import nearley from "nearley";
import { compileAsm } from "../asm/assembler";
// @ts-ignore
import tinyC8Grammar from "./tinyc8";

const labelMarker = "@@tinyc8-label ";

function instructionCount(lines: string[]): number {
  return lines.filter((line) => !line.startsWith(labelMarker)).length;
}

const oppositeOperator = {
  "==": "!=",
  "!=": "==",
};

function binaryExprToAsm(item: any, useOppositeOperator = false) {
  const left = item.left.var_name?.value ?? item.left.value;
  const operator = useOppositeOperator
    ? (oppositeOperator as any)[item.operator.value]
    : item.operator.value;
  const right = item.right.var_name?.value ?? item.right.value;

  return `${left} ${operator} ${right}`;
}

function uncontrolledLoopToAsm(
  node: any,
  acc: string[],
  useOppositeOperator = false,
): void {
  const initialOffset = 0x200 + instructionCount(acc) * 2;
  const initialOffsetStr = `0x${initialOffset.toString(16).padStart(3, "0")}`;
  const statements = node.body;

  astNodeToAsm(statements, acc);

  acc.push(`JUMP IF ${binaryExprToAsm(node.condition, useOppositeOperator)}`);
  acc.push(`JUMP ${initialOffsetStr}`);
}

function whileLoopToAsm(node: any, acc: string[]) {
  const body: any[] = [];
  astNodeToAsm(node.body, body);

  const start = 0x200 + instructionCount(acc) * 2;
  const end =
    0x200 + (instructionCount(acc) + instructionCount(body) + 3) * 2;
  const startTarget = `0x${start.toString(16).padStart(3, "0")}`;
  const endTarget = `0x${end.toString(16).padStart(3, "0")}`;

  acc.push(`JUMP IF ${binaryExprToAsm(node.condition)}`);
  acc.push(`JUMP ${endTarget}`);
  acc.push(...body);
  acc.push(`JUMP ${startTarget}`);
}

function forLoopToAsm(node: any, acc: string[]) {
  if (node.init) {
    astNodeToAsm(node.init, acc);
  }

  const offset = 0x200 + instructionCount(acc) * 2;
  const offsetStr = `0x${offset.toString(16).padStart(3, "0")}`;

  if (node.body) {
    astNodeToAsm(node.body, acc);
  }

  if (node.increment) {
    astNodeToAsm(node.increment, acc);
  }

  if (node.condition) {
    acc.push(`JUMP IF ${binaryExprToAsm(node.condition, true)}`);
  }

  acc.push(`JUMP ${offsetStr}`);
}

function ifStatementToAsm(node: any, acc: string[]) {
  const body: any[] = [];
  const statements = node.body;
  astNodeToAsm(statements, body);

  if (!node.alternate) {
    acc.push(`JUMP IF ${binaryExprToAsm(node.condition, true)}`);
    acc.push(...body);
    return;
  }

  const alternate: any[] = [];
  astNodeToAsm(node.alternate, alternate);

  const elseStart =
    0x200 + (instructionCount(acc) + 3 + instructionCount(body)) * 2;
  const elseTarget = `0x${elseStart.toString(16).padStart(3, "0")}`;
  const endTarget =
    0x200 +
    (instructionCount(acc) +
      3 +
      instructionCount(body) +
      instructionCount(alternate)) *
      2;
  const endTargetStr = `0x${endTarget.toString(16).padStart(3, "0")}`;

  acc.push(`JUMP IF ${binaryExprToAsm(node.condition)}`);
  acc.push(`JUMP ${elseTarget}`);
  acc.push(...body);
  acc.push(`JUMP ${endTargetStr}`);
  acc.push(...alternate);
}

function astNodeToAsm(node: any, acc: string[]): void {
  switch (node.type) {
    case "label_statement":
      acc.push(`${labelMarker}${node.name}`);
      break;
    case "goto_statement":
      acc.push(`GOTO ${node.target}`);
      break;
    case "asm_line":
      if (node.value.type === "identifier") {
        acc.push(`${node.value.value}`);
      } else {
        // recursive
        astNodeToAsm(node.value, acc);
      }
      break;
    case "asm_command":
      {
        const command = node.value.value;
        const args = node.arguments
          .map((arg: any) => {
            switch (arg.type) {
              case "hex_literal":
                return arg.value;
              case "var_reference":
                return arg.var_name.value;
              case "binary_operation":
                return binaryExprToAsm(arg);
              default:
                console.log(JSON.stringify(arg, undefined, 2));
                throw new Error("Unknown arg");
            }
          })
          .join(" ");

        acc.push(`${command} ${args}`);
      }
      break;
    case "var_assignment":
      acc.push(
        `${node.var_name.value} ${node.operator.value} ${node.value.var_name?.value ?? node.value.value}`,
      );
      break;
    case "binary_operation":
      acc.push(binaryExprToAsm(node));
      break;
    case "hex_literal":
      acc.push(`${node.value}`);
      break;
    case "call_expression":
      acc.push(`CALL ${node.fun_name.value}`);
      break;
    case "code_block":
      {
        const statements = node.statements;
        if (Array.isArray(statements)) {
          statements.flat().forEach((s: any) => {
            astNodeToAsm(s, acc);
          });
        } else {
          astNodeToAsm(statements, acc);
        }
      }
      break;
    case "if_statement":
      ifStatementToAsm(node, acc);
      break;
    case "do_while_loop":
      uncontrolledLoopToAsm(node, acc, true);
      break;
    case "while_loop":
      whileLoopToAsm(node, acc);
      break;
    case "for_loop":
      forLoopToAsm(node, acc);
      break;
    case "comment":
      break;
    default:
      console.log(JSON.stringify(node, undefined, 2));
      throw new Error("Unknown node");
  }
}

function astToAsm(astNodes: any[]): string {
  let result: string[] = [];
  const symbols = new Map<string, string>();
  astNodes.forEach((node) => {
    if (node.type === "fun_definition") {
      let offset = 0x200 + instructionCount(result) * 2;
      let offsetStr = `0x${offset.toString(16).padStart(3, "0")}`;
      symbols.set(node.name.value, offsetStr);
      astNodeToAsm(node.body, result);

      result.push("RETURN");
      return;
    }

    astNodeToAsm(node, result);
  });

  const labels = new Map<string, string>();
  let offset = 0x200;
  result = result.filter((line) => {
    if (line.startsWith(labelMarker)) {
      const name = line.slice(labelMarker.length);
      if (labels.has(name)) {
        throw new Error(`Duplicate TinyC8 label '${name}'`);
      }

      labels.set(name, `0x${offset.toString(16).padStart(3, "0")}`);
      return false;
    }

    offset += 2;
    return true;
  });

  result = result.map((line) => {
    if (line.startsWith("GOTO ")) {
      const target = line.slice("GOTO ".length);
      const address = labels.get(target);
      if (!address) {
        throw new Error(`Unknown TinyC8 label '${target}'`);
      }

      return `JUMP ${address}`;
    }

    const labelList = Array.from(symbols.keys());
    for (let i = 0; i < labelList.length; i++) {
      const label = labelList[i];
      if (line.includes(label)) {
        return line.replace(label, symbols.get(label)!);
      }
    }

    return line;
  });

  return result.join("\n");
}

export function compileTinyC8(data: string): Uint8Array {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(tinyC8Grammar));
  console.time();
  parser.feed(data);
  console.timeEnd();

  // console.log(JSON.stringify(parser.results, undefined, 2));

  console.time();
  const results = parser.results[0].flat(3);
  const asmString = astToAsm(results);
  console.timeEnd();

  // console.log(asmString);

  console.time();
  const buffer = compileAsm(asmString);
  console.timeEnd();

  return buffer;
}

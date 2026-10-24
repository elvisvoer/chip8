import nearley from "nearley";
import { compileAsm } from "../asm/assembler";
// @ts-ignore
import basicGrm from "./basic";

function binaryExprToAsm(item: any) {
  const left = item.left.var_name?.value ?? item.left.value;
  const operator = item.operator.value;
  const right = item.right.var_name?.value ?? item.right.value;

  return `${left} ${operator} ${right}`;
}

function callExprToAsm(item: any) {
  if (item.arguments.length === 0) {
    return `${item.name.value}`;
  }

  const args = item.arguments.flat().map((arg: any) => {
    if (arg.type === "identifier") {
      return arg.value;
    }

    if (arg.type === "hex_literal") {
      return arg.value;
    }

    if (arg.type === "var_assignment" || arg.type === "boolean_expr") {
      return binaryExprToAsm(arg);
    }

    throw new Error("wtf!?");
  });

  return `${item.name.value} ${args.join(" ")}`;
}

function repeatLoopToAsm(node: any, acc: string[]): void {
  const initialOffset = 0x200 + acc.length * 2;
  let offset = initialOffset;
  const statements = node.code;

  astNodeToAsm(statements, acc);
  offset += 2;

  acc.push(`JUMP IF ${binaryExprToAsm(node.condition)}`);
  offset += 2;

  const initialOffsetStr = `0x${initialOffset.toString(16).padStart(3, "0")}`;
  acc.push(`JUMP ${initialOffsetStr}`);
}

function astNodeToAsm(node: any, acc: string[]): void {
  switch (node.type) {
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
    case "call_expression":
      acc.push(`${callExprToAsm(node)}`);
      break;
    case "var_assignment":
      acc.push(
        `${node.var_name.value} ${node.operator.value} ${node.value.var_name?.value ?? node.value.value}`,
      );
      break;
    case "hex_literal":
      acc.push(`${node.value}`);
      break;
    case "goto_expression":
      acc.push(`JUMP ${node.label.value}`);
      break;
    case "code_block":
      {
        const statements = node.statements.flat();
        statements.forEach((s: any) => {
          astNodeToAsm(s, acc);
        });
      }
      break;
    case "repeat_loop":
      repeatLoopToAsm(node, acc);
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
  const labelMapping = new Map<string, string>();

  astNodes.forEach((node) => {
    if (node.type === "label_expression") {
      const offset = 0x200 + result.length * 2;
      const offsetStr = `0x${offset.toString(16).padStart(3, "0")}`;
      labelMapping.set(node.label.value, offsetStr);
      astNodeToAsm(node.arguments[0], result);
    } else {
      astNodeToAsm(node, result);
    }
  });

  result = result.map((line) => {
    const labelList = Array.from(labelMapping.keys());
    for (let i = 0; i < labelList.length; i++) {
      const label = labelList[i];
      if (line.includes(label)) {
        return line.replace(label, labelMapping.get(label)!);
      }
    }

    return line;
  });

  return result.join("\n");
}

export function compileBasic(data: string): Uint8Array {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(basicGrm));
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

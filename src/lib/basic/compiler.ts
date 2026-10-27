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

function repeatLoopToAsm(node: any, acc: string[]): void {
  const initialOffset = 0x200 + acc.length * 2;
  const initialOffsetStr = `0x${initialOffset.toString(16).padStart(3, "0")}`;
  const statements = node.code;

  astNodeToAsm(statements, acc);

  acc.push(`JUMP IF ${binaryExprToAsm(node.condition)}`);
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
    case "var_assignment":
      acc.push(
        `${node.var_name.value} ${node.operator.value} ${node.value.var_name?.value ?? node.value.value}`,
      );
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
  const symbols = new Map<string, string>();

  astNodes.forEach((node) => {
    if (node.type === "fun_definition") {
      let offset = 0x200 + result.length * 2;
      let offsetStr = `0x${offset.toString(16).padStart(3, "0")}`;
      symbols.set(node.name.value, offsetStr);
      astNodeToAsm(node.body, result);

      offset = 0x200 + result.length * 2;
      offsetStr = `0x${offset.toString(16).padStart(3, "0")}`;
      result.push("RETURN");
      return;
    }

    astNodeToAsm(node, result);
  });

  result = result.map((line) => {
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

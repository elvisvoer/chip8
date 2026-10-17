import nearley from "nearley";
import { fromAsm } from "../asm/assembler";
import basicGrm from "./basic";

function binaryExprToAsm(item: any) {
  const left = item.name.value;
  const operator = item.operator[0].value;
  const right = item.value[0].value;

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

    if (arg.type === "binary_expr" || arg.type === "boolean_expr") {
      return binaryExprToAsm(arg);
    }

    throw new Error("wtf!?");
  });

  return `${item.name.value} ${args.join(" ")}`;
}

function astNodeToAsm(node: any): string {
  switch (node.type) {
    case "call_expression":
      return callExprToAsm(node);
    case "binary_expr":
      return binaryExprToAsm(node);
    case "hex_literal":
      return node.value;
    default:
      console.log(node);
      throw new Error("Unknown command");
  }
}

function astToAsm(astNodes: any[]): string {
  const results: string[] = [];
  let offset = 0x200;

  astNodes.forEach((node) => {
    const offsetStr = `0x${offset.toString(16).padStart(3, "0")}`;
    offset += 2;

    switch (node.type) {
      case "call_expression":
      case "binary_expr":
      case "hex_literal":
        results.push(`${offsetStr} ${astNodeToAsm(node)}`);
        break;
      case "line_comment":
        // ignore full line comments
        offset -= 2;
        break;
      default:
        console.log(node);
        throw new Error("Unknown command");
    }
  });

  return results.join("\n");
}

export function fromBasic(data: string): Uint8Array {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(basicGrm));
  console.time();
  parser.feed(data);
  console.timeEnd();

  console.time();
  const results = parser.results[0].flat(2);
  const asmString = astToAsm(results);
  console.timeEnd();

  console.time();
  const buffer = fromAsm(asmString);
  console.timeEnd();

  return buffer;
}

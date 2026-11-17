import nearley from "nearley";
import { compileAsm } from "../asm/assembler";
// @ts-ignore
import tinyC8Grammar from "./tinyc8";

const labelMarker = "@@tinyc8-label ";
const breakMarker = "@@tinyc8-break";

function instructionCount(lines: string[]): number {
  return lines.filter((line) => !line.startsWith(labelMarker)).length;
}

function addressAt(lines: string[], baseAddress: number): number {
  return baseAddress + instructionCount(lines) * 2;
}

function addressString(address: number): string {
  return `0x${address.toString(16).padStart(3, "0")}`;
}

function resolveBreaks(lines: string[], exitAddress: number): string[] {
  const target = addressString(exitAddress);
  return lines.map((line) => (line === breakMarker ? `JUMP ${target}` : line));
}

function isDrawCall(node: any): boolean {
  return (
    node?.type === "call_expression" && node.fun_name.value === "draw"
  );
}

function drawCallToAsm(node: any): string {
  const [x, y, height] = node.arguments;
  if (
    node.arguments.length !== 3 ||
    x?.type !== "var_reference" ||
    y?.type !== "var_reference" ||
    height?.type !== "hex_literal"
  ) {
    throw new Error("draw() expects two registers and a hexadecimal height");
  }

  return `DRAW ${x.var_name.value} ${y.var_name.value} ${height.value}`;
}

function expressionValueToAsm(node: any): string {
  if (isDrawCall(node)) {
    return "VF";
  }
  if (node.type === "call_expression") {
    throw new Error(`${node.fun_name.value}() does not return a value`);
  }

  return node.var_name?.value ?? node.value;
}

function drawCallCount(node: any): number {
  if (isDrawCall(node)) {
    return 1;
  }
  if (node.type === "binary_operation") {
    return drawCallCount(node.left) + drawCallCount(node.right);
  }

  return 0;
}

function drawInstructions(node: any): string[] {
  if (isDrawCall(node)) {
    return [drawCallToAsm(node)];
  }
  if (node.type === "binary_operation") {
    return [
      ...drawInstructions(node.left),
      ...drawInstructions(node.right),
    ];
  }

  return [];
}

const oppositeOperator = {
  "==": "!=",
  "!=": "==",
};

function binaryExprToAsm(item: any, useOppositeOperator = false) {
  const left = expressionValueToAsm(item.left);
  const operator = useOppositeOperator
    ? (oppositeOperator as any)[item.operator.value]
    : item.operator.value;
  const right = expressionValueToAsm(item.right);

  return `${left} ${operator} ${right}`;
}

function conditionInstruction(item: any, useOppositeOperator = false): string {
  if (isDrawCall(item)) {
    return `JUMP IF VF ${useOppositeOperator ? "==" : "!="} 0x00`;
  }
  if (item.type === "call_expression") {
    throw new Error(`${item.fun_name.value}() does not return a value`);
  }

  const keyOperand =
    item.left.type === "key_reference"
      ? item.right
      : item.right.type === "key_reference"
        ? item.left
        : null;

  if (keyOperand) {
    const operator = useOppositeOperator
      ? (oppositeOperator as any)[item.operator.value]
      : item.operator.value;
    const register = keyOperand.var_name?.value ?? keyOperand.value;
    return `SKIP IF KEY ${operator} ${register}`;
  }

  return `JUMP IF ${binaryExprToAsm(item, useOppositeOperator)}`;
}

function isLogicalCondition(item: any): boolean {
  return (
    item.type === "binary_operation" &&
    (item.operator.value === "&&" || item.operator.value === "||")
  );
}

function requiresBranchCondition(item: any): boolean {
  return isLogicalCondition(item) || drawCallCount(item) > 0;
}

function conditionInstructionCount(item: any): number {
  if (!isLogicalCondition(item)) {
    return 3 + drawCallCount(item);
  }

  return (
    conditionInstructionCount(item.left) +
    conditionInstructionCount(item.right)
  );
}

function conditionBranchLines(
  item: any,
  trueTarget: number,
  falseTarget: number,
  start: number,
): string[] {
  if (!isLogicalCondition(item)) {
    return [
      ...drawInstructions(item),
      conditionInstruction(item),
      `JUMP ${addressString(falseTarget)}`,
      `JUMP ${addressString(trueTarget)}`,
    ];
  }

  const rightStart =
    start + conditionInstructionCount(item.left) * 2;
  const leftLines =
    item.operator.value === "&&"
      ? conditionBranchLines(item.left, rightStart, falseTarget, start)
      : conditionBranchLines(item.left, trueTarget, rightStart, start);
  const rightLines = conditionBranchLines(
    item.right,
    trueTarget,
    falseTarget,
    rightStart,
  );

  return [...leftLines, ...rightLines];
}

function uncontrolledLoopToAsm(
  node: any,
  acc: string[],
  baseAddress: number,
  useOppositeOperator = false,
): void {
  const initialOffset = addressAt(acc, baseAddress);
  const body: string[] = [];
  astNodeToAsm(node.body, body, initialOffset);
  const branchCondition = requiresBranchCondition(node.condition);
  const conditionCount = branchCondition
    ? conditionInstructionCount(node.condition)
    : 2;
  const endOffset =
    initialOffset + (instructionCount(body) + conditionCount) * 2;

  acc.push(...resolveBreaks(body, endOffset));
  if (branchCondition) {
    const conditionStart = initialOffset + instructionCount(body) * 2;
    acc.push(
      ...conditionBranchLines(
        node.condition,
        initialOffset,
        endOffset,
        conditionStart,
      ),
    );
  } else {
    acc.push(conditionInstruction(node.condition, useOppositeOperator));
    acc.push(`JUMP ${addressString(initialOffset)}`);
  }
}

function whileLoopToAsm(node: any, acc: string[], baseAddress: number) {
  const start = addressAt(acc, baseAddress);
  if (requiresBranchCondition(node.condition)) {
    const conditionCount = conditionInstructionCount(node.condition);
    const bodyStart = start + conditionCount * 2;
    const body: any[] = [];
    astNodeToAsm(node.body, body, bodyStart);
    const end =
      start + (conditionCount + instructionCount(body) + 1) * 2;

    acc.push(
      ...conditionBranchLines(node.condition, bodyStart, end, start),
      ...resolveBreaks(body, end),
      `JUMP ${addressString(start)}`,
    );
    return;
  }

  const body: any[] = [];
  astNodeToAsm(node.body, body, start + 4);

  const end = start + (instructionCount(body) + 3) * 2;

  acc.push(conditionInstruction(node.condition));
  acc.push(`JUMP ${addressString(end)}`);
  acc.push(...resolveBreaks(body, end));
  acc.push(`JUMP ${addressString(start)}`);
}

function forLoopToAsm(node: any, acc: string[], baseAddress: number) {
  if (node.init) {
    astNodeToAsm(node.init, acc, baseAddress);
  }

  const start = addressAt(acc, baseAddress);
  const body: string[] = [];
  astNodeToAsm(node.body, body, start);
  const increment: string[] = [];
  if (node.increment) {
    astNodeToAsm(node.increment, increment, start + instructionCount(body) * 2);
  }

  if (node.condition && requiresBranchCondition(node.condition)) {
    const conditionStart =
      start + (instructionCount(body) + instructionCount(increment)) * 2;
    const end =
      conditionStart + conditionInstructionCount(node.condition) * 2;
    acc.push(
      ...resolveBreaks(body, end),
      ...increment,
      ...conditionBranchLines(node.condition, start, end, conditionStart),
    );
    return;
  }

  const end =
    start +
    (instructionCount(body) +
      instructionCount(increment) +
      (node.condition ? 1 : 0) +
      1) *
      2;
  acc.push(...resolveBreaks(body, end), ...increment);

  if (node.condition) {
    acc.push(conditionInstruction(node.condition, true));
  }

  acc.push(`JUMP ${addressString(start)}`);
}

function ifStatementToAsm(node: any, acc: string[], baseAddress: number) {
  const start = addressAt(acc, baseAddress);
  if (
    !node.alternate &&
    !isLogicalCondition(node.condition) &&
    drawCallCount(node.condition) > 0
  ) {
    const drawLines = drawInstructions(node.condition);
    const body: any[] = [];
    astNodeToAsm(node.body, body, start + (drawLines.length + 1) * 2);
    if (body.length === 1 && body[0].startsWith("GOTO ")) {
      acc.push(...drawLines, conditionInstruction(node.condition, true), ...body);
      return;
    }
  }

  if (requiresBranchCondition(node.condition)) {
    const conditionCount = conditionInstructionCount(node.condition);
    const bodyStart = start + conditionCount * 2;
    const body: any[] = [];
    astNodeToAsm(node.body, body, bodyStart);

    if (!node.alternate) {
      const end = bodyStart + instructionCount(body) * 2;
      acc.push(
        ...conditionBranchLines(node.condition, bodyStart, end, start),
        ...body,
      );
      return;
    }

    const elseStart =
      bodyStart + (instructionCount(body) + 1) * 2;
    const alternate: any[] = [];
    astNodeToAsm(node.alternate, alternate, elseStart);
    const end = elseStart + instructionCount(alternate) * 2;
    acc.push(
      ...conditionBranchLines(node.condition, bodyStart, elseStart, start),
      ...body,
      `JUMP ${addressString(end)}`,
      ...alternate,
    );
    return;
  }

  const body: any[] = [];
  const statements = node.body;
  const hasKeyCondition =
    node.condition.left.type === "key_reference" ||
    node.condition.right.type === "key_reference";

  if (!node.alternate) {
    astNodeToAsm(statements, body, start + (hasKeyCondition ? 4 : 2));
    if (hasKeyCondition) {
      const end = start + (instructionCount(body) + 2) * 2;
      acc.push(conditionInstruction(node.condition));
      acc.push(`JUMP ${addressString(end)}`);
      acc.push(...body);
      return;
    }

    acc.push(`JUMP IF ${binaryExprToAsm(node.condition, true)}`);
    acc.push(...body);
    return;
  }

  astNodeToAsm(statements, body, start + 4);
  const alternate: any[] = [];
  const elseStart = start + (3 + instructionCount(body)) * 2;
  astNodeToAsm(node.alternate, alternate, elseStart);

  if (
    body.length === 1 &&
    alternate.length === 1 &&
    body[0].startsWith("GOTO ") &&
    alternate[0].startsWith("GOTO ")
  ) {
    acc.push(conditionInstruction(node.condition), alternate[0], body[0]);
    return;
  }

  const endTarget = elseStart + instructionCount(alternate) * 2;

  acc.push(conditionInstruction(node.condition));
  acc.push(`JUMP ${addressString(elseStart)}`);
  acc.push(...body);
  acc.push(`JUMP ${addressString(endTarget)}`);
  acc.push(...alternate);
}

function astNodeToAsm(node: any, acc: string[], baseAddress = 0x200): void {
  switch (node.type) {
    case "label_statement":
      acc.push(`${labelMarker}${node.name}`);
      break;
    case "goto_statement":
      acc.push(`GOTO ${node.target}`);
      break;
    case "break_statement":
      acc.push(breakMarker);
      break;
    case "key_skip_statement":
      acc.push(`SKIP IF KEY ${node.operator.value} ${node.key.value}`);
      break;
    case "asm_line":
      if (node.value.type === "identifier") {
        acc.push(`${node.value.value}`);
      } else {
        // recursive
        astNodeToAsm(node.value, acc, baseAddress);
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
    case "var_assignment": {
      const operator =
        node.operator.value === "=" ? ":=" : node.operator.value;
      if (isDrawCall(node.value)) {
        acc.push(
          drawCallToAsm(node.value),
          `${node.var_name.value} ${operator} VF`,
        );
      } else {
        acc.push(
          `${node.var_name.value} ${operator} ${node.value.var_name?.value ?? node.value.value}`,
        );
      }
      break;
    }
    case "postfix_update":
      acc.push(
        `${node.var_name.value} += ${
          node.operator.value === "++" ? "0x01" : "0xff"
        }`,
      );
      break;
    case "binary_operation":
      acc.push(binaryExprToAsm(node));
      break;
    case "hex_literal":
      acc.push(`${node.value}`);
      break;
    case "call_expression":
      if (node.fun_name.value === "clear") {
        if (node.arguments.length !== 0) {
          throw new Error("clear() does not accept arguments");
        }
        acc.push("CLEAR");
      } else if (node.fun_name.value === "draw") {
        acc.push(drawCallToAsm(node));
      } else {
        acc.push(`CALL ${node.fun_name.value}`);
      }
      break;
    case "code_block":
      {
        const statements = node.statements;
        if (Array.isArray(statements)) {
          statements.flat().forEach((s: any) => {
            astNodeToAsm(s, acc, baseAddress);
          });
        } else {
          astNodeToAsm(statements, acc, baseAddress);
        }
      }
      break;
    case "if_statement":
      ifStatementToAsm(node, acc, baseAddress);
      break;
    case "do_while_loop":
      uncontrolledLoopToAsm(node, acc, baseAddress, true);
      break;
    case "while_loop":
      whileLoopToAsm(node, acc, baseAddress);
      break;
    case "for_loop":
      forLoopToAsm(node, acc, baseAddress);
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
      astNodeToAsm(node.body, result, addressAt(result, 0x200));

      result.push("RETURN");
      return;
    }

    astNodeToAsm(node, result);
  });

  if (result.includes(breakMarker)) {
    throw new Error("Break statement outside loop");
  }

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

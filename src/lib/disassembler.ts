import { opToAsm } from "./opToAsm";

const programStart = 0x200;

export function bufferToHex(data: Uint8Array): string {
  return data.toHex();
}

function isSupportedOpcode(op: number): boolean {
  const type = op >> 12;
  const nn = op & 0xff;
  const n = op & 0xf;

  switch (type) {
    case 0x0:
      return (
        op === 0x0000 ||
        op === 0x00e0 ||
        op === 0x00ee ||
        op === 0x00ff
      );
    case 0x1:
    case 0x2:
    case 0x3:
    case 0x4:
    case 0x6:
    case 0x7:
    case 0xa:
    case 0xb:
    case 0xc:
    case 0xd:
      return true;
    case 0x5:
    case 0x9:
      return n === 0;
    case 0x8:
      return [0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0xe].includes(n);
    case 0xe:
      return nn === 0x9e || nn === 0xa1;
    case 0xf:
      return [
        0x07, 0x0a, 0x15, 0x18, 0x1e, 0x29, 0x33, 0x55, 0x65, 0x75, 0x85,
      ].includes(nn);
    default:
      return false;
  }
}

function discoverInstructions(data: Uint8Array): Map<number, number> {
  const instructions = new Map<number, number>();
  const occupiedBytes = new Set<number>();
  const pending = [programStart];

  while (pending.length > 0) {
    const address = pending.pop()!;
    const index = address - programStart;
    if (
      index < 0 ||
      index + 1 >= data.length ||
      occupiedBytes.has(index) ||
      occupiedBytes.has(index + 1)
    ) {
      continue;
    }

    const op = (data[index] << 8) | data[index + 1];
    if (!isSupportedOpcode(op)) {
      continue;
    }

    instructions.set(address, op);
    occupiedBytes.add(index);
    occupiedBytes.add(index + 1);

    const next = address + 2;
    switch (op >> 12) {
      case 0x1:
        pending.push(op & 0x0fff);
        break;
      case 0x2:
        pending.push(op & 0x0fff, next);
        break;
      case 0x3:
      case 0x4:
      case 0x5:
      case 0x9:
        pending.push(next, next + 2);
        break;
      case 0x0:
        if (op !== 0x00ee) {
          pending.push(next);
        }
        break;
      default:
        pending.push(next);
        break;
    }
  }

  return instructions;
}

function oddAddressInstructionsToAsm(
  data: Uint8Array,
  oddStartAddress: number,
): string {
  const result: string[] = [];
  const oddStartIndex = oddStartAddress - programStart;
  let index = 0;
  while (index < oddStartIndex) {
    const address = programStart + index;
    if (index + 1 < oddStartIndex) {
      const op = (data[index] << 8) | data[index + 1];
      result.push(`0x${address.toString(16).padStart(3, "0")} ${opToAsm(op)}`);
      index += 2;
    } else {
      result.push(
        `0x${address.toString(16).padStart(3, "0")} 0x${data[index]
          .toString(16)
          .padStart(2, "0")}`,
      );
      index += 1;
    }
  }

  for (; index < data.length; index += 2) {
    const address = programStart + index;
    if (data[index + 1] === undefined) {
      result.push(
        `0x${address.toString(16).padStart(3, "0")} 0x${data[index]
          .toString(16)
          .padStart(2, "0")}`,
      );
    } else {
      const op = (data[index] << 8) | data[index + 1];
      result.push(`0x${address.toString(16).padStart(3, "0")} ${opToAsm(op)}`);
    }
  }

  return result.join("\n");
}

export function bufferToAsm(data: Uint8Array): string {
  const instructions = discoverInstructions(data);
  const oddStartAddress = Math.min(
    ...Array.from(instructions.keys()).filter((address) => address % 2 !== 0),
  );
  if (Number.isFinite(oddStartAddress)) {
    return oddAddressInstructionsToAsm(data, oddStartAddress);
  }

  const result: string[] = [];
  const pc = programStart;

  for (let i = 0; i < data.length; i += 2) {
    const offset = `0x${(pc + i).toString(16).padStart(3, "0")}`;
    if (data[i + 1] === undefined) {
      const line = `${offset} 0x${data[i].toString(16).padStart(2, "0")}`;
      result.push(line);
      break;
    }
    const op = (data[i] << 8) | data[i + 1];
    result.push(`${offset} ${opToAsm(op)}`);
  }

  return result.join("\n");
}

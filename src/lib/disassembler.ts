import { opToAsm } from "./opToAsm";

export function bufferToHex(data: Uint8Array): string {
  return data.toHex();
}

export function bufferToAsm(data: Uint8Array): string {
  const result: string[] = [];
  const pc = 0x200;

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

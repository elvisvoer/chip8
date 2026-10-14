import nearley from "nearley";
import grammar from "./asm/asm";
import { opToAsm } from "./opToAsm";

export class Disassembler {
  public static toHex(data: Uint8Array): string {
    const result: string[] = [];

    for (let i = 0; i < data.length; i += 2) {
      if (data[i + 1] === undefined) {
        result.push(`0x${data[i].toString(16).padStart(2, "0")}`);
        break;
      }
      const op = (data[i] << 8) | data[i + 1];
      result.push(`0x${op.toString(16).padStart(4, "0")}`);
    }

    return result.join("\n");
  }

  public static fromHex(data: string): Uint8Array {
    const lines = data.split("\n");
    const isOddSize = lines[lines.length - 1].length === 4;
    const size = lines.length * 2 - (isOddSize ? 1 : 0);
    const result = new Uint8Array(size);

    for (let i = 0; i < lines.length; i++) {
      const hexStr = lines[i];
      const hex = parseInt(hexStr, 16);
      if (hexStr.length === 4) {
        result[i * 2] = hex & 0xff;
        break;
      }

      result[i * 2] = (hex & 0xff00) >> 8;
      result[i * 2 + 1] = hex & 0x00ff;
    }

    return result;
  }

  public static toAsm(data: Uint8Array): string {
    const result: string[] = [];
    const pc = 0x200;

    for (let i = 0; i < data.length; i += 2) {
      const offset = `0x${(pc + i).toString(16).padStart(4, "0")}`;
      if (data[i + 1] === undefined) {
        const line = `${offset}: 0x${data[i].toString(16).padStart(2, "0")}`;
        result.push(line);
        break;
      }
      const op = (data[i] << 8) | data[i + 1];
      result.push(`${offset}: ${opToAsm(op)}`);
    }

    return result.join("\n");
  }

  public static fromAsm(data: string): Uint8Array {
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(data);

    const hexString = parser.results[0][0].flat().join("\n");
    return Disassembler.fromHex(hexString);
  }
}

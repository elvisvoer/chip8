import nearley from "nearley";
import grammar from "./asm/asm";

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
      result.push(`${offset}: ${Disassembler.opToAsm(op)}`);
    }

    return result.join("\n");
  }

  public static fromAsm(data: string): Uint8Array {
    const parser = new nearley.Parser(nearley.Grammar.fromCompiled(grammar));
    parser.feed(data);

    const hexString = parser.results[0][0].flat().join("\n");
    return Disassembler.fromHex(hexString);
  }

  private static opToAsm(op: number) {
    const o = (op >> 12) & 0x000f;
    const x = (op >> 8) & 0x000f;
    const y = (op >> 4) & 0x000f;
    const nnn = op & 0x0fff;
    const nn = op & 0x00ff;
    const n = op & 0x000f;

    const opStr = op.toString(16).padStart(4, "0");
    const nnnStr = nnn.toString(16).padStart(3, "0");
    const nnStr = nn.toString(16).padStart(2, "0");
    const nStr = n.toString(16);
    const xStr = x.toString(16).toUpperCase();
    const yStr = y.toString(16).toUpperCase();

    const simpleOps: any = {
      0x0000: () => {
        return "NOOP";
      },

      0x00e0: () => "CLEAR",
      0x00ee: () => {
        return "POP";
      },
      0x00ff: () => {
        return "HIRES";
      },
    };

    if (simpleOps[op]) {
      return simpleOps[op]();
    }

    switch (o) {
      case 0x1:
        return `JUMP 0x${nnnStr}`;
      case 0x2:
        return `PUSH 0x${nnnStr}`;
      case 0x3:
        return `JEQ V${xStr} 0x${nnStr}`;
      case 0x4:
        return `JNQ V${xStr} 0x${nnStr}`;
      case 0x5:
        return `JEQ V${xStr} V${yStr} 0x${nStr}`;
      case 0x9:
        return `JNQ V${xStr} V${yStr} 0x${nStr}`;
      case 0x6:
        return `V${xStr} := 0x${nnStr}`;
      case 0x7:
        return `V${xStr} += 0x${nnStr}`;
      case 0x8: {
        switch (n) {
          case 0x0:
            return `V${xStr} := V${yStr}`;
          case 0x1:
            return `V${xStr} |= V${yStr}`;
          case 0x2:
            return `V${xStr} &= V${yStr}`;
          case 0x3:
            return `V${xStr} ^= V${yStr}`;
          case 0x4: {
            return `V${xStr} += V${yStr}`;
          }
          case 0x5: {
            return `V${xStr} -= V${yStr}`;
          }
          case 0x7: {
            return `V${xStr} ~= V${yStr}`;
          }
          case 0x6: {
            return `V${xStr} >> V${yStr}`;
          }
          case 0xe: {
            return `V${xStr} << V${yStr}`;
          }
        }
        break;
      }
      case 0xa:
        return `I := 0x${nnnStr}`;
      case 0xb:
        return `JOFF 0x${nnnStr}`;
      case 0xc:
        return `RAND V${xStr} 0x${nnStr}`;
      case 0xd:
        return `DRAW V${xStr} V${yStr} 0x${nStr}`;
      case 0xe: {
        // EX9E and EXA1: Skip if key
        switch (nn) {
          case 0x9e:
            return `SIK V${xStr}`;
          case 0xa1:
            return `SINK V${xStr}`;
        }
        break;
      }
      case 0xf: {
        switch (nn) {
          // timers
          case 0x07:
            return `DTVX V${xStr}`;
          case 0x15:
            return `VXDT V${xStr}`;
          case 0x18:
            return `VXST V${xStr}`;
          case 0x0a:
            return `GET V${xStr}`;
          case 0x1e:
            return `INC V${xStr}`;
          case 0x29:
            return `FONT V${xStr}`;
          case 0x33:
            return `BCDC V${xStr}`;
          case 0x55:
            return `SAVE V${xStr}`;
          case 0x65:
            return `LOAD V${xStr}`;
          case 0x75:
            return `PUSHF V${xStr}`;
          case 0x85:
            return `POPF V${xStr}`;
        }
      }
    }

    return `0x${opStr}`;
  }
}

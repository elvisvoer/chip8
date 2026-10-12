export class Disassembler {
  public static toHex(data: Uint8Array): string {
    const result: string[] = [];
    let programCount = 0;

    while (programCount < data.length) {
      const op = (data[programCount] << 8) | data[programCount + 1];
      result.push(Disassembler.opToHex(op));
      programCount += 2;
    }

    return result.join("\n");
  }

  public static fromHex(data: string): Uint8Array {
    const lines = data.split("\n");
    const result = new Uint8Array(lines.length * 2);

    for (let i = 0; i < lines.length; i++) {
      const hex = parseInt(lines[i]);
      result[i * 2] = (hex & 0xff00) >> 8;
      result[i * 2 + 1] = hex & 0x00ff;
    }

    return result;
  }

  private static opToHex(op: number) {
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
    const xStr = x.toString(16);
    const yStr = y.toString(16);

    const simpleOps: any = {
      0x0000: () => {
        return "0x0000";
      },

      0x00e0: () => "0x00e0",
      0x00ee: () => {
        return "0x00ee";
      },
      0x00ff: () => {
        return "0x00ff";
      },
    };

    if (simpleOps[op]) {
      return simpleOps[op]();
    }

    switch (o) {
      case 0x1:
        return `0x1${nnnStr}`;
      case 0x2:
        return `0x2${nnnStr}`;
      case 0x3:
        return `0x3${xStr}${nnStr}`;
      case 0x4:
        return `0x4${xStr}${nnStr}`;
      case 0x5:
        return `0x5${xStr}${nnStr}`;
      case 0x9:
        return `0x9${xStr}${nnStr}`;
      case 0x6:
        return `0x6${xStr}${nnStr}`;
      case 0x7:
        return `0x7${xStr}${nnStr}`;
      case 0x8: {
        switch (n) {
          case 0x0:
            return `0x8${xStr}${yStr}0`;
          case 0x1:
            return `0x8${xStr}${yStr}1`;
          case 0x2:
            return `0x8${xStr}${yStr}2`;
          case 0x3:
            return `0x8${xStr}${yStr}3`;
          case 0x4: {
            return `0x8${xStr}${yStr}4`;
          }
          case 0x5: {
            return `0x8${xStr}${yStr}5`;
          }
          case 0x7: {
            return `0x8${xStr}${yStr}7`;
          }
          case 0x6: {
            return `0x8${xStr}${yStr}6`;
          }
          case 0xe: {
            return `0x8${xStr}${yStr}e`;
          }
        }
        break;
      }
      case 0xa:
        return `0xa${nnnStr}`;
      case 0xb:
        return `0xb${nnnStr}`;
      case 0xc:
        return `0xc${xStr}${nnStr}`;
      case 0xd:
        return `0xd${xStr}${yStr}${nStr}`;
      case 0xe: {
        // EX9E and EXA1: Skip if key
        switch (nn) {
          case 0x9e:
            return `0xe${xStr}9e`;
          case 0xa1:
            return `0xe${xStr}a1`;
        }
        break;
      }
      case 0xf: {
        switch (nn) {
          // timers
          case 0x07:
            return `0xf${xStr}07`;
          case 0x15:
            return `0xf${xStr}15`;
          case 0x18:
            return `0xf${xStr}18`;
          case 0x0a:
            return `0xf${xStr}0a`;
          case 0x1e:
            return `0xf${xStr}1e`;
          case 0x29:
            return `0xf${xStr}29`;
          case 0x33:
            return `0xf${xStr}33`;
          case 0x55:
            return `0xf${xStr}55`;
          case 0x65:
            return `0xf${xStr}65`;
          case 0x75:
            return `0xf${xStr}75`;
          case 0x85:
            return `0xf${xStr}85`;
        }
      }
    }

    return `0x${opStr}`;
  }
}

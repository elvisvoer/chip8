export function opToAsm(op: number) {
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
      return "RETURN";
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
      return `CALL 0x${nnnStr}`;
    case 0x3:
      return `JUMP IF V${xStr} == 0x${nnStr}`;
    case 0x4:
      return `JUMP IF V${xStr} != 0x${nnStr}`;
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
          return `V${xStr} >>= V${yStr}`;
        }
        case 0xe: {
          return `V${xStr} <<= V${yStr}`;
        }
      }
      break;
    }
    case 0xa:
      return `I := 0x${nnnStr}`;
    case 0xb:
      return `JUMP TO 0x${nnnStr}`;
    case 0xc:
      return `RAND V${xStr} 0x${nnStr}`;
    case 0xd:
      return `DRAW V${xStr} V${yStr} 0x${nStr}`;
    case 0xe: {
      // EX9E and EXA1: Skip if key
      switch (nn) {
        case 0x9e:
          return `SKIP IF KEY == V${xStr}`;
        case 0xa1:
          return `SKIP IF KEY != V${xStr}`;
      }
      break;
    }
    case 0xf: {
      switch (nn) {
        // timers
        case 0x07:
          return `V${xStr} := DT`;
        case 0x15:
          return `DT := V${xStr}`;
        case 0x18:
          return `ST := V${xStr}`;
        case 0x0a:
          return `READ V${xStr}`;
        case 0x1e:
          return `INC V${xStr}`;
        case 0x29:
          return `FONT V${xStr}`;
        case 0x33:
          return `BCDC V${xStr}`;
        case 0x55:
          return `SAVE 0x${xStr}`;
        case 0x65:
          return `LOAD 0x${xStr}`;
        case 0x75:
          return `PUSHF 0x${xStr}`;
        case 0x85:
          return `POPF 0x${xStr}`;
      }
    }
  }

  return `0x${opStr}`;
}

import { Stack } from "./stack";

const V: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let PC: number = 0;
let I = 0;

let delayTimer = 0;
let soundTimer = 0;

const addressStack = new Stack<number>("address-stack");
let RAM: Uint8Array = new Uint8Array(4 * 1024);
const FB: number[] = [];
const FBCoSize = 32;
const FBRowSize = 64;

function drawSprite(x: number, y: number, len: number) {
  V[0xf] = 0x0;
  const rowSize = FBRowSize;
  const colSize = FBCoSize;
  let i = I;

  if (len == 0) {
    // draw a SuperChip 16x16 sprite
    for (let a = 0; a < 16; a++) {
      for (let b = 0; b < 16; b++) {
        const target = ((x + b) % rowSize) + ((y + a) % colSize) * rowSize;
        const source =
          ((RAM[i + a * 2 + (b > 7 ? 1 : 0)] >> (7 - (b % 8))) & 0x1) != 0;

        if (!source) {
          continue;
        }

        if (FB[target]) {
          FB[target] = 0;
          V[0xf] = 0x1;
        } else {
          FB[target] = 1;
        }
      }
    }
    i += 32;
  } else {
    // draw a Chip8 8xN sprite
    for (let a = 0; a < len; a++) {
      for (let b = 0; b < 8; b++) {
        const target = ((x + b) % rowSize) + ((y + a) % colSize) * rowSize;
        const source = ((RAM[i + a] >> (7 - b)) & 0x1) != 0;

        if (!source) {
          continue;
        }

        if (FB[target]) {
          FB[target] = 0;
          V[0xf] = 0x1;
        } else {
          FB[target] = 1;
        }
      }
    }
    i += len;
  }
}

function clearScreen() {
  for (var z = 0; z < FBCoSize * FBRowSize; z++) {
    FB[z] = 0;
  }
}

function fetchNextInstruction() {
  if (PC === RAM.length) {
    throw new Error("Emulator reached out of memory");
  }

  const H1 = RAM[PC];
  const H2 = RAM[PC + 1];

  PC += 2;

  return [(H1 & 0xf0) >> 4, H1 & 0x0f, (H2 & 0xf0) >> 4, H2 & 0x0f];
}

function executeInstruction(op: number[]) {
  const hexStr = `${op.reduce(
    (acc, n) => acc + n.toString(16),
    ""
  )}`.toLocaleUpperCase();
  const addr = (PC - 2).toString(16);
  const NNN = parseInt(hexStr, 16) & 0x0fff;
  const NN = parseInt(hexStr, 16) & 0x00ff;
  const [O, X, Y, N] = op;

  // 0000 - noop
  if (hexStr === "0000") {
    console.debug(addr, hexStr, "0000 - noop");
    return;
  }

  // 00E0 - clear screen
  if (hexStr === "00E0") {
    console.debug(addr, hexStr, "00E0 - clear screen");
    clearScreen();
    return;
  }

  // 00EE - subroutine return
  if (hexStr === "00EE") {
    console.debug(addr, hexStr, "00EE - subroutine return");
    const top = addressStack.pop() as number;
    PC = top;
    return;
  }

  switch (O) {
    // 1NNN - jump
    case 1: {
      console.debug(addr, hexStr, "1NNN - jump");
      PC = NNN;
      break;
    }
    // 2NNN - subroutine call
    case 2: {
      console.debug(addr, hexStr, "2NNN - subroutine call");
      addressStack.push(PC); // push return address
      PC = NNN;
      break;
    }
    // 3XNN - skip if equal
    case 3: {
      console.debug(addr, hexStr, "3XNN - skip if equal");
      if (V[X] === NN) {
        PC += 2;
      }
      break;
    }
    // 4XNN - skip if not equal
    case 4: {
      console.debug(addr, hexStr, "4XNN - skip if not equal");
      if (V[X] !== NN) {
        PC += 2;
      }
      break;
    }
    // 5XY0 - skip if equal
    case 5: {
      console.debug(addr, hexStr, "5XY0 - skip if equal");
      if (V[X] === V[Y]) {
        PC += 2;
      }
      break;
    }
    // 9XY0 - skip if not equal
    case 9: {
      console.debug(addr, hexStr, "9XY0 - skip if not equal");
      if (V[X] !== V[Y]) {
        PC += 2;
      }
      break;
    }
    // 6XNN - set
    case 6: {
      console.debug(addr, hexStr, "6XNN - set");
      V[X] = NN;
      break;
    }
    // 7XNN - add
    case 7: {
      console.debug(addr, hexStr, "7XNN - add");
      V[X] += NN;
      break;
    }
    case 8: {
      switch (N) {
        // 8XY0 - set
        case 0: {
          console.debug(addr, hexStr, "8XY0 - set");
          V[X] = V[Y];
          break;
        }
        // 8XY1 - binary or
        case 1: {
          console.debug(addr, hexStr, "8XY1 - binary or");
          V[X] |= V[Y];
          break;
        }
        // 8XY2 - binary and
        case 2: {
          console.debug(addr, hexStr, "8XY2 - binary and");
          V[X] &= V[Y];
          break;
        }
        // 8XY3 - logical xor
        case 3: {
          console.debug(addr, hexStr, "8XY3 - logical xor");
          V[X] ^= V[Y];
          break;
        }
        // 8XY4 - add
        case 4: {
          console.debug(addr, hexStr, "8XY4 - add");
          V[X] += V[Y];
          // carry flag
          V[0xf] = V[X] > 255 ? 1 : 0;
          break;
        }
        // 8XY5 - subtract
        case 5: {
          // carry flag (before subtraction)
          V[0xf] = V[X] > V[Y] ? 1 : 0;
          console.debug(addr, hexStr, "8XY5 - subtract");
          V[X] = V[X] - V[Y];
          break;
        }
        // 8XY7 - subtract
        case 7: {
          // carry flag (before subtraction)
          V[0xf] = V[Y] > V[X] ? 1 : 0;
          console.debug(addr, hexStr, "8XY7 - subtract");
          V[X] = V[Y] - V[X];
          break;
        }
        // 8XY6 - shift
        case 6: {
          // TODO(@elvis): optional -> set VX = VY
          // carry flag (before shift)
          V[0xf] = (V[X] & 0x01) > 0 ? 1 : 0;
          console.debug(addr, hexStr, "8XY6 - shift");
          V[X] = V[X] >> 1;
          break;
        }
        // 8XYE - shift
        case 0xe: {
          // TODO(@elvis): optional -> set VX = VY
          // carry flag (before shift)
          V[0xf] = (V[X] & 0x8000) > 0 ? 1 : 0;
          console.debug(addr, hexStr, "8XYE - shift");
          V[X] = V[X] << 1;
          break;
        }

        default:
          throw new Error(`Unknown instruction #${hexStr}`);
      }
      break;
    }
    // ANNN - set index
    case 0xa: {
      console.debug(addr, hexStr, "ANNN - set index");
      I = NNN;
      break;
    }
    // BNNN - jump with offset
    case 0xb: {
      const offset = V[0];
      console.debug(addr, hexStr, "BNNN - jump with offset");
      PC = NNN + offset;
      break;
    }
    // CXNN - random
    case 0xc: {
      const random = Math.floor(Math.random() * 255);
      console.debug(addr, hexStr, "CXNN - random");
      V[X] = random & NN;
      break;
    }
    // DXYN - display
    case 0xd: {
      console.debug(addr, hexStr, "DXYN - display");
      drawSprite(V[X], V[Y], N);
      break;
    }
    default:
      throw new Error(`Unknown instruction #${hexStr}`);
  }
}

export function init(cardROM: Uint8Array) {
  // copy card memory into RAM starting at address 0x200
  for (let i = 0; i < cardROM.length; i += 1) {
    RAM[0x200 + i] = cardROM[i];
  }

  // init display FrameBuffer (FB)
  clearScreen();
}

export function run() {
  // start emulator from address 0x200
  PC = 0x200;

  for (let i = 0; i < 1000; i += 1) {
    const instr = fetchNextInstruction();
    executeInstruction(instr);
  }
}

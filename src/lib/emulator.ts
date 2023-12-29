// registries
const V: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let PC: number = 0;
let I = 0;

// times
let delayTimer = 0;
let soundTimer = 0;

const callStack: number[] = [];
let RAM: Uint8Array = new Uint8Array(4 * 1024);
// display framebuffer
const FB: number[] = [];
const FBCoSize = 32;
const FBRowSize = 64;

function drawSprite(x: number, y: number, len: number) {
  V[0xf] = 0x0;

  // draw a Chip8 8xN sprite
  for (let a = 0; a < len; a++) {
    for (let b = 0; b < 8; b++) {
      const target = ((x + b) % FBRowSize) + ((y + a) % FBCoSize) * FBRowSize;
      const source = ((RAM[I + a] >> (7 - b)) & 0x1) != 0;

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
  const NNN = parseInt(hexStr, 16) & 0x0fff;
  const NN = parseInt(hexStr, 16) & 0x00ff;
  const [O, X, Y, N] = op;

  // 0000 - noop
  if (hexStr === "0000") {
    return;
  }

  // 00E0 - clear screen
  if (hexStr === "00E0") {
    clearScreen();
    return;
  }

  // 00EE - subroutine return
  if (hexStr === "00EE") {
    const top = callStack.pop() as number;
    PC = top;
    return;
  }

  switch (O) {
    // 1NNN - jump
    case 1: {
      PC = NNN;
      break;
    }
    // 2NNN - subroutine call
    case 2: {
      callStack.push(PC); // push return address
      PC = NNN;
      break;
    }
    // 3XNN - skip if equal
    case 3: {
      if (V[X] === NN) {
        PC += 2;
      }
      break;
    }
    // 4XNN - skip if not equal
    case 4: {
      if (V[X] !== NN) {
        PC += 2;
      }
      break;
    }
    // 5XY0 - skip if equal
    case 5: {
      if (V[X] === V[Y]) {
        PC += 2;
      }
      break;
    }
    // 9XY0 - skip if not equal
    case 9: {
      if (V[X] !== V[Y]) {
        PC += 2;
      }
      break;
    }
    // 6XNN - set
    case 6: {
      V[X] = NN;
      break;
    }
    // 7XNN - add
    case 7: {
      V[X] += NN;
      break;
    }
    case 8: {
      switch (N) {
        // 8XY0 - set
        case 0: {
          V[X] = V[Y];
          break;
        }
        // 8XY1 - binary or
        case 1: {
          V[X] |= V[Y];
          break;
        }
        // 8XY2 - binary and
        case 2: {
          V[X] &= V[Y];
          break;
        }
        // 8XY3 - logical xor
        case 3: {
          V[X] ^= V[Y];
          break;
        }
        // 8XY4 - add
        case 4: {
          V[X] += V[Y];
          // carry flag
          V[0xf] = V[X] > 255 ? 1 : 0;
          break;
        }
        // 8XY5 - subtract
        case 5: {
          // carry flag (before subtraction)
          V[0xf] = V[X] > V[Y] ? 1 : 0;
          V[X] = V[X] - V[Y];
          break;
        }
        // 8XY7 - subtract
        case 7: {
          // carry flag (before subtraction)
          V[0xf] = V[Y] > V[X] ? 1 : 0;
          V[X] = V[Y] - V[X];
          break;
        }
        // 8XY6 - shift
        case 6: {
          // TODO(@elvis): optional -> set VX = VY
          // carry flag (before shift)
          V[0xf] = (V[X] & 0x01) > 0 ? 1 : 0;
          V[X] = V[X] >> 1;
          break;
        }
        // 8XYE - shift
        case 0xe: {
          // TODO(@elvis): optional -> set VX = VY
          // carry flag (before shift)
          V[0xf] = (V[X] & 0x8000) > 0 ? 1 : 0;
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
      I = NNN;
      break;
    }
    // BNNN - jump with offset
    case 0xb: {
      const offset = V[0];
      PC = NNN + offset;
      break;
    }
    // CXNN - random
    case 0xc: {
      const random = Math.floor(Math.random() * 255);
      V[X] = random & NN;
      break;
    }
    // DXYN - display
    case 0xd: {
      drawSprite(V[X], V[Y], N);
      break;
    }
    case 0xf: {
      switch (NN) {
        // FX33 - store
        case 0x33: {
          RAM[I] = Math.floor(V[X] / 100) % 10;
          RAM[I + 1] = Math.floor(V[X] / 10) % 10;
          RAM[I + 2] = V[X] % 10;
          break;
        }
        // FX55 - store
        case 0x55: {
          for (let i = 0; i <= X; i++) {
            RAM[I + i] = V[i];
          }
          break;
        }
        // FX65 - load
        case 0x65: {
          for (let i = 0; i <= X; i++) {
            V[i] = RAM[I + i];
          }
          break;
        }

        default:
          throw new Error(`Unknown instruction #${hexStr}`);
      }
      break;
    }
    default:
      throw new Error(`Unknown instruction #${hexStr}`);
  }
}

function loop() {
  const instr = fetchNextInstruction();
  executeInstruction(instr);
}

const canvas = document.getElementById("display")! as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

function refreshDisplay() {
  ctx.reset();
  for (let i = 0; i < FBCoSize; i++) {
    for (let j = 0; j < FBRowSize; j++) {
      const z = i * FBRowSize + j;
      if (FB[z]) {
        ctx.rect(j * 10, i * 10, 10, 10);
        ctx.fill();
      }
    }
  }
}

export function load(data: Uint8Array, offset: number = 0x200) {
  for (let i = 0; i < data.length; i += 1) {
    RAM[offset + i] = data[i];
  }
}

// start emulator from offset address, default: 0x200
export function run(offset: number = 0x200) {
  PC = offset;

  // init display FrameBuffer (FB)
  clearScreen();

  // display refresh loop
  setInterval(refreshDisplay, 33);
  // main program loop
  setInterval(loop, 10);
}

import { Stack } from "./stack";

const V: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
let PC: number = 0;
let I = 0;

let delayTimer = 0;
let soundTimer = 0;

const addressStack = new Stack<number>("address-stack");
let RAM: Uint8Array = new Uint8Array(4 * 1024);

function fetchNextInstruction() {
  if (PC === RAM.length) {
    throw new Error("Emulator reached out of memory");
  }

  const H1 = RAM[PC];
  const H2 = RAM[PC + 1];

  PC += 2;

  return [(H1 & 0xf0) >> 4, H1 & 0x0f, (H2 & 0xf0) >> 4, H2 & 0x0f];
}

function executeInstruction(N: number[]) {
  const hexStr = `${N.reduce(
    (acc, n) => acc + n.toString(16),
    ""
  )}`.toLocaleUpperCase();

  // 0000 - noop
  if (hexStr === "0000") {
    console.log(hexStr, "0000 - noop");
    return;
  }

  // 00E0 - clear screen
  if (hexStr === "00E0") {
    console.log(hexStr, "00E0 - clear screen");
    return;
  }

  // 00EE - subroutine return
  if (hexStr === "00EE") {
    console.log(hexStr, "00EE - subroutine return");
    const oldPC = addressStack.pop() as number;
    PC = oldPC;
    return;
  }

  switch (N[0]) {
    // 1NNN - jump
    case 1: {
      const NNN = parseInt(hexStr, 16) & 0x0fff;
      console.log(hexStr, "1NNN - jump");
      PC = NNN;
      break;
    }
    // 2NNN - subroutine call
    case 2: {
      const NNN = parseInt(hexStr, 16) & 0x0fff;
      console.log(hexStr, "2NNN - subroutine call");
      addressStack.push(PC); // push return address
      PC = NNN;
      break;
    }
    // 3XNN - skip if equal
    case 3: {
      const NN = parseInt(hexStr, 16) & 0x00ff;
      console.log(hexStr, "3XNN - skip if equal");
      if (V[N[1]] === NN) {
        PC += 2;
      }
      break;
    }
    // 4XNN - skip if not equal
    case 4: {
      const NN = parseInt(hexStr, 16) & 0x00ff;
      console.log(hexStr, "4XNN - skip if not equal");
      if (V[N[1]] !== NN) {
        PC += 2;
      }
      break;
    }
    // 5XY0 - skip if equal
    case 5: {
      console.log(hexStr, "5XY0 - skip if equal");
      if (V[N[1]] === V[N[2]]) {
        PC += 2;
      }
      break;
    }
    // 9XY0 - skip if not equal
    case 9: {
      console.log(hexStr, "9XY0 - skip if not equal");
      if (V[N[1]] !== V[N[2]]) {
        PC += 2;
      }
      break;
    }
    // 6XNN - set
    case 6: {
      const NN = parseInt(hexStr, 16) & 0x00ff;
      console.log(hexStr, "6XNN - set");
      V[N[1]] = NN;
      break;
    }
    // 7XNN - add
    case 7: {
      const NN = parseInt(hexStr, 16) & 0x00ff;
      console.log(hexStr, "7XNN - add");
      V[N[1]] += NN;
      break;
    }
    case 8: {
      switch (N[3]) {
        // 8XY0 - set
        case 0: {
          console.log(hexStr, "8XY0 - set");
          V[N[1]] = V[N[2]];
          break;
        }
        // 8XY1 - binary or
        case 1: {
          console.log(hexStr, "8XY1 - binary or");
          V[N[1]] |= V[N[2]];
          break;
        }
        // 8XY2 - binary and
        case 2: {
          console.log(hexStr, "8XY2 - binary and");
          V[N[1]] &= V[N[2]];
          break;
        }
        // 8XY3 - logical xor
        case 3: {
          console.log(hexStr, "8XY3 - logical xor");
          V[N[1]] ^= V[N[2]];
          break;
        }
        // 8XY4 - add
        case 4: {
          console.log(hexStr, "8XY4 - add");
          V[N[1]] += V[N[2]];
          // carry flag
          V[0xf] = V[N[1]] > 255 ? 1 : 0;
          break;
        }
        // 8XY5 - subtract
        case 5: {
          // carry flag (before subtraction)
          V[0xf] = V[N[1]] > V[N[2]] ? 1 : 0;
          console.log(hexStr, "8XY5 - subtract");
          V[N[1]] = V[N[1]] - V[N[2]];
          break;
        }
        // 8XY7 - subtract
        case 7: {
          // carry flag (before subtraction)
          V[0xf] = V[N[2]] > V[N[1]] ? 1 : 0;
          console.log(hexStr, "8XY7 - subtract");
          V[N[1]] = V[N[2]] - V[N[1]];
          break;
        }
        // 8XY6 - shift
        case 6: {
          // TODO(@elvis): optional -> set VX = VY
          // carry flag (before shift)
          V[0xf] = (V[N[1]] & 0x01) > 0 ? 1 : 0;
          console.log(hexStr, "8XY6 - shift");
          V[N[1]] = V[N[1]] >> 1;
          break;
        }
        // 8XYE - shift
        case 14: {
          // TODO(@elvis): optional -> set VX = VY
          // carry flag (before shift)
          V[0xf] = (V[N[1]] & 0x8000) > 0 ? 1 : 0;
          console.log(hexStr, "8XYE - shift");
          V[N[1]] = V[N[1]] << 1;
          break;
        }

        default:
          throw new Error(`Unknown instruction #${hexStr}`);
      }
      break;
    }
    // ANNN - set index
    case 10: {
      const NNN = parseInt(hexStr, 16) & 0x0fff;
      console.log(hexStr, "ANNN - set index");
      I = NNN;
      break;
    }
    // BNNN - jump with offset
    case 11: {
      const NNN = parseInt(hexStr, 16) & 0x0fff;
      const offset = V[0];
      console.log(hexStr, "BNNN - jump with offset");
      PC = NNN + offset;
      break;
    }
    // CXNN - random
    case 12: {
      const NN = parseInt(hexStr, 16) & 0x00ff;
      const random = Math.floor(Math.random() * 255);
      console.log(hexStr, "CXNN - random");
      V[N[1]] = random & NN;
      break;
    }
    default:
      throw new Error(`Unknown instruction #${hexStr}`);
  }
}

async function fetchCode() {
  const fileName = "test_opcode.ch8";

  try {
    const response = await fetch(`/${fileName}`);
    if (!response.ok) {
      throw new Error(`Invalid response code: ${response.status}`);
    }

    const blob = await response.blob();

    const buffer: ArrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as ArrayBuffer);
      };
      reader.onerror = (e) => {
        reject(e);
      };
      reader.readAsArrayBuffer(blob);
    });

    return new Uint8Array(buffer);
  } catch (err) {
    console.log("fetchCode error:", err);
  }
}

export async function init() {
  const cardROM = (await fetchCode()) as Uint8Array;

  // copy card memory into RAM starting at address 0x200
  for (let i = 0; i < cardROM.length; i += 1) {
    RAM[0x200 + i] = cardROM[i];
  }

  for (let i = 0; i < 1000; i += 1) {
    const instr = fetchNextInstruction();
    executeInstruction(instr);
  }
}

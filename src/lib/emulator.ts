export class Emulator {
  // registries
  private V: number[] = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  private PC: number = 0;
  private I = 0;

  // times
  private delayTimer = 0;
  private soundTimer = 0;

  private callStack: number[] = [];
  private RAM: Uint8Array = new Uint8Array(4 * 1024);
  // display framebuffer
  private FB: number[] = [];

  public static readonly FBColSize = 32;
  public static readonly FBRowSize = 64;

  constructor(private onTick: Function, private onExit: Function) {
    // init display
    this._clearFrameBuffer();
  }

  public load(data: Uint8Array, offset: number = 0x200) {
    for (let i = 0; i < data.length; i += 1) {
      this.RAM[offset + i] = data[i];
    }
  }

  public run(offset: number = 0x200) {
    this.PC = offset;

    let last = this.PC;
    // main program loop
    const intervalID = setInterval(() => {
      this._exec(this._next());
      this.onTick(this.PC, this.FB);

      if (last === this.PC) {
        console.log("Infinite loop detected. Exiting...", last);
        clearInterval(intervalID);
        this.onExit();
      }

      last = this.PC;
    }, 80);
  }

  private _clearFrameBuffer() {
    for (var z = 0; z < Emulator.FBColSize * Emulator.FBRowSize; z++) {
      this.FB[z] = 0;
    }
  }

  private _next() {
    if (this.PC === this.RAM.length) {
      throw new Error("Emulator reached out of memory");
    }

    const H1 = this.RAM[this.PC];
    const H2 = this.RAM[this.PC + 1];

    this.PC += 2;

    return [(H1 & 0xf0) >> 4, H1 & 0x0f, (H2 & 0xf0) >> 4, H2 & 0x0f];
  }

  private _drawSprite(x: number, y: number, len: number) {
    this.V[0xf] = 0x0;

    // draw a Chip8 8xN sprite
    for (let a = 0; a < len; a++) {
      for (let b = 0; b < 8; b++) {
        const target =
          ((x + b) % Emulator.FBRowSize) +
          ((y + a) % Emulator.FBColSize) * Emulator.FBRowSize;
        const source = ((this.RAM[this.I + a] >> (7 - b)) & 0x1) != 0;

        if (!source) {
          continue;
        }

        if (this.FB[target]) {
          this.FB[target] = 0;
          this.V[0xf] = 0x1;
        } else {
          this.FB[target] = 1;
        }
      }
    }
  }

  private _exec(op: number[]) {
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
      this._clearFrameBuffer();
      return;
    }

    // 00EE - subroutine return
    if (hexStr === "00EE") {
      const top = this.callStack.pop() as number;
      this.PC = top;
      return;
    }

    switch (O) {
      // 1NNN - jump
      case 1: {
        this.PC = NNN;
        break;
      }
      // 2NNN - subroutine call
      case 2: {
        this.callStack.push(this.PC); // push return address
        this.PC = NNN;
        break;
      }
      // 3XNN - skip if equal
      case 3: {
        if (this.V[X] === NN) {
          this.PC += 2;
        }
        break;
      }
      // 4XNN - skip if not equal
      case 4: {
        if (this.V[X] !== NN) {
          this.PC += 2;
        }
        break;
      }
      // 5XY0 - skip if equal
      case 5: {
        if (this.V[X] === this.V[Y]) {
          this.PC += 2;
        }
        break;
      }
      // 9XY0 - skip if not equal
      case 9: {
        if (this.V[X] !== this.V[Y]) {
          this.PC += 2;
        }
        break;
      }
      // 6XNN - set
      case 6: {
        this.V[X] = NN;
        break;
      }
      // 7XNN - add
      case 7: {
        this.V[X] += NN;
        break;
      }
      case 8: {
        switch (N) {
          // 8XY0 - set
          case 0: {
            this.V[X] = this.V[Y];
            break;
          }
          // 8XY1 - binary or
          case 1: {
            this.V[X] |= this.V[Y];
            break;
          }
          // 8XY2 - binary and
          case 2: {
            this.V[X] &= this.V[Y];
            break;
          }
          // 8XY3 - logical xor
          case 3: {
            this.V[X] ^= this.V[Y];
            break;
          }
          // 8XY4 - add
          case 4: {
            this.V[X] += this.V[Y];
            // carry flag
            this.V[0xf] = this.V[X] > 255 ? 1 : 0;
            break;
          }
          // 8XY5 - subtract
          case 5: {
            // carry flag (before subtraction)
            this.V[0xf] = this.V[X] > this.V[Y] ? 1 : 0;
            this.V[X] = this.V[X] - this.V[Y];
            break;
          }
          // 8XY7 - subtract
          case 7: {
            // carry flag (before subtraction)
            this.V[0xf] = this.V[Y] > this.V[X] ? 1 : 0;
            this.V[X] = this.V[Y] - this.V[X];
            break;
          }
          // 8XY6 - shift
          case 6: {
            // TODO(@elvis): optional -> set VX = VY
            // carry flag (before shift)
            this.V[0xf] = (this.V[X] & 0x01) > 0 ? 1 : 0;
            this.V[X] = this.V[X] >> 1;
            break;
          }
          // 8XYE - shift
          case 0xe: {
            // TODO(@elvis): optional -> set VX = VY
            // carry flag (before shift)
            this.V[0xf] = (this.V[X] & 0x8000) > 0 ? 1 : 0;
            this.V[X] = this.V[X] << 1;
            break;
          }

          default:
            throw new Error(`Unknown instruction #${hexStr}`);
        }
        break;
      }
      // ANNN - set index
      case 0xa: {
        this.I = NNN;
        break;
      }
      // BNNN - jump with offset
      case 0xb: {
        const offset = this.V[0];
        this.PC = NNN + offset;
        break;
      }
      // CXNN - random
      case 0xc: {
        const random = Math.floor(Math.random() * 255);
        this.V[X] = random & NN;
        break;
      }
      // DXYN - display
      case 0xd: {
        this._drawSprite(this.V[X], this.V[Y], N);
        break;
      }
      case 0xf: {
        switch (NN) {
          // FX33 - store
          case 0x33: {
            this.RAM[this.I] = Math.floor(this.V[X] / 100) % 10;
            this.RAM[this.I + 1] = Math.floor(this.V[X] / 10) % 10;
            this.RAM[this.I + 2] = this.V[X] % 10;
            break;
          }
          // FX55 - store
          case 0x55: {
            for (let i = 0; i <= X; i++) {
              this.RAM[this.I + i] = this.V[i];
            }
            break;
          }
          // FX65 - load
          case 0x65: {
            for (let i = 0; i <= X; i++) {
              this.V[i] = this.RAM[this.I + i];
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
}

import EventEmitter from "./events";

// octo font
const octo = [
  0xf0,
  0x90,
  0x90,
  0x90,
  0xf0, // 0
  0x20,
  0x60,
  0x20,
  0x20,
  0x70, // 1
  0xf0,
  0x10,
  0xf0,
  0x80,
  0xf0, // 2
  0xf0,
  0x10,
  0xf0,
  0x10,
  0xf0, // 3
  0x90,
  0x90,
  0xf0,
  0x10,
  0x10, // 4
  0xf0,
  0x80,
  0xf0,
  0x10,
  0xf0, // 5
  0xf0,
  0x80,
  0xf0,
  0x90,
  0xf0, // 6
  0xf0,
  0x10,
  0x20,
  0x40,
  0x40, // 7
  0xf0,
  0x90,
  0xf0,
  0x90,
  0xf0, // 8
  0xf0,
  0x90,
  0xf0,
  0x10,
  0xf0, // 9
  0xf0,
  0x90,
  0xf0,
  0x90,
  0x90, // A
  0xe0,
  0x90,
  0xe0,
  0x90,
  0xe0, // B
  0xf0,
  0x80,
  0x80,
  0x80,
  0xf0, // C
  0xe0,
  0x90,
  0x90,
  0x90,
  0xe0, // D
  0xf0,
  0x80,
  0xf0,
  0x80,
  0xf0, // E
  0xf0,
  0x80,
  0xf0,
  0x80,
  0x80, // F
];

export default class Emulator extends EventEmitter {
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
  private hires = false;

  private loopId: any = null;
  // for loop detection
  private lastPC: number = 0;
  // execution history
  private history: any[] = [];

  public paused: boolean = false;

  constructor(private offset = 0x200) {
    super();

    // init font (@elvis: maybe should be done on every load)
    for (let z = 0; z < octo.length; z++) {
      this.RAM[z] = octo[z];
    }
  }

  get state() {
    return {
      v: [...this.V],
      i: this.I,
      pc: this.PC - this.offset,
      fb: [...this.FB],
    };
  }

  get FBColSize() {
    return this.hires ? 64 : 32;
  }

  get FBRowSize() {
    return this.hires ? 128 : 64;
  }

  public getOpInfo(op: string) {
    const NNN = parseInt(op, 16) & 0x0fff;
    const NN = parseInt(op, 16) & 0x00ff;
    const [O, X, Y, N] = op.split("").map((d) => parseInt(d, 16));

    const simpleOps: any = {
      "0000": [
        "0000",
        "noop",
        () => {
          /* noop*/
        },
      ],
      "00E0": ["00E0", "clear screen", () => this._clear()],
      "00EE": [
        "00EE",
        "subroutine return",
        () => {
          const top = this.callStack.pop() as number;
          this.PC = top;
        },
      ],
      "00FF": [
        "00FF",
        "high resolution",
        () => {
          this.hires = true;
          this._clear();
        },
      ],
    };

    if (Object.keys(simpleOps).includes(op)) {
      return simpleOps[op];
    }

    switch (O) {
      case 1:
        return ["1NNN", "jump", () => (this.PC = NNN)];
      case 2:
        return [
          "2NNN",
          "subroutine call",
          () => {
            this.callStack.push(this.PC); // push return address
            this.PC = NNN;
          },
        ];
      case 3:
        return [
          "3XNN",
          "skip if equal",
          () => {
            if (this.V[X] === NN) {
              this.PC += 2;
            }
          },
        ];
      case 4:
        return [
          "4XNN",
          "skip if not equal",
          () => {
            if (this.V[X] !== NN) {
              this.PC += 2;
            }
          },
        ];
      case 5:
        return [
          "5XY0",
          "skip if equal",
          () => {
            if (this.V[X] === this.V[Y]) {
              this.PC += 2;
            }
          },
        ];
      case 9:
        return [
          "9XY0",
          "skip if not equal",
          () => {
            if (this.V[X] !== this.V[Y]) {
              this.PC += 2;
            }
          },
        ];
      case 6:
        return ["6XNN", "set", () => (this.V[X] = NN)];
      case 7:
        return ["7XNN", "add", () => (this.V[X] = (this.V[X] + NN) & 0xff)];
      case 8: {
        switch (N) {
          case 0:
            return ["8XY0", "set", () => (this.V[X] = this.V[Y])];
          case 1:
            return ["8XY1", "binary or", () => (this.V[X] |= this.V[Y])];
          case 2:
            return ["8XY2", "binary and", () => (this.V[X] &= this.V[Y])];
          case 3:
            return ["8XY3", "logical xor", () => (this.V[X] ^= this.V[Y])];
          case 4:
            return [
              "8XY4",
              "add",
              () => {
                const t = this.V[X] + this.V[Y];
                this.V[X] = t & 0xff;
                this.V[0xf] = t > 0xff ? 1 : 0;
              },
            ];
          case 5:
            return [
              "8XY5",
              "subtract",
              () => {
                const t = this.V[X] - this.V[Y];
                this.V[X] = t & 0xff;
                this.V[0xf] = this.V[X] >= this.V[Y] ? 1 : 0;
              },
            ];
          case 7:
            return [
              "8XY7",
              "subtract",
              () => {
                const t = this.V[Y] - this.V[X];
                this.V[X] = t & 0xff;
                this.V[0xf] = this.V[Y] >= this.V[X] ? 1 : 0;
              },
            ];
          case 6:
            return [
              "8XY6",
              "shift",
              () => {
                const t = this.V[X] >> 1;
                this.V[X] = t & 0xff;
                this.V[0xf] = this.V[X] & 0x1 ? 1 : 0;
              },
            ];
          case 0xe:
            return [
              "8XYE",
              "shift",
              () => {
                const t = this.V[X] << 1;
                this.V[X] = t & 0xff;
                this.V[0xf] = (this.V[X] >> 7) & 0x1 ? 1 : 0;
              },
            ];
        }
        break;
      }
      case 0xa:
        return ["ANNN", "set index", () => (this.I = NNN)];
      case 0xb:
        return [
          "BNNN",
          "jump with offset",
          () => {
            const offset = this.V[0];
            this.PC = NNN + offset;
          },
        ];
      case 0xc:
        return [
          "CXNN",
          "random",
          () => {
            this.V[X] = (Math.random() * 256) & NN;
          },
        ];
      case 0xd:
        return ["DXYN", "display", () => this._draw(this.V[X], this.V[Y], N)];
      case 0xf: {
        switch (NN) {
          case 0x0a:
            return [
              "FX0A",
              "get key",
              async () => {
                const key = await new Promise<number>((resolve) =>
                  this.emit("pendingInput", resolve)
                );

                this.V[X] = key & 0xff;
              },
            ];
          case 0x1e:
            return [
              "FX1E",
              "add to index",
              () => {
                this.I = (this.I + this.V[X]) & 0xffff;
              },
            ];
          case 0x29:
            return [
              "FX29",
              "font character",
              () => {
                this.I = (this.V[X] & 0xf) * 5;
              },
            ];
          case 0x33:
            return [
              "FX33",
              "store",
              () => {
                this.RAM[this.I] = Math.floor(this.V[X] / 100) % 10;
                this.RAM[this.I + 1] = Math.floor(this.V[X] / 10) % 10;
                this.RAM[this.I + 2] = this.V[X] % 10;
              },
            ];
          case 0x55:
            return [
              "FX55",
              "store",
              () => {
                for (let i = 0; i <= X; i++) {
                  this.RAM[this.I + i] = this.V[i];
                }
              },
            ];
          case 0x65:
            return [
              "FX65",
              "load",
              () => {
                for (let i = 0; i <= X; i++) {
                  this.V[i] = this.RAM[this.I + i];
                }
              },
            ];
        }
        break;
      }
    }

    throw new Error(`Unknown instruction #${op}`);
  }

  public forceTick() {
    const op = this._getOp();
    this.emit("tick", this.history.length, op);
  }

  public load(data: Uint8Array) {
    this.lastPC = this.PC = this.offset;
    this.history = [];
    this.hires = false;

    // init display
    this._clear();

    for (let i = 0; i < data.length; i += 1) {
      this.RAM[this.offset + i] = data[i];
    }
  }

  public async run(_: number = 25) {
    this.loopId && clearTimeout(this.loopId);
    // main program loop
    !this.paused && (await this.next());
    this.loopId = setTimeout(() => this.run(), 0);
  }

  public async next() {
    try {
      await this._exec(this._fetch());
    } catch (err) {
      this.paused = true;
      throw err;
    }

    // pause on infinite loop
    if (this.lastPC === this.PC) {
      this.paused = true;
    }

    this.lastPC = this.PC;
  }

  public prev() {
    // go back 2 instr and execute it so all events are fired
    // or execute first instruction if only one present
    this.history.length && this._setState(this.history.pop());
    this.history.length && this._setState(this.history.pop());
    this.next();
  }

  private _setState({ v, i, pc, fb }: any) {
    this.V = v;
    this.I = i;
    this.PC = pc + this.offset;
    this.FB = fb;
  }

  private _clear() {
    for (var z = 0; z < this.FBColSize * this.FBRowSize; z++) {
      this.FB[z] = 0;
    }
  }

  private _draw(x: number, y: number, len: number) {
    this.V[0xf] = 0x0;

    // draw a Chip8 8xN sprite
    for (let a = 0; a < len; a++) {
      for (let b = 0; b < 8; b++) {
        const target =
          ((x + b) % this.FBRowSize) +
          ((y + a) % this.FBColSize) * this.FBRowSize;
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

  private _getOp() {
    const H1 = this.RAM[this.PC];
    const H2 = this.RAM[this.PC + 1];
    return [(H1 & 0xf0) >> 4, H1 & 0x0f, (H2 & 0xf0) >> 4, H2 & 0x0f]
      .reduce((n, d) => n + d.toString(16), "")
      .toUpperCase();
  }

  private _fetch() {
    if (this.PC > this.RAM.length) {
      throw new Error("Emulator reached out of memory.");
    }

    const op = this._getOp();

    this.emit("tick", this.history.length, op);

    this.history.push(this.state);
    this.PC += 2;

    return op;
  }

  private async _exec(op: string) {
    const instr = this.getOpInfo(op)[2];

    if (!instr) {
      throw new Error(`No handle found for instruction ${op}`);
    }

    await instr();
  }
}

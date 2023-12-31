import EventEmitter from "./events";

// octo font
const font = [
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

type ECU = {
  // standard registries
  v: number[];
  pc: number;
  i: number;

  // delay timer
  dt: number;
  // sound timer
  st: number;

  // return stack
  r: number[];

  // flags copy
  f: number[];
};

export default class Emulator extends EventEmitter {
  // Emulator Control Unit
  private ecu!: ECU;
  private ram: Uint8Array = new Uint8Array(4 * 1024);
  private framebuffer: number[] = [];
  private hires = false; // high resolution

  // for loop detection
  private lastPC: number = 0;

  private history: any[] = [];
  public paused: boolean = false;
  private loopId: any = null;
  private currentOp!: string;

  constructor(private offset = 0x200) {
    super();
    this.init();
  }

  get FBColSize() {
    return this.hires ? 64 : 32;
  }

  get FBRowSize() {
    return this.hires ? 128 : 64;
  }

  get state() {
    // make copy for arrays
    return {
      ecu: {
        ...this.ecu,
        v: [...this.ecu.v],
        r: [...this.ecu.r],
        f: [this.ecu.f],
      },
      framebuffer: [...this.framebuffer],
      hires: this.hires,
    };
  }

  get tick() {
    return this.history.length;
  }

  public forceTick() {
    this.emit("tick");
  }

  public getCurrentOpInfo() {
    const [opCode, opName] = this.getOpMeta(this.currentOp);
    return [opCode, opName, this.currentOp];
  }

  public load(data: Uint8Array) {
    this.init();

    // load data into ram at offset
    for (let i = 0; i < data.length; i += 1) {
      this.ram[this.offset + i] = data[i];
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
      this.fetch();
      await this.exec();
    } catch (err) {
      this.paused = true;
      throw err;
    }

    // pause on infinite loop
    if (this.lastPC === this.ecu.pc) {
      this.paused = true;
    }

    this.lastPC = this.ecu.pc;
  }

  public prev() {
    // go back 2 instr and execute it so all events are fired
    // or execute first instruction if only one present
    this.history.length && this.setState(this.history.pop());
    this.history.length && this.setState(this.history.pop());
    this.next();
  }

  /* Private Methods */

  private clearFramebuffer() {
    for (var z = 0; z < this.FBColSize * this.FBRowSize; z++) {
      this.framebuffer[z] = 0;
    }
  }

  private draw(x: number, y: number, len: number) {
    this.ecu.v[0xf] = 0x0;

    // draw a Chip8 8xN sprite
    for (let a = 0; a < len; a++) {
      for (let b = 0; b < 8; b++) {
        const target =
          ((x + b) % this.FBRowSize) +
          ((y + a) % this.FBColSize) * this.FBRowSize;
        const source = ((this.ram[this.ecu.i + a] >> (7 - b)) & 0x1) != 0;

        if (!source) {
          continue;
        }

        if (this.framebuffer[target]) {
          this.framebuffer[target] = 0;
          this.ecu.v[0xf] = 0x1;
        } else {
          this.framebuffer[target] = 1;
        }
      }
    }
  }

  private async exec() {
    const [, , handler] = this.getOpMeta(this.currentOp);

    if (!handler) {
      throw new Error(`No handler found for instruction ${this.currentOp}`);
    }

    await handler();
  }

  private fetch() {
    this.currentOp = this.getCurrentOp();

    // emit before updating history to make sure `tick` getter
    // has correct value
    this.emit("tick");
    this.history.push(this.state);

    // increment already
    this.ecu.pc += 2;
  }

  private getCurrentOp() {
    if (this.ecu.pc > this.ram.length) {
      throw new Error(`Attempt to read outside RAM bounds.`);
    }

    const H1 = this.ram[this.ecu.pc];
    const H2 = this.ram[this.ecu.pc + 1];
    return [(H1 & 0xf0) >> 4, H1 & 0x0f, (H2 & 0xf0) >> 4, H2 & 0x0f]
      .reduce((n, d) => n + d.toString(16), "")
      .toUpperCase();
  }

  private getOpMeta(op: string) {
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
      "00E0": ["00E0", "clear screen", () => this.clearFramebuffer()],
      "00EE": [
        "00EE",
        "subroutine return",
        () => {
          // pop address from return stack
          const addr = this.ecu.r.pop() as number;
          this.ecu.pc = addr;
        },
      ],
      "00FF": [
        "00FF",
        "high resolution",
        () => {
          this.hires = true;
          this.clearFramebuffer();
        },
      ],
    };

    if (Object.keys(simpleOps).includes(op)) {
      return simpleOps[op];
    }

    switch (O) {
      case 1:
        return ["1NNN", "jump", () => (this.ecu.pc = NNN)];
      case 2:
        return [
          "2NNN",
          "subroutine call",
          () => {
            // push return address to return stack
            this.ecu.r.push(this.ecu.pc);
            this.ecu.pc = NNN;
          },
        ];
      case 3:
        return [
          "3XNN",
          "skip if equal",
          () => {
            if (this.ecu.v[X] === NN) {
              this.ecu.pc += 2;
            }
          },
        ];
      case 4:
        return [
          "4XNN",
          "skip if not equal",
          () => {
            if (this.ecu.v[X] !== NN) {
              this.ecu.pc += 2;
            }
          },
        ];
      case 5:
        return [
          "5XY0",
          "skip if equal",
          () => {
            if (this.ecu.v[X] === this.ecu.v[Y]) {
              this.ecu.pc += 2;
            }
          },
        ];
      case 9:
        return [
          "9XY0",
          "skip if not equal",
          () => {
            if (this.ecu.v[X] !== this.ecu.v[Y]) {
              this.ecu.pc += 2;
            }
          },
        ];
      case 6:
        return ["6XNN", "set", () => (this.ecu.v[X] = NN)];
      case 7:
        return [
          "7XNN",
          "add",
          () => (this.ecu.v[X] = (this.ecu.v[X] + NN) & 0xff),
        ];
      case 8: {
        switch (N) {
          case 0:
            return ["8XY0", "set", () => (this.ecu.v[X] = this.ecu.v[Y])];
          case 1:
            return [
              "8XY1",
              "binary or",
              () => (this.ecu.v[X] |= this.ecu.v[Y]),
            ];
          case 2:
            return [
              "8XY2",
              "binary and",
              () => (this.ecu.v[X] &= this.ecu.v[Y]),
            ];
          case 3:
            return [
              "8XY3",
              "logical xor",
              () => (this.ecu.v[X] ^= this.ecu.v[Y]),
            ];
          case 4:
            return [
              "8XY4",
              "add",
              () => {
                const t = this.ecu.v[X] + this.ecu.v[Y];
                this.ecu.v[X] = t & 0xff;
                this.ecu.v[0xf] = t > 0xff ? 1 : 0;
              },
            ];
          case 5:
            return [
              "8XY5",
              "subtract",
              () => {
                const t = this.ecu.v[X] - this.ecu.v[Y];
                this.ecu.v[X] = t & 0xff;
                this.ecu.v[0xf] = this.ecu.v[X] >= this.ecu.v[Y] ? 1 : 0;
              },
            ];
          case 7:
            return [
              "8XY7",
              "subtract",
              () => {
                const t = this.ecu.v[Y] - this.ecu.v[X];
                this.ecu.v[X] = t & 0xff;
                this.ecu.v[0xf] = this.ecu.v[Y] >= this.ecu.v[X] ? 1 : 0;
              },
            ];
          case 6:
            return [
              "8XY6",
              "shift",
              () => {
                const t = this.ecu.v[X] >> 1;
                this.ecu.v[X] = t & 0xff;
                this.ecu.v[0xf] = this.ecu.v[X] & 0x1 ? 1 : 0;
              },
            ];
          case 0xe:
            return [
              "8XYE",
              "shift",
              () => {
                const t = this.ecu.v[X] << 1;
                this.ecu.v[X] = t & 0xff;
                this.ecu.v[0xf] = (this.ecu.v[X] >> 7) & 0x1 ? 1 : 0;
              },
            ];
        }
        break;
      }
      case 0xa:
        return ["ANNN", "set index", () => (this.ecu.i = NNN)];
      case 0xb:
        return [
          "BNNN",
          "jump with offset",
          () => {
            const offset = this.ecu.v[0];
            this.ecu.pc = NNN + offset;
          },
        ];
      case 0xc:
        return [
          "CXNN",
          "random",
          () => {
            this.ecu.v[X] = (Math.random() * 256) & NN;
          },
        ];
      case 0xd:
        return [
          "DXYN",
          "display",
          () => this.draw(this.ecu.v[X], this.ecu.v[Y], N),
        ];
      case 0xf: {
        switch (NN) {
          // timers
          case 0x07:
            return [
              "0x07",
              "load delay timer",
              () => {
                // TODO(@elvis): properly implement timers, decrementing does the job for now
                this.ecu.v[X] = --this.ecu.dt;
              },
            ];
          case 0x15:
            return [
              "0x15",
              "set delay timer",
              () => {
                this.ecu.dt = this.ecu.v[X];
              },
            ];
          case 0x18:
            return [
              "0x18",
              "set sound timer",
              () => {
                this.ecu.st = this.ecu.v[X];
              },
            ];
          // rest
          case 0x0a:
            return [
              "FX0A",
              "get key",
              async () => {
                const key = await new Promise<number>((resolve) =>
                  this.emit("pendingInput", resolve)
                );

                this.ecu.v[X] = key & 0xff;
              },
            ];
          case 0x1e:
            return [
              "FX1E",
              "add to index",
              () => {
                this.ecu.i = (this.ecu.i + this.ecu.v[X]) & 0xffff;
              },
            ];
          case 0x29:
            return [
              "FX29",
              "font character",
              () => {
                this.ecu.i = (this.ecu.v[X] & 0xf) * 5;
              },
            ];
          case 0x33:
            return [
              "FX33",
              "store",
              () => {
                this.ram[this.ecu.i] = Math.floor(this.ecu.v[X] / 100) % 10;
                this.ram[this.ecu.i + 1] = Math.floor(this.ecu.v[X] / 10) % 10;
                this.ram[this.ecu.i + 2] = this.ecu.v[X] % 10;
              },
            ];
          case 0x55:
            return [
              "FX55",
              "store",
              () => {
                for (let i = 0; i <= X; i++) {
                  this.ram[this.ecu.i + i] = this.ecu.v[i];
                }
              },
            ];
          case 0x65:
            return [
              "FX65",
              "load",
              () => {
                for (let i = 0; i <= X; i++) {
                  this.ecu.v[i] = this.ram[this.ecu.i + i];
                }
              },
            ];
          case 0x75:
            return [
              "FX75",
              "push",
              () => {
                for (var z = 0; z <= X; z++) {
                  this.ecu.f[z] = this.ecu.v[z];
                }
              },
            ];
          case 0x85:
            return [
              "FX85",
              "pop",
              () => {
                for (var z = 0; z <= X; z++) {
                  this.ecu.v[z] = 0xff & this.ecu.f[z];
                }
              },
            ];
        }
        break;
      }
    }

    throw new Error(`Unknown instruction #${op}`);
  }

  private init() {
    // init ECU
    this.ecu = {
      v: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      pc: 0,
      i: 0,
      dt: 0,
      st: 0,
      r: [],
      f: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    };
    this.ecu.pc = this.lastPC = this.offset;
    // init ram
    this.ram = new Uint8Array(4 * 1024);
    // init display
    this.clearFramebuffer();
    this.hires = false;
    // init font
    for (let z = 0; z < font.length; z++) {
      this.ram[z] = font[z];
    }
    // reset history
    this.history = [];
  }

  private setState({ ecu, framebuffer, hires }: any) {
    this.ecu = ecu;
    this.framebuffer = framebuffer;
    this.hires = hires;
  }
}

// font
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

type RomDisk = {
  name: string;
  data: Uint8Array;
};

export default class Emulator {
  private ecu!: ECU; // Emulator Control Unit state
  private ram: Uint8Array = new Uint8Array(4 * 1024);
  private fb: number[] = [];
  private hires = false; // high resolution

  // input handling
  private waitingInput = false;
  private waitReg = -1;

  private _romDisk!: RomDisk;

  constructor(private _offset = 0x200) {
    this.reset();
  }

  get framebuffer() {
    return this.fb;
  }

  get framebufferHeight() {
    return this.hires ? 64 : 32;
  }

  get framebufferWidth() {
    return this.hires ? 128 : 64;
  }

  get offset() {
    return this._offset;
  }

  get romDisk() {
    return this._romDisk;
  }

  public load(romDisk: RomDisk) {
    this._romDisk = romDisk;
    this.reset();

    // load data into ram at offset
    for (let i = 0; i < romDisk.data.length; i += 1) {
      this.ram[this._offset + i] = romDisk.data[i];
    }
  }

  public tick() {
    if (this.waitingInput) {
      return;
    }

    const op = this.fetchOp(this.ecu.pc);
    // increment already
    this.ecu.pc += 2;

    const handler = this.getOpHandler(op);
    handler();
  }

  public setInput(key: number) {
    if (this.waitingInput) {
      this.ecu.v[this.waitReg] = key & 0xff;
      this.waitingInput = false;
    }
  }

  /* Private Methods */

  private clearFramebuffer() {
    for (var z = 0; z < this.framebufferHeight * this.framebufferWidth; z++) {
      this.fb[z] = 0;
    }
  }

  private draw(x: number, y: number, len: number) {
    this.ecu.v[0xf] = 0x0;

    // draw a Chip8 8xN sprite
    for (let a = 0; a < len; a++) {
      for (let b = 0; b < 8; b++) {
        const target =
          ((x + b) % this.framebufferWidth) +
          ((y + a) % this.framebufferHeight) * this.framebufferWidth;
        const source = ((this.ram[this.ecu.i + a] >> (7 - b)) & 0x1) != 0;

        if (!source) {
          continue;
        }

        if (this.fb[target]) {
          this.fb[target] = 0;
          this.ecu.v[0xf] = 0x1;
        } else {
          this.fb[target] = 1;
        }
      }
    }
  }

  private fetchOp(pc: number) {
    if (pc > this.ram.length) {
      throw new Error(`Attempt to read outside RAM bounds.`);
    }

    const H1 = this.ram[pc];
    const H2 = this.ram[pc + 1];
    return [(H1 & 0xf0) >> 4, H1 & 0x0f, (H2 & 0xf0) >> 4, H2 & 0x0f]
      .reduce((n, d) => n + d.toString(16), "")
      .toUpperCase();
  }

  private getOpHandler(op: string) {
    const nnn = parseInt(op, 16) & 0x0fff;
    const nn = parseInt(op, 16) & 0x00ff;
    const [o, x, y, n] = op.split("").map((d) => parseInt(d, 16));

    const simpleOps: any = {
      "0000": () => {
        /* noop*/
      },

      "00E0": () => this.clearFramebuffer(),
      "00EE": () => {
        // pop address from return stack
        const addr = this.ecu.r.pop() as number;
        this.ecu.pc = addr;
      },
      "00FF": () => {
        this.hires = true;
        this.clearFramebuffer();
      },
    };

    if (Object.keys(simpleOps).includes(op)) {
      return simpleOps[op];
    }

    switch (o) {
      case 1:
        return () => (this.ecu.pc = nnn);
      case 2:
        return () => {
          // push return address to return stack
          this.ecu.r.push(this.ecu.pc);
          this.ecu.pc = nnn;
        };
      case 3:
        return () => {
          if (this.ecu.v[x] === nn) {
            this.ecu.pc += 2;
          }
        };
      case 4:
        return () => {
          if (this.ecu.v[x] !== nn) {
            this.ecu.pc += 2;
          }
        };
      case 5:
        return () => {
          if (this.ecu.v[x] === this.ecu.v[y]) {
            this.ecu.pc += 2;
          }
        };
      case 9:
        return () => {
          if (this.ecu.v[x] !== this.ecu.v[y]) {
            this.ecu.pc += 2;
          }
        };
      case 6:
        return () => (this.ecu.v[x] = nn);
      case 7:
        return () => (this.ecu.v[x] = (this.ecu.v[x] + nn) & 0xff);
      case 8: {
        switch (n) {
          case 0:
            return () => (this.ecu.v[x] = this.ecu.v[y]);
          case 1:
            return () => (this.ecu.v[x] |= this.ecu.v[y]);
          case 2:
            return () => (this.ecu.v[x] &= this.ecu.v[y]);
          case 3:
            return () => (this.ecu.v[x] ^= this.ecu.v[y]);
          case 4:
            return () => {
              const t = this.ecu.v[x] + this.ecu.v[y];
              this.ecu.v[x] = t & 0xff;
              this.ecu.v[0xf] = t > 0xff ? 1 : 0;
            };
          case 5:
            return () => {
              const t = this.ecu.v[x] - this.ecu.v[y];
              this.ecu.v[x] = t & 0xff;
              this.ecu.v[0xf] = this.ecu.v[x] >= this.ecu.v[y] ? 1 : 0;
            };
          case 7:
            return () => {
              const t = this.ecu.v[y] - this.ecu.v[x];
              this.ecu.v[x] = t & 0xff;
              this.ecu.v[0xf] = this.ecu.v[y] >= this.ecu.v[x] ? 1 : 0;
            };
          case 6:
            return () => {
              const t = this.ecu.v[x] >> 1;
              this.ecu.v[x] = t & 0xff;
              this.ecu.v[0xf] = this.ecu.v[x] & 0x1 ? 1 : 0;
            };
          case 0xe:
            return () => {
              const t = this.ecu.v[x] << 1;
              this.ecu.v[x] = t & 0xff;
              this.ecu.v[0xf] = (this.ecu.v[x] >> 7) & 0x1 ? 1 : 0;
            };
        }
        break;
      }
      case 0xa:
        return () => (this.ecu.i = nnn);
      case 0xb:
        return () => {
          this.ecu.pc = nnn + this.ecu.v[0];
        };
      case 0xc:
        return () => {
          this.ecu.v[x] = (Math.random() * 256) & nn;
        };
      case 0xd:
        return () => this.draw(this.ecu.v[x], this.ecu.v[y], n);
      case 0xf: {
        switch (nn) {
          // timers
          case 0x07:
            return () => {
              // TODO(@elvis): properly implement timers, decrementing does the job for now
              this.ecu.v[x] = --this.ecu.dt;
            };

          case 0x15:
            return () => {
              this.ecu.dt = this.ecu.v[x];
            };
          case 0x18:
            return () => {
              this.ecu.st = this.ecu.v[x];
            };
          case 0x0a:
            return () => {
              this.waitReg = x;
              this.waitingInput = true;
            };
          case 0x1e:
            return () => {
              this.ecu.i = (this.ecu.i + this.ecu.v[x]) & 0xffff;
            };
          case 0x29:
            return () => {
              this.ecu.i = (this.ecu.v[x] & 0xf) * 5;
            };
          case 0x33:
            return () => {
              this.ram[this.ecu.i] = Math.floor(this.ecu.v[x] / 100) % 10;
              this.ram[this.ecu.i + 1] = Math.floor(this.ecu.v[x] / 10) % 10;
              this.ram[this.ecu.i + 2] = this.ecu.v[x] % 10;
            };
          case 0x55:
            return () => {
              for (let z = 0; z <= x; z++) {
                this.ram[this.ecu.i + z] = this.ecu.v[z];
              }
              this.ecu.i = (this.ecu.i + x + 1) & 0xffff;
            };

          case 0x65:
            return () => {
              for (let z = 0; z <= x; z++) {
                this.ecu.v[z] = this.ram[this.ecu.i + z];
              }
              this.ecu.i = (this.ecu.i + x + 1) & 0xffff;
            };
          case 0x75:
            return () => {
              for (var z = 0; z <= x; z++) {
                this.ecu.f[z] = this.ecu.v[z];
              }
            };
          case 0x85:
            return () => {
              for (var z = 0; z <= x; z++) {
                this.ecu.v[z] = 0xff & this.ecu.f[z];
              }
            };
        }
        break;
      }
    }

    throw new Error(`Unknown instruction #${op}`);
  }

  private reset() {
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
    this.ecu.pc = this._offset;
    // init ram
    this.ram = new Uint8Array(4 * 1024);
    // init display
    this.clearFramebuffer();
    this.hires = false;
    // init font
    for (let z = 0; z < font.length; z++) {
      this.ram[z] = font[z];
    }

    this.waitingInput = false;
  }
}

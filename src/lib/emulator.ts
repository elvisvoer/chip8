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

type CPU = {
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

export default class Emulator {
  private cpu!: CPU; // Emulator Control Unit state
  private ram!: Uint8Array;
  private fb!: Uint8Array;
  private hires = false; // high resolution

  // input handling
  private waitingInput = false;
  private waitReg = -1;

  private ready = false;

  // actively pressed key(s)
  private k = new Set();

  constructor(private memSize: number = 4 * 1024) {
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

  public load(data: Uint8Array, offset: number = 0x200) {
    this.ready = false;
    this.reset();

    if (data.length + offset > this.ram.length) {
      throw new Error("Failed to load - ROM too large.");
    }

    // load data into ram at offset
    for (let i = 0; i < data.length; i += 1) {
      this.ram[offset + i] = data[i];
    }

    this.cpu.pc = offset;
    this.ready = true;
  }

  public tick() {
    if (!this.ready || this.waitingInput) {
      return;
    }

    if (this.cpu.pc > this.ram.length) {
      throw new Error(`Attempt to read outside RAM bounds.`);
    }

    const op = (this.ram[this.cpu.pc] << 8) | this.ram[this.cpu.pc + 1];
    // increment PC before we execute the op
    this.cpu.pc += 2;
    this.executeOp(op);
  }

  public updateTimers() {
    this.cpu.dt > 0 && this.cpu.dt--;
    this.cpu.st > 0 && this.cpu.st--;
  }

  public onKeyDown(key: number) {
    this.k.add(key);

    if (this.waitingInput) {
      this.cpu.v[this.waitReg] = key & 0xff;
      this.waitingInput = false;
    }
  }

  public onKeyUp(key: number) {
    this.k.delete(key);
  }

  /* Private Methods */

  private clearFramebuffer() {
    this.fb = new Uint8Array(this.framebufferHeight * this.framebufferWidth);
  }

  private draw(x: number, y: number, len: number) {
    this.cpu.v[0xf] = 0x0;

    // draw a Chip8 8xN sprite
    for (let a = 0; a < len; a++) {
      for (let b = 0; b < 8; b++) {
        const target =
          ((x + b) % this.framebufferWidth) +
          ((y + a) % this.framebufferHeight) * this.framebufferWidth;
        const source = ((this.ram[this.cpu.i + a] >> (7 - b)) & 0x1) != 0;

        if (!source) {
          continue;
        }

        if (this.fb[target]) {
          this.fb[target] = 0;
          this.cpu.v[0xf] = 0x1;
        } else {
          this.fb[target] = 1;
        }
      }
    }
  }

  private executeOp(op: number) {
    const o = (op >> 12) & 0x000f;
    const x = (op >> 8) & 0x000f;
    const y = (op >> 4) & 0x000f;
    const nnn = op & 0x0fff;
    const nn = op & 0x00ff;
    const n = op & 0x000f;

    const simpleOps: any = {
      0x0000: () => {
        /* noop*/
      },

      0x00e0: () => this.clearFramebuffer(),
      0x00ee: () => {
        // pop address from return stack
        const addr = this.cpu.r.pop() as number;
        this.cpu.pc = addr;
      },
      0x00ff: () => {
        this.hires = true;
        this.clearFramebuffer();
      },
    };

    if (simpleOps[op]) {
      simpleOps[op]();
      return;
    }

    switch (o) {
      case 0x1:
        this.cpu.pc = nnn;
        break;
      case 0x2:
        // push return address to return stack
        this.cpu.r.push(this.cpu.pc);
        this.cpu.pc = nnn;
        break;
      case 0x3:
        if (this.cpu.v[x] === nn) {
          this.cpu.pc += 2;
        }
        break;
      case 0x4:
        if (this.cpu.v[x] !== nn) {
          this.cpu.pc += 2;
        }
        break;
      case 0x5:
        if (this.cpu.v[x] === this.cpu.v[y]) {
          this.cpu.pc += 2;
        }
        break;
      case 0x9:
        if (this.cpu.v[x] !== this.cpu.v[y]) {
          this.cpu.pc += 2;
        }
        break;
      case 0x6:
        this.cpu.v[x] = nn;
        break;
      case 0x7:
        this.cpu.v[x] = (this.cpu.v[x] + nn) & 0xff;
        break;
      case 0x8: {
        switch (n) {
          case 0x0:
            this.cpu.v[x] = this.cpu.v[y];
            break;
          case 0x1:
            this.cpu.v[x] |= this.cpu.v[y];
            break;
          case 0x2:
            this.cpu.v[x] &= this.cpu.v[y];
            break;
          case 0x3:
            this.cpu.v[x] ^= this.cpu.v[y];
            break;
          case 0x4: {
            const t = this.cpu.v[x] + this.cpu.v[y];
            this.cpu.v[x] = t & 0xff;
            this.cpu.v[0xf] = t > 0xff ? 1 : 0;
            break;
          }
          case 0x5: {
            const t = this.cpu.v[x] - this.cpu.v[y];
            const c = this.cpu.v[x] >= this.cpu.v[y];
            this.cpu.v[x] = t & 0xff;
            this.cpu.v[0xf] = c ? 1 : 0;
            break;
          }
          case 0x7: {
            const t = this.cpu.v[y] - this.cpu.v[x];
            const c = this.cpu.v[y] >= this.cpu.v[x];
            this.cpu.v[x] = t & 0xff;
            this.cpu.v[0xf] = c ? 1 : 0;
            break;
          }
          case 0x6: {
            const t = this.cpu.v[y] >> 1;
            const c = this.cpu.v[y] & 0x1;
            this.cpu.v[x] = t & 0xff;
            this.cpu.v[0xf] = c ? 1 : 0;
            break;
          }
          case 0xe: {
            const t = this.cpu.v[y] << 1;
            const c = (this.cpu.v[y] >> 7) & 0x1;
            this.cpu.v[x] = t & 0xff;
            this.cpu.v[0xf] = c ? 1 : 0;
            break;
          }
          default:
            throw new Error(
              `Unknown instruction 0x${op.toString(16).padStart(4, "0")}`
            );
        }
        break;
      }
      case 0xa:
        this.cpu.i = nnn;
        break;
      case 0xb:
        this.cpu.pc = nnn + this.cpu.v[0];
        break;
      case 0xc:
        this.cpu.v[x] = (Math.random() * 256) & nn;
        break;
      case 0xd:
        this.draw(this.cpu.v[x], this.cpu.v[y], n);
        break;
      case 0xe: {
        // EX9E and EXA1: Skip if key
        switch (nn) {
          case 0x9e:
            if (this.k.has(this.cpu.v[x])) {
              this.cpu.pc += 2;
            }
            break;
          case 0xa1:
            if (!this.k.has(this.cpu.v[x])) {
              this.cpu.pc += 2;
            }
            break;
          default:
            throw new Error(
              `Unknown instruction 0x${op.toString(16).padStart(4, "0")}`
            );
        }
        break;
      }
      case 0xf: {
        switch (nn) {
          // timers
          case 0x07:
            this.cpu.v[x] = this.cpu.dt;
            break;
          case 0x15:
            this.cpu.dt = this.cpu.v[x];
            break;
          case 0x18:
            this.cpu.st = this.cpu.v[x];
            break;
          case 0x0a:
            this.waitReg = x;
            this.waitingInput = true;
            break;
          case 0x1e:
            this.cpu.i = (this.cpu.i + this.cpu.v[x]) & 0xffff;
            break;
          case 0x29:
            this.cpu.i = (this.cpu.v[x] & 0xf) * 5;
            break;
          case 0x33:
            this.ram[this.cpu.i] = Math.floor(this.cpu.v[x] / 100) % 10;
            this.ram[this.cpu.i + 1] = Math.floor(this.cpu.v[x] / 10) % 10;
            this.ram[this.cpu.i + 2] = this.cpu.v[x] % 10;
            break;
          case 0x55:
            for (let z = 0; z <= x; z++) {
              this.ram[this.cpu.i + z] = this.cpu.v[z];
            }
            this.cpu.i = (this.cpu.i + x + 1) & 0xffff;
            break;
          case 0x65:
            for (let z = 0; z <= x; z++) {
              this.cpu.v[z] = this.ram[this.cpu.i + z];
            }
            this.cpu.i = (this.cpu.i + x + 1) & 0xffff;
            break;
          case 0x75:
            for (let z = 0; z <= x; z++) {
              this.cpu.f[z] = this.cpu.v[z];
            }
            break;
          case 0x85:
            for (let z = 0; z <= x; z++) {
              this.cpu.v[z] = 0xff & this.cpu.f[z];
            }
            break;
          default:
            throw new Error(
              `Unknown instruction 0x${op.toString(16).padStart(4, "0")}`
            );
        }
        break;
      }
      default:
        throw new Error(
          `Unknown instruction 0x${op.toString(16).padStart(4, "0")}`
        );
    }
  }

  private reset() {
    this.cpu = {
      v: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      pc: 0,
      i: 0,
      dt: 0,
      st: 0,
      r: [],
      f: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    };
    this.ram = new Uint8Array(this.memSize);
    this.hires = false;
    this.clearFramebuffer();
    this.waitingInput = false;
    this.k = new Set();

    // reload font
    for (let z = 0; z < font.length; z++) {
      this.ram[z] = font[z];
    }
  }
}

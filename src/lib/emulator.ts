import EventEmitter from "./events";

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
    return this.hires ? 126 : 64;
  }

  public static getOpInfo(op: string) {
    const NN = parseInt(op, 16) & 0x00ff;
    const O = (parseInt(op, 16) >> 12) & 0x000f;
    const N = parseInt(op, 16) & 0x000f;

    const simpleOps: any = {
      "0000": ["0000", "noop"],
      "00E0": ["00E0", "clear screen"],
      "00EE": ["00EE", "subroutine return"],
      "00FF": ["00FF", "high resolution"],
    };

    if (Object.keys(simpleOps).includes(op)) {
      return simpleOps[op];
    }

    switch (O) {
      case 1:
        return ["1NNN", "jump"];
      case 2:
        return ["2NNN", "subroutine call"];
      case 3:
        return ["3XNN", "skip if equal"];
      case 4:
        return ["4XNN", "skip if not equal"];
      case 5:
        return ["5XY0", "skip if equal"];
      case 9:
        return ["9XY0", "skip if not equal"];
      case 6:
        return ["6XNN", "set"];
      case 7:
        return ["7XNN", "add"];
      case 8: {
        switch (N) {
          case 0:
            return ["8XY0", "set"];
          case 1:
            return ["8XY1", "binary or"];
          case 2:
            return ["8XY2", "binary and"];
          case 3:
            return ["8XY3", "logical xor"];
          case 4:
            return ["8XY4", "add"];
          case 5:
            return ["8XY5", "subtract"];
          case 7:
            return ["8XY7", "subtract"];
          case 6:
            return ["8XY6", "shift"];
          case 0xe:
            return ["8XYE", "shift"];
        }
        break;
      }
      case 0xa:
        return ["ANNN", "set index"];
      case 0xb:
        return ["BNNN", "jump with offset"];
      case 0xc:
        return ["CXNN", "random"];
      case 0xd:
        return ["DXYN", "display"];
      case 0xf: {
        switch (NN) {
          case 0x1e:
            return ["FX1E", "add to index"];
          case 0x33:
            return ["FX33", "store"];
          case 0x55:
            return ["FX55", "store"];
          case 0x65:
            return ["FX65", "load"];
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

    // init display
    this._clear();

    for (let i = 0; i < data.length; i += 1) {
      this.RAM[this.offset + i] = data[i];
    }
  }

  public run(_: number = 25) {
    this.loopId && clearInterval(this.loopId);
    // main program loop
    this.loopId = setInterval(() => !this.paused && this.next(), 0);
  }

  public next() {
    try {
      this._exec(this._fetch());
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

  private _exec(op: string) {
    const NNN = parseInt(op, 16) & 0x0fff;
    const NN = parseInt(op, 16) & 0x00ff;
    const [_, X, Y, N] = op.split("").map((d) => parseInt(d, 16));

    const instructionSet: any = {
      "0000": () => {
        /* noop*/
      },
      "00E0": () => this._clear(),
      "00EE": () => {
        const top = this.callStack.pop() as number;
        this.PC = top;
      },
      "00FF": () => {
        this.hires = true;
        this._clear();
      },
      "1NNN": () => (this.PC = NNN),
      "2NNN": () => {
        this.callStack.push(this.PC); // push return address
        this.PC = NNN;
      },
      "3XNN": () => {
        if (this.V[X] === NN) {
          this.PC += 2;
        }
      },
      "4XNN": () => {
        if (this.V[X] !== NN) {
          this.PC += 2;
        }
      },
      "5XY0": () => {
        if (this.V[X] === this.V[Y]) {
          this.PC += 2;
        }
      },
      "9XY0": () => {
        if (this.V[X] !== this.V[Y]) {
          this.PC += 2;
        }
      },
      "6XNN": () => (this.V[X] = NN),
      "7XNN": () => (this.V[X] = (this.V[X] + NN) & 0xff),
      "8XY0": () => (this.V[X] = this.V[Y]),
      "8XY1": () => (this.V[X] |= this.V[Y]),
      "8XY2": () => (this.V[X] &= this.V[Y]),
      "8XY3": () => (this.V[X] ^= this.V[Y]),
      "8XY4": () => {
        const t = this.V[X] + this.V[Y];
        this.V[X] = t & 0xff;
        this.V[0xf] = t > 0xff ? 1 : 0;
      },
      "8XY5": () => {
        const t = this.V[X] - this.V[Y];
        this.V[X] = t & 0xff;
        this.V[0xf] = this.V[X] >= this.V[Y] ? 1 : 0;
      },
      "8XY7": () => {
        const t = this.V[Y] - this.V[X];
        this.V[X] = t & 0xff;
        this.V[0xf] = this.V[Y] >= this.V[X] ? 1 : 0;
      },
      "8XY6": () => {
        const t = this.V[X] >> 1;
        this.V[X] = t & 0xff;
        this.V[0xf] = this.V[X] & 0x1 ? 1 : 0;
      },
      "8XYE": () => {
        const t = this.V[X] << 1;
        this.V[X] = t & 0xff;
        this.V[0xf] = (this.V[X] >> 7) & 0x1 ? 1 : 0;
      },
      ANNN: () => (this.I = NNN),
      BNNN: () => {
        const offset = this.V[0];
        this.PC = NNN + offset;
      },
      CXNN: () => {
        this.V[X] = (Math.random() * 256) & NN;
      },
      DXYN: () => this._draw(this.V[X], this.V[Y], N),
      FX1E: () => {
        this.I = (this.I + this.V[X]) & 0xffff;
      },
      FX33: () => {
        this.RAM[this.I] = Math.floor(this.V[X] / 100) % 10;
        this.RAM[this.I + 1] = Math.floor(this.V[X] / 10) % 10;
        this.RAM[this.I + 2] = this.V[X] % 10;
      },
      FX55: () => {
        for (let i = 0; i <= X; i++) {
          this.RAM[this.I + i] = this.V[i];
        }
      },
      FX65: () => {
        for (let i = 0; i <= X; i++) {
          this.V[i] = this.RAM[this.I + i];
        }
      },
    };

    const [instrType] = Emulator.getOpInfo(op);
    const instr = instructionSet[instrType];

    if (!instr) {
      throw new Error(`No handle found for instruction ${op}`);
    }

    instr();
  }
}

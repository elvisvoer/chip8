export class TextDisplay {
  constructor(private el: HTMLElement) {}

  public clear() {
    this.el.innerHTML = "";
  }

  public write(data: string) {
    this.el.innerHTML += data;
  }
}

export class BitMapDisplay {
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
  }

  public clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public write(data: number[], width: number, height: number) {
    this.ctx.reset();
    const size = this.canvas.width / width;
    for (let z = 0; z < width * height; z++) {
      const x = Math.floor(z / width);
      const y = z % width;
      if (data[z]) {
        this.ctx.fillStyle = "green";
        this.ctx.fillRect(y * size, x * size, size, size);
      }
    }
  }
}

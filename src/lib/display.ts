export class CanvasDisplay {
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public writeText(text: string[]) {
    let y = 10;
    let x = 15;
    let step = 20;

    this.ctx.reset();
    this.ctx.font = `15px "Lucida Console", "Courier New", monospace`;
    this.ctx.fillStyle = "green";
    text.forEach((line, index) => this.ctx.fillText(line, y, x + step * index));
  }

  public writeGr(data: Uint8Array, width: number, height: number) {
    this.ctx.reset();
    const size = this.canvas.width / width;
    for (let z = 0; z < width * height; z++) {
      const x = Math.floor(z / width);
      const y = z % width;
      if (data[z]) {
        this.ctx.fillStyle = `rgb(0, ${255 - data[z]}, 0)`;
        this.ctx.fillRect(y * size, x * size, size, size);
      }
    }
  }

  public write(data: Uint8Array, width: number, height: number) {
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

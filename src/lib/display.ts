export class CanvasDisplay {
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;

    const resize = () => {
      this.canvas.width = this.canvas.parentElement?.offsetWidth || 0;
      const heightRatio = 0.5;
      this.canvas.height = this.canvas.width * heightRatio;
    };

    window.addEventListener("resize", resize);
    resize();
  }

  public clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
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

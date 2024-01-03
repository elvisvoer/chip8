export class CanvasDisplay {
  private ctx: CanvasRenderingContext2D;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;

    const resize = () => {
      // needs to be a multiple of 64 to avoid gaps in fillRect drawing
      const width = 64 * Math.floor(this.canvas.parentElement!.offsetWidth / 64);
      const heightRatio = 0.5;

      // make 768px the max width allowed
      this.canvas.width = Math.min(width, 768);
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

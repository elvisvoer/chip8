export class CanvasDisplay {
  private ctx: CanvasRenderingContext2D;
  private frameBuffer: Uint8Array | undefined;
  private frameBufferWidth = 0;
  private frameBufferHeight = 0;

  constructor(private canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext("2d")!;

    setInterval(() => {
      this.render(
        this.frameBuffer,
        this.frameBufferWidth,
        this.frameBufferHeight,
      );
    }, 1_000 / 30);
  }

  public resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  public clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public write(data: Uint8Array, width: number, height: number) {
    this.frameBuffer = data;
    this.frameBufferWidth = width;
    this.frameBufferHeight = height;
  }

  private render(data: Uint8Array | undefined, width: number, height: number) {
    if (!data) {
      return;
    }

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

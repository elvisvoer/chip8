import "./style.css";
import Emulator from "./lib/emulator.ts";
import { CanvasDisplay } from "./lib/display.ts";
import { fetchRom, uploadRom } from "./utils.ts";

const display = new CanvasDisplay(
  document.getElementById("display")! as HTMLCanvasElement,
  {
    width: 640,
    height: 320,
  }
);
const emulator = new Emulator();

/**
 * Mapping from (qwerty)
 *
 * 1 2 3 4
 * q w e r
 * a s d f
 * z x c v
 *
 * to (chip-8)
 *
 * 1 2 3 C
 * 4 5 6 D
 * 7 8 9 E
 * A 0 B F
 *
 */
const qKeyboardMapping: any = {
  "1": 0x1,
  "2": 0x2,
  "3": 0x3,
  "4": 0xc,
  q: 0x4,
  w: 0x5,
  e: 0x6,
  r: 0xd,
  a: 0x7,
  s: 0x8,
  d: 0x9,
  f: 0xe,
  z: 0xa,
  x: 0x0,
  c: 0xb,
  v: 0xf,
};

function drawDisplay(emulator: Emulator) {
  display.clear();
  display.write(
    emulator.framebuffer,
    emulator.framebufferWidth,
    emulator.framebufferHeight
  );
}

async function main(fileName: string) {
  document.addEventListener("keydown", async (e) => {
    const hex = qKeyboardMapping[e.key];
    if (hex) {
      emulator.setInput(hex);
    }

    // handle file upload
    if (e.key.toLowerCase() === "u") {
      const rom = await uploadRom();
      emulator.load(rom.data);
    }
  });

  // main loop
  setInterval(() => {
    emulator.tick();
    drawDisplay(emulator);
  }, 0);

  emulator.load(await fetchRom(fileName));
}

main("ibm-logo.ch8");

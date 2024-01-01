import "./style.css";
import Emulator from "./lib/emulator.ts";
import { BitMapDisplay } from "./lib/display.ts";
import { fetchRom } from "./utils.ts";

const display = new BitMapDisplay(
  document.getElementById("display")! as HTMLCanvasElement
);
const emulator = new Emulator();
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
  });

  // main loop
  setInterval(() => {
    emulator.tick();
    drawDisplay(emulator);
  }, 0);

  emulator.load({ name: fileName, data: await fetchRom(fileName) });
}

main("chipcross.ch8");

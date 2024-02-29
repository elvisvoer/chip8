import "./style.css";
import Emulator from "./lib/emulator.ts";
import { CanvasDisplay } from "./lib/display.ts";
import { fetchRom, uploadRom } from "./utils.ts";

const display = new CanvasDisplay(
  document.getElementById("display")! as HTMLCanvasElement
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

function load(data: Uint8Array) {
  emulator.load(data);
}

async function fetchAndLoad(romName: string) {
  const data = await fetchRom(romName);
  load(data);
}

async function main() {
  const roms = [
    "ibm-logo.ch8",
    "chipcross.ch8",
    "pong.ch8",
    "br8kout.ch8",
    "snake.ch8",
  ];
  let currentRomIndex = 0;

  document.addEventListener("keydown", async (e) => {
    const hex = qKeyboardMapping[e.key];
    if (hex) {
      emulator.setKeyDown(hex);
    }

    // handle extra key for open a local ROM file
    // or reload the program
    switch (e.key.toLowerCase()) {
      case "o":
        const rom = await uploadRom();
        load(rom.data);
        break;
      case "n":
        currentRomIndex = (currentRomIndex + 1) % roms.length;
        await fetchAndLoad(roms[currentRomIndex]);
        break;
      case "enter":
        await fetchAndLoad(roms[currentRomIndex]);
        break;
    }
  });

  document.addEventListener("keyup", (e) => {
    const hex = qKeyboardMapping[e.key];
    if (hex) {
      emulator.setKeyUp(hex);
    }
  });

  // main loop
  const loop = () => {
    // make CPU clock tick 2 times faster than timers and display update
    emulator.tick();
    emulator.tick();

    emulator.updateTimers();
    drawDisplay(emulator);
    setTimeout(loop, 0);
  };
  setTimeout(loop, 0);

  // initial ROM load
  await fetchAndLoad(roms[currentRomIndex]);
}

main();

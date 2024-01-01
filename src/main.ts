import "./style.css";
import Emulator from "./lib/emulator.ts";
import { BitMapDisplay, TextDisplay } from "./lib/display.ts";
import { circularArray, fetchRom, uploadRom } from "./utils.ts";

const display = new BitMapDisplay(
  document.getElementById("display")! as HTMLCanvasElement
);
const info = new TextDisplay(document.getElementById("info")!);

const emulator = new Emulator();
const romList = circularArray([
  { name: "ibm-logo.ch8", data: await fetchRom("ibm-logo.ch8") },
  { name: "test-opcode.ch8", data: await fetchRom("test-opcode.ch8") },
]);

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

  info.clear();
  info.write(`ROM: ${emulator.romDisk.name}\n`);
}

document.addEventListener("keydown", async (e) => {
  const hex = qKeyboardMapping[e.key];
  if (hex) {
    emulator.setInput(hex);
  }

  switch (e.keyCode) {
    case 13: // Enter
      emulator.load(romList.peek());
      break;
    case 78: // N
      emulator.load(romList.next());
      break;
    case 80: // P
      emulator.load(romList.prev());
      break;
    case 84: // T
      emulator.tick();
      break;
    case 85: // U
      const rom = await uploadRom();
      emulator.load(romList.add(rom));
      break;
    default:
  }

  drawDisplay(emulator);
});

// start with first element
emulator.load(romList.next());

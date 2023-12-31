import "./style.css";
import Emulator from "./lib/emulator.ts";
import { BitMapDisplay, TextDisplay } from "./lib/display.ts";
import { circularArray, fetchRom, uploadRom } from "./utils.ts";

const display = new BitMapDisplay(
  document.getElementById("display")! as HTMLCanvasElement
);
const info = new TextDisplay(document.getElementById("info")!);
const debug = new TextDisplay(document.getElementById("debug")!);
let showHexDebugger = false;

const emulator = new Emulator();
const romList = circularArray([
  { name: "ibm-logo.ch8", data: await fetchRom("ibm-logo.ch8") },
  { name: "test-opcode.ch8", data: await fetchRom("test-opcode.ch8") },
]);

const qKeyboardMapping: any = {
  "1": 0x1,
  "2": 0x2,
  "3": 0x3,
  "4": 0xc, //?
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

function getColoredText(text: string, color: string) {
  return `<span style="color: ${color};">${text}</span>`;
}

function getHexDebuggerText(data: Uint8Array, pos: number, len = 2) {
  let output = "";
  const highlights = Array(len)
    .fill(0)
    .map((_, index) => index + pos);

  for (let i = 0; i < data.length; i += 1) {
    output += getColoredText(
      `${((data[i] >> 4) & 0xf).toString(16)}${(data[i] & 0xf).toString(16)} `,
      highlights.includes(i) ? "red" : "inherit"
    );
  }

  return output;
}

function drawDisplay(emulator: Emulator, name: string, data: Uint8Array) {
  display.clear();
  display.write(
    emulator.state.framebuffer,
    emulator.FBRowSize,
    emulator.FBColSize
  );

  info.clear();
  info.write(
    `[Space] Pause | [Enter] Run | [H] Prev OP | [L] Next OP | [K] Prev ROM | [J] Next ROM | [U] Upload ROM \n\n`
  );
  info.write(`ROM: ${name}\n`);
  info.write(`PC: 0x${emulator.state.ecu.pc.toString(16).toUpperCase()}\n`);

  const [opCode, opName, op] = emulator.getCurrentOpInfo();
  info.write(`OP: 0x${op} (${opCode} - ${opName})\n\n`);

  debug.clear();
  if (showHexDebugger) {
    debug.write(getHexDebuggerText(data, emulator.state.ecu.pc));
  }
}

function loadAndRun({ name, data }: { name: string; data: Uint8Array }) {
  emulator.clearListeners();
  emulator.load(data);
  emulator.run();
  // draw initial display
  drawDisplay(emulator, name, data);
  emulator.on("tick", () => drawDisplay(emulator, name, data));
}

document.addEventListener("keydown", async (e) => {
  const hex = qKeyboardMapping[e.key];
  if (hex) {
    emulator.setInput(hex);
  }

  switch (e.keyCode) {
    case 13: // Enter
      emulator.paused = false;
      loadAndRun(romList.peek());
      break;
    case 32: // space
      emulator.paused = !emulator.paused;
      break;
    case 72: // H
      emulator.prev();
      break;
    case 74: // J
      loadAndRun(romList.next());
      break;
    case 75: // K
      loadAndRun(romList.prev());
      break;
    case 76: // L
      emulator.next();
      break;
    case 85: // U
      const rom = await uploadRom();
      loadAndRun(romList.add(rom));
      break;
    case 66: // B
      showHexDebugger = !showHexDebugger;
      // force next tick
      emulator.forceTick();
      break;
    default:
  }
});

// start with first element
loadAndRun(romList.next());

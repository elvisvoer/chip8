import "./style.css";
import Emulator from "./lib/emulator.ts";
import { BitMapDisplay, TextDisplay } from "./lib/display.ts";
import {
  circularArray,
  decimalToHexStr,
  fetchRom,
  uploadRom,
} from "./utils.ts";

const display = new BitMapDisplay(
  document.getElementById("display")! as HTMLCanvasElement
);
const info = new TextDisplay(document.getElementById("info")!);
let verbosity = 0;

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

function getRomHexStr(data: Uint8Array, pos: number) {
  let output = "";

  for (let i = 0; i < data.length; i += 2) {
    output += getColoredText(
      `${decimalToHexStr(data[i], 2)}${decimalToHexStr(data[i + 1], 2)} `,
      [i, i + 1].includes(pos) ? "red" : "inherit"
    );
  }

  return output;
}

function getEmulatorECUStr(emulator: Emulator) {
  let output = "";
  output += `PC: ${decimalToHexStr(emulator.state.ecu.pc, 4)}\n`;
  output += `I: ${decimalToHexStr(emulator.state.ecu.i, 4)}\n`;
  output += `V: [${emulator.state.ecu.v
    .map((v) => `${decimalToHexStr(v, 4)}`)
    .join(", ")}]\n`;
  output += `F: [${emulator.state.ecu.f
    .map((f) => `${decimalToHexStr(f, 4)}`)
    .join(", ")}]\n`;
  output += `R: [${emulator.state.ecu.r
    .map((r) => `${decimalToHexStr(r, 4)}`)
    .join(", ")}]\n`;
  output += `DT: ${decimalToHexStr(emulator.state.ecu.dt, 4)}\n`;
  output += `ST: ${decimalToHexStr(emulator.state.ecu.st, 4)}\n`;

  return output;
}

function drawDisplay(emulator: Emulator, romName: string, romData: Uint8Array) {
  display.clear();
  display.write(
    emulator.state.framebuffer,
    emulator.framebufferWidth,
    emulator.framebufferHeight
  );

  info.clear();
  info.write(
    `[Space] Pause | [Enter] Run | [T] Next Tick | [P] Prev ROM | [N] Next ROM | [U] Upload ROM \n\n`
  );
  info.write(`ROM: ${romName}\n`);
  info.write("\n");

  // show more info depending on verbosity level
  if (verbosity > 0) {
    info.write(getEmulatorECUStr(emulator));
    info.write("\n");
  }

  if (verbosity > 1) {
    // rom offset = pc - offset
    info.write(getRomHexStr(romData, emulator.state.ecu.pc - emulator.offset));
  }
}

function loadAndRun({ name, data }: { name: string; data: Uint8Array }) {
  emulator.clearListeners();
  emulator.load(data);
  emulator.run();
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
    case 32: // Space
      emulator.paused = !emulator.paused;
      break;
    case 78: // N
      loadAndRun(romList.next());
      break;
    case 80: // P
      loadAndRun(romList.prev());
      break;
    case 84: // T
      emulator.tick();
      break;
    case 85: // U
      const rom = await uploadRom();
      loadAndRun(romList.add(rom));
      break;

    case 66: // B
      verbosity = ++verbosity % 3;
      break;
    default:
  }
});

// start with first element
loadAndRun(romList.next());

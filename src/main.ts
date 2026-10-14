import "./style.css";
import Emulator, { CPU, Machine } from "./lib/emulator.ts";
import { CanvasDisplay } from "./lib/display.ts";
import { fetchRom, uploadRom } from "./utils.ts";
import { opToAsm } from "./lib/opToAsm.ts";

const canvas = document.getElementById("display")! as HTMLCanvasElement;
const debugCanvas = document.getElementById("debug")! as HTMLCanvasElement;
const display = new CanvasDisplay(canvas);
const debug = new CanvasDisplay(debugCanvas);
const resize = () => {
  // needs to be a multiple of 64 to avoid gaps in fillRect drawing
  const width = Math.min(
    64 * Math.floor(canvas.parentElement!.offsetWidth / 64),
    768,
  );
  const heightRatio = 0.5;

  display.resize(width, width * heightRatio);
  debug.resize(width, (width * heightRatio) / 2);
};

window.addEventListener("resize", resize);
resize();

function cpuToDisplayText(cpu: CPU, op: number) {
  const result = [];
  result.push(
    "     0 |  1 |  2 |  3 |  4 |  5 |  6 |  7 |  6 |  9 |  a |  b |  c |  d |  e |  f ",
  );
  result.push(
    ` V: ${cpu.v.map((v) => v.toString(16).padStart(2, " ")).join(" | ")}`,
  );
  result.push(
    ` F: ${cpu.f.map((f) => f.toString(16).padStart(2, " ")).join(" | ")}`,
  );
  result.push(` DT: ${cpu.dt.toString(16).padStart(4, "0")}`);
  result.push(` ST: ${cpu.st.toString(16).padStart(4, "0")}`);
  result.push(` I:  ${cpu.i.toString(16).padStart(4, "0")}`);
  result.push(``);
  result.push(` 0x${cpu.pc.toString(16).padStart(4, "0")}: ${opToAsm(op)}`);
  result.push(
    ` Return stack: ${cpu.r.reverse().map((rs) => ` ${rs.toString(16).padStart(4, "0")}`)}`,
  );

  return result;
}

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

let loopIntervalId: any = null;
let emState: [number, Machine][] = [];
let emStateIndex = 0;

const emulator = new Emulator(4 * 1024, (op, m) => {
  if (loopIntervalId === null) {
    emState.push([op, m]);
  }

  const {cpu} = m;
  debug.writeText(cpuToDisplayText(cpu, op));
});

function drawNextState() {
  const [op, m] = emState[emStateIndex];
  const {cpu, frameBuffer} = m;

  debug.writeText(cpuToDisplayText(cpu, op));
  drawDisplay(frameBuffer, emulator.framebufferWidth, emulator.framebufferHeight);
}

function previousEmState() {
  emStateIndex = Math.max(--emStateIndex, 0);

  if (emState[emStateIndex] === undefined) {
    emulator.tick();
    return;
  }

  drawNextState();
}

function nextEmState() {
  emStateIndex += 1;

  if (emState[emStateIndex] === undefined) {
    emulator.tick();
    return;
  }

  drawNextState();
}

// main loop
function loop() {
  // make CPU clock tick 2 times faster than timers and display update
  emulator.tick();
  // emulator.tick();

  emulator.updateTimers();
  drawDisplay(
    emulator.framebuffer,
    emulator.framebufferWidth,
    emulator.framebufferHeight,
  );
}

function stopLoop() {
  loopIntervalId && clearInterval(loopIntervalId);
  loopIntervalId = null;
}

function startLoop() {
  stopLoop();
  loopIntervalId = setInterval(loop, 0);
}

function drawDisplay(data: Uint8Array, width: number, height: number) {
  display.clear();
  display.write(data, width, height);
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
      case "b":
        stopLoop();
        await fetchAndLoad(roms[currentRomIndex]);
        emState = [];
        emStateIndex = 0;
        break;
      case "arrowleft":
        previousEmState();
        break;
      case "arrowright":
        nextEmState();
        break;
      case "o":
        const rom = await uploadRom();
        load(rom.data);
        break;
      case "n":
        currentRomIndex = (currentRomIndex + 1) % roms.length;
        await fetchAndLoad(roms[currentRomIndex]);
        startLoop();
        break;
      case "enter":
        await fetchAndLoad(roms[currentRomIndex]);
        startLoop();
        break;
    }
  });

  document.addEventListener("keyup", (e) => {
    const hex = qKeyboardMapping[e.key];
    if (hex) {
      emulator.setKeyUp(hex);
    }
  });

  // initial ROM load
  await fetchAndLoad(roms[currentRomIndex]);
  startLoop();
}

main();

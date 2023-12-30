import "./style.css";
import { Emulator, getOpInfo } from "./lib/emulator.ts";

async function fetchROM(fileName: string) {
  try {
    const response = await fetch(fileName);
    if (!response.ok) {
      throw new Error(`Invalid response code: ${response.status}`);
    }

    const blob = await response.blob();

    const buffer: ArrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as ArrayBuffer);
      };
      reader.onerror = (e) => {
        reject(e);
      };
      reader.readAsArrayBuffer(blob);
    });

    return new Uint8Array(buffer);
  } catch (err) {
    console.log("fetchROM error:", err);
  }
}

async function uploadFile() {
  return new Promise<{ name: string; data: Uint8Array }>((resolve, reject) => {
    let input = document.createElement("input");
    input.type = "file";
    input.accept = ".ch8";
    input.onchange = async (_) => {
      const file = Array.from(input.files!)[0];
      if (file) {
        resolve({
          name: file.name,
          data: new Uint8Array(await file.arrayBuffer()),
        });
      } else {
        reject("No file uploaded");
      }
    };
    input.click();
  });
}

function getCircularList(list: any[]) {
  let current = -1;

  return {
    add: (rom: any) => {
      list.push(rom);
      current = list.length - 1;
      return rom;
    },
    peek: () => list[current],
    next: () => {
      current += 1;
      current = current < list.length ? current : 0; // rotate to first
      return list[current];
    },
    prev: () => {
      current -= 1;
      current = current < 0 ? list.length - 1 : current; // rotate to last
      return list[current];
    },
  };
}

class Display {
  constructor(private el: HTMLElement) {}

  public clear() {
    this.el.innerHTML = "";
  }

  public write(data: string) {
    this.el.innerHTML += data;
  }
}

const display = new Display(document.getElementById("display")!);
const debug = new Display(document.getElementById("debug")!);

const emulator = new Emulator();
const romList = getCircularList([
  { name: "ibm-logo.ch8", data: await fetchROM("ibm-logo.ch8") },
  { name: "test-opcode.ch8", data: await fetchROM("test-opcode.ch8") },
]);

function getColoredText(text: string, color: string) {
  return `<span style="color: ${color};">${text}</span>`;
}

function hexWithHighlightedText(data: Uint8Array, pos: number, len = 2) {
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

function fbToString(fb: number[]) {
  let output = "";

  for (let i = 0; i < emulator.FBColSize; i++) {
    for (let j = 0; j < emulator.FBRowSize; j++) {
      const z = i * emulator.FBRowSize + j;
      if (fb[z]) {
        output += "&#9619;";
      } else {
        output += " ";
      }
    }

    output += "\n";
  }

  return output;
}

async function loadAndRun(rom: { name: string; data: Uint8Array }) {
  emulator.clearListeners();
  emulator.load(rom.data);
  emulator.run();

  const drawDisplay = (count: number, op: string) => {
    display.clear();
    display.write(fbToString(emulator.state.fb));
    // debug info
    debug.clear();

    debug.write(
      `[Space] Pause | [R] Rerun | [H] Prev OP | [L] Next OP | [P] Prev ROM | [N] Next ROM | [U] Upload ROM \n\n`
    );

    debug.write(`ROM: ${rom.name}\n`);
    debug.write(`Tick: ${count}\n`);
    debug.write(`PC: 0x${emulator.state.pc.toString(16).toUpperCase()}\n`);
    debug.write(`OP: 0x${op} (${getOpInfo(op).join(" - ")})\n\n`);
    debug.write(hexWithHighlightedText(rom.data, emulator.state.pc));
  };

  // draw initial display
  drawDisplay(0, "0000");

  emulator.on("tick", drawDisplay);
}

document.addEventListener("keydown", async (e) => {
  switch (e.keyCode) {
    case 32: // space
      emulator.paused = !emulator.paused;
      break;
    case 72: // H
      emulator.prev();
      break;
    case 76: // L
      emulator.next();
      break;
    case 78: // N
      loadAndRun(romList.next());
      break;
    case 80: // P
      loadAndRun(romList.prev());
      break;
    case 82: // R
      emulator.paused = false;
      loadAndRun(romList.peek());
      break;
    case 85: // U
      const file = await uploadFile();
      loadAndRun(romList.add(file));
      break;
    default:
      throw new Error(`Unmapped keycode: ${e.keyCode}`);
  }
});

// start with first element
loadAndRun(romList.next());

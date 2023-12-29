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

class Display {
  constructor(private el: HTMLElement) {}

  public clear() {
    this.el.innerHTML = "";
  }

  public write(data: string) {
    this.el.innerHTML += data;
  }
}

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

  for (let i = 0; i < Emulator.FBColSize; i++) {
    for (let j = 0; j < Emulator.FBRowSize; j++) {
      const z = i * Emulator.FBRowSize + j;
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

async function main() {
  const rom = await fetchROM("test-opcode.ch8");
  const display = new Display(document.getElementById("display")!);

  const emulator = new Emulator();
  emulator.load(rom!);
  emulator.run();

  emulator.on("tick", (op: string, count: number) => {
    display.clear();
    display.write(fbToString(emulator.state.fb));
    // debug info
    display.write(`Tick: ${count}\n`);
    display.write(`PC: 0x${emulator.state.pc.toString(16).toUpperCase()}\n`);
    display.write(`Operation: 0x${op} (${getOpInfo(op).join(" - ")})\n\n`);
    display.write(hexWithHighlightedText(rom!, emulator.state.pc));
  });

  document.addEventListener("keydown", (e) => {
    switch (e.keyCode) {
      case 32: // space
        emulator.paused = !emulator.paused;
        break;
      case 37: // ArrowLeft
        emulator.paused = true;
        emulator.prev();
        break;
      case 39: // ArrowRight
        emulator.paused = true;
        emulator.next();
        break;
      default:
        throw new Error(`Unmapped keycode: ${e.keyCode}`);
    }
  });
}

main();

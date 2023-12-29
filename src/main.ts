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

function createHistory() {
  const data: any[] = [];
  let index = data.length;

  return {
    size: () => data.length,
    add: (d: any) => {
      data.push(d);
      index = data.length;
    },
    prev: () => {
      index = Math.max(0, index - 1);
      return data[index];
    },
    next: () => {
      index = Math.min(data.length - 1, index + 1);
      return data[index];
    },
  };
}

async function main() {
  const history = createHistory();
  const rom = await fetchROM("test-opcode.ch8");
  const display = new Display(document.getElementById("display")!);

  const refreshDisplay = ({
    fb,
    pc,
    op,
  }: {
    pc: number;
    fb: number[];
    op: string;
  }) => {
    display.clear();
    display.write(fbToString(fb));
    // debug info
    display.write(`PC: 0x${pc.toString(16).toUpperCase()}\n`);
    display.write(`Operation: 0x${op} (${getOpInfo(op).join(" - ")})\n\n`);
    display.write(hexWithHighlightedText(rom!, pc));
  };

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      refreshDisplay(history.prev());
    }

    if (e.key === "ArrowRight") {
      refreshDisplay(history.next());
    }
  });

  const emulator = new Emulator();
  emulator.init(rom!);
  emulator.run();
  emulator.on("tick", (meta: { pc: number; fb: number[]; op: string }) => {
    refreshDisplay(meta);
    history.add(meta);
  });
}

main();

import "./style.css";
import { Emulator } from "./lib/emulator.ts";

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

const display = new Display(document.getElementById("display")!);

function printROM(data: Uint8Array) {
  for (let i = 0; i < data.length; i += 1) {
    if (i % 12 === 0) {
      display.write("\n");
    }

    display.write(
      `0x${data[i] < 0x10 ? "0" : ""}${data[i].toString(16).toUpperCase()} `
    );
  }
}

function printFB(fb: number[]) {
  for (let i = 0; i < Emulator.FBColSize; i++) {
    for (let j = 0; j < Emulator.FBRowSize; j++) {
      const z = i * Emulator.FBRowSize + j;
      if (fb[z]) {
        display.write("&#9632;");
      } else {
        display.write(" ");
      }
    }

    display.write("\n");
  }
}

(async () => {
  const rom = (await fetchROM("ibm-logo.ch8")) as Uint8Array;
  const emulator = new Emulator((fb: number[]) => {
    display.clear();
    printFB(fb);
    printROM(rom);
  });
  emulator.load(rom);
  emulator.run();
})();

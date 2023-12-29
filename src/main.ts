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

function printROM(data: Uint8Array) {
  let output = "";
  for (let i = 0; i < data.length; i += 1) {
    output += `<span>0x${data[i] < 0x10 ? "0" : ""}${data[i]
      .toString(16)
      .toUpperCase()}</span>`;
  }

  document.getElementById("rom")!.innerHTML = output;
}

(async () => {
  const rom = (await fetchROM("ibm-logo.ch8")) as Uint8Array;
  printROM(rom);

  const emulator = new Emulator((fb: number[]) => {
    let output = "";
    for (let i = 0; i < Emulator.FBColSize; i++) {
      for (let j = 0; j < Emulator.FBRowSize; j++) {
        const z = i * Emulator.FBRowSize + j;
        if (fb[z]) {
          output += "&#9632;";
        } else {
          output += " ";
        }
      }

      output += "\n";
    }

    document.getElementById("display")!.innerHTML = output;
  });
  emulator.load(rom);
  emulator.run();
})();

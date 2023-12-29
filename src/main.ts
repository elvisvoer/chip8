import "./style.css";
import { init, run } from "./lib/emulator.ts";

async function fetchCode() {
  const fileName = "ibm-logo.ch8";

  try {
    const response = await fetch(`/${fileName}`);
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
    console.log("fetchCode error:", err);
  }
}

function printRom(cardROM: Uint8Array) {
  let output = "";
  for (let i = 0; i < cardROM.length; i += 1) {
    output += `<span>0x${cardROM[i] < 0x10 ? "0" : ""}${cardROM[i]
      .toString(16)
      .toUpperCase()}</span>`;
  }

  document.getElementById("rom")!.innerHTML = output;
}

(async () => {
  const cardROM = (await fetchCode()) as Uint8Array;
  printRom(cardROM);
  init(cardROM);
  run();
})();

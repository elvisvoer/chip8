import "./style.css";
import { init, run } from "./lib/emulator.ts";

async function fetchCode() {
  const fileName = "test_opcode.ch8";

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

(async () => {
  const cardROM = (await fetchCode()) as Uint8Array;
  init(cardROM);
  run();
})();

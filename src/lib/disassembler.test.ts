import { describe, expect, test } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { compileTinyC8 } from "./tinyc8/compiler";
import { bufferToAsm } from "./disassembler";

function areBuffersEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  for (let i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) {
      return false;
    }
  }

  return true;
}

describe("Disassembler", () => {
  test.each([
    // "br8kout.ch8",
    "chip8-picture.ch8",
    // "chipcross.ch8",
    // "dt-test.ch8",
    "ibm-logo.ch8",
    "pong.ch8",
    // "snake.ch8",
    // "sqrt-test.ch8",
    "zero-pong.ch8",
  ])("can correctly disassemble/assemble %1", (rom) => {
    const buffer = new Uint8Array(readFileSync(`public/${rom}`));
    const asm = bufferToAsm(buffer);
    writeFileSync(`public/${rom.replace("ch8", "asm")}`, asm);

    const newBuffer = compileTinyC8(
      readFileSync(`public/${rom.replace("ch8", "tc8")}`, "utf-8"),
    );

    //  const eBuffer = compileTinyC8(readFileSync(`public/elvis.tc8`, "utf-8"))
    //  writeFileSync("public/elvis.ch8", eBuffer);

    // writeFileSync(`public/${rom.replace("ch8", "tc8.ch8")}`, newBuffer);

    expect(areBuffersEqual(buffer, newBuffer)).toBeTruthy();
    // expect(true).toBeTruthy();
  });
});



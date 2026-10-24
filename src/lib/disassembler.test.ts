import { describe, expect, test } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { compileBasic } from "./basic/compiler";
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
    // "ibm-logo.ch8",
    // "chipcross.ch8",
    "pong.ch8",
    // "br8kout.ch8",
    // "snake.ch8",
  ])("can correctly disassemble/assemble %1", (rom) => {
    const buffer = new Uint8Array(readFileSync(`public/${rom}`));
    const asm = bufferToAsm(buffer);

    writeFileSync(`public/${rom.replace("ch8", "asm")}`, asm);

    const newBuffer = compileBasic(
      readFileSync(`public/${rom.replace("ch8", "b")}`, "utf-8"),
    );

    writeFileSync(`public/${rom.replace("ch8", "b.ch8")}`, newBuffer);

    expect(areBuffersEqual(buffer, newBuffer)).toBeTruthy();
    // expect(true).toBeTruthy();
  });
});



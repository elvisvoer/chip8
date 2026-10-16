import { Disassembler } from "./disassembler";
import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";

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
    "ibm-logo.ch8",
    "chipcross.ch8",
    "pong.ch8",
    "br8kout.ch8",
    "snake.ch8",
  ])("can correctly disassemble/assemble %1", (rom) => {
    const buffer = new Uint8Array(readFileSync(`public/${rom}`));
    const newBuffer = Disassembler.fromAsm(Disassembler.toAsm(buffer));

    expect(areBuffersEqual(buffer, newBuffer)).toBeTruthy();
  });
});

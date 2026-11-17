import { describe, expect, test } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { compileAsm } from "./asm/assembler";
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

function assembleDisassembly(asm: string): Uint8Array {
  return compileAsm(asm.replace(/^0x[\da-f]+\s+/gim, ""));
}

describe("Disassembler", () => {
  test("disassembles instructions at odd jump targets", () => {
    const buffer = Uint8Array.fromHex("120560e050610200ee");
    const asm = [
      "0x200 JUMP 0x205",
      "0x202 V0 := 0xe0",
      "0x204 0x50",
      "0x205 V1 := 0x02",
      "0x207 RETURN",
    ].join("\n");

    expect(bufferToAsm(buffer)).toEqual(asm);
    expect(areBuffersEqual(buffer, assembleDisassembly(asm))).toBeTruthy();
  });

  test.each([
    "br8kout.ch8",
    "chip8-picture.ch8",
    "dt-test.ch8",
    "ibm-logo.ch8",
    "pong.ch8",
    "snake.ch8",
    "sqrt-test.ch8",
    "zero-pong.ch8",
  ])("can correctly disassemble/assemble %1", (rom) => {
    const buffer = new Uint8Array(readFileSync(`public/${rom}`));
    const asm = bufferToAsm(buffer);
    writeFileSync(`public/${rom.replace("ch8", "asm")}`, asm);

    const newBuffer = compileTinyC8(
      readFileSync(`public/${rom.replace("ch8", "tc8")}`, "utf-8"),
    );
    const disassembledBuffer = assembleDisassembly(asm);

    expect(newBuffer, rom).toEqual(buffer);
    expect(areBuffersEqual(buffer, disassembledBuffer)).toBeTruthy();
  });

  test("compiles the high-level Chipcross source to its original ROM", () => {
    const rom = new Uint8Array(readFileSync("public/chipcross.ch8"));
    const source = readFileSync("public/chipcross.tc8", "utf-8");

    expect(compileTinyC8(source)).toEqual(rom);
  });

  test.each(["elvis.ch8", "snake.ch8"])(
    "compiles the high-level %s source to its original ROM",
    (romFile) => {
      const rom = new Uint8Array(readFileSync(`public/${romFile}`));
      const source = readFileSync(
        `public/${romFile.replace("ch8", "tc8")}`,
        "utf-8",
      );

      expect(compileTinyC8(source)).toEqual(rom);
    },
  );
});



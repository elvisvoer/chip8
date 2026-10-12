import { Disassembler } from "./disassembler";
import { readRom } from "../test/utils";
import { describe, expect, test } from "vitest";

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
  test("can correctly disassemble/assemble the IBM logo", () => {
    const ibmLogo = readRom("public/ibm-logo.ch8");
    expect(areBuffersEqual(ibmLogo, Disassembler.fromHex(Disassembler.toHex(ibmLogo)))).toBeTruthy();
  });
});

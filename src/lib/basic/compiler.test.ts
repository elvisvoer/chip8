import { describe, expect, test } from "vitest";
import { compileBasic } from "./compiler";
import { bufferToAsm } from "../disassembler";

describe("basic compiler", () => {
  describe("asm statements", () => {
    test("can have an asm statement", () => {
      const testCode = `0x200 CLEAR`;
      const expectedResult = "0x200 CLEAR";
      const disassembledResult = bufferToAsm(compileBasic(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have an asm statement inside a code block", () => {
      const testCode = `{
          0x200 NOOP
        }`;
      const expectedResult = `0x200 NOOP`;
      const disassembledResult = bufferToAsm(compileBasic(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can compile all types of asm instructions", () => {
      const testCode = `{
          0x200 NOOP
          0x202 0xff00
        }`;
      const expectedResult = ["0x200 NOOP", "0x202 0xff00"].join(
        "\n",
      );
      const disassembledResult = bufferToAsm(compileBasic(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });
  });

  describe.skip("code block", () => {
    test("can have an empty code block", () => {
      const testCode = `{}`;
      const expectedResult = ``;
      const disassembledResult = bufferToAsm(compileBasic(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have a code block only with space characters", () => {
      const testCode = `{
         }`;
      const expectedResult = ``;
      const disassembledResult = bufferToAsm(compileBasic(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have a code block with only a comment", () => {
      const testCode = `{
          # some comment
        }`;
      const expectedResult = ``;
      const disassembledResult = bufferToAsm(compileBasic(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have a code block with only a single instruction", () => {
      const testCode = `{
          V0 := 0xed
        }`;
      const expectedResult = "0x200 V0 := 0xed";
      const disassembledResult = bufferToAsm(compileBasic(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have a code block with a comment and a single instruction", () => {
      const testCode = `{
          # some comment
          V0 := 0xed
        }`;
      const expectedResult = "0x200 V0 := 0xed";
      const disassembledResult = bufferToAsm(compileBasic(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have a code block with multiple instructions", () => {
      const testCode = `{
          I := 0x22a
          # some comment
          V0 := 0xed
        }`;
      const expectedResult = ["0x200 I := 0x22a", "0x202 V0 := 0xed"].join(
        "\n",
      );
      const disassembledResult = bufferToAsm(compileBasic(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });
  });

  describe.skip("var assignment", () => {
    test("can assign a variable in a single line statement", () => {
      const testCode = `I := 0x22a`;
      const expectedResult = "0x200 I := 0x22a";
      const disassembledResult = bufferToAsm(compileBasic(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can assign multiple variables in single line statements", () => {
      const testCode = `I := 0x22a
                        V0 := 0xcc`;
      const expectedResult = ["0x200 I := 0x22a", "0x202 V0 := 0xcc"].join(
        "\n",
      );
      const disassembledResult = bufferToAsm(compileBasic(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can assign a variable inside a code block", () => {
      const testCode = `{
          I := 0x22a
        }`;
      const expectedResult = "0x200 I := 0x22a";
      const disassembledResult = bufferToAsm(compileBasic(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });
  });
});

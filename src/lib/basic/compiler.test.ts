import { describe, expect, test } from "vitest";
import { compileBasic } from "./compiler";
import { bufferToAsm } from "../disassembler";

const assignmentOp = [":=", "+=", "-=", "~=", "&=", "|=", "^=", "<<=", ">>="];

describe("basic compiler", () => {
  describe.skip("asm statements", () => {
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
          0x200 CLEAR
          0x202 I := 0x22a
          0x204 V0 := 0x0c
          0x206 V1 := 0x08
          0x208 DRAW V0 V1 0xf
          0x20a 0xff00
          0x20c JUMP TO 0x222
        }`;
      const expectedResult = [
        "0x200 CLEAR",
        "0x202 I := 0x22a",
        "0x204 V0 := 0x0c",
        "0x206 V1 := 0x08",
        "0x208 DRAW V0 V1 0xf",
        "0x20a 0xff00",
        "0x20c JUMP TO 0x222",
      ].join("\n");

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

  describe("var assignment", () => {
    test.each(assignmentOp)(
      "can assign a variable in a single line statement",
      (op) => {
        const testCode = `V0 ${op} VE`;
        const expectedResult = `0x200 V0 ${op} VE`;
        const disassembledResult = bufferToAsm(compileBasic(testCode));

        expect(disassembledResult).toEqual(expectedResult);
      },
    );

    test.each(assignmentOp)(
      "can assign a variable inside a code block",
      (op) => {
        const testCode = `{
          V0 ${op} VF
        }`;
        const expectedResult = `0x200 V0 ${op} VF`;
        const disassembledResult = bufferToAsm(compileBasic(testCode));

        expect(disassembledResult).toEqual(expectedResult);
      },
    );
  });
});

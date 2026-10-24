import { describe, expect, test } from "vitest";
import { compileBasic } from "./compiler";
import { bufferToAsm } from "../disassembler";

const assignmentOp = [":=", "+=", "-=", "~=", "&=", "|=", "^=", "<<=", ">>="];

const testCodeExamples = [
  `0x200 CLEAR
0x202 I := 0x22a
0x204 V0 := 0x0c
0x206 V1 := 0x08
0x208 DRAW V0 V1 0xf
0x20a V0 += 0x09
0x20c I := 0x239
0x20e DRAW V0 V1 0xf
0x210 I := 0x248
0x212 V0 += 0x08
0x214 DRAW V0 V1 0xf
0x216 V0 += 0x04
0x218 I := 0x257
0x21a DRAW V0 V1 0xf
0x21c V0 += 0x08
0x21e I := 0x266
0x220 DRAW V0 V1 0xf
0x222 V0 += 0x08
0x224 I := 0x275
0x226 DRAW V0 V1 0xf
`,
];

describe.skip("basic compiler", () => {
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

  describe("code block", () => {
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

  describe("repeat...until loop", () => {
    test("can have single-instruction repeat...until loop", () => {
      const testCode = `repeat V0 := DT until V0 == 0x00`;
      const expectedResult = [
        `0x200 V0 := DT`,
        `0x202 JUMP IF V0 == 0x00`,
        `0x204 JUMP 0x200`,
      ].join("\n");
      const disassembledResult = bufferToAsm(compileBasic(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have repeat...until loop with a code block", () => {
      const testCode = `repeat {V0 := DT} until V0 == 0x00`;
      const expectedResult = [
        `0x200 V0 := DT`,
        `0x202 JUMP IF V0 == 0x00`,
        `0x204 JUMP 0x200`,
      ].join("\n");
      const disassembledResult = bufferToAsm(compileBasic(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have repeat...until loop with a code block having multiple instructions", () => {
      const testCode = `repeat {
        V0 := DT
        ST := V1
      } until V0 == 0x00`;
      const expectedResult = [
        `0x200 V0 := DT`,
        `0x202 ST := V1`,
        `0x204 JUMP IF V0 == 0x00`,
        `0x206 JUMP 0x200`,
      ].join("\n");
      const disassembledResult = bufferToAsm(compileBasic(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });
  });

  describe("code examples", () => {
    test.each(testCodeExamples)(
      "can assign a variable in a single line statement",
      (testCode) => {
        const disassembledResult = bufferToAsm(compileBasic(testCode));

        expect(disassembledResult.length).toBeGreaterThan(0);
      },
    );
  });
});

import { describe, expect, test } from "vitest";
import { compileTinyC8 } from "./compiler";
import { bufferToAsm } from "../disassembler";

const assignmentOps = [
  ["=", ":="],
  ["+=", "+="],
  ["-=", "-="],
  ["~=", "~="],
  ["&=", "&="],
  ["|=", "|="],
  ["^=", "^="],
  ["<<=", "<<="],
  [">>=", ">>="],
];

const testCodeExamples = [
  `0x200 CLEAR
0x202 I = 0x22a
0x204 V0 = 0x0c
0x206 V1 = 0x08
0x208 DRAW V0 V1 0xf
0x20a V0 += 0x09
0x20c I = 0x239
0x20e DRAW V0 V1 0xf
0x210 I = 0x248
0x212 V0 += 0x08
0x214 DRAW V0 V1 0xf
0x216 V0 += 0x04
0x218 I = 0x257
0x21a DRAW V0 V1 0xf
0x21c V0 += 0x08
0x21e I = 0x266
0x220 DRAW V0 V1 0xf
0x222 V0 += 0x08
0x224 I = 0x275
0x226 DRAW V0 V1 0xf
`,
];

describe("TinyC8 compiler", () => {
  describe.skip("asm statements", () => {
    test("can have an asm statement", () => {
      const testCode = `0x200 CLEAR`;
      const expectedResult = "0x200 CLEAR";
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have an asm statement inside a code block", () => {
      const testCode = `{
          0x200 NOOP
        }`;
      const expectedResult = `0x200 NOOP`;
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can compile all types of asm instructions", () => {
      const testCode = `{
          0x200 CLEAR
          0x202 I = 0x22a
          0x204 V0 = 0x0c
          0x206 V1 = 0x08
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

      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });
  });

  describe.skip("code block", () => {
    test("can have an empty code block", () => {
      const testCode = `{}`;
      const expectedResult = ``;
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have a code block only with space characters", () => {
      const testCode = `{
         }`;
      const expectedResult = ``;
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have a code block with only a comment", () => {
      const testCode = `{
          # some comment
        }`;
      const expectedResult = ``;
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have a code block with only a single instruction", () => {
      const testCode = `{
          V0 = 0xed
        }`;
      const expectedResult = "0x200 V0 := 0xed";
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have a code block with a comment and a single instruction", () => {
      const testCode = `{
          # some comment
          V0 = 0xed
        }`;
      const expectedResult = "0x200 V0 := 0xed";
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have a code block with multiple instructions", () => {
      const testCode = `{
          I = 0x22a
          # some comment
          V0 = 0xed
        }`;
      const expectedResult = ["0x200 I := 0x22a", "0x202 V0 := 0xed"].join(
        "\n",
      );
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have nested code blocks", () => {
      const testCode = `{
          I = 0x22a
          # some comment
          {
            V0 = 0xed
          }
        }`;
      const expectedResult = ["0x200 I := 0x22a", "0x202 V0 := 0xed"].join(
        "\n",
      );
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });
  });

  describe("var assignment", () => {
    test.each(assignmentOps)(
      "can assign a variable in a single line statement",
      (op, emittedOp) => {
        const testCode = `V0 ${op} VE`;
        const expectedResult = `0x200 V0 ${emittedOp} VE`;
        const disassembledResult = bufferToAsm(compileTinyC8(testCode));

        expect(disassembledResult).toEqual(expectedResult);
      },
    );

    test.each(assignmentOps)(
      "can assign a variable inside a code block",
      (op, emittedOp) => {
        const testCode = `{
          V0 ${op} VF
        }`;
        const expectedResult = `0x200 V0 ${emittedOp} VF`;
        const disassembledResult = bufferToAsm(compileTinyC8(testCode));

        expect(disassembledResult).toEqual(expectedResult);
      },
    );

    test("does not accept the previous assignment operator", () => {
      expect(() => compileTinyC8("V0 := 0x01")).toThrow();
    });
  });

  describe("built-in functions", () => {
    test.each(["clear()", "0x200 clear()"])(
      "compiles %s to the CLEAR instruction",
      (source) => {
        expect(bufferToAsm(compileTinyC8(source))).toEqual("0x200 CLEAR");
      },
    );

    test("rejects arguments to clear()", () => {
      expect(() => compileTinyC8("clear(0x01)")).toThrow(
        "clear() does not accept arguments",
      );
    });

    test("compiles draw() to DRAW", () => {
      expect(bufferToAsm(compileTinyC8("draw(V0, V1, 0x6)"))).toEqual(
        "0x200 DRAW V0 V1 0x6",
      );
    });

    test("uses draw()'s collision flag as a condition value", () => {
      const source = `if (draw(V0, V1, 0x6)) { V2 = 0x01 }`;
      const expected = [
        `0x200 DRAW V0 V1 0x6`,
        `0x202 JUMP IF VF != 0x00`,
        `0x204 JUMP 0x20a`,
        `0x206 JUMP 0x208`,
        `0x208 V2 := 0x01`,
      ].join("\n");

      expect(bufferToAsm(compileTinyC8(source))).toEqual(expected);
    });

    test("can compare draw()'s collision flag", () => {
      const source = `if (draw(V0, V1, 0x6) == 0x00) { V2 = 0x01 }`;
      const expected = [
        `0x200 DRAW V0 V1 0x6`,
        `0x202 JUMP IF VF == 0x00`,
        `0x204 JUMP 0x20a`,
        `0x206 JUMP 0x208`,
        `0x208 V2 := 0x01`,
      ].join("\n");

      expect(bufferToAsm(compileTinyC8(source))).toEqual(expected);
    });

    test("can branch on draw()'s collision flag", () => {
      const source = `if (draw(V0, V1, 0x1) != 0x01) { goto done }
done:
clear()`;
      const expected = [
        `0x200 DRAW V0 V1 0x1`,
        `0x202 JUMP IF VF == 0x01`,
        `0x204 JUMP 0x206`,
        `0x206 CLEAR`,
      ].join("\n");

      expect(bufferToAsm(compileTinyC8(source))).toEqual(expected);
    });

    test("can assign draw()'s collision flag to a register", () => {
      const expected = ["0x200 DRAW V0 V1 0x6", "0x202 V2 := VF"].join("\n");

      expect(bufferToAsm(compileTinyC8("V2 = draw(V0, V1, 0x6)"))).toEqual(
        expected,
      );
    });

    test("rejects invalid draw() arguments", () => {
      expect(() => compileTinyC8("draw(V0, V1)")).toThrow(
        "draw() expects two registers and a hexadecimal height",
      );
    });
  });

  describe("postfix operators", () => {
    test.each([
      ["++", "0x01"],
      ["--", "0xff"],
    ])("compiles V0%s as an update", (operator, offset) => {
      expect(bufferToAsm(compileTinyC8(`V0${operator}`))).toEqual(
        `0x200 V0 += ${offset}`,
      );
    });
  });

  describe("logical operators", () => {
    test("short-circuits && in an if condition", () => {
      const source = `if (V0 == 0x00 && V1 != 0x00) { V2 = 0x01 }`;
      const expected = [
        `0x200 JUMP IF V0 == 0x00`,
        `0x202 JUMP 0x20e`,
        `0x204 JUMP 0x206`,
        `0x206 JUMP IF V1 != 0x00`,
        `0x208 JUMP 0x20e`,
        `0x20a JUMP 0x20c`,
        `0x20c V2 := 0x01`,
      ].join("\n");

      expect(bufferToAsm(compileTinyC8(source))).toEqual(expected);
    });

    test("short-circuits || across if and else branches", () => {
      const source = `if (V0 == 0x00 || V1 != 0x00) {
  V2 = 0x01
} else {
  V2 = 0x02
}`;
      const expected = [
        `0x200 JUMP IF V0 == 0x00`,
        `0x202 JUMP 0x206`,
        `0x204 JUMP 0x20c`,
        `0x206 JUMP IF V1 != 0x00`,
        `0x208 JUMP 0x210`,
        `0x20a JUMP 0x20c`,
        `0x20c V2 := 0x01`,
        `0x20e JUMP 0x212`,
        `0x210 V2 := 0x02`,
      ].join("\n");

      expect(bufferToAsm(compileTinyC8(source))).toEqual(expected);
    });

    test("gives && higher precedence than ||", () => {
      const source = `if (V0 == 0x00 || V1 == 0x01 && V2 == 0x02) { V3 = 0x01 }`;
      const expected = [
        `0x200 JUMP IF V0 == 0x00`,
        `0x202 JUMP 0x206`,
        `0x204 JUMP 0x212`,
        `0x206 JUMP IF V1 == 0x01`,
        `0x208 JUMP 0x214`,
        `0x20a JUMP 0x20c`,
        `0x20c JUMP IF V2 == 0x02`,
        `0x20e JUMP 0x214`,
        `0x210 JUMP 0x212`,
        `0x212 V3 := 0x01`,
      ].join("\n");

      expect(bufferToAsm(compileTinyC8(source))).toEqual(expected);
    });

    test("supports logical conditions in while loops", () => {
      const source = `while (V0 == 0x00 && V1 != 0x00) { V2 = 0x01 }`;
      const expected = [
        `0x200 JUMP IF V0 == 0x00`,
        `0x202 JUMP 0x210`,
        `0x204 JUMP 0x206`,
        `0x206 JUMP IF V1 != 0x00`,
        `0x208 JUMP 0x210`,
        `0x20a JUMP 0x20c`,
        `0x20c V2 := 0x01`,
        `0x20e JUMP 0x200`,
      ].join("\n");

      expect(bufferToAsm(compileTinyC8(source))).toEqual(expected);
    });

    test("supports logical conditions in do...while loops", () => {
      const source = `do { V2 = 0x01 } while (V0 == 0x00 || V1 == 0x00)`;
      const expected = [
        `0x200 V2 := 0x01`,
        `0x202 JUMP IF V0 == 0x00`,
        `0x204 JUMP 0x208`,
        `0x206 JUMP 0x200`,
        `0x208 JUMP IF V1 == 0x00`,
        `0x20a JUMP 0x20e`,
        `0x20c JUMP 0x200`,
      ].join("\n");

      expect(bufferToAsm(compileTinyC8(source))).toEqual(expected);
    });

    test("supports logical conditions in for-loop tests", () => {
      const source = `for (V0 = 0x01; V0 == 0x00 || V1 != 0x00; V0++) { V2 = 0x01 }`;
      const expected = [
        `0x200 V0 := 0x01`,
        `0x202 V2 := 0x01`,
        `0x204 V0 += 0x01`,
        `0x206 JUMP IF V0 == 0x00`,
        `0x208 JUMP 0x20c`,
        `0x20a JUMP 0x202`,
        `0x20c JUMP IF V1 != 0x00`,
        `0x20e JUMP 0x212`,
        `0x210 JUMP 0x202`,
      ].join("\n");

      expect(bufferToAsm(compileTinyC8(source))).toEqual(expected);
    });
  });

  describe("key condition", () => {
    test.each(["==", "!="])("supports if (KEY %s V0)", (operator) => {
      const source = `if (KEY ${operator} V0) { V1 = 0x01 }`;
      const oppositeOperator = operator === "==" ? "!=" : "==";
      const expected = [
        `0x200 SKIP IF KEY ${oppositeOperator} V0`,
        `0x202 V1 := 0x01`,
      ].join("\n");

      expect(bufferToAsm(compileTinyC8(source))).toEqual(expected);
    });

    test.each(["==", "!="])("supports while (KEY %s V0)", (operator) => {
      const source = `while (KEY ${operator} V0) { V1 = 0x01 }`;
      const expected = [
        `0x200 SKIP IF KEY ${operator} V0`,
        `0x202 JUMP 0x208`,
        `0x204 V1 := 0x01`,
        `0x206 JUMP 0x200`,
      ].join("\n");

      expect(bufferToAsm(compileTinyC8(source))).toEqual(expected);
    });

    test("supports a key condition with an else branch", () => {
      const source = `if (KEY == V0) {
  V1 = 0x01
} else {
  V1 = 0x02
}`;
      const expected = [
        `0x200 SKIP IF KEY == V0`,
        `0x202 JUMP 0x208`,
        `0x204 V1 := 0x01`,
        `0x206 JUMP 0x20a`,
        `0x208 V1 := 0x02`,
      ].join("\n");

      expect(bufferToAsm(compileTinyC8(source))).toEqual(expected);
    });

    test("supports an else-if key condition", () => {
      const source = `if (KEY == V0) {
  V1 = 0x01
} else if (KEY == V2) {
  V1 = 0x02
}`;
      const expected = [
        `0x200 SKIP IF KEY == V0`,
        `0x202 JUMP 0x208`,
        `0x204 V1 := 0x01`,
        `0x206 JUMP 0x20c`,
        `0x208 SKIP IF KEY != V2`,
        `0x20a V1 := 0x02`,
      ].join("\n");

      expect(bufferToAsm(compileTinyC8(source))).toEqual(expected);
    });
  });

  describe("break statement", () => {
    test.each([
      {
        name: "while loop",
        source: `while (V0 == 0x00) { break }
V1 = 0x01`,
        expected: [
          `0x200 JUMP IF V0 == 0x00`,
          `0x202 JUMP 0x208`,
          `0x204 JUMP 0x208`,
          `0x206 JUMP 0x200`,
          `0x208 V1 := 0x01`,
        ],
      },
      {
        name: "do...while loop",
        source: `do { break } while (V0 != 0x00)
V1 = 0x01`,
        expected: [
          `0x200 JUMP 0x206`,
          `0x202 JUMP IF V0 == 0x00`,
          `0x204 JUMP 0x200`,
          `0x206 V1 := 0x01`,
        ],
      },
      {
        name: "for loop",
        source: `for (;;) { break }
V1 = 0x01`,
        expected: [
          `0x200 JUMP 0x204`,
          `0x202 JUMP 0x200`,
          `0x204 V1 := 0x01`,
        ],
      },
    ])("exits a $name", ({ source, expected }) => {
      expect(bufferToAsm(compileTinyC8(source))).toEqual(expected.join("\n"));
    });

    test("breaks only the innermost loop", () => {
      const source = `while (V0 == 0x00) {
  while (V1 == 0x00) { break }
  break
}
V2 = 0x01`;
      const expected = [
        `0x200 JUMP IF V0 == 0x00`,
        `0x202 JUMP 0x210`,
        `0x204 JUMP IF V1 == 0x00`,
        `0x206 JUMP 0x20c`,
        `0x208 JUMP 0x20c`,
        `0x20a JUMP 0x204`,
        `0x20c JUMP 0x210`,
        `0x20e JUMP 0x200`,
        `0x210 V2 := 0x01`,
      ].join("\n");

      expect(bufferToAsm(compileTinyC8(source))).toEqual(expected);
    });

    test("reports a break outside a loop", () => {
      expect(() => compileTinyC8("break")).toThrow(
        "Break statement outside loop",
      );
    });
  });

  describe("goto statement", () => {
    test("jumps to forward and backward labels", () => {
      const testCode = `goto after
start:
V0 += 0x01
goto start
after:
V1 = 0x02`;
      const expectedResult = [
        `0x200 JUMP 0x206`,
        `0x202 V0 += 0x01`,
        `0x204 JUMP 0x202`,
        `0x206 V1 := 0x02`,
      ].join("\n");
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("emits compact branches when both if branches jump", () => {
      const source = `if (KEY == V0) {
  goto pressed
} else {
  goto released
}
pressed:
V1 = 0x01
released:
V2 = 0x02`;
      const expected = [
        `0x200 SKIP IF KEY == V0`,
        `0x202 JUMP 0x208`,
        `0x204 JUMP 0x206`,
        `0x206 V1 := 0x01`,
        `0x208 V2 := 0x02`,
      ].join("\n");

      expect(bufferToAsm(compileTinyC8(source))).toEqual(expected);
    });

    test("resolves labels after generated control flow", () => {
      const testCode = `if (V0 == 0x00) {
  inside:
  goto done
} else {
  V1 = 0x01
}
done:
V2 = 0x02`;
      const expectedResult = [
        `0x200 JUMP IF V0 == 0x00`,
        `0x202 JUMP 0x208`,
        `0x204 JUMP 0x20a`,
        `0x206 JUMP 0x20a`,
        `0x208 V1 := 0x01`,
        `0x20a V2 := 0x02`,
      ].join("\n");
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("reports an unknown label", () => {
      expect(() => compileTinyC8("goto missing")).toThrow(
        "Unknown TinyC8 label 'missing'",
      );
    });

    test("reports duplicate labels", () => {
      expect(() => compileTinyC8("loop:\nloop:")).toThrow(
        "Duplicate TinyC8 label 'loop'",
      );
    });
  });

  describe("if statement", () => {
    test("can have an if statement with an else branch", () => {
      const testCode = `if (V0 == 0x00) { V1 = 0x01 } else { V1 = 0x02 }`;
      const expectedResult = [
        `0x200 JUMP IF V0 == 0x00`,
        `0x202 JUMP 0x208`,
        `0x204 V1 := 0x01`,
        `0x206 JUMP 0x20a`,
        `0x208 V1 := 0x02`,
      ].join("\n");
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });
  });

  describe("do...while loop", () => {
    test("can have single-instruction do...while loop", () => {
      const testCode = `do {V0 = DT} while (V0 != 0x00)`;
      const expectedResult = [
        `0x200 V0 := DT`,
        `0x202 JUMP IF V0 == 0x00`,
        `0x204 JUMP 0x200`,
      ].join("\n");
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have do...while loop with a code block having multiple instructions", () => {
      const testCode = `do {
        V0 = DT
        ST = V1
      } while (V0 != 0x00)`;
      const expectedResult = [
        `0x200 V0 := DT`,
        `0x202 ST := V1`,
        `0x204 JUMP IF V0 == 0x00`,
        `0x206 JUMP 0x200`,
      ].join("\n");
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have do...while loop with opposite condition", () => {
      const testCode = `do {V0 = DT} while (V0 == 0x00)`;
      const expectedResult = [
        `0x200 V0 := DT`,
        `0x202 JUMP IF V0 != 0x00`,
        `0x204 JUMP 0x200`,
      ].join("\n");
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });
  });

  describe("while loop", () => {
    test("checks the condition before running the body", () => {
      const testCode = `while (V0 != 0x00) { V1 = 0x01 }`;
      const expectedResult = [
        `0x200 JUMP IF V0 != 0x00`,
        `0x202 JUMP 0x208`,
        `0x204 V1 := 0x01`,
        `0x206 JUMP 0x200`,
      ].join("\n");
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("loops back after a multi-statement body", () => {
      const testCode = `while (V0 == 0x00) {
        V1 = 0x01
        V2 = 0x02
      }`;
      const expectedResult = [
        `0x200 JUMP IF V0 == 0x00`,
        `0x202 JUMP 0x20a`,
        `0x204 V1 := 0x01`,
        `0x206 V2 := 0x02`,
        `0x208 JUMP 0x200`,
      ].join("\n");
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });
  });

  describe("for loop", () => {
    test("can have an empty infinite loop", () => {
      const testCode = `for(;;){}`;
      const expectedResult = [
        `0x200 JUMP 0x200`,
      ].join("\n");
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have a loop only with initializer", () => {
      const testCode = `for(V0 = 0xff;;){}`;
      const expectedResult = [
        `0x200 V0 := 0xff`,
        `0x202 JUMP 0x202`,
      ].join("\n");
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have a loop only with initializer and step", () => {
      const testCode = `for(V0 = 0xff;; V0 += V1){}`;
      const expectedResult = [
        `0x200 V0 := 0xff`,
        `0x202 V0 += V1`,
        `0x204 JUMP 0x202`,
      ].join("\n");
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("can have a loop only with initializer, condition, and step", () => {
      const testCode = `for(V0 = 0x0f; V0 != 0xff; V0 += V1){}`;
      const expectedResult = [
        `0x200 V0 := 0x0f`,
        `0x202 V0 += V1`,
        `0x204 JUMP IF V0 == 0xff`,
        `0x206 JUMP 0x202`,
      ].join("\n");
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });

    test("supports a postfix decrement as the loop step", () => {
      const testCode = `for(V0 = 0xff; V0 != 0x00; V0--){}`;
      const expectedResult = [
        `0x200 V0 := 0xff`,
        `0x202 V0 += 0xff`,
        `0x204 JUMP IF V0 == 0x00`,
        `0x206 JUMP 0x202`,
      ].join("\n");
      const disassembledResult = bufferToAsm(compileTinyC8(testCode));

      expect(disassembledResult).toEqual(expectedResult);
    });
  });

  describe("code examples", () => {
    test.each(testCodeExamples)(
      "can assign a variable in a single line statement",
      (testCode) => {
        const disassembledResult = bufferToAsm(compileTinyC8(testCode));

        expect(disassembledResult.length).toBeGreaterThan(0);
      },
    );
  });
});

import nearley from "nearley";
// @ts-ignore
import asmGrm from "./asm";

export function compileHex(data: string): Uint8Array {
  if (data === "") {
    return new Uint8Array();
  }

  const lines = data.split("\n");
  const isOddSize = lines[lines.length - 1].length === 4;
  const size = lines.length * 2 - (isOddSize ? 1 : 0);
  const result = new Uint8Array(size);

  for (let i = 0; i < lines.length; i++) {
    const hexStr = lines[i];
    const hex = parseInt(hexStr, 16);
    if (hexStr.length === 4) {
      result[i * 2] = hex & 0xff;
      break;
    }

    result[i * 2] = (hex & 0xff00) >> 8;
    result[i * 2 + 1] = hex & 0x00ff;
  }

  return result;
}

export function compileAsm(data: string): Uint8Array {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(asmGrm));
  parser.feed(data);

  const hexString = parser.results.flat(3).join("\n");
  return compileHex(hexString);
}

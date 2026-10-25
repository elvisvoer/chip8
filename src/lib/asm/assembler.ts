import nearley from "nearley";
// @ts-ignore
import asmGrm from "./asm";

export function compileAsm(data: string): Uint8Array {
  const parser = new nearley.Parser(nearley.Grammar.fromCompiled(asmGrm));
  parser.feed(data);

  const hexString = parser.results.flat(3).join("");
  return Uint8Array.fromHex(hexString);
}

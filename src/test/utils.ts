import { readFileSync } from "node:fs";

export function readRom(path: string): Uint8Array {
  return new Uint8Array(readFileSync(path));
}
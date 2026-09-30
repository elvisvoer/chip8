import { readFileSync } from "node:fs";

export function readRomAsUint8Array(path: string): Uint8Array {
  return new Uint8Array(readFileSync(path));
}
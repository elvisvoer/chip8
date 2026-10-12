import { readFileSync, writeFileSync } from "node:fs";

export function readRom(path: string): Uint8Array {
  return new Uint8Array(readFileSync(path));
}

export function writeRom(path: string, buffer: Uint8Array): void {
  writeFileSync(path, buffer);
}

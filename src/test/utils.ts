import { readFileSync, writeFileSync } from "node:fs";

export function readRom(path: string): Uint8Array {
  return new Uint8Array(readFileSync(path));
}

export function writeRom(path: string, buffer: Uint8Array): void {
  writeFileSync(path, buffer);
}

export function printBuffer(buffer: Uint8Array): void {
  for (let i = 0; i < buffer.length; i += 2) {
    const op = (buffer[i] << 8) | buffer[i + 1];
    console.log(`0x${op.toString(16).padStart(4, '0')}`);
  }
}

export async function fetchRom(fileName: string) {
  try {
    const response = await fetch(fileName);
    if (!response.ok) {
      throw new Error(`Invalid response code: ${response.status}`);
    }

    const blob = await response.blob();

    const buffer: ArrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as ArrayBuffer);
      };
      reader.onerror = (e) => {
        reject(e);
      };
      reader.readAsArrayBuffer(blob);
    });

    return new Uint8Array(buffer);
  } catch (err) {
    console.log("fetchROM error:", err);
  }
}

export async function uploadRom() {
  return new Promise<{ name: string; data: Uint8Array }>((resolve, reject) => {
    let input = document.createElement("input");
    input.type = "file";
    input.accept = ".ch8";
    input.onchange = async (_) => {
      const file = Array.from(input.files!)[0];
      if (file) {
        resolve({
          name: file.name,
          data: new Uint8Array(await file.arrayBuffer()),
        });
      } else {
        reject("No file uploaded");
      }
    };
    input.click();
  });
}

export function circularArray(list: any[]) {
  let current = -1;

  return {
    add: (rom: any) => {
      list.push(rom);
      current = list.length - 1;
      return rom;
    },
    peek: () => list[current],
    next: () => {
      current += 1;
      current = current < list.length ? current : 0; // rotate to first
      return list[current];
    },
    prev: () => {
      current -= 1;
      current = current < 0 ? list.length - 1 : current; // rotate to last
      return list[current];
    },
  };
}

export function decimalToHexStr(val: number, strWidth = 0) {
  let str = val.toString(16).toUpperCase();
  if (str.length < strWidth) {
    str =
      Array(strWidth - str.length)
        .fill("0")
        .join("") + str;
  }

  return str;
}
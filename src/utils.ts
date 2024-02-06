export async function fetchRom(fileName: string) {
  const response = await fetch(fileName);
  if (!response.ok) {
    throw new Error(`Invalid response code: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();

  return new Uint8Array(buffer);
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

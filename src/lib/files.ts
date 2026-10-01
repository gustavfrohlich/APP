// Fájl letöltése és beolvasása a böngészőben (szerver nélkül).

export function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(
  filename: string,
  text: string,
  mime = 'text/plain;charset=utf-8',
): void {
  downloadBlob(filename, new Blob([text], { type: mime }));
}

export function readAsText(file: Blob): Promise<string> {
  return file.text();
}

export function readAsArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  return file.arrayBuffer();
}

/** Fájlválasztó megnyitása programból. */
export function pickFile(accept: string, multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.addEventListener('change', () => resolve(Array.from(input.files ?? [])));
    input.addEventListener('cancel', () => resolve([]));
    input.click();
  });
}

/** Converts a 1-indexed column number to its A1 letter (1 -> A, 27 -> AA). */
export function columnLetter(index: number): string {
  let n = index;
  let letters = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    letters = String.fromCharCode(65 + remainder) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters || "A";
}

export function rowsToObjects(headers: string[], rows: string[][], startRowNumber: number) {
  return rows.map((row, idx) => {
    const values: Record<string, string> = {};
    headers.forEach((header, colIdx) => {
      values[header] = row[colIdx] ?? "";
    });
    return { rowNumber: startRowNumber + idx, values };
  });
}

export function objectToRow(headers: string[], values: Record<string, string>): string[] {
  return headers.map((header) => values[header] ?? "");
}

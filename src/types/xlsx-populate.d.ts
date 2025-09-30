declare module 'xlsx-populate' {
  interface Cell {
    value(): any;
    value(val: any): Cell;
    style(name: string): any;
    style(name: string, value: any): Cell;
    style(styles: { [key: string]: any }): Cell;
  }

  interface Sheet {
    cell(address: string): Cell;
    row(rowNumber: number): any;
    column(columnLetter: string): any;
    name(): string;
    name(name: string): Sheet;
  }

  interface Workbook {
    sheet(sheetNameOrIndex: string | number): Sheet;
    addSheet(name: string): Sheet;
    deleteSheet(sheetNameOrIndex: string | number): Workbook;
    outputAsync(): Promise<ArrayBuffer>;
    outputAsync(type: string): Promise<any>;
  }

  function fromDataAsync(data: ArrayBuffer | Uint8Array | Buffer): Promise<Workbook>;
  function fromFileAsync(path: string): Promise<Workbook>;
  function fromBlankAsync(): Promise<Workbook>;

  export default {
    fromDataAsync,
    fromFileAsync,
    fromBlankAsync
  };
}

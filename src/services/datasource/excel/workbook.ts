import * as XLSX from "xlsx";

const EXCEL_FILE_PATH = "/data/SCHOOL RECONCILIATION 2025.xlsx";

let workbookCache: XLSX.WorkBook | null = null;
let workbookPromise: Promise<XLSX.WorkBook> | null = null;

export async function loadWorkbook(): Promise<XLSX.WorkBook> {
  if (workbookCache) {
    console.log("Using cached workbook");
    return workbookCache;
  }

  if (workbookPromise) {
    console.log("Waiting for existing workbook promise");
    return workbookPromise;
  }

  console.log("Loading Excel workbook from:", EXCEL_FILE_PATH);

  workbookPromise = fetch(`${EXCEL_FILE_PATH}?t=${Date.now()}`, {
    cache: "no-store",
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to fetch Excel file: ${response.status} ${response.statusText}`);
      }

      console.log("Excel file fetched successfully, reading array buffer...");
      const arrayBuffer = await response.arrayBuffer();

      console.log("Array buffer size:", arrayBuffer.byteLength, "bytes");
      console.log("Parsing Excel workbook...");

      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      console.log("Workbook parsed successfully");
      console.log("Found sheets:", workbook.SheetNames);

      workbookCache = workbook;
      return workbook;
    })
    .finally(() => {
      workbookPromise = null;
    });

  return workbookPromise;
}

export function clearWorkbookCache() {
  console.log("Clearing workbook cache");
  workbookCache = null;
  workbookPromise = null;
}

export function getSheetNames(): string[] {
  return workbookCache?.SheetNames || [];
}

export function sheetExists(sheetName: string): boolean {
  return workbookCache ? workbookCache.SheetNames.includes(sheetName) : false;
}

export function getSheet(sheetName: string): XLSX.WorkSheet | undefined {
  return workbookCache?.Sheets[sheetName];
}

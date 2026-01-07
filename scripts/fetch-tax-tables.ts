import * as fs from "fs";
import * as path from "path";

const API_BASE_URL =
  "https://skatteverket.entryscape.net/rowstore/dataset/88320397-5c32-4c16-ae79-d36d95b17b95/json";

const YEAR = process.argv[2] || "2026";
const VALID_TABLES = [29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42];
const PERIOD = "30B"; // Monthly

interface ApiRow {
  år: string;
  tabellnr: string;
  "antal dgr": string;
  "inkomst fr.o.m.": string;
  "inkomst t.o.m.": string;
  "kolumn 1": string;
  "kolumn 2": string;
  "kolumn 3": string;
  "kolumn 4": string;
  "kolumn 5": string;
  "kolumn 6": string;
  "kolumn 7": string;
}

interface ApiResponse {
  resultCount: number;
  results: ApiRow[];
  next?: string;
}

interface TaxBracket {
  incomeFrom: number;
  incomeTo: number;
  columns: number[];
}

interface TaxTablesData {
  year: number;
  period: string;
  fetchedAt: string;
  tables: Record<string, TaxBracket[]>;
}

async function fetchPage(
  offset: number,
  limit: number = 500
): Promise<ApiResponse> {
  const params = new URLSearchParams({
    år: YEAR,
    "antal dgr": PERIOD,
    _offset: offset.toString(),
    _limit: limit.toString(),
  });

  const url = `${API_BASE_URL}?${params}`;
  console.log(`  Fetching offset ${offset}...`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as ApiResponse;
}

async function fetchAllData(): Promise<ApiRow[]> {
  const allRows: ApiRow[] = [];
  let offset = 0;
  const limit = 500;
  let totalCount = 0;

  console.log(`Fetching tax tables for year ${YEAR}, period ${PERIOD}...`);

  // First request to get total count
  const firstPage = await fetchPage(offset, limit);
  totalCount = firstPage.resultCount;
  console.log(`Total records available: ${totalCount}`);

  allRows.push(...firstPage.results);
  offset += limit;

  // Fetch remaining pages
  while (offset < totalCount) {
    await sleep(100); // Rate limiting
    const page = await fetchPage(offset, limit);
    allRows.push(...page.results);
    offset += limit;
    console.log(`  Progress: ${Math.min(offset, totalCount)}/${totalCount}`);
  }

  return allRows;
}

function transformData(rows: ApiRow[]): TaxTablesData {
  const tables: Record<string, TaxBracket[]> = {};

  // Filter for valid tables only
  const filteredRows = rows.filter((row) => {
    const tableNum = parseInt(row.tabellnr, 10);
    return VALID_TABLES.includes(tableNum);
  });

  console.log(
    `\nFiltered ${filteredRows.length} rows for tables ${VALID_TABLES.join(", ")}`
  );

  // Group by table number
  for (const row of filteredRows) {
    const tableNum = row.tabellnr;

    if (!tables[tableNum]) {
      tables[tableNum] = [];
    }

    const bracket: TaxBracket = {
      incomeFrom: parseInt(row["inkomst fr.o.m."], 10) || 0,
      incomeTo: parseInt(row["inkomst t.o.m."], 10) || 999999,
      columns: [
        parseInt(row["kolumn 1"], 10) || 0,
        parseInt(row["kolumn 2"], 10) || 0,
        parseInt(row["kolumn 3"], 10) || 0,
        parseInt(row["kolumn 4"], 10) || 0,
        parseInt(row["kolumn 5"], 10) || 0,
        parseInt(row["kolumn 6"], 10) || 0,
      ],
    };

    tables[tableNum].push(bracket);
  }

  // Sort brackets by income range within each table
  for (const tableNum of Object.keys(tables)) {
    tables[tableNum].sort((a, b) => a.incomeFrom - b.incomeFrom);
  }

  return {
    year: parseInt(YEAR, 10),
    period: PERIOD,
    fetchedAt: new Date().toISOString(),
    tables,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const outputPath = path.join(
    process.cwd(),
    "public",
    `tax-tables-${YEAR}.json`
  );

  try {
    // Fetch all data from API
    const rows = await fetchAllData();
    console.log(`\nFetched ${rows.length} total rows`);

    // Transform to our format
    const data = transformData(rows);

    // Validate we got all tables
    const tableCount = Object.keys(data.tables).length;
    console.log(`\nProcessed ${tableCount} tables:`);
    for (const tableNum of VALID_TABLES) {
      const brackets = data.tables[tableNum.toString()];
      if (brackets) {
        console.log(`  Tabell ${tableNum}: ${brackets.length} income brackets`);
      } else {
        console.log(`  Tabell ${tableNum}: MISSING!`);
      }
    }

    // Write output
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
    console.log(`\nSaved to: ${outputPath}`);

    // Show file size
    const stats = fs.statSync(outputPath);
    console.log(`File size: ${(stats.size / 1024).toFixed(1)} KB`);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();

interface BankTransactionRow {
  date: string;
  amount: number;
  description: string;
  reference?: string;
  balance?: number;
}

export interface ParsedBankTransaction {
  accountingDate: string;
  amount: number;
  reference: string;
  bookedBalance?: number;
}

export function parseCSV(content: string, bankFormat?: string): ParsedBankTransaction[] {
  const lines = content.split("\n").filter((line) => line.trim());
  
  if (lines.length === 0) {
    throw new Error("CSV-filen är tom");
  }

  const transactions: ParsedBankTransaction[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseCSVLine(line);
    
    if (parts.length < 3) continue;

    try {
      const date = parseDate(parts[0], bankFormat);
      const amount = parseAmount(parts[parts.length - 2] || parts[parts.length - 1]);
      const description = parts.slice(1, -2).join(" ").trim() || parts[1]?.trim() || "";
      const balance = parts[parts.length - 1] ? parseAmount(parts[parts.length - 1]) : undefined;

      if (date && !isNaN(amount)) {
        transactions.push({
          accountingDate: date,
          amount,
          reference: description,
          bookedBalance: balance,
        });
      }
    } catch (error) {
      continue;
    }
  }

  return transactions;
}

function parseCSVLine(line: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  
  if (current) {
    parts.push(current.trim());
  }

  return parts;
}

function parseDate(dateStr: string, bankFormat?: string): string | null {
  const cleaned = dateStr.replace(/"/g, "").trim();
  
  const formats = [
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{4})(\d{2})(\d{2})$/,
    /^(\d{2})\/(\d{2})\/(\d{4})$/,
    /^(\d{2})-(\d{2})-(\d{4})$/,
    /^(\d{2})\.(\d{2})\.(\d{4})$/,
    /^(\d{2})\/(\d{2})\/(\d{2})$/,
  ];

  for (const format of formats) {
    const match = cleaned.match(format);
    if (match) {
      let year: string;
      let month: string;
      let day: string;

      if (format === formats[0] || format === formats[1]) {
        year = match[1];
        month = match[2];
        day = match[3];
      } else if (format === formats[5]) {
        year = "20" + match[3];
        month = match[2];
        day = match[1];
      } else {
        year = match[3];
        month = match[2];
        day = match[1];
      }

      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

function parseAmount(amountStr: string): number {
  const cleaned = amountStr.replace(/[^\d,.-]/g, "").trim();
  
  const normalized = cleaned.replace(",", ".");
  const amount = parseFloat(normalized);
  
  return isNaN(amount) ? 0 : amount;
}

export function parseOFX(content: string): ParsedBankTransaction[] {
  const transactions: ParsedBankTransaction[] = [];
  
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/g;
  let match;

  while ((match = stmtTrnRegex.exec(content)) !== null) {
    const trnContent = match[1];
    
    const dtPostedMatch = trnContent.match(/<DTPOSTED>(\d{8})/);
    const trnAmtMatch = trnContent.match(/<TRNAMT>([-\d.]+)/);
    const memoMatch = trnContent.match(/<MEMO>(.*?)(?:<|$)/);
    const fitIdMatch = trnContent.match(/<FITID>(.*?)(?:<|$)/);

    if (dtPostedMatch && trnAmtMatch) {
      const dateStr = dtPostedMatch[1];
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const date = `${year}-${month}-${day}`;

      const amount = parseFloat(trnAmtMatch[1]);
      const reference = (memoMatch?.[1] || fitIdMatch?.[1] || "").trim();

      transactions.push({
        accountingDate: date,
        amount,
        reference,
      });
    }
  }

  return transactions;
}

export function detectFileFormat(fileName: string, content: string): "csv" | "ofx" | "unknown" {
  const lowerName = fileName.toLowerCase();
  
  if (lowerName.endsWith(".ofx") || content.includes("<OFX>")) {
    return "ofx";
  }
  
  if (lowerName.endsWith(".csv") || content.includes(",")) {
    return "csv";
  }
  
  return "unknown";
}


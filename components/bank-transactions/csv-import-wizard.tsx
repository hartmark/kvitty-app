"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Loader2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { CsvFieldMapper } from "./csv-field-mapper";
import { CsvPreviewTable } from "./csv-preview-table";
import {
  parseRawCsv,
  applyMapping,
  getSampleValue,
  detectIntraBatchDuplicates,
} from "@/lib/utils/csv-parser";
import type {
  CsvFieldMapping,
  AiFieldMapping,
  CsvConfig,
} from "@/lib/validations/csv-import";

interface CsvImportWizardProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bankAccountId?: string;
}

type Step = "upload" | "mapping" | "preview" | "result";

interface ParsedTransaction {
  rowIndex: number;
  rawValues: string[];
  parsed: {
    accountingDate: string | null;
    amount: number | null;
    reference: string | null;
    bookedBalance: number | null;
  };
  isDuplicate: boolean;
  firstOccurrenceRow?: number;
  validationErrors: string[];
}

export function CsvImportWizard({
  workspaceId,
  open,
  onOpenChange,
  bankAccountId,
}: CsvImportWizardProps) {
  const router = useRouter();
  const utils = trpc.useUtils();

  // Wizard state
  const [step, setStep] = useState<Step>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  // Parsed CSV data
  const [headers, setHeaders] = useState<string[]>([]);
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [sampleValues, setSampleValues] = useState<Record<number, string[]>>(
    {}
  );

  // Field mapping
  const [mapping, setMapping] = useState<CsvFieldMapping>({
    accountingDate: null,
    amount: null,
    reference: null,
    bookedBalance: null,
  });
  const [aiMapping, setAiMapping] = useState<AiFieldMapping | null>(null);
  const [csvConfig, setCsvConfig] = useState<CsvConfig>({
    separator: ";",
    hasHeaderRow: true,
    skipRows: 0,
    decimalSeparator: ",",
  });

  // Preview
  const [transactions, setTransactions] = useState<ParsedTransaction[]>([]);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

  // Result
  const [importedCount, setImportedCount] = useState(0);

  // AI field detection
  const detectMutation = trpc.bankTransactions.detectCsvMapping.useMutation({
    onSuccess: (data) => {
      setAiMapping(data);
      setMapping(data.mapping);
      setStep("mapping");
    },
    onError: (error) => {
      toast.error("AI-detektering misslyckades", {
        description: error.message + ". Du kan mappa fälten manuellt.",
      });
      setStep("mapping");
    },
  });

  // Import mutation
  const importMutation = trpc.bankTransactions.importParsedTransactions.useMutation({
    onSuccess: (data) => {
      setImportedCount(data.imported);
      setStep("result");
      utils.bankTransactions.list.invalidate({ workspaceId });
      router.refresh();
    },
    onError: (error) => {
      toast.error("Import misslyckades", { description: error.message });
    },
  });

  // File drop handler
  const onDrop = useCallback(
    (acceptedFiles: globalThis.File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setSelectedFile(file);
      setIsParsing(true);

      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);

        // Try UTF-8 first, fallback to Latin-1 for Swedish bank exports
        let content = new TextDecoder("utf-8").decode(bytes);
        if (content.includes("\ufffd") || content.includes("�")) {
          content = new TextDecoder("iso-8859-1").decode(bytes);
        }

        try {
          const result = parseRawCsv(content);

          if (result.headers.length === 0) {
            toast.error("Kunde inte läsa filen", {
              description: "CSV-filen verkar vara tom eller har ogiltigt format",
            });
            setIsParsing(false);
            return;
          }

          setHeaders(result.headers);
          setParsedRows(result.rows);
          setCsvConfig((prev) => ({ ...prev, separator: result.separator }));

          // Get sample values for column preview
          const samples: Record<number, string[]> = {};
          for (let i = 0; i < result.headers.length; i++) {
            samples[i] = getSampleValue(result.rows, i, 3);
          }
          setSampleValues(samples);
          setIsParsing(false);

          // Auto-detect mapping with AI
          detectMutation.mutate({
            workspaceId,
            headers: result.headers,
            sampleRows: result.rows.slice(0, 10),
          });
        } catch (error) {
          toast.error("Kunde inte läsa filen", {
            description:
              error instanceof Error ? error.message : "Okänt fel vid parsning",
          });
          setIsParsing(false);
        }
      };

      reader.onerror = () => {
        toast.error("Kunde inte läsa filen", {
          description: "Kontrollera att filen inte är skadad.",
        });
        setIsParsing(false);
      };

      reader.readAsArrayBuffer(file);
    },
    [workspaceId, detectMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "text/plain": [".csv", ".txt"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  // Process and go to preview
  const handleContinueToPreview = () => {
    if (mapping.accountingDate === null || mapping.amount === null) {
      toast.error("Fälten Datum och Belopp måste mappas");
      return;
    }

    // Parse all rows
    const parsed = parsedRows.map((row, index) => {
      const result = applyMapping(row, mapping, csvConfig);
      return {
        rowIndex: index,
        rawValues: row,
        parsed: {
          accountingDate: result.accountingDate,
          amount: result.amount,
          reference: result.reference,
          bookedBalance: result.bookedBalance,
        },
        validationErrors: result.validationErrors,
      };
    });

    // Detect duplicates within the batch
    const duplicateMap = detectIntraBatchDuplicates(
      parsed.map((t) => ({
        rowIndex: t.rowIndex,
        accountingDate: t.parsed.accountingDate,
        amount: t.parsed.amount,
        reference: t.parsed.reference,
      }))
    );

    // Build final list with duplicate info
    const withDuplicates: ParsedTransaction[] = parsed.map((t) => ({
      ...t,
      isDuplicate: duplicateMap.has(t.rowIndex),
      firstOccurrenceRow: duplicateMap.get(t.rowIndex),
    }));

    setTransactions(withDuplicates);

    // Auto-select valid, non-duplicate rows
    const valid = new Set<number>();
    for (const t of withDuplicates) {
      const isValid =
        t.validationErrors.length === 0 &&
        t.parsed.accountingDate !== null &&
        t.parsed.amount !== null;
      if (isValid && !t.isDuplicate) {
        valid.add(t.rowIndex);
      }
    }
    setSelectedRows(valid);
    setStep("preview");
  };

  // Import selected transactions
  const handleImport = () => {
    const toImport = transactions
      .filter((t) => selectedRows.has(t.rowIndex))
      .filter((t) => t.parsed.accountingDate && t.parsed.amount !== null)
      .map((t) => ({
        accountingDate: t.parsed.accountingDate!,
        amount: t.parsed.amount!,
        reference: t.parsed.reference,
        bookedBalance: t.parsed.bookedBalance,
      }));

    if (toImport.length === 0) {
      toast.error("Inga giltiga transaktioner att importera");
      return;
    }

    // Check if user selected any duplicates
    const hasSelectedDuplicates = transactions.some(
      (t) => selectedRows.has(t.rowIndex) && t.isDuplicate
    );

    importMutation.mutate({
      workspaceId,
      bankAccountId,
      fileName: selectedFile?.name || "import.csv",
      transactions: toImport,
      allowIntraBatchDuplicates: hasSelectedDuplicates,
    });
  };

  // Reset and close
  const handleClose = () => {
    setStep("upload");
    setSelectedFile(null);
    setIsParsing(false);
    setHeaders([]);
    setParsedRows([]);
    setSampleValues({});
    setMapping({
      accountingDate: null,
      amount: null,
      reference: null,
      bookedBalance: null,
    });
    setAiMapping(null);
    setCsvConfig({
      separator: ";",
      hasHeaderRow: true,
      skipRows: 0,
      decimalSeparator: ",",
    });
    setTransactions([]);
    setSelectedRows(new Set());
    setImportedCount(0);
    onOpenChange(false);
  };

  // Computed values
  const isLoading = isParsing || detectMutation.isPending;
  const canContinueToPreview =
    mapping.accountingDate !== null && mapping.amount !== null;

  const stats = {
    total: transactions.length,
    valid: transactions.filter(
      (t) =>
        t.validationErrors.length === 0 &&
        t.parsed.accountingDate &&
        t.parsed.amount !== null &&
        !t.isDuplicate
    ).length,
    duplicates: transactions.filter((t) => t.isDuplicate).length,
    errors: transactions.filter((t) => t.validationErrors.length > 0).length,
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="min-w-2xl max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Importera CSV-fil"}
            {step === "mapping" && "Mappa fält"}
            {step === "preview" && "Förhandsgranska import"}
            {step === "result" && "Import slutförd"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Ladda upp en CSV-fil med banktransaktioner."}
            {step === "mapping" &&
              "Verifiera att rätt kolumner är mappade till rätt fält."}
            {step === "preview" &&
              "Granska transaktionerna som kommer att importeras."}
            {step === "result" && "Importen är slutförd."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {/* Upload Step */}
          {step === "upload" && (
            <div className="space-y-4">
              <div
                {...getRootProps()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                  ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
                `}
              >
                <input {...getInputProps()} />
                {isLoading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {isParsing && "Läser filen..."}
                      {detectMutation.isPending && "Analyserar kolumner..."}
                    </p>
                  </div>
                ) : (
                  <>
                    <Upload className="size-10 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground mb-1">
                      {isDragActive
                        ? "Släpp filen här..."
                        : "Dra och släpp en CSV-fil här, eller klicka för att välja"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Stödjer CSV-filer från svenska banker
                    </p>
                  </>
                )}
              </div>

            </div>
          )}

          {/* Mapping Step */}
          {step === "mapping" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <FileText className="size-8 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{selectedFile?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {headers.length} kolumner • {parsedRows.length} rader
                  </p>
                </div>
              </div>

              <CsvFieldMapper
                headers={headers}
                sampleValues={sampleValues}
                mapping={mapping}
                aiMapping={aiMapping}
                onChange={setMapping}
              />
            </div>
          )}

          {/* Preview Step */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Totalt:</span>
                  <Badge variant="secondary">{stats.total}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Giltiga:</span>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800"
                  >
                    {stats.valid}
                  </Badge>
                </div>
                {stats.duplicates > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Dubbletter:</span>
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-800"
                    >
                      {stats.duplicates}
                    </Badge>
                  </div>
                )}
                {stats.errors > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Fel:</span>
                    <Badge variant="destructive">{stats.errors}</Badge>
                  </div>
                )}
              </div>

              <CsvPreviewTable
                transactions={transactions}
                selectedRows={selectedRows}
                onSelectionChange={setSelectedRows}
              />

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm">
                  <span className="font-medium">{selectedRows.size}</span> av{" "}
                  <span className="font-medium">{stats.total}</span>{" "}
                  transaktioner valda
                </span>
              </div>
            </div>
          )}

          {/* Result Step */}
          {step === "result" && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center size-16 rounded-full bg-green-100 mb-4">
                <CheckCircle2 className="size-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium mb-2">Import slutförd</h3>
              <p className="text-muted-foreground">
                <span className="text-2xl font-semibold text-foreground">
                  {importedCount}
                </span>{" "}
                transaktioner importerades
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {step === "mapping" && (
              <Button variant="ghost" onClick={() => setStep("upload")}>
                <ChevronLeft className="size-4 mr-1" />
                Tillbaka
              </Button>
            )}
            {step === "preview" && (
              <Button variant="ghost" onClick={() => setStep("mapping")}>
                <ChevronLeft className="size-4 mr-1" />
                Tillbaka
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              {step === "result" ? "Stäng" : "Avbryt"}
            </Button>

            {step === "mapping" && (
              <Button
                onClick={handleContinueToPreview}
                disabled={!canContinueToPreview}
              >
                Förhandsgranska
                <ChevronRight className="size-4 ml-1" />
              </Button>
            )}

            {step === "preview" && (
              <Button
                onClick={handleImport}
                disabled={selectedRows.size === 0 || importMutation.isPending}
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Importerar...
                  </>
                ) : (
                  <>
                    Importera {selectedRows.size} transaktioner
                    <ChevronRight className="size-4 ml-1" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

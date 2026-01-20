"use client";

import { useState, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import {
  Upload,
  FileText,
  Check,
  Warning,
  X,
  ArrowRight,
  ArrowLeft,
  CircleNotch,
  Download,
  Calendar,
  User,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc/client";
import { useWorkspace } from "@/components/workspace-provider";
import { SIEImportPreview } from "@/components/bookkeeping/sie-import-preview";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

interface SIEImportSectionProps {
  workspaceId: string;
  workspaceSlug: string;
}

type Step = "upload" | "preview" | "result";

interface PreviewVerification {
  sourceId: string;
  date: string;
  description: string;
  lines: Array<{
    accountNumber: number;
    accountName: string;
    debit: number;
    credit: number;
    description?: string;
  }>;
  balanced: boolean;
  totalDebit: number;
  totalCredit: number;
}

interface PreviewData {
  format: string;
  verifications: PreviewVerification[];
  accounts: Array<{ id: string; name: string; type: string }>;
  companyName?: string;
  orgNumber?: string;
  fiscalYear?: { start: string; end: string };
  softwareProduct?: string;
  errors: string[];
  warnings: string[];
}

export function SIEImportSection({
  workspaceId,
  workspaceSlug,
}: SIEImportSectionProps) {
  const { periods } = useWorkspace();
  const [step, setStep] = useState<Step>("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState(periods[0]?.id || "");
  const [selectedVerifications, setSelectedVerifications] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    message: string;
  } | null>(null);

  const utils = trpc.useUtils();

  const { data: imports, isLoading: isLoadingImports } = trpc.journalEntries.listSIEImports.useQuery(
    { workspaceId },
    { enabled: step === "upload" }
  );

  const previewMutation = trpc.journalEntries.previewSIEImport.useMutation({
    onSuccess: (data) => {
      setPreviewData(data);
      setSelectedVerifications(new Set(data.verifications.map((v) => v.sourceId)));
      setStep("preview");
    },
    onError: (error) => {
      toast.error("Kunde inte läsa filen", {
        description: error.message,
      });
    },
  });

  const importMutation = trpc.journalEntries.importSIE.useMutation({
    onSuccess: (data) => {
      setImportResult(data);
      setStep("result");
      utils.journalEntries.list.invalidate();
      utils.journalEntries.listSIEImports.invalidate();
    },
    onError: (error) => {
      toast.error("Import misslyckades", {
        description: error.message,
      });
    },
  });

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setSelectedFile(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const bytes = new Uint8Array(arrayBuffer);
        let binary = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64Content = btoa(binary);
        setFileContent(base64Content);

        previewMutation.mutate({
          workspaceId,
          fileContent: base64Content,
          fileName: file.name,
        });
      };
      reader.onerror = () => {
        toast.error("Kunde inte läsa filen", {
          description: "Kontrollera att filen inte är skadad.",
        });
      };
      reader.readAsArrayBuffer(file);
    },
    [workspaceId, previewMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/xml": [".sie", ".se", ".si"],
      "text/plain": [".sie", ".se", ".si"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
  });

  const handleImport = () => {
    if (!previewData || selectedVerifications.size === 0) return;

    const verificationsToImport = previewData.verifications
      .filter((v) => selectedVerifications.has(v.sourceId))
      .map((v) => ({
        sourceId: v.sourceId,
        date: v.date,
        description: v.description,
        lines: v.lines,
      }));

    const fileFormat = previewData.format.toLowerCase() === "sie5" ? "sie5" : "sie4";

    importMutation.mutate({
      workspaceId,
      fiscalPeriodId: selectedPeriodId,
      verifications: verificationsToImport,
      sourceFileName: selectedFile?.name || "unknown.sie",
      fileContent: fileContent || undefined,
      fileFormat,
    });
  };

  const handleReset = () => {
    setStep("upload");
    setSelectedFile(null);
    setFileContent(null);
    setPreviewData(null);
    setSelectedVerifications(new Set());
    setImportResult(null);
  };

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  const verificationsInPeriod =
    previewData?.verifications.filter(
      (v) =>
        selectedPeriod && v.date >= selectedPeriod.startDate && v.date <= selectedPeriod.endDate
    ) || [];

  const verificationsOutsidePeriod = (previewData?.verifications.length || 0) - verificationsInPeriod.length;

  useEffect(() => {
    if (previewData && selectedPeriod) {
      const validIds = new Set(
        previewData.verifications
          .filter((v) => v.date >= selectedPeriod.startDate && v.date <= selectedPeriod.endDate)
          .map((v) => v.sourceId)
      );
      setSelectedVerifications((prev) => new Set([...prev].filter((id) => validIds.has(id))));
    }
  }, [selectedPeriodId, previewData, selectedPeriod]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-500">Slutförd</Badge>;
      case "processing":
        return <Badge variant="secondary">Bearbetar</Badge>;
      case "failed":
        return <Badge variant="destructive">Misslyckades</Badge>;
      default:
        return <Badge variant="secondary">Väntar</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>SIE Import</CardTitle>
        <CardDescription>
          Importera verifikationer från SIE-filer från andra bokföringssystem
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {step === "upload" && (
          <>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}
              `}
            >
              <input {...getInputProps()} />
              {previewMutation.isPending ? (
                <div className="flex flex-col items-center gap-2">
                  <Spinner className="size-8" />
                  <p className="text-muted-foreground">Läser filen...</p>
                </div>
              ) : (
                <>
                  <Upload className="size-10 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-1">
                    {isDragActive
                      ? "Släpp filen här..."
                      : "Dra och släpp en SIE-fil här, eller klicka för att välja"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Stödjer SIE4 (.sie) och SIE5 (.sie) format, max 10 MB
                  </p>
                </>
              )}
            </div>

            {imports && imports.length > 0 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Tidigare importer</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Filnamn</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Datum</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Importerade</TableHead>
                        <TableHead className="text-right">Dubbletter</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {imports.map((importBatch) => (
                        <TableRow key={importBatch.id}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <FileText className="size-4 text-muted-foreground" />
                              {importBatch.fileName}
                            </div>
                          </TableCell>
                          <TableCell>
                            {importBatch.fiscalPeriod?.label || "Okänd"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(importBatch.importedAt), "PPP", { locale: sv })}
                          </TableCell>
                          <TableCell>{getStatusBadge(importBatch.status)}</TableCell>
                          <TableCell className="text-right">
                            {importBatch.importedVerifications}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {importBatch.duplicateVerifications}
                          </TableCell>
                          <TableCell>
                            {importBatch.fileUrl && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  window.open(importBatch.fileUrl!, "_blank");
                                }}
                              >
                                <Download className="size-4 mr-2" />
                                Ladda ner
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {isLoadingImports && (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            )}

            {imports && imports.length === 0 && !isLoadingImports && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="size-12 mx-auto mb-2 opacity-50" />
                <p>Inga tidigare importer</p>
              </div>
            )}
          </>
        )}

        {step === "preview" && previewData && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <FileText className="size-8 text-muted-foreground" weight="duotone" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{selectedFile?.name}</p>
                <p className="text-sm text-muted-foreground">
                  {previewData.format.toUpperCase()} format
                  {previewData.companyName && ` • ${previewData.companyName}`}
                  {previewData.softwareProduct && ` • ${previewData.softwareProduct}`}
                </p>
              </div>
              <Badge variant="secondary">{previewData.verifications.length} verifikationer</Badge>
            </div>

            {previewData.errors.length > 0 && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <X className="size-4" weight="bold" />
                  <span className="font-medium">Fel vid inlasning</span>
                </div>
                <ul className="list-disc list-inside text-sm text-destructive">
                  {previewData.errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            {previewData.warnings.length > 0 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-600 mb-2">
                  <Warning className="size-4" weight="bold" />
                  <span className="font-medium">Varningar</span>
                </div>
                <ul className="list-disc list-inside text-sm text-yellow-600">
                  {previewData.warnings.slice(0, 5).map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                  {previewData.warnings.length > 5 && (
                    <li>...och {previewData.warnings.length - 5} till</li>
                  )}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label>Importera till period</Label>
                <Select value={selectedPeriodId} onValueChange={setSelectedPeriodId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Välj period" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem
                        key={period.id}
                        value={period.id}
                        disabled={period.isLocked}
                      >
                        {period.label}
                        {period.isLocked && " (låst)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {verificationsOutsidePeriod > 0 && (
                <div className="text-sm text-muted-foreground">
                  <Warning className="size-4 inline-block mr-1" />
                  {verificationsOutsidePeriod} verifikationer utanför perioden
                </div>
              )}
            </div>

            <SIEImportPreview
              verifications={verificationsInPeriod}
              selectedIds={selectedVerifications}
              onSelectionChange={setSelectedVerifications}
            />

            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="text-sm">
                <span className="font-medium">{selectedVerifications.size}</span> av{" "}
                <span className="font-medium">{verificationsInPeriod.length}</span> verifikationer valda
              </div>
              <div className="text-sm text-muted-foreground">
                Totalt:{" "}
                {formatCurrency(
                  verificationsInPeriod
                    .filter((v) => selectedVerifications.has(v.sourceId))
                    .reduce((sum, v) => sum + v.totalDebit, 0)
                )}{" "}
                debet
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={handleReset}>
                Avbryt
              </Button>
              <Button
                onClick={handleImport}
                disabled={
                  selectedVerifications.size === 0 ||
                  importMutation.isPending ||
                  selectedPeriod?.isLocked
                }
              >
                {importMutation.isPending ? (
                  <>
                    <CircleNotch className="size-4 mr-2 animate-spin" />
                    Importerar...
                  </>
                ) : (
                  <>
                    Importera {selectedVerifications.size} verifikationer
                    <ArrowRight className="size-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "result" && importResult && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center size-16 rounded-full bg-green-100 mb-4">
              <Check className="size-8 text-green-600" weight="bold" />
            </div>
            <h3 className="text-lg font-medium mb-2">Import slutförd</h3>
            <p className="text-muted-foreground mb-4">{importResult.message}</p>
            <div className="flex justify-center gap-6 text-sm mb-6">
              <div>
                <div className="text-2xl font-semibold text-green-600">{importResult.imported}</div>
                <div className="text-muted-foreground">importerade</div>
              </div>
              {importResult.skipped > 0 && (
                <div>
                  <div className="text-2xl font-semibold text-muted-foreground">
                    {importResult.skipped}
                  </div>
                  <div className="text-muted-foreground">dubbletter</div>
                </div>
              )}
            </div>
            <Button onClick={handleReset}>
              Importera en till fil
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

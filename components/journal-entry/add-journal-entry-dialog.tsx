"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Plus, Receipt, Money, FileText, DotsThree, Check, ArrowLeft, CloudArrowUp, X, File } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldError,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { JournalEntryLineRow } from "./journal-entry-line-row";
import { AIChat } from "@/components/ai-chat";
import { trpc } from "@/lib/trpc/client";
import type { fiscalPeriods } from "@/lib/db/schema";
import type { JournalEntryLineInput, JournalEntryType } from "@/lib/validations/journal-entry";

type FiscalPeriod = typeof fiscalPeriods.$inferSelect;

interface AddJournalEntryDialogProps {
  workspaceId: string;
  periods: FiscalPeriod[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultPeriodId?: string;
}

const entryTypes: { value: JournalEntryType; label: string; description: string; icon: typeof Receipt }[] = [
  { value: "kvitto", label: "Kvitto/Utgift", description: "Registrera inköp och utlägg", icon: Receipt },
  { value: "inkomst", label: "Inkomst", description: "Bokför försäljning och intäkter", icon: Money },
  { value: "leverantorsfaktura", label: "Leverantörsfaktura", description: "Hantera fakturor från leverantörer", icon: FileText },
  { value: "annat", label: "Annat", description: "Övriga bokföringshändelser", icon: DotsThree },
];

const emptyLine: JournalEntryLineInput = {
  accountNumber: 0,
  accountName: "",
  debit: undefined,
  credit: undefined,
};

export function AddJournalEntryDialog({
  workspaceId,
  periods,
  open,
  onOpenChange,
  defaultPeriodId,
}: AddJournalEntryDialogProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [fiscalPeriodId, setFiscalPeriodId] = useState(defaultPeriodId || periods[0]?.id || "");
  const [entryType, setEntryType] = useState<JournalEntryType>("kvitto");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [lines, setLines] = useState<JournalEntryLineInput[]>([
    { ...emptyLine },
    { ...emptyLine },
  ]);
  const [files, setFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeReceipt = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/analyze-receipt", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Pre-fill the form with analyzed data
        if (result.data.date) {
          setEntryDate(result.data.date);
        }
        if (result.data.suggestedEntry) {
          if (result.data.suggestedEntry.description) {
            setDescription(result.data.suggestedEntry.description);
          }
          if (result.data.suggestedEntry.lines) {
            setLines(
              result.data.suggestedEntry.lines.map((l: { accountNumber: number; accountName: string; debit: number; credit: number }) => ({
                accountNumber: l.accountNumber,
                accountName: l.accountName,
                debit: l.debit || undefined,
                credit: l.credit || undefined,
              }))
            );
          }
        } else if (result.data.description) {
          setDescription(result.data.description);
        }
        // Move to step 2 to show the pre-filled form
        setStep(2);
      }
    } catch (err) {
      console.error("Failed to analyze receipt:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
    // Analyze the first image file
    const imageFile = acceptedFiles.find((f) => f.type.startsWith("image/"));
    if (imageFile) {
      analyzeReceipt(imageFile);
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "application/pdf": [".pdf"],
    },
  });

  const utils = trpc.useUtils();

  const addAttachment = trpc.journalEntries.addAttachment.useMutation();

  const uploadFiles = async (journalEntryId: string) => {
    for (const file of files) {
      try {
        // Upload to blob storage
        const res = await fetch(
          `/api/upload?filename=${encodeURIComponent(file.name)}`,
          {
            method: "POST",
            body: file,
          }
        );

        if (!res.ok) continue;

        const { url } = await res.json();

        // Create attachment record
        await addAttachment.mutateAsync({
          workspaceId,
          journalEntryId,
          fileName: file.name,
          fileUrl: url,
          fileSize: file.size,
          mimeType: file.type,
        });
      } catch (err) {
        console.error("Failed to upload file:", file.name, err);
      }
    }
  };

  const createEntry = trpc.journalEntries.create.useMutation({
    onSuccess: async (data) => {
      // Upload files if any
      if (files.length > 0) {
        setIsUploading(true);
        await uploadFiles(data.id);
        setIsUploading(false);
      }
      utils.journalEntries.list.invalidate();
      onOpenChange(false);
      resetForm();
      router.refresh();
    },
    onError: (err) => {
      setError(err.message);
      setIsUploading(false);
    },
  });

  const resetForm = () => {
    setStep(1);
    setEntryType("kvitto");
    setEntryDate(new Date().toISOString().split("T")[0]);
    setDescription("");
    setLines([{ ...emptyLine }, { ...emptyLine }]);
    setFiles([]);
    setIsAnalyzing(false);
    setIsUploading(false);
    setError(null);
  };

  const handleLineChange = (index: number, line: JournalEntryLineInput) => {
    const newLines = [...lines];
    newLines[index] = line;
    setLines(newLines);
  };

  const handleRemoveLine = (index: number) => {
    if (lines.length > 2) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const handleAddLine = () => {
    setLines([...lines, { ...emptyLine }]);
  };

  const handleAISuggestion = (suggestion: {
    description: string;
    lines: Array<{
      accountNumber: number;
      accountName: string;
      debit: number;
      credit: number;
    }>;
  }) => {
    // Set lines from suggestion (convert 0 to undefined for the form)
    setLines(
      suggestion.lines.map((l) => ({
        accountNumber: l.accountNumber,
        accountName: l.accountName,
        debit: l.debit || undefined,
        credit: l.credit || undefined,
      }))
    );
    // Also set description if current is empty
    if (suggestion.description && !description) {
      setDescription(suggestion.description);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    const validLines = lines.filter(
      (l) => l.accountNumber && l.accountName && (l.debit || l.credit)
    );

    if (validLines.length < 2) {
      setError("Minst två rader med konto och belopp krävs");
      return;
    }

    const totalDebit = validLines.reduce((sum, l) => sum + (l.debit || 0), 0);
    const totalCredit = validLines.reduce((sum, l) => sum + (l.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      setError(`Verifikationen balanserar inte. Debet: ${totalDebit}, Kredit: ${totalCredit}`);
      return;
    }

    createEntry.mutate({
      workspaceId,
      fiscalPeriodId,
      entryDate,
      description,
      entryType,
      sourceType: "manual",
      lines: validLines,
    });
  };

  const totalDebit = lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (l.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Ny verifikation</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden grid grid-cols-2 gap-4 mt-4">
          {/* Left side - Step content */}
          <div className="flex flex-col overflow-hidden">
            {step === 1 ? (
              /* Step 1: Entry Type Selection */
              <div className="flex flex-col h-full">
                {/* Quick upload dropzone */}
                <div
                  {...getRootProps()}
                  className={cn(
                    "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors mb-4",
                    isAnalyzing
                      ? "border-primary bg-primary/5"
                      : isDragActive
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                >
                  <input {...getInputProps()} />
                  {isAnalyzing ? (
                    <>
                      <Spinner className="size-8 mx-auto mb-2" />
                      <p className="text-sm font-medium">Analyserar kvitto...</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        AI läser av och fyller i formuläret
                      </p>
                    </>
                  ) : (
                    <>
                      <CloudArrowUp className="size-8 mx-auto mb-2 text-muted-foreground" weight="duotone" />
                      <p className="text-sm text-muted-foreground">
                        {isDragActive
                          ? "Släpp filen här..."
                          : "Ladda upp kvitto för automatisk ifyllning"}
                      </p>
                    </>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  {entryTypes.map((type) => {
                    const isSelected = entryType === type.value;
                    const Icon = type.icon;

                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setEntryType(type.value)}
                        disabled={isAnalyzing}
                        className={cn(
                          "relative flex items-center gap-3 w-full rounded-xl border-2 p-4 text-left transition-all",
                          "hover:border-primary/50 hover:bg-muted/50",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                          "disabled:opacity-50 disabled:cursor-not-allowed",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border bg-card"
                        )}
                      >
                        <div
                          className={cn(
                            "flex size-10 shrink-0 items-center justify-center rounded-lg",
                            isSelected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}
                        >
                          <Icon className="size-5" weight="duotone" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-medium">{type.label}</h3>
                          <p className="text-xs text-muted-foreground">{type.description}</p>
                        </div>
                        {isSelected && (
                          <div className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-3" weight="bold" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-4 border-t mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={isAnalyzing}
                    className="flex-1"
                  >
                    Avbryt
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={isAnalyzing}
                    className="flex-1"
                  >
                    Fortsätt
                  </Button>
                </div>
              </div>
            ) : (
              /* Step 2: Form Entry */
              <form onSubmit={handleSubmit} className="flex flex-col h-full overflow-hidden">
                <FieldGroup className="flex-1 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="period">Period</FieldLabel>
                      <Select value={fiscalPeriodId} onValueChange={setFiscalPeriodId}>
                        <SelectTrigger id="period">
                          <SelectValue placeholder="Välj period" />
                        </SelectTrigger>
                        <SelectContent>
                          {periods.map((period) => (
                            <SelectItem key={period.id} value={period.id}>
                              {period.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="date">Datum</FieldLabel>
                      <Input
                        id="date"
                        type="date"
                        value={entryDate}
                        onChange={(e) => setEntryDate(e.target.value)}
                        required
                      />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel htmlFor="description">Beskrivning</FieldLabel>
                    <Input
                      id="description"
                      type="text"
                      placeholder="T.ex. Inköp av dator"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </Field>

                  {/* Dropzone for underlag */}
                  <Field>
                    <FieldLabel>Underlag</FieldLabel>
                    <div
                      {...getRootProps()}
                      className={cn(
                        "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors",
                        isDragActive
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      )}
                    >
                      <input {...getInputProps()} />
                      <CloudArrowUp className="size-8 mx-auto mb-2 text-muted-foreground" weight="duotone" />
                      <p className="text-sm text-muted-foreground">
                        {isDragActive
                          ? "Släpp filen här..."
                          : "Dra och släpp kvitto eller faktura, eller klicka för att välja"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        PDF, PNG, JPG (max 10MB)
                      </p>
                    </div>

                    {files.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center gap-2 p-2 bg-muted rounded-lg"
                          >
                            <File className="size-4 text-muted-foreground shrink-0" weight="duotone" />
                            <span className="text-sm truncate flex-1">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {(file.size / 1024).toFixed(0)} KB
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-6"
                              onClick={() => removeFile(index)}
                            >
                              <X className="size-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </Field>

                  <div className="space-y-2">
                    <FieldLabel>Konteringar</FieldLabel>
                    <div className="grid grid-cols-[1fr_120px_120px_40px] gap-2 text-xs text-muted-foreground font-medium px-1">
                      <span>Konto</span>
                      <span className="text-right">Debet</span>
                      <span className="text-right">Kredit</span>
                      <span></span>
                    </div>

                    <div className="space-y-2">
                      {lines.map((line, index) => (
                        <JournalEntryLineRow
                          key={index}
                          line={line}
                          index={index}
                          onChange={handleLineChange}
                          onRemove={handleRemoveLine}
                          canRemove={lines.length > 2}
                          disabled={createEntry.isPending}
                        />
                      ))}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddLine}
                      className="w-full"
                    >
                      <Plus className="size-4 mr-2" />
                      Lägg till rad
                    </Button>
                  </div>

                  {/* Summary */}
                  <div className="flex items-center justify-between text-sm border-t pt-4">
                    <span className="text-muted-foreground">Summa:</span>
                    <div className="flex gap-4">
                      <span>
                        Debet: <strong>{totalDebit.toFixed(2)} kr</strong>
                      </span>
                      <span>
                        Kredit: <strong>{totalCredit.toFixed(2)} kr</strong>
                      </span>
                      <span
                        className={
                          isBalanced ? "text-green-600" : "text-red-600"
                        }
                      >
                        {isBalanced ? "Balanserat" : "Obalanserat"}
                      </span>
                    </div>
                  </div>

                  {error && <FieldError>{error}</FieldError>}
                </FieldGroup>

                <div className="flex gap-3 pt-4 border-t mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={createEntry.isPending}
                  >
                    <ArrowLeft className="size-4 mr-2" />
                    Tillbaka
                  </Button>
                  <Button
                    type="submit"
                    disabled={createEntry.isPending || isUploading || !isBalanced}
                    className="flex-1"
                  >
                    {createEntry.isPending || isUploading ? (
                      <>
                        <Spinner className="mr-2" />
                        {isUploading ? "Laddar upp filer..." : "Sparar..."}
                      </>
                    ) : (
                      "Spara verifikation"
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Right side - AI Chat (always visible) */}
          <div className="border-l pl-4 overflow-hidden">
            <AIChat
              onSuggestion={handleAISuggestion}
              context={{ entryType, description }}
              className="h-full"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

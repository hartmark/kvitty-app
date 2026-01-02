"use client";

import { useState, useEffect } from "react";
import { Plus, Trash } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc/client";

interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
}

interface CreateInvoiceDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyLine: InvoiceLine = {
  description: "",
  quantity: 1,
  unitPrice: 0,
  vatRate: 25,
};

export function CreateInvoiceDialog({
  workspaceId,
  open,
  onOpenChange,
}: CreateInvoiceDialogProps) {
  const utils = trpc.useUtils();

  const [customerId, setCustomerId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  });
  const [reference, setReference] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([{ ...emptyLine }]);

  const { data: customers } = trpc.customers.list.useQuery({ workspaceId });

  const createInvoice = trpc.invoices.create.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setCustomerId("");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    const date = new Date();
    date.setDate(date.getDate() + 30);
    setDueDate(date.toISOString().split("T")[0]);
    setReference("");
    setLines([{ ...emptyLine }]);
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  const handleLineChange = (index: number, field: keyof InvoiceLine, value: string | number) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const addLine = () => {
    setLines([...lines, { ...emptyLine }]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      setLines(lines.filter((_, i) => i !== index));
    }
  };

  const calculateLineAmount = (line: InvoiceLine) => {
    return line.quantity * line.unitPrice;
  };

  const calculateSubtotal = () => {
    return lines.reduce((sum, line) => sum + calculateLineAmount(line), 0);
  };

  const calculateVat = () => {
    return lines.reduce((sum, line) => {
      return sum + calculateLineAmount(line) * (line.vatRate / 100);
    }, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateVat();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validLines = lines.filter((l) => l.description && l.unitPrice > 0);
    if (validLines.length === 0) return;

    createInvoice.mutate({
      workspaceId,
      customerId,
      invoiceDate,
      dueDate,
      reference: reference || undefined,
      lines: validLines,
    });
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("sv-SE", { minimumFractionDigits: 2 }) + " kr";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ny faktura</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="customer">Kund *</FieldLabel>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger id="customer">
                  <SelectValue placeholder="Välj kund" />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {customers?.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Du måste skapa en kund först
                </p>
              )}
            </Field>

            <div className="grid grid-cols-3 gap-4">
              <Field>
                <FieldLabel htmlFor="invoiceDate">Fakturadatum</FieldLabel>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="dueDate">Förfallodatum</FieldLabel>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="reference">Referens</FieldLabel>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Er referens"
                />
              </Field>
            </div>

            <FieldSeparator>Rader</FieldSeparator>

            <div className="space-y-3">
              {/* Header */}
              <div className="grid grid-cols-[1fr_80px_100px_80px_40px] gap-2 text-xs font-medium text-muted-foreground">
                <span>Beskrivning</span>
                <span>Antal</span>
                <span>À-pris</span>
                <span>Moms</span>
                <span />
              </div>

              {/* Lines */}
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-[1fr_80px_100px_80px_40px] gap-2">
                  <Input
                    value={line.description}
                    onChange={(e) => handleLineChange(index, "description", e.target.value)}
                    placeholder="Beskrivning av tjänst/vara"
                    required
                  />
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) => handleLineChange(index, "quantity", parseFloat(e.target.value) || 0)}
                    required
                  />
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) => handleLineChange(index, "unitPrice", parseFloat(e.target.value) || 0)}
                    required
                  />
                  <Select
                    value={line.vatRate.toString()}
                    onValueChange={(v) => handleLineChange(index, "vatRate", parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25%</SelectItem>
                      <SelectItem value="12">12%</SelectItem>
                      <SelectItem value="6">6%</SelectItem>
                      <SelectItem value="0">0%</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLine(index)}
                    disabled={lines.length === 1}
                  >
                    <Trash className="size-4" />
                  </Button>
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" onClick={addLine}>
                <Plus className="size-4 mr-2" />
                Lägg till rad
              </Button>
            </div>

            {/* Totals */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Summa exkl. moms</span>
                <span className="font-mono">{formatCurrency(calculateSubtotal())}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Moms</span>
                <span className="font-mono">{formatCurrency(calculateVat())}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Att betala</span>
                <span className="font-mono">{formatCurrency(calculateTotal())}</span>
              </div>
            </div>

            {createInvoice.error && (
              <p className="text-sm text-red-500">{createInvoice.error.message}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={createInvoice.isPending}
              >
                Avbryt
              </Button>
              <Button
                type="submit"
                disabled={createInvoice.isPending || !customerId || lines.every((l) => !l.description)}
              >
                {createInvoice.isPending ? <Spinner /> : "Skapa faktura"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}

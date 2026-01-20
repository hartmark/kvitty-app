"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import type { Invoice, Customer } from "@/lib/db/schema";
import { currencies, currencyLabels, type Currency } from "@/lib/validations/currency";

interface InvoiceWithCustomer extends Invoice {
  customer: Customer;
}

interface EditInvoiceMetadataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceWithCustomer;
}

export function EditInvoiceMetadataDialog({
  open,
  onOpenChange,
  invoice,
}: EditInvoiceMetadataDialogProps) {
  const utils = trpc.useUtils();
  const [customerId, setCustomerId] = useState(invoice.customerId);
  const [invoiceDate, setInvoiceDate] = useState(invoice.invoiceDate);
  const [dueDate, setDueDate] = useState(invoice.dueDate);
  const [reference, setReference] = useState(invoice.reference || "");
  const [currency, setCurrency] = useState<Currency>(invoice.currency as Currency);

  const { data: customersData } = trpc.customers.list.useQuery({
    workspaceId: invoice.workspaceId,
  });
  const customers = customersData?.items;

  const updateMetadata = trpc.invoices.updateMetadata.useMutation({
    onSuccess: () => {
      utils.invoices.get.invalidate({ id: invoice.id, workspaceId: invoice.workspaceId });
      onOpenChange(false);
    },
  });

  useEffect(() => {
    if (open) {
      setCustomerId(invoice.customerId);
      setInvoiceDate(invoice.invoiceDate);
      setDueDate(invoice.dueDate);
      setReference(invoice.reference || "");
      setCurrency(invoice.currency as Currency);
    }
  }, [open, invoice]);

  const handleSave = () => {
    updateMetadata.mutate({
      workspaceId: invoice.workspaceId,
      id: invoice.id,
      customerId,
      invoiceDate,
      dueDate,
      reference: reference || null,
      currency,
    });
  };

  const handleCancel = () => {
    setCustomerId(invoice.customerId);
    setInvoiceDate(invoice.invoiceDate);
    setDueDate(invoice.dueDate);
    setReference(invoice.reference || "");
    setCurrency(invoice.currency as Currency);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Redigera faktura</DialogTitle>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="customer">Kund</FieldLabel>
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
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="invoiceDate">Fakturadatum</FieldLabel>
              <Input
                id="invoiceDate"
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                disabled={updateMetadata.isPending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="dueDate">Förfallodatum</FieldLabel>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={updateMetadata.isPending}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field>
              <FieldLabel htmlFor="reference">Referens</FieldLabel>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Valfri referens"
                disabled={updateMetadata.isPending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="currency">Valuta</FieldLabel>
              <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)} disabled={updateMetadata.isPending}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Välj valuta" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((curr) => (
                    <SelectItem key={curr} value={curr}>
                      {currencyLabels[curr]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
        </FieldGroup>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={updateMetadata.isPending}
          >
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={updateMetadata.isPending}>
            {updateMetadata.isPending ? <Spinner /> : "Spara"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


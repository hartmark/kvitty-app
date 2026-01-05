"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "@phosphor-icons/react";
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc/client";
import { useWorkspace } from "@/components/workspace-provider";
import { CreateCustomerInlineDialog } from "@/components/invoices/create-customer-inline-dialog";

interface CreateInvoiceDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCustomerId?: string;
}

export function CreateInvoiceDialog({
  workspaceId,
  open,
  onOpenChange,
  initialCustomerId,
}: CreateInvoiceDialogProps) {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const utils = trpc.useUtils();

  const [customerId, setCustomerId] = useState(initialCustomerId || "");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split("T")[0];
  });
  const [reference, setReference] = useState("");
  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);

  const { data: customers } = trpc.customers.list.useQuery({ workspaceId });

  const createInvoice = trpc.invoices.create.useMutation({
    onSuccess: (invoice) => {
      utils.invoices.list.invalidate({ workspaceId });
      onOpenChange(false);
      // Redirect to the invoice detail page
      router.push(`/${workspace.slug}/fakturor/${invoice.id}`);
    },
  });

  const resetForm = () => {
    setCustomerId(initialCustomerId || "");
    setInvoiceDate(new Date().toISOString().split("T")[0]);
    const date = new Date();
    date.setDate(date.getDate() + 30);
    setDueDate(date.toISOString().split("T")[0]);
    setReference("");
  };

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    if (initialCustomerId && open) {
      setCustomerId(initialCustomerId);
    }
  }, [initialCustomerId, open]);

  const handleCustomerCreated = (newCustomerId: string) => {
    setCustomerId(newCustomerId);
    setCreateCustomerOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    createInvoice.mutate({
      workspaceId,
      customerId,
      invoiceDate,
      dueDate,
      reference: reference || undefined,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="min-w-lg">
          <DialogHeader>
            <DialogTitle>Ny faktura</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="customer">Kund *</FieldLabel>
                <div className="flex gap-2">
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger id="customer" className="flex-1">
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
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCreateCustomerOpen(true)}
                    title="Skapa ny kund"
                  >
                    <Plus className="size-4" />
                  </Button>
                </div>
                {customers?.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Klicka på + för att skapa din första kund
                  </p>
                )}
              </Field>

              <div className="grid grid-cols-2 gap-4">
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
              </div>

              <Field>
                <FieldLabel htmlFor="reference">Referens (valfritt)</FieldLabel>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Er referens"
                />
              </Field>

              {createInvoice.error && (
                <p className="text-sm text-red-500">{createInvoice.error.message}</p>
              )}

              <div className="flex justify-end gap-2 pt-4">
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
                  disabled={createInvoice.isPending || !customerId}
                >
                  {createInvoice.isPending ? <Spinner /> : "Skapa faktura"}
                </Button>
              </div>
            </FieldGroup>
          </form>
        </DialogContent>
      </Dialog>

      <CreateCustomerInlineDialog
        open={createCustomerOpen}
        onOpenChange={setCreateCustomerOpen}
        workspaceId={workspaceId}
        onCustomerCreated={handleCustomerCreated}
      />
    </>
  );
}

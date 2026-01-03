"use client";

import { useState } from "react";
import { Pencil, Check, X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import type { Invoice, Customer } from "@/lib/db/schema";

interface InvoiceWithCustomer extends Invoice {
  customer: Customer;
}

interface InvoiceMetadataSectionProps {
  invoice: InvoiceWithCustomer;
  isDraft: boolean;
}

export function InvoiceMetadataSection({
  invoice,
  isDraft,
}: InvoiceMetadataSectionProps) {
  const utils = trpc.useUtils();
  const [isEditing, setIsEditing] = useState(false);
  const [customerId, setCustomerId] = useState(invoice.customerId);
  const [invoiceDate, setInvoiceDate] = useState(invoice.invoiceDate);
  const [dueDate, setDueDate] = useState(invoice.dueDate);
  const [reference, setReference] = useState(invoice.reference || "");

  const { data: customers } = trpc.customers.list.useQuery({
    workspaceId: invoice.workspaceId,
  });

  const updateMetadata = trpc.invoices.updateMetadata.useMutation({
    onSuccess: () => {
      utils.invoices.get.invalidate({ id: invoice.id, workspaceId: invoice.workspaceId });
      setIsEditing(false);
    },
  });

  const handleSave = () => {
    updateMetadata.mutate({
      workspaceId: invoice.workspaceId,
      id: invoice.id,
      customerId,
      invoiceDate,
      dueDate,
      reference: reference || null,
    });
  };

  const handleCancel = () => {
    setCustomerId(invoice.customerId);
    setInvoiceDate(invoice.invoiceDate);
    setDueDate(invoice.dueDate);
    setReference(invoice.reference || "");
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-between items-start">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Kund</p>
                <p className="font-medium">{invoice.customer.name}</p>
                {invoice.customer.orgNumber && (
                  <p className="text-sm text-muted-foreground">
                    {invoice.customer.orgNumber}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fakturadatum</p>
                <p className="font-medium">{invoice.invoiceDate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Förfallodatum</p>
                <p className="font-medium">{invoice.dueDate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Referens</p>
                <p className="font-medium">{invoice.reference || "-"}</p>
              </div>
            </div>
            {isDraft && (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Pencil className="size-4 mr-2" />
                Redigera
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm text-muted-foreground">Kund</label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger>
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
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Fakturadatum</label>
              <Input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Förfallodatum</label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Referens</label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Valfri referens"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={updateMetadata.isPending}
            >
              <X className="size-4 mr-2" />
              Avbryt
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={updateMetadata.isPending}
            >
              <Check className="size-4 mr-2" />
              Spara
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

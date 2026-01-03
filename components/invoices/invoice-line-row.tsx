"use client";

import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVertical, Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { unitLabels, productUnits, type ProductUnit } from "@/lib/validations/product";
import type { InvoiceLine, Product } from "@/lib/db/schema";

interface InvoiceLineWithProduct extends InvoiceLine {
  product: Product | null;
}

interface InvoiceLineRowProps {
  line: InvoiceLineWithProduct;
  workspaceId: string;
  invoiceId: string;
  isDraft: boolean;
}

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function InvoiceLineRow({ line, workspaceId, invoiceId, isDraft }: InvoiceLineRowProps) {
  const utils = trpc.useUtils();
  const [description, setDescription] = useState(line.description);
  const [quantity, setQuantity] = useState(line.quantity);
  const [unit, setUnit] = useState<ProductUnit>(line.unit || "styck");
  const [unitPrice, setUnitPrice] = useState(line.unitPrice);
  const [vatRate, setVatRate] = useState(line.vatRate);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: line.id, disabled: !isDraft });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const updateLine = trpc.invoices.updateLine.useMutation({
    onSuccess: () => utils.invoices.get.invalidate({ workspaceId, id: invoiceId }),
  });

  const deleteLine = trpc.invoices.deleteLine.useMutation({
    onSuccess: () => utils.invoices.get.invalidate({ workspaceId, id: invoiceId }),
  });

  const handleBlur = (field: string, value: string | number) => {
    const updates: Record<string, unknown> = {
      workspaceId,
      lineId: line.id,
      invoiceId,
    };

    if (field === "description" && value !== line.description) {
      updates.description = value as string;
    } else if (field === "quantity" && value !== line.quantity) {
      updates.quantity = parseFloat(value as string) || 1;
    } else if (field === "unit" && value !== line.unit) {
      updates.unit = value as string;
    } else if (field === "unitPrice" && value !== line.unitPrice) {
      updates.unitPrice = parseFloat(value as string) || 0;
    } else if (field === "vatRate" && value !== line.vatRate) {
      updates.vatRate = parseInt(value as string) || 0;
    } else {
      return; // No change
    }

    updateLine.mutate(updates as Parameters<typeof updateLine.mutate>[0]);
  };

  const isTextLine = line.lineType === "text";
  const lineAmount = parseFloat(line.amount);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[auto_1fr_80px_80px_80px_80px_100px_40px] gap-2 items-center px-2 py-2 rounded-md hover:bg-muted/50 group"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className={`w-6 flex justify-center ${isDraft ? "cursor-grab" : ""}`}
      >
        {isDraft && (
          <DotsSixVertical className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
        )}
      </div>

      {/* Description */}
      {isDraft ? (
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onBlur={() => handleBlur("description", description)}
          className="h-8"
        />
      ) : (
        <span className="truncate">{line.description}</span>
      )}

      {/* Quantity */}
      {isTextLine ? (
        <span className="text-right text-muted-foreground">-</span>
      ) : isDraft ? (
        <Input
          type="number"
          step="0.01"
          min="0.01"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          onBlur={() => handleBlur("quantity", quantity)}
          className="h-8 text-right"
        />
      ) : (
        <span className="text-right">{line.quantity}</span>
      )}

      {/* Unit */}
      {isTextLine ? (
        <span className="text-muted-foreground">-</span>
      ) : isDraft ? (
        <Select
          value={unit}
          onValueChange={(v) => {
            setUnit(v as ProductUnit);
            handleBlur("unit", v);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {productUnits.map((u) => (
              <SelectItem key={u} value={u}>
                {unitLabels[u]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span>{line.unit ? unitLabels[line.unit] : "-"}</span>
      )}

      {/* Unit Price */}
      {isTextLine ? (
        <span className="text-right text-muted-foreground">-</span>
      ) : isDraft ? (
        <Input
          type="number"
          step="0.01"
          min="0"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          onBlur={() => handleBlur("unitPrice", unitPrice)}
          className="h-8 text-right"
        />
      ) : (
        <span className="text-right">{formatCurrency(line.unitPrice)}</span>
      )}

      {/* VAT Rate */}
      {isTextLine ? (
        <span className="text-muted-foreground">-</span>
      ) : isDraft ? (
        <Select
          value={String(vatRate)}
          onValueChange={(v) => {
            setVatRate(parseInt(v));
            handleBlur("vatRate", v);
          }}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25%</SelectItem>
            <SelectItem value="12">12%</SelectItem>
            <SelectItem value="6">6%</SelectItem>
            <SelectItem value="0">0%</SelectItem>
          </SelectContent>
        </Select>
      ) : (
        <span>{line.vatRate}%</span>
      )}

      {/* Amount */}
      <span className="text-right font-medium">
        {isTextLine ? "-" : formatCurrency(lineAmount)}
      </span>

      {/* Delete */}
      {isDraft && (
        <Button
          variant="ghost"
          size="icon"
          className="size-8 opacity-0 group-hover:opacity-100 text-red-600"
          onClick={() => {
            if (confirm("Ta bort denna rad?")) {
              deleteLine.mutate({ workspaceId, lineId: line.id, invoiceId });
            }
          }}
        >
          <Trash className="size-4" />
        </Button>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { MagnifyingGlass, Package } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { unitLabels, productTypeLabels } from "@/lib/validations/product";
import type { Product } from "@/lib/db/schema";

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  invoiceId: string;
}

function formatCurrency(value: string | number) {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return num.toLocaleString("sv-SE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " kr";
}

export function AddProductDialog({
  open,
  onOpenChange,
  workspaceId,
  invoiceId,
}: AddProductDialogProps) {
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");

  const { data: products, isLoading } = trpc.products.search.useQuery(
    { workspaceId, query: search },
    { enabled: open }
  );

  const addLine = trpc.invoices.addLine.useMutation({
    onSuccess: () => {
      utils.invoices.get.invalidate({ workspaceId, id: invoiceId });
      onOpenChange(false);
      setSearch("");
    },
  });

  const handleSelectProduct = (product: Product) => {
    addLine.mutate({
      workspaceId,
      invoiceId,
      productId: product.id,
      lineType: "product",
      description: product.name,
      quantity: parseFloat(product.defaultQuantity) || 1,
      unit: product.unit,
      unitPrice: parseFloat(product.unitPrice) || 0,
      vatRate: product.vatRate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Lägg till produkt</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Sök produkt..."
            className="pl-10"
            autoFocus
          />
        </div>

        <div className="flex-1 overflow-auto min-h-0 -mx-6 px-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : products?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="size-8 mx-auto mb-2 opacity-50" />
              <p>Inga produkter hittades</p>
              <p className="text-sm mt-1">
                {search
                  ? "Prova att söka på något annat"
                  : "Skapa produkter i produktkatalogen först"}
              </p>
            </div>
          ) : (
            <div className="space-y-1 py-2">
              {products?.map((product) => (
                <button
                  key={product.id}
                  onClick={() => handleSelectProduct(product)}
                  disabled={addLine.isPending}
                  className="w-full text-left p-3 rounded-md hover:bg-muted/50 transition-colors disabled:opacity-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      {product.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {product.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {productTypeLabels[product.type]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {product.vatRate}% moms
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatCurrency(product.unitPrice)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        per {unitLabels[product.unit]}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t -mx-6 px-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

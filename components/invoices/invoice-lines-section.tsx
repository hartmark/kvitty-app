"use client";

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { trpc } from "@/lib/trpc/client";
import { InvoiceLineRow } from "@/components/invoices/invoice-line-row";
import type { InvoiceLine, Product } from "@/lib/db/schema";

interface InvoiceLineWithProduct extends InvoiceLine {
  product: Product | null;
}

interface InvoiceLinesSectionProps {
  workspaceId: string;
  invoiceId: string;
  lines: InvoiceLineWithProduct[];
  isDraft: boolean;
}

export function InvoiceLinesSection({
  workspaceId,
  invoiceId,
  lines,
  isDraft,
}: InvoiceLinesSectionProps) {
  const utils = trpc.useUtils();

  const reorderLines = trpc.invoices.reorderLines.useMutation({
    onSuccess: () => utils.invoices.get.invalidate({ workspaceId, id: invoiceId }),
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = lines.findIndex((l) => l.id === active.id);
      const newIndex = lines.findIndex((l) => l.id === over.id);
      const newOrder = arrayMove(lines, oldIndex, newIndex);

      reorderLines.mutate({
        workspaceId,
        invoiceId,
        lineIds: newOrder.map((l) => l.id),
      });
    }
  };

  if (lines.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>Inga rader ännu</p>
        <p className="text-sm mt-1">
          Lägg till produkter eller textrader ovan
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-[auto_1fr_80px_80px_80px_80px_100px_40px] gap-2 px-2 text-sm text-muted-foreground font-medium">
        <div className="w-6" />
        <div>Beskrivning</div>
        <div className="text-right">Antal</div>
        <div>Enhet</div>
        <div className="text-right">Pris</div>
        <div>Moms</div>
        <div className="text-right">Belopp</div>
        <div />
      </div>

      {/* Lines */}
      {isDraft ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={lines.map((l) => l.id)}
            strategy={verticalListSortingStrategy}
          >
            {lines.map((line) => (
              <InvoiceLineRow
                key={line.id}
                line={line}
                workspaceId={workspaceId}
                invoiceId={invoiceId}
                isDraft={isDraft}
              />
            ))}
          </SortableContext>
        </DndContext>
      ) : (
        lines.map((line) => (
          <InvoiceLineRow
            key={line.id}
            line={line}
            workspaceId={workspaceId}
            invoiceId={invoiceId}
            isDraft={isDraft}
          />
        ))
      )}
    </div>
  );
}

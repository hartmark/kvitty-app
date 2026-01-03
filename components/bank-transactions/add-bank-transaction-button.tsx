"use client";

import { useState } from "react";
import { Plus } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { AddBankTransactionDialog } from "./add-bank-transaction-dialog";

interface AddBankTransactionButtonProps {
  workspaceId: string;
  periodId: string;
}

export function AddBankTransactionButton({
  workspaceId,
  periodId,
}: AddBankTransactionButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4 mr-2" />
        Lägg till
      </Button>
      <AddBankTransactionDialog
        workspaceId={workspaceId}
        periodId={periodId}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}


"use client";

import { useState } from "react";
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
import { AccountCombobox } from "@/components/journal-entry/account-combobox";
import { trpc } from "@/lib/trpc/client";

interface AddBankAccountDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddBankAccountDialog({
  workspaceId,
  open,
  onOpenChange,
}: AddBankAccountDialogProps) {
  const [selectedAccount, setSelectedAccount] = useState<{
    number: number;
    name: string;
  } | null>(null);
  const [customName, setCustomName] = useState("");
  const [description, setDescription] = useState("");

  const utils = trpc.useUtils();

  const createAccount = trpc.bankAccounts.create.useMutation({
    onSuccess: () => {
      utils.bankAccounts.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setSelectedAccount(null);
    setCustomName("");
    setDescription("");
  };

  const handleCreate = () => {
    if (!selectedAccount) return;

    createAccount.mutate({
      workspaceId,
      accountNumber: selectedAccount.number,
      name: customName || selectedAccount.name,
      description: description || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-lg">
        <DialogHeader>
          <DialogTitle>Lägg till bankkonto</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>Välj konto från kontoplanen</FieldLabel>
            <AccountCombobox
              value={selectedAccount?.number}
              onChange={(num, name) => {
                setSelectedAccount({ number: num, name });
                if (!customName) setCustomName(name);
              }}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="customName">Eget namn (valfritt)</FieldLabel>
            <Input
              id="customName"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="T.ex. Företagskonto Nordea"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="description">Beskrivning (valfritt)</FieldLabel>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="T.ex. Huvudkonto för löpande utgifter"
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!selectedAccount || createAccount.isPending}
          >
            {createAccount.isPending ? <Spinner /> : "Lägg till"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc/client";

interface DeleteBankAccountDialogProps {
  workspaceId: string;
  accountId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteBankAccountDialog({
  workspaceId,
  accountId,
  open,
  onOpenChange,
}: DeleteBankAccountDialogProps) {
  const utils = trpc.useUtils();

  const deleteAccount = trpc.bankAccounts.delete.useMutation({
    onSuccess: () => {
      utils.bankAccounts.list.invalidate();
      onOpenChange(false);
    },
  });

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ta bort bankkonto</AlertDialogTitle>
          <AlertDialogDescription>
            Vill du ta bort detta konto? Denna åtgärd kan inte ångras.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Avbryt</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              if (accountId) {
                deleteAccount.mutate({
                  id: accountId,
                  workspaceId,
                });
              }
            }}
            disabled={deleteAccount.isPending}
          >
            {deleteAccount.isPending ? <Spinner /> : "Ta bort"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


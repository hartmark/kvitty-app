"use client";

import { useState } from "react";
import { Plus, Trash, CheckCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { useSession } from "@/lib/auth-client";

interface AllowedEmailsSectionProps {
  workspaceId: string;
  workspaceSlug: string;
  inboxEmailSlug: string | null;
}

export function AllowedEmailsSection({
  workspaceId,
  workspaceSlug,
  inboxEmailSlug,
}: AllowedEmailsSectionProps) {
  const { data: session } = useSession();
  const [newEmail, setNewEmail] = useState("");
  const userEmail = session?.user?.email;
  const inboxEmail = inboxEmailSlug
    ? `${inboxEmailSlug}.${workspaceSlug}@inbox.kvitty.se`
    : null;
  const utils = trpc.useUtils();

  const { data: allowedEmails, isLoading } = trpc.allowedEmails.list.useQuery({
    workspaceId,
  });

  const createMutation = trpc.allowedEmails.create.useMutation({
    onSuccess: () => {
      setNewEmail("");
      utils.allowedEmails.list.invalidate({ workspaceId });
      toast.success("E-postadress tillagd");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = trpc.allowedEmails.delete.useMutation({
    onSuccess: () => {
      utils.allowedEmails.list.invalidate({ workspaceId });
      toast.success("E-postadress borttagen");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) return;

    createMutation.mutate({
      workspaceId,
      email: newEmail.trim(),
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate({
      workspaceId,
      id,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dina tillåtna e-postadresser</CardTitle>
        <CardDescription>
          E-postadresser du kan skicka kvitton från till denna arbetsytas inkorg.
          {inboxEmail && (
            <>
              {" "}Skicka till{" "}
              <code className="bg-muted px-1 py-0.5 rounded text-xs">
                {inboxEmail}
              </code>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* User's own email - always allowed */}
        {userEmail && (
          <div className="flex items-center justify-between gap-4 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="size-4 text-green-600" weight="fill" />
              <span className="text-sm font-medium">{userEmail}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              Ditt konto
            </Badge>
          </div>
        )}

        {/* Additional allowed emails */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner className="size-6" />
            </div>
          ) : (
            <>
              {allowedEmails?.map((allowedEmail) => (
                <div
                  key={allowedEmail.id}
                  className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg"
                >
                  <span className="text-sm font-medium">{allowedEmail.email}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(allowedEmail.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Add new email form */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            type="email"
            placeholder="annan.email@exempel.se"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            disabled={createMutation.isPending}
            className="flex-1"
          />
          <Button type="submit" disabled={createMutation.isPending || !newEmail.trim()}>
            {createMutation.isPending ? (
              <Spinner className="size-4" />
            ) : (
              <>
                <Plus className="size-4 mr-2" />
                Lägg till
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

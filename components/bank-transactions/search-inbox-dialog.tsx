"use client";

import { useState, useEffect } from "react";
import {
  MagnifyingGlass,
  WarningCircle,
  Envelope,
  Paperclip,
  Link as LinkIcon,
  File,
  FilePdf,
  Image as ImageIcon,
  FileXls,
  FileCsv,
} from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  bankTransactionId: string;
};

type InboxEmailStatus = "pending" | "processed" | "rejected" | "error" | "archived" | "all";

function formatFileSize(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | null, fileName: string) {
  if (mimeType?.startsWith("image/")) return ImageIcon;
  if (mimeType === "application/pdf" || fileName.endsWith(".pdf")) return FilePdf;
  if (
    mimeType?.includes("spreadsheet") ||
    mimeType?.includes("excel") ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls")
  )
    return FileXls;
  if (mimeType === "text/csv" || fileName.endsWith(".csv")) return FileCsv;
  return File;
}

function isImageFile(mimeType: string | null) {
  return mimeType?.startsWith("image/") ?? false;
}

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function SearchInboxDialog({
  open,
  onOpenChange,
  workspaceId,
  bankTransactionId,
}: Props) {
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState<string | undefined>(undefined);
  const [statusFilter, setStatusFilter] = useState<InboxEmailStatus>("all");
  const utils = trpc.useUtils();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim() || undefined);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchInput("");
      setDebouncedSearch(undefined);
      setStatusFilter("all");
    }
  }, [open]);

  const {
    data: inboxData,
    isLoading,
    error,
  } = trpc.inbox.list.useQuery(
    {
      workspaceId,
      status: statusFilter,
      search: debouncedSearch,
      limit: 20,
    },
    { enabled: open }
  );

  const linkMutation = trpc.inbox.linkAttachment.useMutation({
    onSuccess: () => {
      utils.inbox.list.invalidate({ workspaceId });
      utils.bankTransactions.get.invalidate({ workspaceId, bankTransactionId });
      utils.bankTransactions.list.invalidate({ workspaceId });
      toast.success("Bilagan har kopplats till transaktionen");
    },
    onError: (error) => {
      toast.error(error.message || "Kunde inte koppla bilagan");
    },
  });

  const handleLinkAttachment = (attachmentId: string) => {
    linkMutation.mutate({
      workspaceId,
      attachmentId,
      bankTransactionId,
    });
  };

  const emails = inboxData?.emails ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:min-w-xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Sök i inbox</DialogTitle>
          <DialogDescription>
            Sök efter e-postmeddelanden och koppla bilagor till denna transaktion
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Sök på ämne eller avsändare..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as InboxEmailStatus)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alla</SelectItem>
              <SelectItem value="pending">Väntande</SelectItem>
              <SelectItem value="processed">Behandlade</SelectItem>
              <SelectItem value="archived">Arkiverade</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6 mt-4">
          {error ? (
            <div className="text-center py-8">
              <WarningCircle className="size-8 mx-auto mb-2 text-destructive opacity-70" />
              <p className="text-sm text-destructive">
                Kunde inte hämta inbox
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6" />
            </div>
          ) : emails.length === 0 ? (
            <div className="text-center py-8">
              <Envelope className="size-8 mx-auto mb-2 text-muted-foreground opacity-70" />
              <p className="text-sm text-muted-foreground">
                {debouncedSearch ? "Inga e-postmeddelanden hittades" : "Inbox är tom"}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {emails.map((email) => (
                <div
                  key={email.id}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* Email header */}
                  <div className="p-3 bg-muted/30">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {email.subject || "(Inget ämne)"}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {email.fromEmail}
                        </p>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {format(new Date(email.receivedAt), "d MMM yyyy", {
                          locale: sv,
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Attachments */}
                  {email.attachments.length > 0 ? (
                    <div className="divide-y">
                      {email.attachments.map((attachment) => {
                        const FileIcon = getFileIcon(attachment.mimeType, attachment.fileName);
                        const isImage = isImageFile(attachment.mimeType);
                        const isLinkedToThisTransaction = attachment.links?.some(
                          (link) => link.bankTransactionId === bankTransactionId
                        );

                        return (
                          <div
                            key={attachment.id}
                            className="flex items-center gap-3 p-3"
                          >
                            {isImage && isSafeUrl(attachment.fileUrl) ? (
                              <a
                                href={attachment.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0"
                              >
                                <img
                                  src={attachment.fileUrl}
                                  alt={attachment.fileName}
                                  className="size-10 object-cover rounded border"
                                />
                              </a>
                            ) : (
                              <div className="size-10 flex items-center justify-center bg-muted rounded shrink-0">
                                <FileIcon className="size-5 text-muted-foreground" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              {isSafeUrl(attachment.fileUrl) ? (
                                <a
                                  href={attachment.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm font-medium hover:underline truncate block"
                                >
                                  {attachment.fileName}
                                </a>
                              ) : (
                                <span className="text-sm font-medium truncate block">
                                  {attachment.fileName}
                                </span>
                              )}
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(attachment.fileSize)}
                                {attachment.links && attachment.links.length > 0 && (
                                  <span className="text-green-600 ml-2">
                                    <LinkIcon className="size-3 inline mr-0.5" />
                                    {attachment.links.length} koppling(ar)
                                  </span>
                                )}
                              </p>
                            </div>

                            {isLinkedToThisTransaction ? (
                              <Badge variant="secondary" className="shrink-0">
                                Redan kopplad
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleLinkAttachment(attachment.id)}
                                disabled={linkMutation.isPending}
                                className="shrink-0"
                              >
                                {linkMutation.isPending ? (
                                  <Spinner className="size-3 mr-1" />
                                ) : (
                                  <LinkIcon className="size-3 mr-1" />
                                )}
                                Koppla
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 text-sm text-muted-foreground text-center">
                      <Paperclip className="size-4 inline mr-1 opacity-50" />
                      Inga bilagor
                    </div>
                  )}
                </div>
              ))}

              {inboxData && inboxData.total > 20 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Visar 20 av {inboxData.total} e-postmeddelanden. Använd sök för att hitta fler.
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Stäng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

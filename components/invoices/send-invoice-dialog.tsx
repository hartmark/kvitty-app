"use client";

import { useState } from "react";
import { PaperPlaneTilt, Link as LinkIcon, FilePdf, Copy, Check } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface SendInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  workspaceId: string;
  customerEmail?: string | null;
  invoiceNumber: number;
  shareToken?: string | null;
  sentMethod?: string | null;
  openedCount?: number;
  lastOpenedAt?: Date | null;
}

export function SendInvoiceDialog({
  open,
  onOpenChange,
  invoiceId,
  workspaceId,
  customerEmail,
  invoiceNumber,
  shareToken,
  sentMethod,
  openedCount,
  lastOpenedAt,
}: SendInvoiceDialogProps) {
  const [sendMethod, setSendMethod] = useState<"pdf" | "link">("pdf");
  const [email, setEmail] = useState(customerEmail || "");
  const [linkCopied, setLinkCopied] = useState(false);
  const utils = trpc.useUtils();

  const sendInvoice = trpc.invoices.sendInvoice.useMutation({
    onSuccess: () => {
      utils.invoices.get.invalidate({ workspaceId, id: invoiceId });
      toast.success("Fakturan har skickats");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Kunde inte skicka fakturan");
    },
  });

  const handleSend = () => {
    if (!email.trim()) {
      toast.error("E-postadress krävs");
      return;
    }

    sendInvoice.mutate({
      id: invoiceId,
      workspaceId,
      email: email.trim(),
      sendMethod,
    });
  };

  const invoiceUrl = shareToken
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/faktura/${invoiceId}?token=${shareToken}`
    : null;

  const handleCopyLink = () => {
    if (invoiceUrl) {
      navigator.clipboard.writeText(invoiceUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      toast.success("Länk kopierad");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Skicka faktura #{invoiceNumber}</DialogTitle>
          <DialogDescription>
            Välj hur du vill skicka fakturan till kunden.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>E-postadress</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="kund@example.com"
            />
          </div>

          <div className="space-y-3">
            <Label>Skicka som</Label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setSendMethod("pdf")}
                className={`w-full text-left p-3 border rounded-md transition-colors ${
                  sendMethod === "pdf"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`size-4 rounded-full border-2 flex items-center justify-center ${
                      sendMethod === "pdf"
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {sendMethod === "pdf" && (
                      <div className="size-2 rounded-full bg-white" />
                    )}
                  </div>
                  <FilePdf className="size-4" />
                  <div>
                    <div className="font-medium">PDF-bilaga</div>
                    <div className="text-sm text-muted-foreground">
                      Skicka fakturan som PDF-bilaga i e-post
                    </div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setSendMethod("link")}
                className={`w-full text-left p-3 border rounded-md transition-colors ${
                  sendMethod === "link"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`size-4 rounded-full border-2 flex items-center justify-center ${
                      sendMethod === "link"
                        ? "border-primary bg-primary"
                        : "border-muted-foreground"
                    }`}
                  >
                    {sendMethod === "link" && (
                      <div className="size-2 rounded-full bg-white" />
                    )}
                  </div>
                  <LinkIcon className="size-4" />
                  <div>
                    <div className="font-medium">Länk</div>
                    <div className="text-sm text-muted-foreground">
                      Skicka en länk till fakturan (spåras när den öppnas)
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {sentMethod === "email_link" && shareToken && (
            <div className="space-y-2 p-4 bg-muted rounded-md">
              <Label className="text-sm font-medium">Delningslänk</Label>
              <div className="flex gap-2">
                <Input value={invoiceUrl || ""} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                  title="Kopiera länk"
                >
                  {linkCopied ? (
                    <Check className="size-4" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {sentMethod === "email_link" && (
            <div className="space-y-2 p-4 bg-muted rounded-md">
              <Label className="text-sm font-medium">Öppningsstatistik</Label>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Antal öppningar:</span>
                  <span className="font-medium">{openedCount || 0}</span>
                </div>
                {lastOpenedAt && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Senast öppnad:</span>
                    <span className="font-medium">
                      {new Date(lastOpenedAt).toLocaleString("sv-SE")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button onClick={handleSend} disabled={sendInvoice.isPending || !email.trim()}>
            {sendInvoice.isPending ? (
              <>
                <Spinner className="size-4 mr-2" />
                Skickar...
              </>
            ) : (
              <>
                <PaperPlaneTilt className="size-4 mr-2" />
                Skicka
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


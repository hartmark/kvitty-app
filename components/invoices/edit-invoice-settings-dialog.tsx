"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc/client";
import type { Invoice, Customer, Workspace } from "@/lib/db/schema";
import { paymentMethods, deliveryMethods } from "@/lib/validations/invoice";
import { toast } from "sonner";

interface InvoiceWithCustomer extends Invoice {
  customer: Customer;
}

interface EditInvoiceSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: InvoiceWithCustomer;
  workspace: Workspace;
}

export function EditInvoiceSettingsDialog({
  open,
  onOpenChange,
  invoice,
  workspace,
}: EditInvoiceSettingsDialogProps) {
  const utils = trpc.useUtils();

  // State for all settings
  const [deliveryTerms, setDeliveryTerms] = useState(invoice.deliveryTerms || "");
  const [latePaymentInterest, setLatePaymentInterest] = useState<number | "">(
    invoice.latePaymentInterest ? Number(invoice.latePaymentInterest) : ""
  );
  const [paymentTermsDays, setPaymentTermsDays] = useState<number | "">(
    invoice.paymentTermsDays || workspace.paymentTermsDays || 30
  );
  const [paymentMethod, setPaymentMethod] = useState(invoice.paymentMethod || "");
  const [paymentAccount, setPaymentAccount] = useState(invoice.paymentAccount || "");
  const [ocrNumber, setOcrNumber] = useState(invoice.ocrNumber || "");
  const [customNotes, setCustomNotes] = useState(invoice.customNotes || "");
  const [deliveryMethod, setDeliveryMethod] = useState(invoice.deliveryMethod || "");

  const updateSettings = trpc.invoices.updateSettings.useMutation({
    onSuccess: () => {
      utils.invoices.get.invalidate({ id: invoice.id });
      toast.success("Inställningar sparade");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Kunde inte spara inställningar");
    },
  });

  const generateOcr = trpc.invoices.generateOcrNumber.useMutation({
    onSuccess: (data) => {
      setOcrNumber(data.ocrNumber || "");
      utils.invoices.get.invalidate({ id: invoice.id });
      toast.success("OCR-nummer genererat");
    },
    onError: (error) => {
      toast.error(error.message || "Kunde inte generera OCR-nummer");
    },
  });

  useEffect(() => {
    if (open) {
      setDeliveryTerms(invoice.deliveryTerms || "");
      setLatePaymentInterest(
        invoice.latePaymentInterest ? Number(invoice.latePaymentInterest) : ""
      );
      setPaymentTermsDays(invoice.paymentTermsDays || workspace.paymentTermsDays || 30);
      setPaymentMethod(invoice.paymentMethod || "");
      setPaymentAccount(invoice.paymentAccount || "");
      setOcrNumber(invoice.ocrNumber || "");
      setCustomNotes(invoice.customNotes || "");
      setDeliveryMethod(invoice.deliveryMethod || "");
    }
  }, [open, invoice, workspace.paymentTermsDays]);

  const handleSave = () => {
    updateSettings.mutate({
      workspaceId: workspace.id,
      id: invoice.id,
      deliveryTerms: deliveryTerms || null,
      latePaymentInterest: latePaymentInterest !== "" ? Number(latePaymentInterest) : null,
      paymentTermsDays: paymentTermsDays !== "" ? Number(paymentTermsDays) : null,
      paymentMethod: (paymentMethod as any) || null,
      paymentAccount: paymentAccount || null,
      ocrNumber: ocrNumber || null,
      customNotes: customNotes || null,
      deliveryMethod: (deliveryMethod as any) || null,
    });
  };

  const handleCancel = () => {
    setDeliveryTerms(invoice.deliveryTerms || "");
    setLatePaymentInterest(
      invoice.latePaymentInterest ? Number(invoice.latePaymentInterest) : ""
    );
    setPaymentTermsDays(invoice.paymentTermsDays || workspace.paymentTermsDays || 30);
    setPaymentMethod(invoice.paymentMethod || "");
    setPaymentAccount(invoice.paymentAccount || "");
    setOcrNumber(invoice.ocrNumber || "");
    setCustomNotes(invoice.customNotes || "");
    setDeliveryMethod(invoice.deliveryMethod || "");
    onOpenChange(false);
  };

  const handleGenerateOcr = () => {
    generateOcr.mutate({ workspaceId: workspace.id, invoiceId: invoice.id });
  };

  const isSubmitting = updateSettings.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fakturasinställningar</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="terms" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="terms">Villkor</TabsTrigger>
            <TabsTrigger value="payment">Betalning</TabsTrigger>
            <TabsTrigger value="delivery">Leverans</TabsTrigger>
            <TabsTrigger value="notes">Anteckningar</TabsTrigger>
          </TabsList>

          <TabsContent value="terms" className="space-y-4 mt-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="paymentTermsDays">Betalningsvillkor (dagar)</FieldLabel>
                <Input
                  id="paymentTermsDays"
                  type="number"
                  min={1}
                  max={365}
                  value={paymentTermsDays}
                  onChange={(e) =>
                    setPaymentTermsDays(e.target.value ? Number(e.target.value) : "")
                  }
                  disabled={isSubmitting}
                />
                <FieldDescription>
                  Antal dagar från fakturadatum till förfallodatum
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="deliveryTerms">Leveransvillkor</FieldLabel>
                <Input
                  id="deliveryTerms"
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  placeholder="T.ex. Fritt vårt lager"
                  maxLength={200}
                  disabled={isSubmitting}
                />
                <FieldDescription>
                  Valfri text som beskriver leveransvillkor
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="latePaymentInterest">Dröjsmålsränta (%)</FieldLabel>
                <Input
                  id="latePaymentInterest"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={latePaymentInterest}
                  onChange={(e) =>
                    setLatePaymentInterest(e.target.value ? Number(e.target.value) : "")
                  }
                  placeholder="T.ex. 12"
                  disabled={isSubmitting}
                />
                <FieldDescription>
                  Ränta vid försenad betalning (lämna tomt för standard)
                </FieldDescription>
              </Field>
            </FieldGroup>
          </TabsContent>

          <TabsContent value="payment" className="space-y-4 mt-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="paymentMethod">Betalningsmetod</FieldLabel>
                <Select value={paymentMethod || "__none__"} onValueChange={(val) => setPaymentMethod(val === "__none__" ? "" : val)}>
                  <SelectTrigger id="paymentMethod">
                    <SelectValue placeholder="Välj betalningsmetod" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Standard (visa alla)</SelectItem>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method === "bankgiro"
                          ? "Bankgiro"
                          : method === "plusgiro"
                          ? "Plusgiro"
                          : method === "iban"
                          ? "IBAN"
                          : method === "swish"
                          ? "Swish"
                          : method === "paypal"
                          ? "PayPal"
                          : "Egen"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Välj specifik betalningsmetod att visa på fakturan
                </FieldDescription>
              </Field>

              {paymentMethod && (
                <Field>
                  <FieldLabel htmlFor="paymentAccount">
                    {paymentMethod === "bankgiro"
                      ? "Bankgiro-nummer"
                      : paymentMethod === "plusgiro"
                      ? "Plusgiro-nummer"
                      : paymentMethod === "iban"
                      ? "IBAN-nummer"
                      : paymentMethod === "swish"
                      ? "Swish-nummer"
                      : paymentMethod === "paypal"
                      ? "PayPal-adress"
                      : "Kontonummer"}
                  </FieldLabel>
                  <Input
                    id="paymentAccount"
                    value={paymentAccount}
                    onChange={(e) => setPaymentAccount(e.target.value)}
                    placeholder={
                      paymentMethod === "bankgiro"
                        ? "123-4567"
                        : paymentMethod === "plusgiro"
                        ? "12 34 56-7"
                        : paymentMethod === "iban"
                        ? "SE35 5000 0000 0549 1000 0003"
                        : ""
                    }
                    maxLength={100}
                    disabled={isSubmitting}
                  />
                </Field>
              )}

              <Field>
                <FieldLabel htmlFor="ocrNumber">OCR-nummer</FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="ocrNumber"
                    value={ocrNumber}
                    onChange={(e) => setOcrNumber(e.target.value)}
                    placeholder="Genereras automatiskt eller skriv eget"
                    maxLength={50}
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateOcr}
                    disabled={isSubmitting || generateOcr.isPending}
                  >
                    {generateOcr.isPending ? <Spinner /> : "Generera"}
                  </Button>
                </div>
                <FieldDescription>
                  OCR-nummer för betalningsreferens (10 siffror med kontrollsiffra)
                </FieldDescription>
              </Field>
            </FieldGroup>
          </TabsContent>

          <TabsContent value="delivery" className="space-y-4 mt-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="deliveryMethod">Leveransmetod</FieldLabel>
                <Select value={deliveryMethod || "__none__"} onValueChange={(val) => setDeliveryMethod(val === "__none__" ? "" : val)}>
                  <SelectTrigger id="deliveryMethod">
                    <SelectValue placeholder="Välj leveransmetod" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      Standard ({invoice.customer.preferredDeliveryMethod || "manuell"})
                    </SelectItem>
                    {deliveryMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method === "email_pdf"
                          ? "E-post med PDF"
                          : method === "email_link"
                          ? "E-post med länk"
                          : method === "manual"
                          ? "Manuell hantering"
                          : "E-faktura"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Hur fakturan ska levereras till kunden
                </FieldDescription>
              </Field>

              {deliveryMethod === "e_invoice" && invoice.customer.einvoiceAddress && (
                <Field>
                  <FieldLabel>E-faktura-adress</FieldLabel>
                  <div className="text-sm text-muted-foreground">
                    {invoice.customer.einvoiceAddress}
                  </div>
                  <FieldDescription>
                    Kundens Peppol-ID eller e-faktura-adress (ändra i kunduppgifter)
                  </FieldDescription>
                </Field>
              )}
            </FieldGroup>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4 mt-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="customNotes">Anpassade anteckningar</FieldLabel>
                <Textarea
                  id="customNotes"
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  placeholder="Valfri text som visas i fakturafoten (lämna tomt för standard)"
                  rows={5}
                  maxLength={1000}
                  disabled={isSubmitting}
                />
                <FieldDescription>
                  {workspace.invoiceNotes
                    ? `Standard: "${workspace.invoiceNotes}"`
                    : "Ingen standardtext inställd"}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Avbryt
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? <Spinner /> : "Spara"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { z } from "zod";
import type { Workspace } from "@/lib/db/schema";

interface PaymentSettingsFormProps {
  workspace: Workspace;
}

const formSchema = z.object({
  workspaceId: z.string(),
  bankgiro: z.string().max(20).optional().nullable(),
  plusgiro: z.string().max(20).optional().nullable(),
  iban: z.string().max(34).optional().nullable(),
  bic: z.string().max(11).optional().nullable(),
  swishNumber: z.string().max(20).optional().nullable(),
  paymentTermsDays: z.number().min(1).max(365).optional().nullable(),
  invoiceNotes: z.string().max(1000).optional().nullable(),
  deliveryTerms: z.string().max(200).optional().nullable(),
  latePaymentInterest: z.number().min(0).max(100).optional().nullable(),
  defaultPaymentMethod: z.string().max(50).optional().nullable(),
  addOcrNumber: z.boolean().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export function PaymentSettingsForm({ workspace }: PaymentSettingsFormProps) {
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workspaceId: workspace.id,
      bankgiro: workspace.bankgiro ?? "",
      plusgiro: workspace.plusgiro ?? "",
      iban: workspace.iban ?? "",
      bic: workspace.bic ?? "",
      swishNumber: workspace.swishNumber ?? "",
      paymentTermsDays: workspace.paymentTermsDays ?? 30,
      invoiceNotes: workspace.invoiceNotes ?? "",
      deliveryTerms: workspace.deliveryTerms ?? "",
      latePaymentInterest: workspace.latePaymentInterest
        ? Number(workspace.latePaymentInterest)
        : null,
      defaultPaymentMethod: workspace.defaultPaymentMethod ?? "",
      addOcrNumber: workspace.addOcrNumber ?? false,
    },
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = form;

  const updateMutation = trpc.workspaces.update.useMutation({
    onSuccess: (updated) => {
      reset({
        workspaceId: updated.id,
        bankgiro: updated.bankgiro ?? "",
        plusgiro: updated.plusgiro ?? "",
        iban: updated.iban ?? "",
        bic: updated.bic ?? "",
        swishNumber: updated.swishNumber ?? "",
        paymentTermsDays: updated.paymentTermsDays ?? 30,
        invoiceNotes: updated.invoiceNotes ?? "",
        deliveryTerms: updated.deliveryTerms ?? "",
        latePaymentInterest: updated.latePaymentInterest
          ? Number(updated.latePaymentInterest)
          : null,
        defaultPaymentMethod: updated.defaultPaymentMethod ?? "",
        addOcrNumber: updated.addOcrNumber ?? false,
      });
      router.refresh();
    },
  });

  function onSubmit(data: FormValues) {
    updateMutation.mutate({
      workspaceId: data.workspaceId,
      bankgiro: data.bankgiro || null,
      plusgiro: data.plusgiro || null,
      iban: data.iban || null,
      bic: data.bic || null,
      swishNumber: data.swishNumber || null,
      paymentTermsDays: data.paymentTermsDays,
      invoiceNotes: data.invoiceNotes || null,
      deliveryTerms: data.deliveryTerms || null,
      latePaymentInterest: data.latePaymentInterest,
      defaultPaymentMethod: data.defaultPaymentMethod || null,
      addOcrNumber: data.addOcrNumber,
    });
  }

  const isSubmitting = updateMutation.isPending;

  return (
    <form id="payment-settings-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Betalning</h1>
          <p className="text-muted-foreground text-sm">
            Betalningsuppgifter som visas på fakturor
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Betalningsinformation</CardTitle>
            <CardDescription>
              Betalningsuppgifter som visas på fakturor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={!!errors.bankgiro}>
                  <FieldLabel htmlFor="bankgiro">Bankgiro</FieldLabel>
                  <Input
                    id="bankgiro"
                    placeholder="123-4567"
                    maxLength={20}
                    disabled={isSubmitting}
                    {...register("bankgiro")}
                  />
                  <FieldDescription>Bankgironummer</FieldDescription>
                  {errors.bankgiro && <FieldError errors={[errors.bankgiro]} />}
                </Field>

                <Field data-invalid={!!errors.plusgiro}>
                  <FieldLabel htmlFor="plusgiro">Plusgiro</FieldLabel>
                  <Input
                    id="plusgiro"
                    placeholder="12 34 56-7"
                    maxLength={20}
                    disabled={isSubmitting}
                    {...register("plusgiro")}
                  />
                  <FieldDescription>Plusgironummer</FieldDescription>
                  {errors.plusgiro && <FieldError errors={[errors.plusgiro]} />}
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={!!errors.iban}>
                  <FieldLabel htmlFor="iban">IBAN</FieldLabel>
                  <Input
                    id="iban"
                    placeholder="SE35 5000 0000 0549 1000 0003"
                    maxLength={34}
                    disabled={isSubmitting}
                    {...register("iban")}
                  />
                  <FieldDescription>
                    För internationella betalningar
                  </FieldDescription>
                  {errors.iban && <FieldError errors={[errors.iban]} />}
                </Field>

                <Field data-invalid={!!errors.bic}>
                  <FieldLabel htmlFor="bic">BIC/SWIFT</FieldLabel>
                  <Input
                    id="bic"
                    placeholder="ESSESESS"
                    maxLength={11}
                    disabled={isSubmitting}
                    {...register("bic")}
                  />
                  <FieldDescription>Bankens BIC-kod</FieldDescription>
                  {errors.bic && <FieldError errors={[errors.bic]} />}
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={!!errors.swishNumber}>
                  <FieldLabel htmlFor="swishNumber">Swish-nummer</FieldLabel>
                  <Input
                    id="swishNumber"
                    placeholder="123 456 78 90"
                    maxLength={20}
                    disabled={isSubmitting}
                    {...register("swishNumber")}
                  />
                  <FieldDescription>Swish för företag</FieldDescription>
                  {errors.swishNumber && (
                    <FieldError errors={[errors.swishNumber]} />
                  )}
                </Field>

                <Controller
                  name="paymentTermsDays"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="paymentTermsDays">
                        Betalningsvillkor (dagar)
                      </FieldLabel>
                      <Input
                        id="paymentTermsDays"
                        type="number"
                        min={1}
                        max={365}
                        disabled={isSubmitting}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value) : 30
                          )
                        }
                      />
                      <FieldDescription>Standard: 30 dagar netto</FieldDescription>
                      {fieldState.error && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>

              <Field data-invalid={!!errors.invoiceNotes}>
                <FieldLabel htmlFor="invoiceNotes">Fakturatext</FieldLabel>
                <Textarea
                  id="invoiceNotes"
                  placeholder="Standardtext som visas på fakturor..."
                  maxLength={1000}
                  rows={3}
                  disabled={isSubmitting}
                  {...register("invoiceNotes")}
                />
                <FieldDescription>
                  Visas längst ner på alla fakturor
                </FieldDescription>
                {errors.invoiceNotes && (
                  <FieldError errors={[errors.invoiceNotes]} />
                )}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={!!errors.deliveryTerms}>
                  <FieldLabel htmlFor="deliveryTerms">
                    Leveransvillkor (standard)
                  </FieldLabel>
                  <Input
                    id="deliveryTerms"
                    placeholder="T.ex. Fritt vårt lager"
                    maxLength={200}
                    disabled={isSubmitting}
                    {...register("deliveryTerms")}
                  />
                  <FieldDescription>
                    Standardtext för leveransvillkor på fakturor
                  </FieldDescription>
                  {errors.deliveryTerms && (
                    <FieldError errors={[errors.deliveryTerms]} />
                  )}
                </Field>

                <Controller
                  name="latePaymentInterest"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="latePaymentInterest">
                        Dröjsmålsränta (%)
                      </FieldLabel>
                      <Input
                        id="latePaymentInterest"
                        type="number"
                        placeholder="12"
                        min={0}
                        max={100}
                        step={0.1}
                        disabled={isSubmitting}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                      />
                      <FieldDescription>
                        Standard dröjsmålsränta vid försenad betalning
                      </FieldDescription>
                      {fieldState.error && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="addOcrNumber"
                control={control}
                render={({ field }) => (
                  <Field>
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="addOcrNumber"
                        checked={field.value ?? false}
                        onCheckedChange={(checked) => field.onChange(!!checked)}
                        disabled={isSubmitting}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="addOcrNumber"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Lägg till OCR-nummer på fakturor
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Generera OCR-nummer automatiskt för enklare betalningsidentifiering
                        </p>
                      </div>
                    </div>
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        {updateMutation.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">
              {updateMutation.error.message}
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            form="payment-settings-form"
            disabled={isSubmitting || !isDirty}
          >
            {isSubmitting ? <Spinner /> : "Spara ändringar"}
          </Button>
        </div>
      </div>
    </form>
  );
}

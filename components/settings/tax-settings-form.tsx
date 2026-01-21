"use client";

import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
  FieldError,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { z } from "zod";
import type { Workspace } from "@/lib/db/schema";

interface TaxSettingsFormProps {
  workspace: Workspace;
}

const formSchema = z.object({
  workspaceId: z.string(),
  vatReportingFrequency: z.enum(["monthly", "quarterly", "yearly"]).optional().nullable(),
  defaultUtlaggAccount: z.number().int().optional().nullable(),
  vatNumber: z
    .string()
    .max(20)
    .regex(/^SE\d{12}$/, "VAT-nummer måste vara i format SE + 12 siffror (t.ex. SE559012345601)")
    .optional()
    .nullable()
    .or(z.literal("")),
  isVatExempt: z.boolean().optional().nullable(),
  inboxEmailSlug: z
    .string()
    .min(1, "Inkorgs-slug krävs")
    .max(50, "Inkorgs-slug får max vara 50 tecken")
    .regex(
      /^[a-z0-9]+(\.[a-z0-9]+)?$/,
      "Endast små bokstäver, siffror och en punkt tillåts (t.ex. 'företag.ab12')"
    )
    .optional()
    .nullable(),
});

type FormValues = z.infer<typeof formSchema>;

function GenerateVatNumberButton({
  workspaceId,
  onSuccess,
  disabled,
}: {
  workspaceId: string;
  onSuccess: (vatNumber: string) => void;
  disabled: boolean;
}) {
  const generateMutation = trpc.workspaces.generateVatNumber.useMutation({
    onSuccess: (workspace) => {
      if (workspace.vatNumber) {
        onSuccess(workspace.vatNumber);
      }
    },
  });

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => generateMutation.mutate({ workspaceId })}
      disabled={disabled || generateMutation.isPending}
    >
      {generateMutation.isPending ? <Spinner className="h-4 w-4" /> : "Generera"}
    </Button>
  );
}

function OwnerPersonalNumberCard({ workspaceId }: { workspaceId: string }) {
  const [personalNumber, setPersonalNumber] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const { data: nebilagaData } = trpc.nebilaga.isAvailable.useQuery({
    workspaceId,
  });

  const updateMutation = trpc.nebilaga.updateOwnerPersonalNumber.useMutation({
    onSuccess: () => {
      setHasChanges(false);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 12);
    setPersonalNumber(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    updateMutation.mutate({
      workspaceId,
      personalNumber,
    });
  };

  const formatPersonalNumber = (value: string) => {
    if (value.length <= 8) return value;
    return `${value.slice(0, 8)}-${value.slice(8)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Enskild firma</CardTitle>
        <CardDescription>
          Uppgifter för NE-bilaga och inkomstdeklaration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field data-invalid={updateMutation.isError}>
            <FieldLabel htmlFor="ownerPersonalNumber">
              Personnummer (innehavare)
            </FieldLabel>
            <div className="flex gap-2">
              <Input
                id="ownerPersonalNumber"
                type="text"
                inputMode="numeric"
                placeholder="ÅÅÅÅMMDDXXXX"
                value={formatPersonalNumber(personalNumber)}
                onChange={handleChange}
                disabled={updateMutation.isPending}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSave}
                disabled={!hasChanges || updateMutation.isPending || personalNumber.length !== 12}
              >
                {updateMutation.isPending ? <Spinner className="h-4 w-4" /> : "Spara"}
              </Button>
            </div>
            <FieldDescription>
              12 siffror (ÅÅÅÅMMDDXXXX). Krävs för att fylla i NE-bilagan.
              {nebilagaData?.hasOwnerPersonalNumber && (
                <span className="block text-green-600 mt-1">
                  Personnummer är redan sparat (krypterat)
                </span>
              )}
            </FieldDescription>
            {updateMutation.isError && (
              <p className="text-sm text-red-600 mt-1">
                {updateMutation.error?.message || "Kunde inte spara personnummer"}
              </p>
            )}
            {updateMutation.isSuccess && !hasChanges && (
              <p className="text-sm text-green-600 mt-1">
                Personnummer sparat
              </p>
            )}
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}

export function TaxSettingsForm({ workspace }: TaxSettingsFormProps) {
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workspaceId: workspace.id,
      vatReportingFrequency: workspace.vatReportingFrequency ?? "quarterly",
      defaultUtlaggAccount: workspace.defaultUtlaggAccount ?? 2893,
      vatNumber: workspace.vatNumber ?? "",
      isVatExempt: workspace.isVatExempt ?? false,
      inboxEmailSlug: workspace.inboxEmailSlug ?? "",
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
        vatReportingFrequency: updated.vatReportingFrequency ?? "quarterly",
        defaultUtlaggAccount: updated.defaultUtlaggAccount ?? 2893,
        vatNumber: updated.vatNumber ?? "",
        isVatExempt: updated.isVatExempt ?? false,
        inboxEmailSlug: updated.inboxEmailSlug ?? "",
      });
      router.refresh();
    },
  });

  function onSubmit(data: FormValues) {
    updateMutation.mutate({
      workspaceId: data.workspaceId,
      name: workspace.name,
      vatReportingFrequency: data.vatReportingFrequency || null,
      defaultUtlaggAccount: data.defaultUtlaggAccount,
      vatNumber: data.vatNumber || null,
      isVatExempt: data.isVatExempt,
      inboxEmailSlug: data.inboxEmailSlug || null,
    });
  }

  const isSubmitting = updateMutation.isPending;

  return (
    <form id="tax-settings-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Moms & skatt</h1>
          <p className="text-muted-foreground text-sm">
            Momsrapportering och skatteinställningar
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Momsrapportering</CardTitle>
            <CardDescription>
              Frekvens för momsrapportering till Skatteverket
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                name="vatReportingFrequency"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="vatReportingFrequency">
                      Momsrapporteringsfrekvens
                    </FieldLabel>
                    <Select
                      value={field.value ?? "quarterly"}
                      onValueChange={(v) => field.onChange(v)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="vatReportingFrequency" className="w-full">
                        <SelectValue placeholder="Välj frekvens" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Månadsvis</SelectItem>
                        <SelectItem value="quarterly">Kvartalsvis</SelectItem>
                        <SelectItem value="yearly">Årsvis</SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Hur ofta du rapporterar moms till Skatteverket
                    </FieldDescription>
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>VAT & Compliance</CardTitle>
            <CardDescription>
              Momsregistreringsnummer och specialregler
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={!!errors.vatNumber}>
                <FieldLabel htmlFor="vatNumber">
                  VAT-nummer (momsregistreringsnummer)
                </FieldLabel>
                <div className="flex gap-2">
                  <Input
                    id="vatNumber"
                    placeholder="SE559012345601"
                    maxLength={20}
                    disabled={isSubmitting}
                    {...register("vatNumber")}
                    className="flex-1"
                  />
                  <GenerateVatNumberButton
                    workspaceId={workspace.id}
                    onSuccess={(vatNumber) => {
                      form.setValue("vatNumber", vatNumber, { shouldDirty: true });
                    }}
                    disabled={isSubmitting || !workspace.orgNumber}
                  />
                </div>
                <FieldDescription>
                  Format: SE + organisationsnummer + 01 (t.ex. SE559012345601).
                  Krävs för att köparen ska ha avdragsrätt för moms.
                </FieldDescription>
                {errors.vatNumber && <FieldError errors={[errors.vatNumber]} />}
              </Field>

              <Controller
                name="isVatExempt"
                control={control}
                render={({ field }) => (
                  <Field>
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id="isVatExempt"
                        checked={field.value ?? false}
                        onCheckedChange={(checked) => field.onChange(!!checked)}
                        disabled={isSubmitting}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="isVatExempt"
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          Undantagen från momsplikt
                        </label>
                        <p className="text-sm text-muted-foreground">
                          Aktivera om ditt företag omsätter under 120 000 kr/år
                          och är undantaget från momsplikt. Fakturor kommer visa
                          texten "Undantagen från skatteplikt enligt 18 kap.
                          mervärdesskattelagen".
                        </p>
                      </div>
                    </div>
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Utlägg</CardTitle>
            <CardDescription>
              Inställningar för personliga utlägg och ersättningar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                name="defaultUtlaggAccount"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="defaultUtlaggAccount">
                      Standardkonto för utlägg
                    </FieldLabel>
                    <Select
                      value={String(field.value ?? 2893)}
                      onValueChange={(v) => field.onChange(parseInt(v))}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="defaultUtlaggAccount" className="w-full">
                        <SelectValue placeholder="Välj konto" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2893">
                          2893 - Skulder till närstående personer (egna utlägg)
                        </SelectItem>
                        <SelectItem value="2890">
                          2890 - Övriga kortfristiga skulder (anställdas utlägg)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Konto 2893 används för ägarens/delägarnas egna utlägg.
                      Konto 2890 används för anställdas utlägg.
                    </FieldDescription>
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>E-postinkorg</CardTitle>
            <CardDescription>
              Ta emot kvitton och bilagor via e-post
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={!!errors.inboxEmailSlug}>
                <FieldLabel htmlFor="inboxEmailSlug">Inkorgsadress</FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="inboxEmailSlug"
                    placeholder={workspace.name.toLowerCase().replace(/[^a-z0-9]/g, "")}
                    maxLength={30}
                    disabled={isSubmitting}
                    {...register("inboxEmailSlug", {
                      onChange: (e) => {
                        e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "");
                      },
                    })}
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupText>.{workspace.slug}@inbox.kvitty.se</InputGroupText>
                  </InputGroupAddon>
                </InputGroup>
                <FieldDescription>
                  {form.watch("inboxEmailSlug") ? (
                    <>
                      Skicka kvitton till{" "}
                      <code className="bg-muted px-1 py-0.5 rounded text-xs">
                        {form.watch("inboxEmailSlug")}.{workspace.slug}@inbox.kvitty.se
                      </code>
                    </>
                  ) : (
                    "Endast små bokstäver och siffror tillåts"
                  )}
                </FieldDescription>
                {errors.inboxEmailSlug && (
                  <FieldError errors={[errors.inboxEmailSlug]} />
                )}
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        {workspace.businessType === "enskild_firma" && (
          <OwnerPersonalNumberCard workspaceId={workspace.id} />
        )}

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
            form="tax-settings-form"
            disabled={isSubmitting || !isDirty}
          >
            {isSubmitting ? <Spinner /> : "Spara ändringar"}
          </Button>
        </div>
      </div>
    </form>
  );
}

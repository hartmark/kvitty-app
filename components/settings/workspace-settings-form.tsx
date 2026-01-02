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
import {
  businessTypes,
  type BusinessType,
  updateWorkspaceSchema,
} from "@/lib/validations/workspace";
import { z } from "zod";

interface WorkspaceSettingsFormProps {
  workspaceId: string;
  initialName: string;
  initialSlug: string;
  initialBusinessType: BusinessType | null;
  initialOrgNumber: string | null;
  initialOrgName: string | null;
  initialContactName: string | null;
  initialContactPhone: string | null;
  initialContactEmail: string | null;
  initialAddress: string | null;
  initialPostalCode: string | null;
  initialCity: string | null;
}

const businessTypeLabels: Record<BusinessType, string> = {
  aktiebolag: "Aktiebolag (AB)",
  enskild_firma: "Enskild firma",
  handelsbolag: "Handelsbolag (HB)",
  kommanditbolag: "Kommanditbolag (KB)",
  ekonomisk_forening: "Ekonomisk förening",
  ideell_forening: "Ideell förening",
  stiftelse: "Stiftelse",
  other: "Annat",
};

const formSchema = updateWorkspaceSchema.extend({
  workspaceId: z.string(),
});

type FormValues = z.infer<typeof formSchema>;

export function WorkspaceSettingsForm({
  workspaceId,
  initialName,
  initialSlug,
  initialBusinessType,
  initialOrgNumber,
  initialOrgName,
  initialContactName,
  initialContactPhone,
  initialContactEmail,
  initialAddress,
  initialPostalCode,
  initialCity,
}: WorkspaceSettingsFormProps) {
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workspaceId,
      name: initialName,
      slug: initialSlug,
      businessType: initialBusinessType ?? null,
      orgNumber: initialOrgNumber ?? "",
      orgName: initialOrgName ?? "",
      contactName: initialContactName ?? "",
      contactPhone: initialContactPhone ?? "",
      contactEmail: initialContactEmail ?? "",
      address: initialAddress ?? "",
      postalCode: initialPostalCode ?? "",
      city: initialCity ?? "",
    },
  });

  const updateMutation = trpc.workspaces.update.useMutation({
    onSuccess: (updated) => {
      if (updated.slug !== initialSlug) {
        router.push(`/${updated.slug}/settings`);
      } else {
        form.reset({
          workspaceId,
          name: updated.name,
          slug: updated.slug,
          businessType: updated.businessType,
          orgNumber: updated.orgNumber ?? "",
          orgName: updated.orgName ?? "",
          contactName: updated.contactName ?? "",
          contactPhone: updated.contactPhone ?? "",
          contactEmail: updated.contactEmail ?? "",
          address: updated.address ?? "",
          postalCode: updated.postalCode ?? "",
          city: updated.city ?? "",
        });
        router.refresh();
      }
    },
  });

  function onSubmit(data: FormValues) {
    const payload: Parameters<typeof updateMutation.mutate>[0] = {
      workspaceId,
      name: data.name,
    };

    if (data.slug !== initialSlug) {
      payload.slug = data.slug;
    }

    if (data.businessType !== initialBusinessType) {
      payload.businessType = data.businessType;
    }

    if (data.orgNumber !== (initialOrgNumber ?? "")) {
      payload.orgNumber = data.orgNumber || "";
    }

    if (data.orgName !== (initialOrgName ?? "")) {
      payload.orgName = data.orgName || null;
    }

    if (data.contactName !== (initialContactName ?? "")) {
      payload.contactName = data.contactName || null;
    }

    if (data.contactPhone !== (initialContactPhone ?? "")) {
      payload.contactPhone = data.contactPhone || null;
    }

    if (data.contactEmail !== (initialContactEmail ?? "")) {
      payload.contactEmail = data.contactEmail || null;
    }

    if (data.address !== (initialAddress ?? "")) {
      payload.address = data.address || null;
    }

    if (data.postalCode !== (initialPostalCode ?? "")) {
      payload.postalCode = data.postalCode || null;
    }

    if (data.city !== (initialCity ?? "")) {
      payload.city = data.city || null;
    }

    updateMutation.mutate(payload);
  }

  const isDirty = form.formState.isDirty;
  const isSubmitting = updateMutation.isPending;

  return (
    <form id="workspace-settings-form" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Grundläggande information</CardTitle>
            <CardDescription>
              Arbetsytans namn och URL-slug
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="workspace-settings-name">
                      Namn
                    </FieldLabel>
                    <Input
                      {...field}
                      id="workspace-settings-name"
                      placeholder="Arbetsytans namn"
                      disabled={isSubmitting}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>
                      Namnet som visas i sidomenyn och på arbetsytan
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="slug"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="workspace-settings-slug">
                      URL-slug
                    </FieldLabel>
                    <Input
                      {...field}
                      id="workspace-settings-slug"
                      placeholder="abcd"
                      pattern="[a-z0-9]{4}"
                      maxLength={4}
                      disabled={isSubmitting}
                      aria-invalid={fieldState.invalid}
                      onChange={(e) => {
                        field.onChange(e.target.value.toLowerCase());
                      }}
                    />
                    <FieldDescription>
                      4 tecken (a-z, 0-9). Används i webbadressen: /{field.value}/...
                    </FieldDescription>
                    {fieldState.invalid && (
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
            <CardTitle>Företagsinformation</CardTitle>
            <CardDescription>
              Information om företaget som används för fakturering och AGI XML
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                name="businessType"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="workspace-settings-businessType">
                      Företagstyp
                    </FieldLabel>
                    <Select
                      value={field.value ?? "__none__"}
                      onValueChange={(value) => {
                        field.onChange(value === "__none__" ? null : value);
                      }}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger
                        id="workspace-settings-businessType"
                        className="w-full"
                        aria-invalid={fieldState.invalid}
                      >
                        <SelectValue placeholder="Välj företagstyp" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Ingen</SelectItem>
                        {businessTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {businessTypeLabels[type]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FieldDescription>
                      Typ av företag eller organisation
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="orgNumber"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="workspace-settings-orgNumber">
                      Organisationsnummer
                    </FieldLabel>
                    <Input
                      {...field}
                      id="workspace-settings-orgNumber"
                      placeholder="165592540321"
                      pattern="\d{10,12}"
                      maxLength={12}
                      disabled={isSubmitting}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>
                      10-12 siffror (t.ex. 165592540321)
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="orgName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="workspace-settings-orgName">
                      Företagsnamn
                    </FieldLabel>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      id="workspace-settings-orgName"
                      placeholder="Företagsnamn"
                      maxLength={200}
                      disabled={isSubmitting}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>
                      Det officiella företagsnamnet
                    </FieldDescription>
                    {fieldState.invalid && (
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
            <CardTitle>Kontaktinformation</CardTitle>
            <CardDescription>
              Kontaktuppgifter för företaget
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                name="contactName"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="workspace-settings-contactName">
                      Kontaktperson
                    </FieldLabel>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      id="workspace-settings-contactName"
                      placeholder="Namn på kontaktperson"
                      maxLength={100}
                      disabled={isSubmitting}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>
                      Namn på den person som ska kontaktas
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="contactPhone"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="workspace-settings-contactPhone">
                      Telefonnummer
                    </FieldLabel>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      id="workspace-settings-contactPhone"
                      type="tel"
                      placeholder="+46 70 123 45 67"
                      maxLength={20}
                      disabled={isSubmitting}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>
                      Telefonnummer till kontaktpersonen
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <Controller
                name="contactEmail"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="workspace-settings-contactEmail">
                      E-postadress
                    </FieldLabel>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      id="workspace-settings-contactEmail"
                      type="email"
                      placeholder="kontakt@foretag.se"
                      disabled={isSubmitting}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>
                      E-postadress till kontaktpersonen
                    </FieldDescription>
                    {fieldState.invalid && (
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
            <CardTitle>Adress</CardTitle>
            <CardDescription>Företagets adress</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                name="address"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="workspace-settings-address">
                      Gatuadress
                    </FieldLabel>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      id="workspace-settings-address"
                      placeholder="Gatan 123"
                      maxLength={200}
                      disabled={isSubmitting}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>Gatuadress</FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="postalCode"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="workspace-settings-postalCode">
                        Postnummer
                      </FieldLabel>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        id="workspace-settings-postalCode"
                        placeholder="123 45"
                        maxLength={10}
                        disabled={isSubmitting}
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldDescription>Postnummer</FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
                <Controller
                  name="city"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel htmlFor="workspace-settings-city">
                        Stad
                      </FieldLabel>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        id="workspace-settings-city"
                        placeholder="Stockholm"
                        maxLength={100}
                        disabled={isSubmitting}
                        aria-invalid={fieldState.invalid}
                      />
                      <FieldDescription>Stad</FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </Field>
                  )}
                />
              </div>
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
            form="workspace-settings-form"
            disabled={isSubmitting || !isDirty}
          >
            {isSubmitting ? <Spinner /> : "Spara ändringar"}
          </Button>
        </div>
      </div>
    </form>
  );
}

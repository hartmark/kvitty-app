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
} from "@/lib/validations/workspace";
import { z } from "zod";
import type { Workspace } from "@/lib/db/schema";

interface GeneralSettingsFormProps {
  workspace: Workspace;
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

const formSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1, "Namn krävs").max(100, "Namn får max vara 100 tecken"),
  slug: z
    .string()
    .length(4, "Slug måste vara exakt 4 tecken")
    .regex(/^[a-z0-9]+$/, "Endast små bokstäver och siffror")
    .optional(),
  businessType: z.enum(businessTypes).optional().nullable(),
  orgNumber: z
    .union([
      z.literal(""),
      z
        .string()
        .transform((val) => val.replace(/\D/g, ""))
        .pipe(
          z
            .string()
            .regex(/^\d{10,12}$/, "Organisationsnummer måste vara 10-12 siffror")
        ),
    ])
    .optional(),
  orgName: z.string().max(200, "Företagsnamn får max vara 200 tecken").optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export function GeneralSettingsForm({ workspace }: GeneralSettingsFormProps) {
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workspaceId: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      businessType: workspace.businessType ?? null,
      orgNumber: workspace.orgNumber ?? "",
      orgName: workspace.orgName ?? "",
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
      if (updated.slug !== workspace.slug) {
        router.push(`/${updated.slug}/settings`);
      } else {
        reset({
          workspaceId: updated.id,
          name: updated.name,
          slug: updated.slug,
          businessType: updated.businessType ?? null,
          orgNumber: updated.orgNumber ?? "",
          orgName: updated.orgName ?? "",
        });
        router.refresh();
      }
    },
  });

  function onSubmit(data: FormValues) {
    updateMutation.mutate({
      workspaceId: data.workspaceId,
      name: data.name,
      slug: data.slug,
      businessType: data.businessType,
      orgNumber: data.orgNumber ? data.orgNumber.replace(/\D/g, "") : undefined,
      orgName: data.orgName || null,
    });
  }

  const isSubmitting = updateMutation.isPending;

  return (
    <form id="general-settings-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Allmänt</h1>
          <p className="text-muted-foreground text-sm">
            Grundläggande information om arbetsytan
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Grundläggande information</CardTitle>
            <CardDescription>Arbetsytans namn och URL-slug</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Namn</FieldLabel>
                <Input
                  id="name"
                  placeholder="Arbetsytans namn"
                  disabled={isSubmitting}
                  {...register("name")}
                />
                <FieldDescription>
                  Namnet som visas i sidomenyn och på arbetsytan
                </FieldDescription>
                {errors.name && <FieldError errors={[errors.name]} />}
              </Field>

              <Field data-invalid={!!errors.slug}>
                <FieldLabel htmlFor="slug">URL-slug</FieldLabel>
                <Input
                  id="slug"
                  placeholder="abcd"
                  maxLength={4}
                  disabled
                />
                <FieldDescription>
                  4 tecken (a-z, 0-9). Används i webbadressen
                </FieldDescription>
                {errors.slug && <FieldError errors={[errors.slug]} />}
              </Field>
            </FieldGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Företagsinformation</CardTitle>
            <CardDescription>
              Information om företaget som används för fakturering och XML för arbetsgivardeklarationer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Controller
                name="businessType"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="businessType">Företagstyp</FieldLabel>
                    <Select
                      value={field.value ?? "__none__"}
                      onValueChange={(v) =>
                        field.onChange(v === "__none__" ? null : v)
                      }
                      disabled={isSubmitting}
                    >
                      <SelectTrigger id="businessType" className="w-full">
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
                    {fieldState.error && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />

              <Field data-invalid={!!errors.orgNumber}>
                <FieldLabel htmlFor="orgNumber">Organisationsnummer</FieldLabel>
                <Input
                  id="orgNumber"
                  placeholder="XXXXXX-XXXX"
                  maxLength={13}
                  disabled={isSubmitting}
                  {...register("orgNumber")}
                />
                <FieldDescription>
                  10-12 siffror (t.ex. 165592-5403)
                </FieldDescription>
                {errors.orgNumber && <FieldError errors={[errors.orgNumber]} />}
              </Field>

              <Field data-invalid={!!errors.orgName}>
                <FieldLabel htmlFor="orgName">Företagsnamn</FieldLabel>
                <Input
                  id="orgName"
                  placeholder="Företagsnamn"
                  maxLength={200}
                  disabled={isSubmitting}
                  {...register("orgName")}
                />
                <FieldDescription>Det officiella företagsnamnet</FieldDescription>
                {errors.orgName && <FieldError errors={[errors.orgName]} />}
              </Field>
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
            form="general-settings-form"
            disabled={isSubmitting || !isDirty}
          >
            {isSubmitting ? <Spinner /> : "Spara ändringar"}
          </Button>
        </div>
      </div>
    </form>
  );
}

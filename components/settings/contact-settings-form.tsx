"use client";

import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Spinner } from "@/components/ui/spinner";
import { z } from "zod";
import type { Workspace } from "@/lib/db/schema";

interface ContactSettingsFormProps {
  workspace: Workspace;
}

const formSchema = z.object({
  workspaceId: z.string(),
  contactName: z.string().max(100).optional().nullable(),
  contactPhone: z.string().max(20).optional().nullable(),
  contactEmail: z.string().email("Ogiltig e-postadress").optional().nullable().or(z.literal("")),
  address: z.string().max(200).optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
  city: z.string().max(100).optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

export function ContactSettingsForm({ workspace }: ContactSettingsFormProps) {
  const router = useRouter();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      workspaceId: workspace.id,
      contactName: workspace.contactName ?? "",
      contactPhone: workspace.contactPhone ?? "",
      contactEmail: workspace.contactEmail ?? "",
      address: workspace.address ?? "",
      postalCode: workspace.postalCode ?? "",
      city: workspace.city ?? "",
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = form;

  const updateMutation = trpc.workspaces.update.useMutation({
    onSuccess: (updated) => {
      reset({
        workspaceId: updated.id,
        contactName: updated.contactName ?? "",
        contactPhone: updated.contactPhone ?? "",
        contactEmail: updated.contactEmail ?? "",
        address: updated.address ?? "",
        postalCode: updated.postalCode ?? "",
        city: updated.city ?? "",
      });
      router.refresh();
    },
  });

  function onSubmit(data: FormValues) {
    updateMutation.mutate({
      workspaceId: data.workspaceId,
      contactName: data.contactName || null,
      contactPhone: data.contactPhone || null,
      contactEmail: data.contactEmail || null,
      address: data.address || null,
      postalCode: data.postalCode || null,
      city: data.city || null,
    });
  }

  const isSubmitting = updateMutation.isPending;

  return (
    <form id="contact-settings-form" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Kontakt</h1>
          <p className="text-muted-foreground text-sm">
            Kontaktuppgifter och adress
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Kontaktinformation</CardTitle>
            <CardDescription>Kontaktuppgifter för företaget</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <Field data-invalid={!!errors.contactName}>
                <FieldLabel htmlFor="contactName">Kontaktperson</FieldLabel>
                <Input
                  id="contactName"
                  placeholder="Namn på kontaktperson"
                  maxLength={100}
                  disabled={isSubmitting}
                  {...register("contactName")}
                />
                <FieldDescription>
                  Namn på den person som ska kontaktas
                </FieldDescription>
                {errors.contactName && (
                  <FieldError errors={[errors.contactName]} />
                )}
              </Field>

              <Field data-invalid={!!errors.contactPhone}>
                <FieldLabel htmlFor="contactPhone">Telefonnummer</FieldLabel>
                <Input
                  id="contactPhone"
                  type="tel"
                  placeholder="+46 70 123 45 67"
                  maxLength={20}
                  disabled={isSubmitting}
                  {...register("contactPhone")}
                />
                <FieldDescription>
                  Telefonnummer till kontaktpersonen
                </FieldDescription>
                {errors.contactPhone && (
                  <FieldError errors={[errors.contactPhone]} />
                )}
              </Field>

              <Field data-invalid={!!errors.contactEmail}>
                <FieldLabel htmlFor="contactEmail">E-postadress</FieldLabel>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="kontakt@foretag.se"
                  disabled={isSubmitting}
                  {...register("contactEmail")}
                />
                <FieldDescription>
                  E-postadress till kontaktpersonen
                </FieldDescription>
                {errors.contactEmail && (
                  <FieldError errors={[errors.contactEmail]} />
                )}
              </Field>
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
              <Field data-invalid={!!errors.address}>
                <FieldLabel htmlFor="address">Gatuadress</FieldLabel>
                <Textarea
                  id="address"
                  placeholder="Gatan 123"
                  maxLength={200}
                  disabled={isSubmitting}
                  {...register("address")}
                />
                <FieldDescription>Gatuadress</FieldDescription>
                {errors.address && <FieldError errors={[errors.address]} />}
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field data-invalid={!!errors.postalCode}>
                  <FieldLabel htmlFor="postalCode">Postnummer</FieldLabel>
                  <Input
                    id="postalCode"
                    placeholder="123 45"
                    maxLength={10}
                    disabled={isSubmitting}
                    {...register("postalCode")}
                  />
                  <FieldDescription>Postnummer</FieldDescription>
                  {errors.postalCode && (
                    <FieldError errors={[errors.postalCode]} />
                  )}
                </Field>

                <Field data-invalid={!!errors.city}>
                  <FieldLabel htmlFor="city">Stad</FieldLabel>
                  <Input
                    id="city"
                    placeholder="Stockholm"
                    maxLength={100}
                    disabled={isSubmitting}
                    {...register("city")}
                  />
                  <FieldDescription>Stad</FieldDescription>
                  {errors.city && <FieldError errors={[errors.city]} />}
                </Field>
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
            form="contact-settings-form"
            disabled={isSubmitting || !isDirty}
          >
            {isSubmitting ? <Spinner /> : "Spara ändringar"}
          </Button>
        </div>
      </div>
    </form>
  );
}

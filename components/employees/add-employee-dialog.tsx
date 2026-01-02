"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

interface AddEmployeeDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAtLimit: boolean;
}

export function AddEmployeeDialog({
  workspaceId,
  open,
  onOpenChange,
  isAtLimit,
}: AddEmployeeDialogProps) {
  const [form, setForm] = useState({
    personalNumber: "",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    postalCode: "",
    city: "",
  });
  const [error, setError] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const createEmployee = trpc.employees.create.useMutation({
    onSuccess: () => {
      utils.employees.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  const resetForm = () => {
    setForm({
      personalNumber: "",
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      postalCode: "",
      city: "",
    });
    setError(null);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    createEmployee.mutate({
      workspaceId,
      ...form,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-lg">
        <DialogHeader>
          <DialogTitle>Lägg till anställd</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleCreate}>
          <FieldGroup>
            {isAtLimit && (
              <FieldError>
                Maximalt 25 anställda tillåtna. Arkivera en anställd för att lägga till en ny.
              </FieldError>
            )}
            <Field>
              <FieldLabel htmlFor="personalNumber">Personnummer *</FieldLabel>
              <Input
                id="personalNumber"
                value={form.personalNumber}
                onChange={(e) =>
                  setForm({ ...form, personalNumber: e.target.value.replace(/\D/g, "") })
                }
                placeholder="YYYYMMDDXXXX"
                maxLength={12}
                required
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="firstName">Förnamn *</FieldLabel>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  placeholder="Förnamn"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="lastName">Efternamn *</FieldLabel>
                <Input
                  id="lastName"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  placeholder="Efternamn"
                  required
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="email">E-post</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="exempel@email.com"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="phone">Telefon</FieldLabel>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="070-123 45 67"
                />
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="address">Adress</FieldLabel>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Gatunamn 123"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="postalCode">Postnummer</FieldLabel>
                <Input
                  id="postalCode"
                  value={form.postalCode}
                  onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
                  placeholder="123 45"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="city">Ort</FieldLabel>
                <Input
                  id="city"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Stad"
                />
              </Field>
            </div>

            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Avbryt
            </Button>
            <Button type="submit" disabled={createEmployee.isPending || isAtLimit}>
              {createEmployee.isPending ? <Spinner /> : "Lägg till"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


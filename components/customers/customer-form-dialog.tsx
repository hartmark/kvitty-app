"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import type { Customer } from "@/lib/db/schema";

interface CustomerFormDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

export function CustomerFormDialog({
  workspaceId,
  open,
  onOpenChange,
  customer,
}: CustomerFormDialogProps) {
  const utils = trpc.useUtils();
  const [name, setName] = useState(customer?.name || "");
  const [orgNumber, setOrgNumber] = useState(customer?.orgNumber || "");
  const [email, setEmail] = useState(customer?.email || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [address, setAddress] = useState(customer?.address || "");
  const [postalCode, setPostalCode] = useState(customer?.postalCode || "");
  const [city, setCity] = useState(customer?.city || "");

  const createCustomer = trpc.customers.create.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate();
      onOpenChange(false);
      resetForm();
    },
  });

  const updateCustomer = trpc.customers.update.useMutation({
    onSuccess: () => {
      utils.customers.list.invalidate();
      onOpenChange(false);
    },
  });

  const resetForm = () => {
    setName("");
    setOrgNumber("");
    setEmail("");
    setPhone("");
    setAddress("");
    setPostalCode("");
    setCity("");
  };

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setOrgNumber(customer.orgNumber || "");
      setEmail(customer.email || "");
      setPhone(customer.phone || "");
      setAddress(customer.address || "");
      setPostalCode(customer.postalCode || "");
      setCity(customer.city || "");
    } else {
      resetForm();
    }
  }, [customer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name, orgNumber, email, phone, address, postalCode, city };

    if (customer) {
      updateCustomer.mutate({ workspaceId, id: customer.id, ...data });
    } else {
      createCustomer.mutate({ workspaceId, ...data });
    }
  };

  const isPending = createCustomer.isPending || updateCustomer.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{customer ? "Redigera kund" : "Ny kund"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Namn *</FieldLabel>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isPending}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="orgNumber">Org.nummer</FieldLabel>
              <Input
                id="orgNumber"
                value={orgNumber}
                onChange={(e) => setOrgNumber(e.target.value)}
                placeholder="XXXXXX-XXXX"
                disabled={isPending}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="email">E-post</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Telefon</FieldLabel>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isPending}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="address">Adress</FieldLabel>
              <Input
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isPending}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="postalCode">Postnummer</FieldLabel>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  disabled={isPending}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="city">Ort</FieldLabel>
                <Input
                  id="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={isPending}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Avbryt
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? <Spinner /> : customer ? "Spara" : "Skapa"}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}


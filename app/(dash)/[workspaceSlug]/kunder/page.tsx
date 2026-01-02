"use client";

import { useState } from "react";
import { Plus, Pencil, Trash, DotsThree } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Spinner } from "@/components/ui/spinner";
import { trpc } from "@/lib/trpc/client";
import { useWorkspace } from "@/components/workspace-provider";
import type { Customer } from "@/lib/db/schema";
import { CustomerFormDialog } from "@/components/customers/customer-form-dialog";

export default function CustomersPage() {
  const { workspace } = useWorkspace();
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: customers, isLoading } = trpc.customers.list.useQuery({
    workspaceId: workspace.id,
  });

  const deleteCustomer = trpc.customers.delete.useMutation({
    onSuccess: () => utils.customers.list.invalidate(),
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Kunder</h1>
          <p className="text-muted-foreground">
            Hantera dina kunder för fakturering
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-2" />
          Ny kund
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-8" />
        </div>
      ) : customers?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Inga kunder ännu</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setCreateOpen(true)}
          >
            Lägg till din första kund
          </Button>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Namn</TableHead>
              <TableHead>Org.nr</TableHead>
              <TableHead>E-post</TableHead>
              <TableHead>Telefon</TableHead>
              <TableHead>Ort</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers?.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell className="font-mono text-sm">{customer.orgNumber || "-"}</TableCell>
                <TableCell>{customer.email || "-"}</TableCell>
                <TableCell>{customer.phone || "-"}</TableCell>
                <TableCell>{customer.city || "-"}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <DotsThree className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingCustomer(customer)}>
                        <Pencil className="size-4 mr-2" />
                        Redigera
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600"
                        onClick={() => {
                          if (confirm("Är du säker på att du vill ta bort denna kund?")) {
                            deleteCustomer.mutate({ workspaceId: workspace.id, id: customer.id });
                          }
                        }}
                      >
                        <Trash className="size-4 mr-2" />
                        Ta bort
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <CustomerFormDialog
        workspaceId={workspace.id}
        open={createOpen}
        onOpenChange={setCreateOpen}
        customer={null}
      />

      <CustomerFormDialog
        workspaceId={workspace.id}
        open={!!editingCustomer}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        customer={editingCustomer}
      />
    </div>
  );
}

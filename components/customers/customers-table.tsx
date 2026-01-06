"use client";

import Link from "next/link";
import { Pencil, Trash, DotsThree, Clock, Invoice } from "@phosphor-icons/react";
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
import type { Customer } from "@/lib/db/schema";
import { useWorkspace } from "@/components/workspace-provider";

interface CustomersTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
}

export function CustomersTable({
  customers,
  onEdit,
  onDelete,
}: CustomersTableProps) {
  const { workspace } = useWorkspace();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="px-4">Namn</TableHead>
          <TableHead className="px-4">Org.nr</TableHead>
          <TableHead className="px-4">E-post</TableHead>
          <TableHead className="px-4">Telefon</TableHead>
          <TableHead className="px-4">Ort</TableHead>
          <TableHead className="px-4 w-[140px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell className="px-4 font-medium">{customer.name}</TableCell>
            <TableCell className="px-4 font-mono text-sm">{customer.orgNumber || "-"}</TableCell>
            <TableCell className="px-4">{customer.email || "-"}</TableCell>
            <TableCell className="px-4">{customer.phone || "-"}</TableCell>
            <TableCell className="px-4">{customer.city || "-"}</TableCell>
            <TableCell className="px-4">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  title="Visa fakturor"
                >
                  <Link href={`/${workspace.slug}/fakturor?customerId=${customer.id}`}>
                    <Clock className="size-4" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  asChild
                  title="Skapa faktura"
                >
                  <Link href={`/${workspace.slug}/fakturor?newInvoice=true&customerId=${customer.id}`}>
                    <Invoice className="size-4" />
                  </Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <DotsThree className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(customer)}>
                      <Pencil className="size-4 mr-2" />
                      Redigera
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600"
                      onClick={() => {
                        if (confirm("Är du säker på att du vill ta bort denna kund?")) {
                          onDelete(customer);
                        }
                      }}
                    >
                      <Trash className="size-4 mr-2" />
                      Ta bort
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}


"use client";

import { useState } from "react";
import { Plus, Funnel, BookOpen, CaretUpDown, Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { CreateInvoiceDialog } from "@/components/invoices/create-invoice-dialog";
import { SendReminderDialog } from "@/components/invoices/send-reminder-dialog";
import { generateInvoicePdf } from "@/lib/utils/invoice-pdf";
import { useWorkspace } from "@/components/workspace-provider";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import type { InvoiceStatus } from "@/lib/db/schema";

type StatusFilter = InvoiceStatus | "all";

// Dialog state for bokföring confirmation
type BokforingDialog =
  | { type: "markAsSent"; invoiceId: string }
  | { type: "markAsPaid"; invoiceId: string }
  | null;

// State for reminder dialog
interface ReminderInvoice {
  id: string;
  invoiceNumber: number;
  customerName: string;
  customerEmail: string | null;
  total: string;
  dueDate: string;
}

interface InvoicesPageClientProps {
  initialCustomerId?: string;
  initialCreateOpen?: boolean;
}

export function InvoicesPageClient({
  initialCustomerId,
  initialCreateOpen = false,
}: InvoicesPageClientProps = {}) {
  const { workspace } = useWorkspace();
  const [createOpen, setCreateOpen] = useState(initialCreateOpen);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [customerFilter, setCustomerFilter] = useState<string | undefined>(initialCustomerId);
  const [customerComboboxOpen, setCustomerComboboxOpen] = useState(false);
  const [bokforingDialog, setBokforingDialog] = useState<BokforingDialog>(null);
  const [reminderInvoice, setReminderInvoice] = useState<ReminderInvoice | null>(null);
  const utils = trpc.useUtils();

  const { data: invoices, isLoading } = trpc.invoices.list.useQuery({
    workspaceId: workspace.id,
    status: statusFilter === "all" ? undefined : statusFilter,
    customerId: customerFilter,
  });

  const { data: customers } = trpc.customers.list.useQuery({
    workspaceId: workspace.id,
  });

  const markAsSent = trpc.invoices.markAsSent.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate({ workspaceId: workspace.id });
      setBokforingDialog(null);
    },
  });

  const markAsPaid = trpc.invoices.markAsPaid.useMutation({
    onSuccess: () => {
      utils.invoices.list.invalidate({ workspaceId: workspace.id });
      setBokforingDialog(null);
    },
  });

  const deleteInvoice = trpc.invoices.delete.useMutation({
    onSuccess: () => utils.invoices.list.invalidate({ workspaceId: workspace.id }),
  });

  const createSentVerification = trpc.invoices.createSentVerification.useMutation({
    onSuccess: () => utils.invoices.list.invalidate({ workspaceId: workspace.id }),
  });

  const createPaidVerification = trpc.invoices.createPaidVerification.useMutation({
    onSuccess: () => utils.invoices.list.invalidate({ workspaceId: workspace.id }),
  });

  // Handle confirmation dialog actions
  const handleBokforing = (createVerification: boolean) => {
    if (!bokforingDialog) return;

    if (bokforingDialog.type === "markAsSent") {
      markAsSent.mutate({
        workspaceId: workspace.id,
        id: bokforingDialog.invoiceId,
        createVerification,
      });
    } else {
      markAsPaid.mutate({
        workspaceId: workspace.id,
        id: bokforingDialog.invoiceId,
        createVerification,
      });
    }
  };

  const handleDownloadPdf = async (invoiceId: string) => {
    const invoice = invoices?.find((i) => i.id === invoiceId);
    if (!invoice) return;

    const pdf = generateInvoicePdf({
      workspace,
      invoice,
      customer: invoice.customer,
      lines: invoice.lines,
    });

    pdf.save(`Faktura-${invoice.invoiceNumber}.pdf`);
  };

  // Count invoices by status for filter badges
  const statusCounts = invoices?.reduce(
    (acc, inv) => {
      acc[inv.status] = (acc[inv.status] || 0) + 1;
      acc.all++;
      return acc;
    },
    { all: 0, draft: 0, sent: 0, paid: 0 } as Record<StatusFilter, number>
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Fakturor</h1>
          <p className="text-muted-foreground">
            Skapa och hantera kundfakturor
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="size-4 mr-2" />
          Ny faktura
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Funnel className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtrera:</span>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Alla status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Alla ({statusCounts?.all || 0})
            </SelectItem>
            <SelectItem value="draft">
              Utkast ({statusCounts?.draft || 0})
            </SelectItem>
            <SelectItem value="sent">
              Publicerad ({statusCounts?.sent || 0})
            </SelectItem>
            <SelectItem value="paid">
              Betald ({statusCounts?.paid || 0})
            </SelectItem>
          </SelectContent>
        </Select>
        <Popover open={customerComboboxOpen} onOpenChange={setCustomerComboboxOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={customerComboboxOpen}
              className="w-[250px] justify-between"
            >
              {customerFilter
                ? customers?.find((customer) => customer.id === customerFilter)?.name
                : "Alla kunder"}
              <CaretUpDown className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[250px] p-0">
            <Command>
              <CommandInput placeholder="Sök kund..." />
              <CommandList>
                <CommandEmpty>Ingen kund hittades.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="alla-kunder"
                    onSelect={() => {
                      setCustomerFilter(undefined);
                      setCustomerComboboxOpen(false);
                      const url = new URL(window.location.href);
                      url.searchParams.delete("customerId");
                      window.history.replaceState({}, "", url.toString());
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        !customerFilter ? "opacity-100" : "opacity-0"
                      )}
                    />
                    Alla kunder
                  </CommandItem>
                  {customers?.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={`${customer.name} ${customer.id}`}
                      onSelect={() => {
                        const newValue = customer.id === customerFilter ? undefined : customer.id;
                        setCustomerFilter(newValue);
                        setCustomerComboboxOpen(false);
                        const url = new URL(window.location.href);
                        if (!newValue) {
                          url.searchParams.delete("customerId");
                        } else {
                          url.searchParams.set("customerId", newValue);
                        }
                        window.history.replaceState({}, "", url.toString());
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 size-4",
                          customerFilter === customer.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {customer.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner className="size-8" />
        </div>
      ) : invoices?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>
            {statusFilter === "all"
              ? "Inga fakturor ännu"
              : `Inga fakturor med status "${
                  statusFilter === "draft"
                    ? "Utkast"
                    : statusFilter === "sent"
                    ? "Publicerad"
                    : "Betald"
                }"`}
          </p>
          {statusFilter === "all" && (
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setCreateOpen(true)}
            >
              Skapa din första faktura
            </Button>
          )}
        </div>
      ) : (
        <InvoicesTable
          invoices={invoices || []}
          workspaceSlug={workspace.slug}
          onDownloadPdf={handleDownloadPdf}
          onMarkAsSent={(invoiceId) =>
            setBokforingDialog({ type: "markAsSent", invoiceId })
          }
          onMarkAsPaid={(invoiceId) =>
            setBokforingDialog({ type: "markAsPaid", invoiceId })
          }
          onDelete={(invoiceId) =>
            deleteInvoice.mutate({ workspaceId: workspace.id, id: invoiceId })
          }
          onCreateSentVerification={(invoiceId) =>
            createSentVerification.mutate({ workspaceId: workspace.id, id: invoiceId })
          }
          onCreatePaidVerification={(invoiceId) =>
            createPaidVerification.mutate({ workspaceId: workspace.id, id: invoiceId })
          }
          onSendReminder={(invoice) =>
            setReminderInvoice({
              id: invoice.id,
              invoiceNumber: invoice.invoiceNumber,
              customerName: invoice.customer.name,
              customerEmail: invoice.customer.email,
              total: invoice.total,
              dueDate: invoice.dueDate,
            })
          }
        />
      )}

      <CreateInvoiceDialog
        workspaceId={workspace.id}
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open && customerFilter) {
            const url = new URL(window.location.href);
            url.searchParams.delete("newInvoice");
            window.history.replaceState({}, "", url.toString());
          }
        }}
        initialCustomerId={customerFilter}
      />

      {/* Bokföring Confirmation Dialog */}
      <AlertDialog
        open={bokforingDialog !== null}
        onOpenChange={(open) => !open && setBokforingDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia>
              <BookOpen className="size-6 text-foreground" />
            </AlertDialogMedia>
            <AlertDialogTitle>
              {bokforingDialog?.type === "markAsSent"
                ? "Publicera faktura"
                : "Markera som betald"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bokforingDialog?.type === "markAsSent"
                ? "Vill du skapa en verifikation för intäktsredovisningen?"
                : "Vill du skapa en verifikation för betalningen?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => handleBokforing(false)}
              disabled={markAsSent.isPending || markAsPaid.isPending}
            >
              Nej, bara {bokforingDialog?.type === "markAsSent" ? "publicera" : "markera"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleBokforing(true)}
              disabled={markAsSent.isPending || markAsPaid.isPending}
            >
              Ja, bokför
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Reminder Dialog */}
      {reminderInvoice && (
        <SendReminderDialog
          open={true}
          onOpenChange={(open) => !open && setReminderInvoice(null)}
          invoiceId={reminderInvoice.id}
          workspaceId={workspace.id}
          invoiceNumber={reminderInvoice.invoiceNumber}
          customerName={reminderInvoice.customerName}
          customerEmail={reminderInvoice.customerEmail}
          total={reminderInvoice.total}
          dueDate={reminderInvoice.dueDate}
        />
      )}
    </div>
  );
}

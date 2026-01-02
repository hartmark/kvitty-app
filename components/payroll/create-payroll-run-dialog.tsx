"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { trpc } from "@/lib/trpc/client";

interface CreatePayrollRunDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  periods: Array<{ id: string; label: string }>;
}

function generateMonthOptions() {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  const monthNames = [
    "Januari", "Februari", "Mars", "April", "Maj", "Juni",
    "Juli", "Augusti", "September", "Oktober", "November", "December"
  ];
  
  for (let year = currentYear - 1; year <= currentYear + 1; year++) {
    const startMonth = year === currentYear - 1 ? 1 : 1;
    const endMonth = year === currentYear + 1 ? currentMonth : 12;
    
    for (let month = startMonth; month <= endMonth; month++) {
      const value = `${year}${String(month).padStart(2, "0")}`;
      const label = `${monthNames[month - 1]} ${year}`;
      options.push({ value, label });
    }
  }
  
  return options.reverse();
}

export function CreatePayrollRunDialog({
  workspaceId,
  open,
  onOpenChange,
  periods,
}: CreatePayrollRunDialogProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(periods[0]?.id || "");
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [paymentDate, setPaymentDate] = useState(() => {
    const now = new Date();
    now.setDate(25);
    return now.toISOString().split("T")[0];
  });

  const monthOptions = generateMonthOptions();
  const utils = trpc.useUtils();

  const createRun = trpc.payroll.createRun.useMutation({
    onSuccess: () => {
      utils.payroll.listRuns.invalidate();
      onOpenChange(false);
      const now = new Date();
      setMonth(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`);
      const paymentDateNow = new Date();
      paymentDateNow.setDate(25);
      setPaymentDate(paymentDateNow.toISOString().split("T")[0]);
      setSelectedPeriod(periods[0]?.id || "");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Ny lönekörning</DialogTitle>
          <DialogDescription>
            Skapa en ny lönekörning för att betala ut löner till personalen.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (selectedPeriod && month) {
              createRun.mutate({
                workspaceId,
                fiscalPeriodId: selectedPeriod,
                period: month,
                paymentDate,
              });
            }
          }}
        >
          <FieldGroup className="pb-6">
            <Field>
              <FieldLabel htmlFor="period">Räkenskapsperiod</FieldLabel>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger id="period">
                  <SelectValue placeholder="Välj period" />
                </SelectTrigger>
                <SelectContent>
                  {periods.map((period) => (
                    <SelectItem key={period.id} value={period.id}>
                      {period.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {periods.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  Du måste skapa en räkenskapsperiod först
                </p>
              )}
            </Field>

            <Field>
              <FieldLabel htmlFor="month">Lönemånad</FieldLabel>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Välj månad" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="paymentDate">Utbetalningsdatum</FieldLabel>
              <DatePicker
                id="paymentDate"
                value={paymentDate}
                onChange={setPaymentDate}
                placeholder="Välj utbetalningsdatum"
              />
            </Field>
          </FieldGroup>

          {createRun.error && (
            <p className="text-sm text-destructive mt-2 mb-6">{createRun.error.message}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createRun.isPending}
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={createRun.isPending || !selectedPeriod || !month}
            >
              {createRun.isPending ? <Spinner /> : "Skapa lönekörning"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


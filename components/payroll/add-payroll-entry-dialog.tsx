"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";

interface AddPayrollEntryDialogProps {
  payrollRunId: string;
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableEmployees: Array<{ id: string; firstName: string; lastName: string }>;
  onSuccess: () => void;
}

export function AddPayrollEntryDialog({
  payrollRunId,
  workspaceId,
  open,
  onOpenChange,
  availableEmployees,
  onSuccess,
}: AddPayrollEntryDialogProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [grossSalary, setGrossSalary] = useState("");

  const addEntry = trpc.payroll.addEntry.useMutation({
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
      setSelectedEmployeeId("");
      setGrossSalary("");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lägg till anställd i lönekörning</DialogTitle>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>Anställd</FieldLabel>
            <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Välj anställd" />
              </SelectTrigger>
              <SelectContent>
                {availableEmployees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <FieldLabel htmlFor="grossSalary">Bruttolön</FieldLabel>
            <Input
              id="grossSalary"
              type="number"
              min="0"
              step="100"
              value={grossSalary}
              onChange={(e) => setGrossSalary(e.target.value)}
              placeholder="25000"
            />
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Avbryt
          </Button>
          <Button
            onClick={() =>
              addEntry.mutate({
                payrollRunId,
                workspaceId,
                entry: {
                  employeeId: selectedEmployeeId,
                  grossSalary: parseFloat(grossSalary),
                },
              })
            }
            disabled={addEntry.isPending || !selectedEmployeeId || !grossSalary}
          >
            {addEntry.isPending ? <Spinner /> : "Lägg till"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FilePdf, FileText, CircleNotch } from "@phosphor-icons/react";

interface ReportExportMenuProps {
  onExportPDF: () => void;
  onExportCSV: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export function ReportExportMenu({
  onExportPDF,
  onExportCSV,
  isLoading = false,
  disabled = false,
}: ReportExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="md"
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <CircleNotch className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          {isLoading ? "Exporterar..." : "Exportera"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-full">
        <DropdownMenuItem
          onClick={onExportPDF}
          disabled={isLoading}
        >
          <FilePdf className="mr-2 h-4 w-4" />
          Exportera PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onExportCSV}
          disabled={isLoading}
        >
          <FileText className="mr-2 h-4 w-4" />
          Exportera CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

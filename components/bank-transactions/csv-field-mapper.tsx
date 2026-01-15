"use client";

import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getConfidenceColor } from "@/lib/ai/csv-field-detection";
import type { CsvFieldMapping, AiFieldMapping } from "@/lib/validations/csv-import";

interface CsvFieldMapperProps {
  headers: string[];
  sampleValues: Record<number, string[]>;
  mapping: CsvFieldMapping;
  aiMapping: AiFieldMapping | null;
  onChange: (mapping: CsvFieldMapping) => void;
}

type ConfidenceKey = "accountingDate" | "amount" | "reference" | "bookedBalance";

interface FieldConfig {
  key: keyof CsvFieldMapping;
  label: string;
  required: boolean;
  description: string;
}

const FIELDS: FieldConfig[] = [
  {
    key: "accountingDate",
    label: "Bokföringsdag",
    required: true,
    description: "Datum för transaktionen",
  },
  {
    key: "amount",
    label: "Belopp",
    required: true,
    description: "Transaktionsbelopp (negativt för uttag)",
  },
  {
    key: "reference",
    label: "Referens",
    required: false,
    description: "Beskrivning eller meddelande",
  },
  {
    key: "bookedBalance",
    label: "Saldo",
    required: false,
    description: "Bokfört saldo efter transaktionen",
  },
];

function ConfidenceBadge({ confidence }: { confidence: number }): React.ReactElement {
  const color = getConfidenceColor(confidence);
  const percentage = Math.round(confidence * 100);

  const colorClasses = {
    green: "bg-green-100 text-green-800",
    yellow: "bg-yellow-100 text-yellow-800",
    red: "bg-red-100 text-red-800",
  };

  const icons = {
    green: <CheckCircle2 className="size-3" />,
    yellow: <AlertCircle className="size-3" />,
    red: <XCircle className="size-3" />,
  };

  return (
    <Badge variant="secondary" className={`text-xs gap-1 ${colorClasses[color]}`}>
      {icons[color]}
      {percentage}%
    </Badge>
  );
}

interface FieldSelectorProps {
  field: FieldConfig;
  selectedIndex: number | null | undefined;
  confidence: number | undefined;
  headers: string[];
  sampleValues: Record<number, string[]>;
  onChange: (value: string) => void;
}

function FieldSelector({
  field,
  selectedIndex,
  confidence,
  headers,
  sampleValues,
  onChange,
}: FieldSelectorProps): React.ReactElement {
  const hasSelection = selectedIndex != null;
  const samples = hasSelection ? sampleValues[selectedIndex] : undefined;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-2">
          {field.label}
          {field.required && <span className="text-red-500">*</span>}
        </Label>
        {confidence !== undefined && hasSelection && (
          <ConfidenceBadge confidence={confidence} />
        )}
      </div>
      <Select
        value={hasSelection ? selectedIndex.toString() : "none"}
        onValueChange={onChange}
      >
        <SelectTrigger>
          <SelectValue placeholder="Välj kolumn" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">
            {field.required ? "-- Välj kolumn --" : "-- Ingen --"}
          </SelectItem>
          {headers.map((header, index) => (
            <SelectItem key={index} value={index.toString()}>
              {header || `Kolumn ${index + 1}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{field.description}</p>
      {samples && samples.length > 0 && (
        <div className="text-xs bg-muted/50 rounded px-2 py-1">
          <span className="text-muted-foreground">Exempel: </span>
          {samples.slice(0, 3).join(", ")}
        </div>
      )}
    </div>
  );
}

export function CsvFieldMapper({
  headers,
  sampleValues,
  mapping,
  aiMapping,
  onChange,
}: CsvFieldMapperProps): React.ReactElement {
  function handleFieldChange(field: keyof CsvFieldMapping, value: string): void {
    const columnIndex = value === "none" ? null : parseInt(value, 10);
    onChange({ ...mapping, [field]: columnIndex });
  }

  const requiredFields = FIELDS.filter((f) => f.required);
  const optionalFields = FIELDS.filter((f) => !f.required);

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-medium mb-3">Obligatoriska fält</h4>
        <div className="space-y-4">
          {requiredFields.map((field) => (
            <FieldSelector
              key={field.key}
              field={field}
              selectedIndex={mapping[field.key]}
              confidence={aiMapping?.confidence[field.key as ConfidenceKey]}
              headers={headers}
              sampleValues={sampleValues}
              onChange={(value) => handleFieldChange(field.key, value)}
            />
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Valfria fält</h4>
        <div className="space-y-4">
          {optionalFields.map((field) => (
            <FieldSelector
              key={field.key}
              field={field}
              selectedIndex={mapping[field.key]}
              confidence={aiMapping?.confidence[field.key as ConfidenceKey]}
              headers={headers}
              sampleValues={sampleValues}
              onChange={(value) => handleFieldChange(field.key, value)}
            />
          ))}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-3">Alla kolumner i filen</h4>
        <div className="flex flex-wrap gap-2">
          {headers.map((header, index) => {
            const isUsed = Object.values(mapping).includes(index);
            return (
              <Badge
                key={index}
                variant={isUsed ? "default" : "secondary"}
                className="text-xs"
              >
                {index}: {header || "(tom)"}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}

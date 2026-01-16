"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Sparkle, ListBullets, Info } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc/client";
import {
  createCategorizationRuleSchema,
  conditionTypes,
  actionTypes,
  conditionTypeLabels,
  actionTypeLabels,
  type CreateCategorizationRuleInput,
  type ConditionType,
  type ActionType,
} from "@/lib/validations/categorization-rules";
import { VERIFICATION_TEMPLATES, TEMPLATE_CATEGORIES } from "@/lib/consts/verification-templates";

// Group templates by category for the selector (computed once)
const templatesByCategory = TEMPLATE_CATEGORIES.reduce(
  (acc, category) => {
    acc[category] = VERIFICATION_TEMPLATES.filter((t) =>
      t.categories.includes(category)
    );
    return acc;
  },
  {} as Record<string, typeof VERIFICATION_TEMPLATES>
);

interface TemplateSelectorFieldProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  description?: string;
}

function TemplateSelectorField({
  value,
  onChange,
  label = "Mall",
  description,
}: TemplateSelectorFieldProps) {
  // Track rendered template IDs to avoid duplicates (Radix uses value as internal key)
  const renderedTemplateIds = new Set<string>();

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Välj mall..." />
        </SelectTrigger>
        <SelectContent>
          {TEMPLATE_CATEGORIES.map((category) => {
            const templates = templatesByCategory[category];
            if (!templates || templates.length === 0) return null;

            // Filter out templates we've already rendered
            const uniqueTemplates = templates.filter((t) => {
              if (renderedTemplateIds.has(t.id)) return false;
              renderedTemplateIds.add(t.id);
              return true;
            });

            if (uniqueTemplates.length === 0) return null;

            return (
              <div key={category}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {category}
                </div>
                {uniqueTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </div>
            );
          })}
        </SelectContent>
      </Select>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

interface RuleBuilderDialogProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editRuleId?: string;
}

export function RuleBuilderDialog({
  workspaceId,
  open,
  onOpenChange,
  editRuleId,
}: RuleBuilderDialogProps) {
  const utils = trpc.useUtils();
  const isEditing = !!editRuleId;

  // Get existing rule if editing
  const { data: existingRule } = trpc.categorizationRules.get.useQuery(
    { workspaceId, id: editRuleId! },
    { enabled: open && isEditing }
  );

  const form = useForm<CreateCategorizationRuleInput>({
    resolver: zodResolver(createCategorizationRuleSchema),
    defaultValues: {
      workspaceId,
      name: "",
      description: "",
      priority: 0,
      isActive: true,
      conditionType: "contains",
      conditionValue: "",
      actionType: "suggest_template",
      actionValue: "",
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (existingRule && isEditing) {
      form.reset({
        workspaceId,
        name: existingRule.name,
        description: existingRule.description || "",
        priority: existingRule.priority,
        isActive: existingRule.isActive,
        conditionType: existingRule.conditionType as ConditionType,
        conditionValue: existingRule.conditionValue,
        actionType: existingRule.actionType as ActionType,
        actionValue: existingRule.actionValue,
      });
    }
  }, [existingRule, isEditing, form, workspaceId]);

  // Reset form when dialog opens for new rule
  useEffect(() => {
    if (open && !isEditing) {
      form.reset({
        workspaceId,
        name: "",
        description: "",
        priority: 0,
        isActive: true,
        conditionType: "contains",
        conditionValue: "",
        actionType: "suggest_template",
        actionValue: "",
      });
    }
  }, [open, isEditing, form, workspaceId]);

  const createMutation = trpc.categorizationRules.create.useMutation({
    onSuccess: () => {
      toast.success("Regel skapad");
      utils.categorizationRules.list.invalidate({ workspaceId });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      toast.error("Kunde inte skapa regel", { description: error.message });
    },
  });

  const updateMutation = trpc.categorizationRules.update.useMutation({
    onSuccess: () => {
      toast.success("Regel uppdaterad");
      utils.categorizationRules.list.invalidate({ workspaceId });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Kunde inte uppdatera regel", { description: error.message });
    },
  });

  const onSubmit = (data: CreateCategorizationRuleInput) => {
    if (isEditing) {
      updateMutation.mutate({
        id: editRuleId!,
        workspaceId: data.workspaceId,
        name: data.name,
        description: data.description,
        priority: data.priority,
        isActive: data.isActive,
        conditionType: data.conditionType,
        conditionValue: data.conditionValue,
        actionType: data.actionType,
        actionValue: data.actionValue,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const actionType = form.watch("actionType");
  const conditionType = form.watch("conditionType");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Redigera regel" : "Skapa ny regel"}
          </DialogTitle>
          <DialogDescription>
            Definiera villkor och åtgärd för automatisk kategorisering av transaktioner.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Namn</Label>
            <Input
              id="name"
              placeholder="T.ex. Spotify prenumeration"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Beskrivning (valfritt)</Label>
            <Textarea
              id="description"
              placeholder="Beskriv vad denna regel matchar..."
              rows={2}
              {...form.register("description")}
            />
          </div>

          {/* Condition Section */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="font-medium flex items-center gap-2">
                <ListBullets className="size-4" />
                Villkor
              </h4>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="size-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="text-sm">
                  <p className="font-medium mb-2">Hur villkor fungerar</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li><strong>Innehåller</strong> – Matchar om beskrivningen innehåller texten</li>
                    <li><strong>Exakt matchning</strong> – Matchar endast om beskrivningen är exakt lika</li>
                    <li><strong>Regex</strong> – Använd reguljära uttryck för avancerad matchning</li>
                    <li><strong>Belopp</strong> – Matchar baserat på transaktionens belopp</li>
                  </ul>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select
                  value={form.watch("conditionType")}
                  onValueChange={(v) => form.setValue("conditionType", v as ConditionType)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {conditionTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {conditionTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="conditionValue">
                  {conditionType === "amount_range" ? "Min, Max" : "Värde"}
                </Label>
                <Input
                  id="conditionValue"
                  placeholder={
                    conditionType === "amount_range"
                      ? "T.ex. 100, 500"
                      : conditionType.startsWith("amount_")
                      ? "T.ex. 1000"
                      : "T.ex. spotify"
                  }
                  {...form.register("conditionValue")}
                />
              </div>
            </div>
            {form.formState.errors.conditionValue && (
              <p className="text-sm text-destructive">
                {form.formState.errors.conditionValue.message}
              </p>
            )}
          </div>

          {/* Action Section */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="font-medium flex items-center gap-2">
                <Sparkle className="size-4" />
                Åtgärd
              </h4>
              <Popover>
                <PopoverTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-foreground transition-colors">
                    <Info className="size-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="text-sm">
                  <p className="font-medium mb-2">Vad händer när regeln matchar</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li><strong>Föreslå mall</strong> – Visar den valda mallen som förslag vid bokföring</li>
                    <li><strong>Föreslå konto</strong> – Föreslår ett specifikt konto för transaktionen</li>
                    <li><strong>Bokför automatiskt</strong> – Bokför transaktionen automatiskt med vald mall</li>
                  </ul>
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Typ</Label>
                <Select
                  value={form.watch("actionType")}
                  onValueChange={(v) => {
                    form.setValue("actionType", v as ActionType);
                    form.setValue("actionValue", "");
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {actionTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {actionTypeLabels[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Template selector */}
              {actionType === "suggest_template" && (
                <TemplateSelectorField
                  value={form.watch("actionValue")}
                  onChange={(v) => form.setValue("actionValue", v)}
                />
              )}

              {/* Account input */}
              {actionType === "suggest_account" && (
                <div className="space-y-2">
                  <Label htmlFor="actionValue">Kontonummer</Label>
                  <Input
                    id="actionValue"
                    type="number"
                    placeholder="T.ex. 6212"
                    {...form.register("actionValue")}
                  />
                </div>
              )}

              {/* Template for auto-book */}
              {actionType === "auto_book" && (
                <TemplateSelectorField
                  value={form.watch("actionValue")}
                  onChange={(v) => form.setValue("actionValue", v)}
                  label="Mall för automatisk bokföring"
                  description="Transaktioner som matchar denna regel bokförs automatiskt med vald mall."
                />
              )}
            </div>
            {form.formState.errors.actionValue && (
              <p className="text-sm text-destructive">
                {form.formState.errors.actionValue.message}
              </p>
            )}
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Aktiverad</Label>
              <p className="text-xs text-muted-foreground">
                Inaktiva regler kommer inte att användas
              </p>
            </div>
            <Switch
              checked={form.watch("isActive")}
              onCheckedChange={(checked) => form.setValue("isActive", checked)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Avbryt
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Sparar..."
                : isEditing
                ? "Uppdatera"
                : "Skapa regel"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

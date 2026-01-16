"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  DotsThree,
  Trash,
  PencilSimple,
  DotsSixVertical,
  Sparkle,
  ListBullets,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc/client";
import { RuleBuilderDialog } from "./rule-builder-dialog";
import {
  conditionTypeLabels,
  actionTypeLabels,
  type ConditionType,
  type ActionType,
} from "@/lib/validations/categorization-rules";
import { VERIFICATION_TEMPLATES } from "@/lib/consts/verification-templates";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface RulesListProps {
  workspaceId: string;
}

interface Rule {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  isActive: boolean;
  conditionType: string;
  conditionValue: string;
  actionType: string;
  actionValue: string;
  usageCount: number;
  lastMatchedAt: Date | null;
}

function SortableRuleItem({
  rule,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  rule: Rule;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: (active: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get template name if action is suggest_template or auto_book
  const getActionValueDisplay = () => {
    if (rule.actionType === "suggest_template" || rule.actionType === "auto_book") {
      const template = VERIFICATION_TEMPLATES.find((t) => t.id === rule.actionValue);
      return template?.name || rule.actionValue;
    }
    return rule.actionValue;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-4 bg-background border rounded-lg",
        isDragging && "opacity-50 shadow-lg",
        !rule.isActive && "opacity-60"
      )}
    >
      {/* Drag handle */}
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
      >
        <DotsSixVertical className="size-5" />
      </button>

      {/* Rule content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{rule.name}</span>
          {rule.usageCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {rule.usageCount}x använd
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <ListBullets className="size-3.5" />
            {conditionTypeLabels[rule.conditionType as ConditionType]}:{" "}
            <span className="font-mono text-foreground/80">{rule.conditionValue}</span>
          </span>
          <span className="flex items-center gap-1">
            <Sparkle className="size-3.5" />
            {actionTypeLabels[rule.actionType as ActionType]}:{" "}
            <span className="text-foreground/80">{getActionValueDisplay()}</span>
          </span>
        </div>
      </div>

      {/* Active toggle */}
      <Switch
        checked={rule.isActive}
        onCheckedChange={onToggleActive}
        aria-label="Aktivera regel"
      />

      {/* Actions menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <DotsThree className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <PencilSimple className="size-4 mr-2" />
            Redigera
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash className="size-4 mr-2" />
            Ta bort
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function RulesList({ workspaceId }: RulesListProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editRuleId, setEditRuleId] = useState<string | null>(null);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: rules, isLoading } = trpc.categorizationRules.list.useQuery({
    workspaceId,
    activeOnly: false,
  });

  const updateMutation = trpc.categorizationRules.update.useMutation({
    onMutate: async (newData) => {
      // Cancel outgoing refetches
      await utils.categorizationRules.list.cancel({ workspaceId });

      // Snapshot previous value
      const previousRules = utils.categorizationRules.list.getData({ workspaceId, activeOnly: false });

      // Optimistically update
      if (previousRules) {
        utils.categorizationRules.list.setData({ workspaceId, activeOnly: false }, (old) =>
          old?.map((r) => r.id === newData.id ? { ...r, ...newData } : r)
        );
      }

      return { previousRules };
    },
    onError: (error, _newData, context) => {
      // Rollback on error
      if (context?.previousRules) {
        utils.categorizationRules.list.setData({ workspaceId, activeOnly: false }, context.previousRules);
      }
      toast.error("Kunde inte uppdatera regel", { description: error.message });
    },
    onSettled: () => {
      utils.categorizationRules.list.invalidate({ workspaceId });
    },
  });

  const deleteMutation = trpc.categorizationRules.delete.useMutation({
    onSuccess: () => {
      toast.success("Regel borttagen");
      utils.categorizationRules.list.invalidate({ workspaceId });
      setDeleteRuleId(null);
    },
    onError: (error) => {
      toast.error("Kunde inte ta bort regel", { description: error.message });
    },
  });

  const updatePrioritiesMutation = trpc.categorizationRules.updatePriorities.useMutation({
    onSuccess: () => {
      toast.success("Ordning uppdaterad");
      utils.categorizationRules.list.invalidate({ workspaceId });
    },
    onError: (error) => {
      toast.error("Kunde inte uppdatera ordning", { description: error.message });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && rules) {
      const oldIndex = rules.findIndex((r) => r.id === active.id);
      const newIndex = rules.findIndex((r) => r.id === over.id);

      const newOrder = arrayMove(rules, oldIndex, newIndex);

      // Update priorities based on new order (highest priority = first in list)
      const priorities = newOrder.map((rule, index) => ({
        id: rule.id,
        priority: newOrder.length - index,
      }));

      updatePrioritiesMutation.mutate({ workspaceId, priorities });
    }
  };

  const handleToggleActive = (ruleId: string, isActive: boolean) => {
    updateMutation.mutate({
      workspaceId,
      id: ruleId,
      isActive,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-8" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Kategoriseringsregler</CardTitle>
            <CardDescription>
              Definiera regler för automatisk kategorisering av banktransaktioner.
              Dra för att ändra prioritet.
            </CardDescription>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="size-4 mr-2" />
            Ny regel
          </Button>
        </CardHeader>
        <CardContent>
          {!rules || rules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkle className="size-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">Inga regler skapade ännu</p>
              <p className="text-sm mb-4">
                Skapa en regel för att automatiskt kategorisera transaktioner
              </p>
              <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
                Skapa en regel
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={rules.map((r) => r.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {rules.map((rule) => (
                    <SortableRuleItem
                      key={rule.id}
                      rule={rule}
                      onEdit={() => setEditRuleId(rule.id)}
                      onDelete={() => setDeleteRuleId(rule.id)}
                      onToggleActive={(active) => handleToggleActive(rule.id, active)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <RuleBuilderDialog
        workspaceId={workspaceId}
        open={createDialogOpen || editRuleId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditRuleId(null);
          }
        }}
        editRuleId={editRuleId ?? undefined}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={deleteRuleId !== null}
        onOpenChange={(open) => !open && setDeleteRuleId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta bort regel</AlertDialogTitle>
            <AlertDialogDescription>
              Är du säker på att du vill ta bort regeln{" "}
              <strong>{rules?.find((r) => r.id === deleteRuleId)?.name}</strong>?
              Detta kan inte ångras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteRuleId &&
                deleteMutation.mutate({ workspaceId, id: deleteRuleId })
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Ta bort
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

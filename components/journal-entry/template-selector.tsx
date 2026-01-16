"use client";

import { useState, useMemo } from "react";
import { MagnifyingGlass, CaretRight, PencilSimple, ArrowLeft, Sparkle } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { VerificationTemplate } from "@/lib/types/templates";
import {
  searchTemplates,
  groupTemplatesByCategory,
  getValidTemplates,
  getTemplatesByDirection,
} from "@/lib/utils/template-utils";

export interface SuggestedTemplate extends VerificationTemplate {
  usageCount: number;
  lastUsedAt: Date;
  score: number;
}

interface TemplateSelectorProps {
  templates: VerificationTemplate[];
  categories: string[];
  direction: "In" | "Out" | "all";
  onSelectTemplate: (template: VerificationTemplate) => void;
  onSelectManual: () => void;
  onBack: () => void;
  suggestions?: SuggestedTemplate[];
}

export function TemplateSelector({
  templates,
  categories,
  direction,
  onSelectTemplate,
  onSelectManual,
  onBack,
  suggestions,
}: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [openCategories, setOpenCategories] = useState<Set<string>>(new Set());

  // Filter templates by direction and validity
  const filteredByDirection = useMemo(() => {
    const valid = getValidTemplates(templates);
    return getTemplatesByDirection(valid, direction);
  }, [templates, direction]);

  // Apply search filter
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return null;
    }
    return searchTemplates(filteredByDirection, searchQuery);
  }, [filteredByDirection, searchQuery]);

  // Group templates by category for browsing
  const groupedTemplates = useMemo(() => {
    return groupTemplatesByCategory(filteredByDirection, categories);
  }, [filteredByDirection, categories]);

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Search Input */}
      <div className="flex gap-2 mb-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onBack}
            >
              <ArrowLeft className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Tillbaka
          </TooltipContent>
        </Tooltip>
        <div className="relative flex-1">
          <MagnifyingGlass
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
            weight="bold"
          />
          <Input
            type="text"
            placeholder="Vad betalade du för?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onSelectManual}
            >
              <PencilSimple className="size-4" weight="duotone" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Manuell bokföring
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Results Area */}
      <div className="flex-1 overflow-y-auto relative">
        {isSearching ? (
          // Search Results
          <div className="space-y-1">
            {searchResults && searchResults.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-2">
                  {searchResults.length} resultat
                </p>
                {searchResults.map((template) => (
                  <TemplateListItem
                    key={template.id}
                    template={template}
                    onSelect={() => onSelectTemplate(template)}
                  />
                ))}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">Inga mallar hittades</p>
                <p className="text-xs mt-1">Prova ett annat sökord eller välj manuell bokföring</p>
              </div>
            )}
          </div>
        ) : (
          // Category Browser
          <div className="space-y-1">
            {/* Smart Suggestions Section */}
            {suggestions && suggestions.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Sparkle className="size-3.5 text-amber-500" weight="fill" />
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Föreslagna mallar
                  </p>
                </div>
                <div className="space-y-1 pl-0.5">
                  {suggestions.map((template) => (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() => onSelectTemplate(template)}
                      className={cn(
                        "w-full text-left rounded-lg px-3 py-2 transition-colors",
                        "bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40",
                        "hover:bg-amber-100 dark:hover:bg-amber-950/40 hover:border-amber-300 dark:hover:border-amber-700/60",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{template.name}</p>
                        <span className="text-xs text-amber-600 dark:text-amber-400 tabular-nums">
                          {template.usageCount}x
                        </span>
                      </div>
                      {template.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {template.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">
              Alla mallar
            </p>
            {categories.map((category) => {
              const categoryTemplates = groupedTemplates.get(category);
              if (!categoryTemplates || categoryTemplates.length === 0) {
                return null;
              }

              const isOpen = openCategories.has(category);

              return (
                <Collapsible
                  key={category}
                  open={isOpen}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center justify-between w-full rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        "hover:bg-muted/50",
                        isOpen && "bg-muted/30"
                      )}
                    >
                      <span className="font-medium">{category}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {categoryTemplates.length}
                        </span>
                        <CaretRight
                          className={cn(
                            "size-4 text-muted-foreground transition-transform",
                            isOpen && "rotate-90"
                          )}
                          weight="bold"
                        />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-3 space-y-0.5 py-1">
                      {categoryTemplates.map((template) => (
                        <TemplateListItem
                          key={template.id}
                          template={template}
                          onSelect={() => onSelectTemplate(template)}
                          compact
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        )}
        <div className="sticky bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent pointer-events-none" />
      </div>
    </div>
  );
}

interface TemplateListItemProps {
  template: VerificationTemplate;
  onSelect: () => void;
  compact?: boolean;
}

function TemplateListItem({ template, onSelect, compact }: TemplateListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full text-left rounded-lg transition-colors",
        "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        compact ? "px-3 py-2" : "px-3 py-2 border border-transparent hover:border-border"
      )}
    >
      <p className="font-medium text-sm">
        {template.name}
      </p>
      {template.description && (
        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
          {template.description}
        </p>
      )}
    </button>
  );
}

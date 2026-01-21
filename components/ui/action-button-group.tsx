"use client";

import * as React from "react";
import { DotsThree } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ActionButtonGroupProps {
  primaryAction: React.ReactNode;
  moreActions?: Array<{
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
    variant?: "default" | "destructive";
  }>;
}

export function ActionButtonGroup({
  primaryAction,
  moreActions = [],
}: ActionButtonGroupProps) {
  if (moreActions.length === 0) {
    return <>{primaryAction}</>;
  }

  return (
    <ButtonGroup>
      {primaryAction}
      <ButtonGroupSeparator />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="default" size="icon" aria-label="More options" className="border-l-0 rounded-l-none">
            <DotsThree className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          {moreActions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              onClick={action.onClick}
              variant={action.variant}
            >
              {action.icon}
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </ButtonGroup>
  );
}

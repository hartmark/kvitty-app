"use client";

import { useContext } from "react";
import { ChatCircle } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { AIChatDrawerContext } from "./ai-chat-drawer-provider";

export function ChatTriggerButton() {
  const context = useContext(AIChatDrawerContext);

  // Don't render if not within provider (e.g., outside workspace routes)
  if (!context) {
    return null;
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={context.toggleDrawer}
      aria-label="Oppna AI-assistent"
    >
      <ChatCircle className="size-4" />
    </Button>
  );
}

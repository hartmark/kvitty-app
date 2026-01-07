"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { AIChatDrawer } from "./ai-chat-drawer";

interface AIChatDrawerContextValue {
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
}

export const AIChatDrawerContext =
  createContext<AIChatDrawerContextValue | null>(null);

export function AIChatDrawerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const openDrawer = useCallback(() => setIsOpen(true), []);
  const closeDrawer = useCallback(() => setIsOpen(false), []);
  const toggleDrawer = useCallback(() => setIsOpen((prev) => !prev), []);

  return (
    <AIChatDrawerContext.Provider
      value={{ isOpen, openDrawer, closeDrawer, toggleDrawer }}
    >
      {children}
      <Drawer open={isOpen} onOpenChange={setIsOpen} direction="right">
        <DrawerContent
          className="h-full"
          style={{
            width: "min(512px, 100%)",
            maxWidth: "512px",
          }}
        >
          <AIChatDrawer onClose={closeDrawer} />
        </DrawerContent>
      </Drawer>
    </AIChatDrawerContext.Provider>
  );
}

export function useAIChatDrawer() {
  const context = useContext(AIChatDrawerContext);
  if (!context) {
    throw new Error(
      "useAIChatDrawer must be used within an AIChatDrawerProvider"
    );
  }
  return context;
}

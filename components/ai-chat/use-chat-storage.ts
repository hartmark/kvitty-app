"use client";

import { useState, useEffect, useCallback } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface StoredChatData {
  messages: ChatMessage[];
  version: number;
}

const STORAGE_VERSION = 1;
const MAX_MESSAGES = 100;

function getStorageKey(workspaceId: string) {
  return `kvitty:chat:${workspaceId}`;
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function useChatStorage(workspaceId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load messages from localStorage on mount
  useEffect(() => {
    if (!workspaceId) return;

    const key = getStorageKey(workspaceId);
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const data: StoredChatData = JSON.parse(stored);
        if (data.version === STORAGE_VERSION) {
          setMessages(data.messages);
        }
      }
    } catch {
      // Handle corrupted data - clear it
      localStorage.removeItem(key);
    }
    setIsLoaded(true);
  }, [workspaceId]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (!workspaceId || !isLoaded) return;

    const key = getStorageKey(workspaceId);
    const data: StoredChatData = {
      messages: messages.slice(-MAX_MESSAGES), // Keep only last N messages
      version: STORAGE_VERSION,
    };
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      // Storage quota exceeded - clear old messages
      console.warn("localStorage quota exceeded, clearing old messages");
      const reducedData: StoredChatData = {
        messages: messages.slice(-20),
        version: STORAGE_VERSION,
      };
      localStorage.setItem(key, JSON.stringify(reducedData));
    }
  }, [messages, workspaceId, isLoaded]);

  const addMessage = useCallback(
    (message: Omit<ChatMessage, "id" | "createdAt">) => {
      const newMessage: ChatMessage = {
        ...message,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, newMessage]);
    },
    []
  );

  const updateLastMessage = useCallback((content: string) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      updated[updated.length - 1] = {
        ...updated[updated.length - 1],
        content,
      };
      return updated;
    });
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    if (workspaceId) {
      localStorage.removeItem(getStorageKey(workspaceId));
    }
  }, [workspaceId]);

  return {
    messages,
    addMessage,
    updateLastMessage,
    clearMessages,
    isLoaded,
  };
}

"use client";

import { useState, useRef, useEffect } from "react";
import { PaperPlaneRight, Robot, User, Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

interface JournalLine {
  accountNumber: number;
  accountName: string;
  debit: number;
  credit: number;
}

interface Suggestion {
  description: string;
  lines: JournalLine[];
}

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestion?: Suggestion;
}

interface AIChatProps {
  onSuggestion?: (suggestion: Suggestion) => void;
  context?: Record<string, unknown>;
  className?: string;
}

export function AIChat({ onSuggestion, context, className }: AIChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }].map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context,
        }),
      });

      if (!response.ok) throw new Error("Failed to fetch");

      const data = await response.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.message,
          suggestion: data.suggestion,
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Något gick fel. Försök igen." },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const formatCurrency = (value: number) => {
    if (!value) return "-";
    return `${value.toLocaleString("sv-SE")} kr`;
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            <Robot className="size-12 mx-auto mb-3 opacity-50" weight="duotone" />
            <p>Hej! Jag kan hjälpa dig att bokföra.</p>
            <p className="mt-1">Prova t.ex. &quot;Bokför en dator för 22500kr&quot;</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="space-y-3">
              {/* Message bubble */}
              <div className={cn("flex gap-3", message.role === "user" && "flex-row-reverse")}>
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full",
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  {message.role === "user" ? (
                    <User className="size-4" weight="bold" />
                  ) : (
                    <Robot className="size-4" weight="duotone" />
                  )}
                </div>
                <div
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm max-w-[85%]",
                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  {message.content}
                </div>
              </div>

              {/* Suggestion card */}
              {message.suggestion && (
                <div className="ml-11">
                  <SuggestionCard
                    suggestion={message.suggestion}
                    onUse={onSuggestion ? () => onSuggestion(message.suggestion!) : undefined}
                  />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Robot className="size-4" weight="duotone" />
            </div>
            <div className="rounded-lg px-3 py-2 bg-muted">
              <Spinner className="size-4" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Beskriv transaktionen..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <PaperPlaneRight className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onUse,
}: {
  suggestion: Suggestion;
  onUse?: () => void;
}) {
  const totalDebit = suggestion.lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = suggestion.lines.reduce((sum, l) => sum + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const formatCurrency = (value: number) => {
    if (!value) return "-";
    return `${value.toLocaleString("sv-SE")} kr`;
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{suggestion.description}</span>
        {isBalanced && (
          <span className="text-xs text-green-600 flex items-center gap-1">
            <Check className="size-3" weight="bold" />
            Balanserat
          </span>
        )}
      </div>

      <div className="space-y-1">
        <div className="grid grid-cols-[1fr_80px_80px] gap-2 text-xs text-muted-foreground font-medium">
          <span>Konto</span>
          <span className="text-right">Debet</span>
          <span className="text-right">Kredit</span>
        </div>
        {suggestion.lines.map((line, i) => (
          <div key={i} className="grid grid-cols-[1fr_80px_80px] gap-2 text-sm py-1 border-t">
            <span className="truncate">
              <span className="font-mono text-xs text-muted-foreground mr-1">
                {line.accountNumber}
              </span>
              {line.accountName}
            </span>
            <span className="text-right font-mono text-xs">{formatCurrency(line.debit)}</span>
            <span className="text-right font-mono text-xs">{formatCurrency(line.credit)}</span>
          </div>
        ))}
        <div className="grid grid-cols-[1fr_80px_80px] gap-2 text-sm py-1 border-t font-medium">
          <span>Summa</span>
          <span className="text-right font-mono text-xs">{formatCurrency(totalDebit)}</span>
          <span className="text-right font-mono text-xs">{formatCurrency(totalCredit)}</span>
        </div>
      </div>

      {onUse && (
        <Button size="sm" className="w-full" onClick={onUse}>
          <Check className="size-4 mr-2" />
          Använd förslag
        </Button>
      )}
    </div>
  );
}

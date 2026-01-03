"use client";

import { useCallback, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Separator } from "@/components/ui/separator";

interface BankTransactionFilterBarProps {
  search: string;
  dateFrom: string;
  dateTo: string;
}

export function BankTransactionFilterBar({
  search,
  dateFrom,
  dateTo,
}: BankTransactionFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());

      for (const [key, value] of Object.entries(updates)) {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      }

      const queryString = params.toString();
      router.replace(queryString ? `?${queryString}` : "?", { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== search) {
        updateParams({ search: searchInput || null });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchInput, search, updateParams]);

  const hasFilters = search || dateFrom || dateTo;

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1 max-w-sm">
        <MagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Sök referens, konto..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="pl-8 pr-8"
        />
        {searchInput && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 size-7"
            onClick={() => setSearchInput("")}
          >
            <X className="size-3" />
          </Button>
        )}
      </div>

      <Separator orientation="vertical" className="hidden sm:block" />

      <div className="flex items-center gap-2">
        <DatePicker
          value={dateFrom}
          onChange={(value) => updateParams({ dateFrom: value || null })}
          placeholder="Från datum"
        />
        <DatePicker
          value={dateTo}
          onChange={(value) => updateParams({ dateTo: value || null })}
          placeholder="Till datum"
        />
      </div>

      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setSearchInput("");
            updateParams({ search: null, dateFrom: null, dateTo: null });
          }}
          className="self-start sm:self-center"
        >
          Rensa filter
        </Button>
      )}
    </div>
  );
}


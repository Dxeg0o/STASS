"use client";

import React, { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown, Package2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  displayLoteCode,
  formatNumber,
  relativeTimeEs,
  normalizeText,
  type LoteOption,
} from "./types";

interface LoteComboboxProps {
  options: LoteOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  excludeIds?: string[];
  className?: string;
}

export function LoteCombobox({
  options,
  value,
  onChange,
  placeholder = "Buscar lote por código, variedad o producto…",
  excludeIds = [],
  className,
}: LoteComboboxProps) {
  const [open, setOpen] = useState(false);

  const ordered = useMemo(() => {
    const excluded = new Set(excludeIds);
    return [...options]
      .filter((l) => !excluded.has(l.id))
      .sort((a, b) => {
        const aEmpty = a.totalBulbs === 0 && !a.lastTs;
        const bEmpty = b.totalBulbs === 0 && !b.lastTs;
        if (aEmpty !== bEmpty) return aEmpty ? 1 : -1;
        const aTime = a.lastTs ? new Date(a.lastTs).getTime() : 0;
        const bTime = b.lastTs ? new Date(b.lastTs).getTime() : 0;
        return bTime - aTime;
      });
  }, [options, excludeIds]);

  const selected = options.find((l) => l.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-expanded={open}
          className={cn(
            "flex items-center justify-between gap-2 w-full max-w-md px-3 py-2 rounded-lg bg-slate-900/40 border border-white/10 text-sm text-left hover:border-white/20 focus:outline-none focus:border-cyan-500/40 transition-colors",
            className
          )}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Package2 className="w-4 h-4 text-slate-500 shrink-0" />
            {selected ? (
              <span className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-white truncate">
                  {displayLoteCode(selected)}
                </span>
                {selected.variedadNombre && (
                  <span className="text-slate-400 truncate">
                    · {selected.variedadNombre}
                  </span>
                )}
              </span>
            ) : (
              <span className="text-slate-500 truncate">{placeholder}</span>
            )}
          </div>
          <ChevronsUpDown className="w-4 h-4 text-slate-500 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-slate-950 border-white/10"
      >
        <Command
          className="bg-transparent"
          filter={(itemValue, search) => {
            const lote = ordered.find((l) => l.id === itemValue);
            if (!lote) return 0;
            const hay = normalizeText(
              [
                lote.codigoLote,
                lote.variedadNombre,
                lote.productoNombre,
                lote.servicioActual,
                lote.etapaActual,
              ].join(" ")
            );
            const needle = normalizeText(search);
            return hay.includes(needle) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder="Buscar…"
            className="text-white placeholder:text-slate-500"
          />
          <CommandList className="max-h-[360px]">
            <CommandEmpty className="text-slate-500">
              No se encontraron lotes.
            </CommandEmpty>
            <CommandGroup>
              {ordered.map((lote) => {
                const isEmpty = lote.totalBulbs === 0 && !lote.lastTs;
                const isSelected = lote.id === value;
                return (
                  <CommandItem
                    key={lote.id}
                    value={lote.id}
                    onSelect={() => {
                      onChange(lote.id);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex flex-col items-start gap-0.5 py-2 px-3 cursor-pointer data-[selected=true]:bg-cyan-500/10",
                      isEmpty && "opacity-50"
                    )}
                  >
                    <div className="flex items-center gap-2 w-full min-w-0">
                      <Check
                        className={cn(
                          "w-3.5 h-3.5 text-cyan-400 shrink-0",
                          isSelected ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="font-mono text-sm text-white truncate">
                        {displayLoteCode(lote)}
                      </span>
                      {lote.variedadNombre && (
                        <span className="text-xs text-slate-400 truncate">
                          · {lote.variedadNombre}
                        </span>
                      )}
                      {!isEmpty && lote.isActive && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)] shrink-0" />
                      )}
                    </div>
                    {!isEmpty && (
                      <div className="pl-6 text-[11px] text-slate-500">
                        {formatNumber(lote.totalBulbs)} bulbos · {relativeTimeEs(lote.lastTs)}
                      </div>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

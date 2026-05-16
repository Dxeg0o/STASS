"use client";

import React, { useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AnaliticaFiltersState, FacetOption } from "./types";

interface Props {
  state: AnaliticaFiltersState;
  onChange: (next: AnaliticaFiltersState) => void;
  productos: FacetOption[];
  variedades: (FacetOption & { productoId: string | null })[];
  etapas: FacetOption[];
  resultCount: number;
  totalCount: number;
}

const ACTIVITY_OPTIONS = [
  { label: "Todos", value: "todos" as const },
  { label: "Últimos 7 días", value: "ultimos_7" as const },
  { label: "Últimos 30 días", value: "ultimos_30" as const },
];

const DEFAULT_STATE: AnaliticaFiltersState = {
  search: "",
  productoId: "",
  variedadId: "",
  tipoProcesoId: "",
  hideEmpty: true,
  activity: "todos",
};

export function AnaliticaFilters({
  state,
  onChange,
  productos,
  variedades,
  etapas,
  resultCount,
  totalCount,
}: Props) {
  const [moreOpen, setMoreOpen] = useState(false);

  const set = <K extends keyof AnaliticaFiltersState>(
    key: K,
    value: AnaliticaFiltersState[K]
  ) => onChange({ ...state, [key]: value });

  const filteredVariedades =
    state.productoId === ""
      ? variedades
      : variedades.filter((v) => v.productoId === state.productoId);

  const isFiltered =
    state.search !== "" ||
    state.productoId !== "" ||
    state.variedadId !== "" ||
    state.tipoProcesoId !== "" ||
    state.activity !== "todos" ||
    !state.hideEmpty;

  const advancedCount =
    (state.activity !== "todos" ? 1 : 0) + (!state.hideEmpty ? 1 : 0);

  return (
    <div className="flex flex-wrap items-center gap-2 pb-3 border-b border-white/5">
      <div className="relative flex-1 min-w-[220px] max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Buscar lote, variedad…"
          value={state.search}
          onChange={(e) => set("search", e.target.value)}
          className="w-full pl-9 pr-3 h-9 rounded-lg text-sm bg-slate-900/40 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/40"
        />
      </div>

      <FilterSelect
        value={state.productoId}
        onChange={(v) => {
          const next = { ...state, productoId: v };
          if (
            v &&
            state.variedadId &&
            !variedades.find(
              (var_) => var_.id === state.variedadId && var_.productoId === v
            )
          ) {
            next.variedadId = "";
          }
          onChange(next);
        }}
        placeholder="Producto"
        options={productos}
      />
      <FilterSelect
        value={state.variedadId}
        onChange={(v) => set("variedadId", v)}
        placeholder="Variedad"
        options={filteredVariedades}
      />
      <FilterSelect
        value={state.tipoProcesoId}
        onChange={(v) => set("tipoProcesoId", v)}
        placeholder="Etapa"
        options={etapas}
      />

      <Popover open={moreOpen} onOpenChange={setMoreOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-medium border transition-colors ${
              advancedCount > 0
                ? "bg-cyan-950/50 text-cyan-300 border-cyan-500/30"
                : "bg-slate-900/40 text-slate-300 border-white/10 hover:border-white/20"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Más
            {advancedCount > 0 && (
              <span className="ml-0.5 px-1.5 rounded-full bg-cyan-500/20 text-[10px] text-cyan-200">
                {advancedCount}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          className="w-64 bg-slate-950 border-white/10 p-3 space-y-3"
        >
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wide text-slate-500 font-medium">
              Actividad
            </p>
            <div className="grid grid-cols-3 gap-1">
              {ACTIVITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => set("activity", opt.value)}
                  className={`px-2 py-1.5 rounded-md text-[11px] font-medium border transition-colors ${
                    state.activity === opt.value
                      ? "bg-cyan-950/60 text-cyan-300 border-cyan-500/40"
                      : "bg-slate-900/40 text-slate-400 border-white/10 hover:border-white/20"
                  }`}
                >
                  {opt.label.replace("Últimos ", "")}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between gap-2 text-xs text-slate-300 cursor-pointer">
            <span>Mostrar lotes sin datos</span>
            <input
              type="checkbox"
              checked={!state.hideEmpty}
              onChange={(e) => set("hideEmpty", !e.target.checked)}
              className="accent-cyan-500"
            />
          </label>
        </PopoverContent>
      </Popover>

      <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-500">
        <span>
          <span className="text-slate-300 font-medium">{resultCount}</span>
          <span className="text-slate-600">/{totalCount}</span>
        </span>
        {isFiltered && (
          <button
            onClick={() => onChange(DEFAULT_STATE)}
            title="Limpiar filtros"
            className="p-1 rounded-md text-slate-500 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: FacetOption[];
}) {
  const isActive = value !== "";
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`appearance-none h-9 pl-3 pr-7 rounded-lg text-xs font-medium border transition-colors cursor-pointer focus:outline-none focus:border-cyan-500/40 ${
        isActive
          ? "bg-cyan-950/50 text-cyan-200 border-cyan-500/30"
          : "bg-slate-900/40 text-slate-300 border-white/10 hover:border-white/20"
      }`}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.nombre} ({opt.count})
        </option>
      ))}
    </select>
  );
}

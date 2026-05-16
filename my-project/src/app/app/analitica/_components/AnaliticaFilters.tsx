"use client";

import React from "react";
import { Search, EyeOff, Eye, FilterX } from "lucide-react";
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

export function AnaliticaFilters({
  state,
  onChange,
  productos,
  variedades,
  etapas,
  resultCount,
  totalCount,
}: Props) {
  const set = <K extends keyof AnaliticaFiltersState>(
    key: K,
    value: AnaliticaFiltersState[K]
  ) => onChange({ ...state, [key]: value });

  const isFiltered =
    state.search !== "" ||
    state.productoId !== "" ||
    state.variedadId !== "" ||
    state.tipoProcesoId !== "" ||
    state.activity !== "todos" ||
    !state.hideEmpty;

  const filteredVariedades =
    state.productoId === ""
      ? variedades
      : variedades.filter((v) => v.productoId === state.productoId);

  return (
    <div className="rounded-xl bg-slate-900/40 border border-white/10 p-3 md:p-4 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar lote, variedad, producto…"
            value={state.search}
            onChange={(e) => set("search", e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-full text-sm bg-slate-950/50 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/40"
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
          placeholder="Todos los productos"
          options={productos}
        />
        <FilterSelect
          value={state.variedadId}
          onChange={(v) => set("variedadId", v)}
          placeholder="Todas las variedades"
          options={filteredVariedades}
        />
        <FilterSelect
          value={state.tipoProcesoId}
          onChange={(v) => set("tipoProcesoId", v)}
          placeholder="Todas las etapas"
          options={etapas}
        />

        <div className="flex gap-1.5">
          {ACTIVITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => set("activity", opt.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                state.activity === opt.value
                  ? "bg-cyan-950/60 text-cyan-400 border-cyan-500/40"
                  : "bg-slate-900/40 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => set("hideEmpty", !state.hideEmpty)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            state.hideEmpty
              ? "bg-slate-900/40 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-300"
              : "bg-amber-950/40 text-amber-300 border-amber-500/30"
          }`}
          title={state.hideEmpty ? "Mostrar lotes sin datos" : "Ocultar lotes sin datos"}
        >
          {state.hideEmpty ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {state.hideEmpty ? "Sin datos ocultos" : "Mostrando sin datos"}
        </button>

        {isFiltered && (
          <button
            onClick={() =>
              onChange({
                search: "",
                productoId: "",
                variedadId: "",
                tipoProcesoId: "",
                hideEmpty: true,
                activity: "todos",
              })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-900/40 text-slate-400 border border-white/10 hover:border-red-500/30 hover:text-red-300 transition-colors"
          >
            <FilterX className="w-3.5 h-3.5" />
            Limpiar
          </button>
        )}
      </div>

      <div className="text-[11px] text-slate-500">
        Mostrando <span className="text-slate-300 font-medium">{resultCount}</span> de{" "}
        <span className="text-slate-400">{totalCount}</span> lotes
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
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none pl-3 pr-7 py-1.5 rounded-full text-xs font-medium bg-slate-900/40 text-slate-300 border border-white/10 hover:border-white/20 focus:outline-none focus:border-cyan-500/40 cursor-pointer"
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

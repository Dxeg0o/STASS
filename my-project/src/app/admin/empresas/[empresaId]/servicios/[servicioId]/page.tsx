"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  Layers,
  Cpu,
  Unlink,
  FileSpreadsheet,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────

interface Lote {
  id: string;
  codigoLote?: string | null;
  fechaCreacion: string;
  variedadId?: string | null;
  variedadNombre?: string | null;
  variedadTipo?: string | null;
  subvariedadId?: string | null;
  subvariedadNombre?: string | null;
  productoNombre?: string | null;
}

interface Subvariedad {
  id: string;
  nombre: string;
}

interface Variedad {
  id: string;
  nombre: string;
  tipo?: string | null;
  subvariedades?: Subvariedad[];
}

interface Producto {
  id: string;
  nombre: string;
  variedades: Variedad[];
}

interface ServicioInfo {
  id: string;
  nombre: string;
  tipo: string;
  estado: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  proceso?: { tipoProceso?: { nombre: string } | null } | null;
  ubicacion?: { nombre: string; tipo: string } | null;
}

interface Dispositivo {
  id: string;
  nombre: string;
  tipo: string;
  activo: boolean | null;
}

interface ServicioDispositivo {
  dispositivoId: string;
  servicioId: string;
  maquina: string | null;
  asignadoAt: string | null;
  fechaInicio: string | null;
  fechaTermino: string | null;
  dispositivo: Dispositivo;
}

interface ServicioDispositivosResponse {
  asignados: ServicioDispositivo[];
  disponibles: Dispositivo[];
}

const TIPO_LABELS: Record<string, string> = {
  linea_conteo: "Línea de Conteo",
  maquina_plantacion: "Máquina de Plantación",
  estacion_calidad: "Estación de Calidad",
};

const ESTADO_LABELS: Record<string, { label: string; className: string }> = {
  planificado: {
    label: "Planificado",
    className: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  },
  en_curso: {
    label: "En curso",
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  },
  completado: {
    label: "Completado",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  },
  cancelado: {
    label: "Cancelado",
    className: "bg-red-500/20 text-red-400 border-red-500/40",
  },
};

type CreationMode = "individual" | "excel";
type ColumnMapping =
  | "ignore"
  | "codigoLote"
  | "variedad"
  | "subvariedad"
  | "producto";

interface ExcelRow {
  rowNumber: number;
  values: Record<string, string>;
}

interface ExcelSheetOption {
  name: string;
  headers: string[];
  rows: ExcelRow[];
}

interface ImportPreviewRow {
  rowNumber: number;
  codigoLote: string;
  variedadId: string | null;
  variedadNombre: string | null;
  subvariedadId: string | null;
  subvariedadNombre: string | null;
  productoNombre: string | null;
  status: "ready" | "warning" | "skipped";
  warnings: string[];
  skipReason?: string;
}

const MAPPING_LABELS: Record<ColumnMapping, string> = {
  ignore: "Ignorar",
  codigoLote: "Código de lote",
  variedad: "Variedad",
  subvariedad: "Subvariedad",
  producto: "Producto",
};

const normalizeText = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// ── Component ────────────────────────────────────────────────

export default function AdminServicioLotesPage() {
  const params = useParams<{ empresaId: string; servicioId: string }>();
  const router = useRouter();
  const { empresaId, servicioId } = params;

  // Data
  const [servicioInfo, setServicioInfo] = useState<ServicioInfo | null>(null);
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispositivosAsignados, setDispositivosAsignados] = useState<ServicioDispositivo[]>([]);
  const [dispositivosDisponibles, setDispositivosDisponibles] = useState<Dispositivo[]>([]);
  const [dispositivosLoading, setDispositivosLoading] = useState(true);

  // Search
  const [search, setSearch] = useState("");

  // Create dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creationMode, setCreationMode] = useState<CreationMode>("individual");
  const [selectedProductoId, setSelectedProductoId] = useState("");
  const [selectedVariedadId, setSelectedVariedadId] = useState("");
  const [creating, setCreating] = useState(false);
  const [codigoLoteInput, setCodigoLoteInput] = useState("");
  const [excelFileName, setExcelFileName] = useState("");
  const [excelSheets, setExcelSheets] = useState<ExcelSheetOption[]>([]);
  const [selectedExcelSheetName, setSelectedExcelSheetName] = useState("");
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelRows, setExcelRows] = useState<ExcelRow[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, ColumnMapping>>({});
  const [bulkProductoId, setBulkProductoId] = useState("");
  const [bulkVariedadId, setBulkVariedadId] = useState("");

  // Selection mode
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Device assignment dialog
  const [deviceDialogOpen, setDeviceDialogOpen] = useState(false);
  const [selectedDispositivoId, setSelectedDispositivoId] = useState("");
  const [deviceMaquina, setDeviceMaquina] = useState("");
  const [assigningDevice, setAssigningDevice] = useState(false);
  const [unassigningDeviceId, setUnassigningDeviceId] = useState<string | null>(null);

  // ── Fetch data ──────────────────────────────────────────────

  useEffect(() => {
    if (!servicioId || !empresaId) return;
    setLoading(true);

    Promise.all([
      axios.get(`/api/admin/empresas/${empresaId}`),
      axios.get(`/api/admin/servicios/${servicioId}/lotes`),
      axios.get("/api/admin/productos"),
      axios.get<ServicioDispositivosResponse>(
        `/api/admin/servicios/${servicioId}/dispositivos`
      ),
    ])
      .then(([empresaRes, lotesRes, productosRes, dispositivosRes]) => {
        // Find the service in empresa data
        const srv = empresaRes.data.servicios?.find(
          (s: ServicioInfo) => s.id === servicioId
        );
        setServicioInfo(srv ?? null);
        setLotes(lotesRes.data);
        setProductos(productosRes.data);
        setDispositivosAsignados(dispositivosRes.data.asignados);
        setDispositivosDisponibles(dispositivosRes.data.disponibles);
      })
      .catch(() => toast.error("Error al cargar datos"))
      .finally(() => {
        setLoading(false);
        setDispositivosLoading(false);
      });
  }, [servicioId, empresaId]);

  // ── Filtered lotes ──────────────────────────────────────────

  const filteredLotes = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return lotes;
    return lotes.filter(
      (l) =>
        l.id.toLowerCase().includes(term) ||
        (l.codigoLote ?? "").toLowerCase().includes(term) ||
        (l.variedadTipo ?? "").toLowerCase().includes(term) ||
        l.variedadNombre?.toLowerCase().includes(term) ||
        l.subvariedadNombre?.toLowerCase().includes(term) ||
        l.productoNombre?.toLowerCase().includes(term)
    );
  }, [lotes, search]);

  // ── Varieties for selected product ──────────────────────────

  const variedadesForSelected = useMemo(() => {
    if (!selectedProductoId) return [];
    return productos.find((p) => p.id === selectedProductoId)?.variedades ?? [];
  }, [productos, selectedProductoId]);

  const bulkVariedadOptions = useMemo(() => {
    const sourceProducts = bulkProductoId
      ? productos.filter((p) => p.id === bulkProductoId)
      : productos;

    return sourceProducts.flatMap((p) =>
      p.variedades.map((v) => ({
        variedad: v,
        producto: p,
      }))
    );
  }, [bulkProductoId, productos]);

  const bulkVariedadSelection = useMemo(
    () =>
      bulkVariedadOptions.find((option) => option.variedad.id === bulkVariedadId) ??
      null,
    [bulkVariedadId, bulkVariedadOptions]
  );

  const selectedExcelSheet = useMemo(
    () =>
      excelSheets.find((sheet) => sheet.name === selectedExcelSheetName) ??
      null,
    [excelSheets, selectedExcelSheetName]
  );

  const mappedHeaderByType = useMemo(() => {
    const entries = Object.entries(columnMappings);

    return {
      codigoLote: entries.find(([, mapping]) => mapping === "codigoLote")?.[0] ?? null,
      variedad: entries.find(([, mapping]) => mapping === "variedad")?.[0] ?? null,
      subvariedad: entries.find(([, mapping]) => mapping === "subvariedad")?.[0] ?? null,
      producto: entries.find(([, mapping]) => mapping === "producto")?.[0] ?? null,
    };
  }, [columnMappings]);

  const importPreview = useMemo(() => {
    const existingCodes = new Set(
      lotes
        .map((l) => l.codigoLote)
        .filter((value): value is string => Boolean(value))
        .map(normalizeText)
    );
    const seenCodes = new Set<string>();
    const productByName = new Map(productos.map((p) => [normalizeText(p.nombre), p]));
    const varietiesByName = new Map<string, Array<{ variedad: Variedad; producto: Producto }>>();

    productos.forEach((p) => {
      p.variedades.forEach((v) => {
        const key = normalizeText(v.nombre);
        const current = varietiesByName.get(key) ?? [];
        current.push({ variedad: v, producto: p });
        varietiesByName.set(key, current);
      });
    });

    const manualProduct = bulkProductoId
      ? productos.find((p) => p.id === bulkProductoId) ?? null
      : null;
    const manualVariety = bulkVariedadSelection;
    const codigoHeader = mappedHeaderByType.codigoLote;
    const variedadHeader = mappedHeaderByType.variedad;
    const subvariedadHeader = mappedHeaderByType.subvariedad;
    const productoHeader = mappedHeaderByType.producto;

    if (!codigoHeader) {
      return {
        rows: [] as ImportPreviewRow[],
        readyRows: [] as ImportPreviewRow[],
        skippedCount: 0,
        warningCount: 0,
        hasCodigoMapping: false,
      };
    }

    const rows = excelRows.map((row) => {
      const warnings: string[] = [];
      const codigoLote = (row.values[codigoHeader] ?? "").trim();

      if (!codigoLote) {
        return {
          rowNumber: row.rowNumber,
          codigoLote,
          variedadId: null,
          variedadNombre: null,
          subvariedadId: null,
          subvariedadNombre: null,
          productoNombre: null,
          status: "skipped" as const,
          warnings: [],
          skipReason: "Sin código de lote",
        };
      }

      const normalizedCode = normalizeText(codigoLote);
      if (seenCodes.has(normalizedCode)) {
        return {
          rowNumber: row.rowNumber,
          codigoLote,
          variedadId: null,
          variedadNombre: null,
          subvariedadId: null,
          subvariedadNombre: null,
          productoNombre: null,
          status: "skipped" as const,
          warnings: [],
          skipReason: "Código duplicado en el Excel",
        };
      }
      seenCodes.add(normalizedCode);

      if (existingCodes.has(normalizedCode)) {
        return {
          rowNumber: row.rowNumber,
          codigoLote,
          variedadId: null,
          variedadNombre: null,
          subvariedadId: null,
          subvariedadNombre: null,
          productoNombre: null,
          status: "skipped" as const,
          warnings: [],
          skipReason: "Código ya existe en este servicio",
        };
      }

      let productContext = manualProduct;
      const productValue = productoHeader ? (row.values[productoHeader] ?? "").trim() : "";
      if (productoHeader) {
        productContext = productValue
          ? productByName.get(normalizeText(productValue)) ?? null
          : null;
        if (productValue && !productContext) {
          warnings.push(`Producto no encontrado: ${productValue}`);
        }
      }

      let variedadId: string | null = null;
      let variedadNombre: string | null = null;
      let matchedVariedad: Variedad | null = null;
      const variedadValue = variedadHeader ? (row.values[variedadHeader] ?? "").trim() : "";

      if (variedadHeader && variedadValue) {
        if (productContext) {
          const match = productContext.variedades.find(
            (v) => normalizeText(v.nombre) === normalizeText(variedadValue)
          );
          if (match) {
            variedadId = match.id;
            variedadNombre = match.nombre;
            matchedVariedad = match;
          } else {
            warnings.push(`Variedad no encontrada para ${productContext.nombre}: ${variedadValue}`);
          }
        } else {
          const matches = varietiesByName.get(normalizeText(variedadValue)) ?? [];
          if (matches.length === 1) {
            variedadId = matches[0].variedad.id;
            variedadNombre = matches[0].variedad.nombre;
            matchedVariedad = matches[0].variedad;
            productContext = matches[0].producto;
          } else if (matches.length > 1) {
            warnings.push(`Variedad ambigua sin producto: ${variedadValue}`);
          } else {
            warnings.push(`Variedad no encontrada: ${variedadValue}`);
          }
        }
      } else if (variedadHeader) {
        warnings.push("Fila sin variedad");
      } else if (manualVariety) {
        variedadId = manualVariety.variedad.id;
        variedadNombre = manualVariety.variedad.nombre;
        matchedVariedad = manualVariety.variedad;
        productContext = manualVariety.producto;
      }

      let subvariedadId: string | null = null;
      let subvariedadNombre: string | null = null;
      const subvariedadValue = subvariedadHeader
        ? (row.values[subvariedadHeader] ?? "").trim()
        : "";

      if (subvariedadHeader && subvariedadValue) {
        subvariedadNombre = subvariedadValue;
        if (!matchedVariedad) {
          warnings.push("Subvariedad sin variedad identificada");
        } else {
          const match = matchedVariedad.subvariedades?.find(
            (s) => normalizeText(s.nombre) === normalizeText(subvariedadValue)
          );

          if (match) {
            subvariedadId = match.id;
            subvariedadNombre = match.nombre;
          } else {
            warnings.push(`Subvariedad se creará: ${subvariedadValue}`);
          }
        }
      }

      return {
        rowNumber: row.rowNumber,
        codigoLote,
        variedadId,
        variedadNombre,
        subvariedadId,
        subvariedadNombre,
        productoNombre: productContext?.nombre ?? null,
        status: warnings.length > 0 ? ("warning" as const) : ("ready" as const),
        warnings,
      };
    });

    return {
      rows,
      readyRows: rows.filter((row) => row.status !== "skipped"),
      skippedCount: rows.filter((row) => row.status === "skipped").length,
      warningCount: rows.filter((row) => row.status === "warning").length,
      hasCodigoMapping: true,
    };
  }, [bulkProductoId, bulkVariedadSelection, excelRows, lotes, mappedHeaderByType, productos]);

  // ── Handlers ────────────────────────────────────────────────

  const handleProductoChange = (id: string) => {
    setSelectedProductoId(id);
    setSelectedVariedadId("");
  };

  const resetExcelImport = () => {
    setExcelFileName("");
    setExcelSheets([]);
    setSelectedExcelSheetName("");
    setExcelHeaders([]);
    setExcelRows([]);
    setColumnMappings({});
    setBulkProductoId("");
    setBulkVariedadId("");
  };

  const resetDialog = () => {
    setSelectedProductoId("");
    setSelectedVariedadId("");
    setCreationMode("individual");
    setCodigoLoteInput("");
    resetExcelImport();
  };

  const inferColumnMapping = (header: string): ColumnMapping => {
    const normalized = normalizeText(header);
    const compact = normalized.replace(/[^a-z0-9]/g, "");
    if (
      normalized.includes("codigo") ||
      normalized === "lote" ||
      normalized.includes("cod lote") ||
      normalized.includes("id lote")
    ) {
      return "codigoLote";
    }
    if (compact.includes("subvariedad")) {
      return "subvariedad";
    }
    if (normalized.includes("variedad")) return "variedad";
    if (normalized.includes("producto")) return "producto";
    return "ignore";
  };

  const buildInitialMappings = (headers: string[]) =>
    headers.reduce<Record<string, ColumnMapping>>((acc, header) => {
      const inferred = inferColumnMapping(header);
      const alreadyUsed = Object.values(acc).includes(inferred);
      acc[header] = inferred !== "ignore" && alreadyUsed ? "ignore" : inferred;
      return acc;
    }, {});

  const parseExcelSheet = (
    name: string,
    sheet: XLSX.WorkSheet
  ): ExcelSheetOption => {
    const rows = XLSX.utils.sheet_to_json<
      Array<string | number | boolean | null>
    >(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
    });

    const headerRow = rows[0] ?? [];
    const headers = headerRow
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);

    const parsedRows: ExcelRow[] = rows.slice(1).flatMap((row, index) => {
      const values = headers.reduce<Record<string, string>>(
        (acc, header, columnIndex) => {
          acc[header] = String(row[columnIndex] ?? "").trim();
          return acc;
        },
        {}
      );

      const hasAnyValue = Object.values(values).some((value) => value.trim());
      if (!hasAnyValue) return [];

      return [{ rowNumber: index + 2, values }];
    });

    return { name, headers, rows: parsedRows };
  };

  const applyExcelSheet = (sheet: ExcelSheetOption) => {
    setSelectedExcelSheetName(sheet.name);
    setExcelHeaders(sheet.headers);
    setExcelRows(sheet.rows);
    setColumnMappings(buildInitialMappings(sheet.headers));
    setBulkProductoId("");
    setBulkVariedadId("");
  };

  const handleExcelSheetChange = (sheetName: string) => {
    const sheet = excelSheets.find((option) => option.name === sheetName);
    if (!sheet) return;
    applyExcelSheet(sheet);
  };

  const handleExcelFile = async (file: File | null) => {
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        toast.error("El Excel no tiene hojas");
        return;
      }

      const sheets = workbook.SheetNames.map((sheetName) =>
        parseExcelSheet(sheetName, workbook.Sheets[sheetName])
      );
      const firstReadableSheet =
        sheets.find((sheet) => sheet.headers.length > 0) ?? sheets[0];

      setExcelFileName(file.name);
      setExcelSheets(sheets);
      applyExcelSheet(firstReadableSheet);

      if (firstReadableSheet.headers.length === 0) {
        toast.error("No se encontraron cabeceras legibles en la primera fila");
        return;
      }

      toast.success(
        `Excel cargado: ${sheets.length} hoja(s), ${firstReadableSheet.rows.length} fila(s) en "${firstReadableSheet.name}"`
      );
    } catch {
      toast.error("No se pudo leer el Excel");
    }
  };

  const handleMappingChange = (header: string, mapping: ColumnMapping) => {
    setColumnMappings((prev) => {
      const next = { ...prev, [header]: mapping };
      if (mapping !== "ignore") {
        Object.keys(next).forEach((key) => {
          if (key !== header && next[key] === mapping) next[key] = "ignore";
        });
      }
      if (mapping === "producto") setBulkProductoId("");
      if (mapping === "variedad") setBulkVariedadId("");
      return next;
    });
  };

  const handleBulkProductoChange = (productoId: string) => {
    setBulkProductoId(productoId);
    setBulkVariedadId((currentVariedadId) => {
      if (!currentVariedadId) return "";

      const selectedProduct = productos.find((p) => p.id === productoId);
      const belongsToSelectedProduct = selectedProduct?.variedades.some(
        (v) => v.id === currentVariedadId
      );

      return belongsToSelectedProduct ? currentVariedadId : "";
    });
  };

  const handleCreate = async () => {
    if (creationMode === "excel") {
      if (!mappedHeaderByType.codigoLote) {
        toast.error("Debes mapear una columna como Código de lote");
        return;
      }

      if (importPreview.readyRows.length === 0) {
        toast.error("No hay lotes válidos para importar");
        return;
      }
    }

    setCreating(true);

    try {
      if (creationMode === "excel") {
        const res = await axios.post(`/api/admin/servicios/${servicioId}/lotes`, {
          lotes: importPreview.readyRows.map((row) => ({
            codigoLote: row.codigoLote,
            variedadId: row.variedadId,
            subvariedadId: row.subvariedadId,
            subvariedadNombre: row.subvariedadNombre,
          })),
        });

        const { created, lotes: newLotes, skippedDuplicates = [] } = res.data;
        setLotes((prev) => [...newLotes, ...prev]);
        setDialogOpen(false);
        resetDialog();

        toast.success(
          `Se importaron ${created} lote(s)${
            skippedDuplicates.length ? `; ${skippedDuplicates.length} duplicado(s) omitido(s)` : ""
          }`
        );
        return;
      }

      const res = await axios.post(`/api/admin/servicios/${servicioId}/lotes`, {
        variedadId: selectedVariedadId || undefined,
        cantidad: 1,
        codigoLote: creationMode === "individual" ? (codigoLoteInput.trim() || undefined) : undefined,
      });

      const { created, lotes: newLotes } = res.data;
      setLotes((prev) => [...newLotes, ...prev]);
      setDialogOpen(false);
      resetDialog();

      if (created === 1) {
        toast.success("Lote creado correctamente");
      } else {
        toast.success(`Se crearon ${created} lotes correctamente`);
      }
    } catch {
      toast.error(creationMode === "excel" ? "Error al importar lotes" : "Error al crear lotes");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredLotes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredLotes.map((l) => l.id)));
    }
  };

  const handleExitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  };

  const handleDelete = async () => {
    const ids = Array.from(selectedIds);
    setDeleting(true);
    try {
      await axios.delete(`/api/admin/servicios/${servicioId}/lotes`, {
        data: { loteIds: ids },
      });
      setLotes((prev) => prev.filter((l) => !selectedIds.has(l.id)));
      setSelectedIds(new Set());
      setDeleteDialogOpen(false);
      setSelectionMode(false);
      toast.success(`Se eliminaron ${ids.length} lote(s)`);
    } catch (err: unknown) {
      const error = err as { response?: { status?: number; data?: { blockedLoteIds?: string[] } } };
      if (error.response?.status === 409) {
        const blocked = error.response.data?.blockedLoteIds ?? [];
        toast.error(
          `${blocked.length} lote(s) tienen sesiones activas y no pueden eliminarse`
        );
      } else {
        toast.error("Error al eliminar lotes");
      }
    } finally {
      setDeleting(false);
    }
  };

  const fetchServicioDispositivos = async () => {
    setDispositivosLoading(true);
    try {
      const res = await axios.get<ServicioDispositivosResponse>(
        `/api/admin/servicios/${servicioId}/dispositivos`
      );
      setDispositivosAsignados(res.data.asignados);
      setDispositivosDisponibles(res.data.disponibles);
    } catch {
      toast.error("Error al cargar dispositivos");
    } finally {
      setDispositivosLoading(false);
    }
  };

  const resetDeviceDialog = () => {
    setSelectedDispositivoId("");
    setDeviceMaquina("");
  };

  const handleAssignDevice = async () => {
    if (!selectedDispositivoId) return;

    setAssigningDevice(true);
    try {
      await axios.post(`/api/admin/servicios/${servicioId}/dispositivos`, {
        dispositivoId: selectedDispositivoId,
        maquina: deviceMaquina.trim() || null,
      });
      setDeviceDialogOpen(false);
      resetDeviceDialog();
      await fetchServicioDispositivos();
      toast.success("Dispositivo asignado correctamente");
    } catch {
      toast.error("Error al asignar dispositivo");
    } finally {
      setAssigningDevice(false);
    }
  };

  const handleUnassignDevice = async (dispositivoId: string) => {
    setUnassigningDeviceId(dispositivoId);
    try {
      await axios.delete(`/api/admin/servicios/${servicioId}/dispositivos`, {
        data: { dispositivoId },
      });
      await fetchServicioDispositivos();
      toast.success("Dispositivo desasignado correctamente");
    } catch {
      toast.error("Error al desasignar dispositivo");
    } finally {
      setUnassigningDeviceId(null);
    }
  };

  // ── Loading / Error ─────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        <div className="h-8 w-64 bg-slate-800 animate-pulse rounded" />
        <div className="h-48 bg-slate-800/40 animate-pulse rounded-lg" />
        <div className="h-96 bg-slate-800/40 animate-pulse rounded-lg" />
      </div>
    );
  }

  const allSelected =
    filteredLotes.length > 0 && selectedIds.size === filteredLotes.length;

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push(`/admin/empresas/${empresaId}`)}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a empresa
      </button>

      {/* Service header */}
      {servicioInfo && (
        <div className="space-y-2">
          <div className="flex items-center gap-3 flex-wrap">
            <Layers className="w-6 h-6 text-amber-400" />
            <h1 className="text-2xl font-bold text-white">{servicioInfo.nombre}</h1>
            <Badge
              variant="outline"
              className="border-amber-500/40 text-amber-400 text-xs"
            >
              {TIPO_LABELS[servicioInfo.tipo] ?? servicioInfo.tipo}
            </Badge>
            <Badge
              variant="outline"
              className={`text-xs ${ESTADO_LABELS[servicioInfo.estado]?.className ?? ESTADO_LABELS.planificado.className}`}
            >
              {ESTADO_LABELS[servicioInfo.estado]?.label ?? servicioInfo.estado}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-400">
            {servicioInfo.proceso?.tipoProceso?.nombre && (
              <span>Proceso: {servicioInfo.proceso.tipoProceso.nombre}</span>
            )}
            {servicioInfo.ubicacion && (
              <span>
                Ubicación: {servicioInfo.ubicacion.nombre} ({servicioInfo.ubicacion.tipo})
              </span>
            )}
            <span>
              Inicio {servicioInfo.fechaInicio ? format(new Date(servicioInfo.fechaInicio), "dd/MM/yyyy") : "pendiente"}
              {servicioInfo.fechaFin
                ? ` — Hasta ${format(new Date(servicioInfo.fechaFin), "dd/MM/yyyy")}`
                : ""}
            </span>
          </div>
        </div>
      )}

      <Tabs defaultValue="lotes" className="space-y-4">
        <TabsList className="bg-slate-800/50 border border-white/10">
          <TabsTrigger
            value="lotes"
            className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
          >
            Lotes
            <Badge variant="outline" className="ml-1.5 border-white/10 text-slate-400 text-xs">
              {lotes.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="dispositivos"
            className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
          >
            Dispositivos
            <Badge variant="outline" className="ml-1.5 border-white/10 text-slate-400 text-xs">
              {dispositivosAsignados.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Lotes management */}
        <TabsContent value="lotes" className="mt-0">
          <Card className="bg-slate-900/60 border-white/10">
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <CardTitle className="text-lg text-white">
              Lotes del servicio
              <span className="text-slate-500 font-normal ml-2 text-sm">
                ({lotes.length})
              </span>
            </CardTitle>
            <div className="flex items-center gap-2">
              {selectionMode ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExitSelection}
                    className="border-white/10 text-slate-400 hover:text-white"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    disabled={selectedIds.size === 0}
                    onClick={() => setDeleteDialogOpen(true)}
                    className="bg-red-600 hover:bg-red-500 text-white font-semibold"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Eliminar ({selectedIds.size})
                  </Button>
                </>
              ) : (
                <>
                  {lotes.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectionMode(true)}
                      className="border-white/10 text-slate-400 hover:text-white"
                    >
                      Gestionar
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setDialogOpen(true)}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Crear Lotes
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <Input
            placeholder="Buscar por ID, variedad o producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm bg-slate-800/50 border-white/10 text-white placeholder:text-slate-500"
          />

          {/* Table */}
          {filteredLotes.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <Layers className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-lg font-medium">No hay lotes</p>
              <p className="text-sm mt-1">
                Crea lotes de forma individual o importa un Excel para comenzar
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    {selectionMode && (
                      <TableHead className="w-10">
                        <button
                          onClick={handleSelectAll}
                          className="text-slate-400 hover:text-amber-400 transition-colors"
                        >
                          {allSelected ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </TableHead>
                    )}
                    <TableHead className="text-slate-400 uppercase text-xs">
                      ID
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Producto
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Tipo
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Variedad
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Subvariedad
                    </TableHead>
                    <TableHead className="text-slate-400 uppercase text-xs">
                      Creado
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLotes.map((l) => {
                    const isSelected = selectedIds.has(l.id);
                    return (
                      <TableRow
                        key={l.id}
                        className={`border-white/5 transition-colors ${
                          isSelected
                            ? "bg-amber-500/10"
                            : "hover:bg-white/[0.02]"
                        }`}
                      >
                        {selectionMode && (
                          <TableCell>
                            <button
                              onClick={() => handleToggleSelect(l.id)}
                              className={`transition-colors ${
                                isSelected
                                  ? "text-amber-400"
                                  : "text-slate-500 hover:text-slate-300"
                              }`}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4" />
                              ) : (
                                <Square className="w-4 h-4" />
                              )}
                            </button>
                          </TableCell>
                        )}
                        <TableCell className="font-mono text-white text-sm">
                          {l.codigoLote ?? l.id.slice(-8)}
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {l.productoNombre ?? (
                            <span className="italic text-slate-600">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {l.variedadTipo ? (
                            <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/30 text-xs">
                              {l.variedadTipo}
                            </Badge>
                          ) : (
                            <span className="italic text-slate-600">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {l.variedadNombre ? (
                            <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-xs">
                              {l.variedadNombre}
                            </Badge>
                          ) : (
                            <span className="italic text-slate-600">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {l.subvariedadNombre ? (
                            <Badge className="bg-cyan-500/15 text-cyan-300 border-cyan-500/30 text-xs">
                              {l.subvariedadNombre}
                            </Badge>
                          ) : (
                            <span className="italic text-slate-600">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          {format(new Date(l.fechaCreacion), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
          </Card>
        </TabsContent>

        {/* Device management */}
        <TabsContent value="dispositivos" className="mt-0">
          <Card className="bg-slate-900/60 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <CardTitle className="text-lg text-white">
                  Dispositivos del servicio
                  <span className="text-slate-500 font-normal ml-2 text-sm">
                    ({dispositivosAsignados.length})
                  </span>
                </CardTitle>
                <Button
                  size="sm"
                  disabled={
                    dispositivosDisponibles.length === 0 ||
                    dispositivosLoading ||
                    servicioInfo?.estado === "completado" ||
                    servicioInfo?.estado === "cancelado"
                  }
                  onClick={() => setDeviceDialogOpen(true)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Asignar Dispositivo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {dispositivosLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 rounded-lg bg-slate-800/70 animate-pulse"
                    />
                  ))}
                </div>
              ) : dispositivosAsignados.length === 0 ? (
                <div className="text-center py-16 text-slate-500">
                  <Cpu className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-lg font-medium">No hay dispositivos asignados</p>
                  <p className="text-sm mt-1">
                    Asigna dispositivos desde este servicio para comenzar.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-transparent">
                        <TableHead className="text-slate-400 uppercase text-xs">
                          Nombre
                        </TableHead>
                        <TableHead className="text-slate-400 uppercase text-xs">
                          Tipo
                        </TableHead>
                        <TableHead className="text-slate-400 uppercase text-xs">
                          Máquina
                        </TableHead>
                        <TableHead className="text-slate-400 uppercase text-xs">
                          Asignado
                        </TableHead>
                        <TableHead className="text-slate-400 uppercase text-xs text-center">
                          Estado
                        </TableHead>
                        <TableHead className="text-slate-400 uppercase text-xs text-right">
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dispositivosAsignados.map((assignment) => {
                        const isInactive = assignment.dispositivo.activo === false;
                        const assignmentStatus = assignment.fechaTermino
                          ? "cerrado"
                          : assignment.fechaInicio
                            ? "activo"
                            : "pendiente";

                        return (
                          <TableRow
                            key={assignment.dispositivoId}
                            className="border-white/5 hover:bg-white/[0.02] transition-colors"
                          >
                            <TableCell className="text-white font-medium">
                              {assignment.dispositivo.nombre}
                            </TableCell>
                            <TableCell className="text-slate-400">
                              {assignment.dispositivo.tipo}
                            </TableCell>
                            <TableCell className="text-slate-400">
                              {assignment.maquina || (
                                <span className="italic text-slate-600">Sin máquina</span>
                              )}
                            </TableCell>
                            <TableCell className="text-slate-400 text-sm">
                              {assignment.asignadoAt
                                ? format(new Date(assignment.asignadoAt), "dd/MM/yyyy HH:mm")
                                : "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge
                                variant="outline"
                                className={
                                  assignmentStatus === "pendiente"
                                    ? "border-amber-500/30 bg-amber-950/30 text-amber-400"
                                    : assignmentStatus === "cerrado" || isInactive
                                      ? "border-red-500/30 bg-red-950/30 text-red-400"
                                      : "border-emerald-500/30 bg-emerald-950/30 text-emerald-400"
                                }
                              >
                                {assignmentStatus === "pendiente"
                                  ? "Pendiente"
                                  : assignmentStatus === "cerrado"
                                    ? "Cerrado"
                                    : isInactive
                                      ? "Inactivo"
                                      : "Activo"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={unassigningDeviceId === assignment.dispositivoId}
                                onClick={() => handleUnassignDevice(assignment.dispositivoId)}
                                className="border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                              >
                                <Unlink className="w-3 h-3 mr-1" />
                                {unassigningDeviceId === assignment.dispositivoId
                                  ? "Quitando..."
                                  : "Desasignar"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Create Dialog ──────────────────────────────────────── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetDialog();
        }}
      >
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Crear Lotes</DialogTitle>
          </DialogHeader>

          <Tabs
            value={creationMode}
            onValueChange={(v) => setCreationMode(v as CreationMode)}
            className="mt-2"
          >
            <TabsList className="bg-slate-800/60 border border-white/10 w-full">
              <TabsTrigger
                value="individual"
                className="flex-1 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
              >
                Individual
              </TabsTrigger>
              <TabsTrigger
                value="excel"
                className="flex-1 data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"
              >
                Excel
              </TabsTrigger>
            </TabsList>

            <TabsContent value="individual" className="mt-4 space-y-4">
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">
                  Producto
                </label>
                <Select
                  value={selectedProductoId}
                  onValueChange={handleProductoChange}
                >
                  <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar producto..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {productos.map((p) => (
                      <SelectItem
                        key={p.id}
                        value={p.id}
                        className="text-white hover:bg-slate-800"
                      >
                        {p.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">
                  Variedad
                </label>
                <Select
                  value={selectedVariedadId}
                  onValueChange={setSelectedVariedadId}
                  disabled={
                    !selectedProductoId || variedadesForSelected.length === 0
                  }
                >
                  <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                    <SelectValue placeholder="Seleccionar variedad..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {variedadesForSelected.map((v) => (
                      <SelectItem
                        key={v.id}
                        value={v.id}
                        className="text-white hover:bg-slate-800"
                      >
                        {v.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">
                  Código de lote <span className="text-slate-600">(ej. 320.22C.S)</span>
                </label>
                <input
                  type="text"
                  placeholder="320.22C.S"
                  value={codigoLoteInput}
                  onChange={(e) => setCodigoLoteInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-slate-800/50 border border-white/10 text-white placeholder:text-slate-500 text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </TabsContent>

            <TabsContent value="excel" className="mt-4 space-y-5">
              <div className="rounded-lg border border-dashed border-white/15 bg-slate-950/40 p-4">
                <label className="flex flex-col sm:flex-row sm:items-center gap-3 cursor-pointer">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-amber-500/15 text-amber-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </span>
                  <span className="space-y-1">
                    <span className="block text-sm font-medium text-white">
                      {excelFileName || "Subir archivo Excel"}
                    </span>
                    <span className="block text-xs text-slate-500">
                      {selectedExcelSheet
                        ? `${selectedExcelSheet.name} · ${selectedExcelSheet.rows.length} fila(s)`
                        : "Se leerá la primera fila como cabeceras."}
                    </span>
                  </span>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => handleExcelFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>

              {excelSheets.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,360px)_1fr] gap-3">
                  <div>
                    <label className="text-sm text-slate-400 mb-1.5 block">
                      Hoja del Excel
                    </label>
                    <Select
                      value={selectedExcelSheetName}
                      onValueChange={handleExcelSheetChange}
                    >
                      <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                        <SelectValue placeholder="Seleccionar hoja" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        {excelSheets.map((sheet) => (
                          <SelectItem
                            key={sheet.name}
                            value={sheet.name}
                            className="text-white hover:bg-slate-800"
                          >
                            {sheet.name} · {sheet.rows.length} fila(s)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
                      <p className="text-xs text-slate-500">Cabeceras</p>
                      <p className="text-xl font-semibold text-white">
                        {selectedExcelSheet?.headers.length ?? 0}
                      </p>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
                      <p className="text-xs text-slate-500">Filas en hoja</p>
                      <p className="text-xl font-semibold text-white">
                        {selectedExcelSheet?.rows.length ?? 0}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedExcelSheet && excelHeaders.length === 0 && (
                <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-sm text-red-300">
                  La hoja seleccionada no tiene cabeceras legibles en la primera fila.
                </div>
              )}

              {excelHeaders.length > 0 && (
                <>
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        Mapear cabeceras
                      </h3>
                      <p className="text-xs text-slate-500">
                        Asigna manualmente qué columna corresponde a cada atributo.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {excelHeaders.map((header) => (
                        <div
                          key={header}
                          className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/30 p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm text-white">{header}</p>
                            <p className="text-xs text-slate-500">
                              {excelRows[0]?.values[header] || "Sin ejemplo"}
                            </p>
                          </div>
                          <Select
                            value={columnMappings[header] ?? "ignore"}
                            onValueChange={(value) =>
                              handleMappingChange(header, value as ColumnMapping)
                            }
                          >
                            <SelectTrigger className="w-40 shrink-0 bg-slate-800/50 border-white/10 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-900 border-white/10">
                              {(Object.keys(MAPPING_LABELS) as ColumnMapping[]).map((value) => (
                                <SelectItem
                                  key={value}
                                  value={value}
                                  className="text-white hover:bg-slate-800"
                                >
                                  {MAPPING_LABELS[value]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>

                  {(!mappedHeaderByType.producto || !mappedHeaderByType.variedad) && (
                    <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
                      <div className="mb-3">
                        <h3 className="text-sm font-semibold text-white">
                          Valores para toda la hoja
                        </h3>
                        <p className="text-xs text-slate-500">
                          Se aplican a los lotes cuando el dato no viene mapeado desde una columna.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {!mappedHeaderByType.producto && (
                          <div>
                            <label className="text-sm text-slate-400 mb-1.5 block">
                              Producto
                            </label>
                            <Select
                              value={bulkProductoId}
                              onValueChange={handleBulkProductoChange}
                            >
                              <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                                <SelectValue placeholder="Opcional: seleccionar producto" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-white/10">
                                {productos.map((p) => (
                                  <SelectItem
                                    key={p.id}
                                    value={p.id}
                                    className="text-white hover:bg-slate-800"
                                  >
                                    {p.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}

                        {!mappedHeaderByType.variedad && (
                          <div>
                            <label className="text-sm text-slate-400 mb-1.5 block">
                              Variedad
                            </label>
                            <Select
                              value={bulkVariedadId}
                              onValueChange={setBulkVariedadId}
                            >
                              <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                                <SelectValue placeholder="Opcional: seleccionar variedad" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-900 border-white/10">
                                {bulkVariedadOptions.map(({ variedad, producto }) => (
                                  <SelectItem
                                    key={variedad.id}
                                    value={variedad.id}
                                    className="text-white hover:bg-slate-800"
                                  >
                                    {variedad.nombre} · {producto.nombre}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="rounded-lg border border-white/10 bg-slate-950/30 p-3">
                      <p className="text-xs text-slate-500">Filas leídas</p>
                      <p className="text-xl font-semibold text-white">{excelRows.length}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-950/20 p-3">
                      <p className="text-xs text-emerald-500">A importar</p>
                      <p className="text-xl font-semibold text-emerald-300">
                        {importPreview.readyRows.length}
                      </p>
                    </div>
                    <div className="rounded-lg border border-amber-500/20 bg-amber-950/20 p-3">
                      <p className="text-xs text-amber-500">Con advertencias</p>
                      <p className="text-xl font-semibold text-amber-300">
                        {importPreview.warningCount}
                      </p>
                    </div>
                    <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-3">
                      <p className="text-xs text-red-500">Omitidas</p>
                      <p className="text-xl font-semibold text-red-300">
                        {importPreview.skippedCount}
                      </p>
                    </div>
                  </div>

                  {!importPreview.hasCodigoMapping ? (
                    <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-sm text-red-300">
                      Debes mapear una columna como Código de lote para importar.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-white/10">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-white/10 hover:bg-transparent">
                            <TableHead className="text-slate-400 uppercase text-xs">
                              Fila
                            </TableHead>
                            <TableHead className="text-slate-400 uppercase text-xs">
                              Código
                            </TableHead>
                            <TableHead className="text-slate-400 uppercase text-xs">
                              Producto
                            </TableHead>
                            <TableHead className="text-slate-400 uppercase text-xs">
                              Variedad
                            </TableHead>
                            <TableHead className="text-slate-400 uppercase text-xs">
                              Subvariedad
                            </TableHead>
                            <TableHead className="text-slate-400 uppercase text-xs">
                              Estado
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {importPreview.rows.slice(0, 20).map((row) => (
                            <TableRow
                              key={row.rowNumber}
                              className="border-white/5 hover:bg-white/[0.02]"
                            >
                              <TableCell className="text-slate-400">
                                {row.rowNumber}
                              </TableCell>
                              <TableCell className="font-mono text-white">
                                {row.codigoLote || "—"}
                              </TableCell>
                              <TableCell className="text-slate-400">
                                {row.productoNombre ?? "—"}
                              </TableCell>
                              <TableCell className="text-slate-400">
                                {row.variedadNombre ?? "—"}
                              </TableCell>
                              <TableCell className="text-slate-400">
                                {row.subvariedadNombre ?? "—"}
                              </TableCell>
                              <TableCell>
                                {row.status === "skipped" ? (
                                  <Badge className="bg-red-500/15 text-red-300 border-red-500/30">
                                    {row.skipReason}
                                  </Badge>
                                ) : row.status === "warning" ? (
                                  <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30">
                                    {row.warnings.join("; ")}
                                  </Badge>
                                ) : (
                                  <Badge className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">
                                    Listo
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {importPreview.rows.length > 20 && (
                        <p className="border-t border-white/10 px-3 py-2 text-xs text-slate-500">
                          Mostrando primeras 20 filas de {importPreview.rows.length}.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-white/10 text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                creating ||
                (creationMode === "excel" &&
                  (!mappedHeaderByType.codigoLote || importPreview.readyRows.length === 0))
              }
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              {creating
                ? "Creando..."
                : creationMode === "excel"
                ? `Importar ${importPreview.readyRows.length} lotes`
                : "Crear lote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-400">Eliminar Lotes</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400 text-sm py-2">
            ¿Estás seguro de que deseas eliminar{" "}
            <span className="text-white font-semibold">
              {selectedIds.size} lote(s)
            </span>
            ? Esta acción no se puede deshacer. Se eliminarán también sus
            estadísticas y sesiones asociadas.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-white/10 text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-500 text-white font-semibold"
            >
              {deleting ? "Eliminando..." : `Eliminar ${selectedIds.size} lote(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Device Dialog ───────────────────────────────── */}
      <Dialog
        open={deviceDialogOpen}
        onOpenChange={(open) => {
          setDeviceDialogOpen(open);
          if (!open) resetDeviceDialog();
        }}
      >
        <DialogContent className="bg-slate-900 border-white/10 text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Dispositivo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">
                Dispositivo
              </label>
              <Select
                value={selectedDispositivoId}
                onValueChange={setSelectedDispositivoId}
              >
                <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                  <SelectValue placeholder="Seleccionar dispositivo" />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10">
                  {dispositivosDisponibles.map((d) => {
                    const isInactive = d.activo === false;

                    return (
                      <SelectItem
                        key={d.id}
                        value={d.id}
                        className="text-white hover:bg-slate-800"
                      >
                        {d.nombre} - {d.tipo}
                        {isInactive ? " (inactivo)" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-1.5 block">
                Máquina (opcional)
              </label>
              <Input
                value={deviceMaquina}
                onChange={(e) => setDeviceMaquina(e.target.value)}
                placeholder="Identificador de máquina"
                className="bg-slate-800/50 border-white/10 text-white placeholder:text-slate-600"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeviceDialogOpen(false)}
              className="border-white/10 text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAssignDevice}
              disabled={assigningDevice || !selectedDispositivoId}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold"
            >
              {assigningDevice ? "Asignando..." : "Asignar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

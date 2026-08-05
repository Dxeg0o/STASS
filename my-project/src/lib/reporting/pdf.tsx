import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import React from "react";
import type { ReactElement } from "react";
import type { ReportCalibreRow, ReportLote, ServiceReport } from "./types";
import { getQualiblickLogoDataUri } from "./logo";

const colors = {
  ink: "#172033",
  muted: "#64748B",
  cyan: "#0E7490",
  cyanLight: "#E0F2FE",
  line: "#D9E2EC",
  soft: "#F8FAFC",
  white: "#FFFFFF",
};

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 54, paddingHorizontal: 42, fontFamily: "Helvetica", color: colors.ink, fontSize: 9 },
  header: { borderBottomWidth: 2, borderBottomColor: colors.cyan, paddingBottom: 14, marginBottom: 16 },
  logoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  logo: { width: 142, height: 32, objectFit: "contain" },
  brand: { color: colors.cyan, fontSize: 8, fontWeight: 700, letterSpacing: 1.1, textAlign: "right" },
  title: { fontSize: 19, fontWeight: 700, marginTop: 5 },
  subtitle: { color: colors.muted, marginTop: 4, fontSize: 9 },
  cards: { flexDirection: "row", gap: 8, marginBottom: 16 },
  card: { flexGrow: 1, backgroundColor: colors.cyanLight, padding: 9, borderRadius: 4 },
  cardLabel: { color: colors.muted, fontSize: 7.2, lineHeight: 1.2, textTransform: "uppercase" },
  cardValue: { color: colors.cyan, fontSize: 15, fontWeight: 700, marginTop: 3 },
  sectionTitle: { fontSize: 12, fontWeight: 700, marginBottom: 7, marginTop: 6 },
  table: { borderWidth: 1, borderColor: colors.line, borderRadius: 3, marginBottom: 13 },
  tableHeader: { flexDirection: "row", backgroundColor: colors.cyan, color: colors.white, paddingVertical: 6, paddingHorizontal: 7, fontSize: 8, fontWeight: 700 },
  tableRow: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 7, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
  tableRowAlt: { backgroundColor: colors.soft },
  colLabel: { width: "46%" },
  // Fila hija de una salida: sin borde propio y con sangria, para que se lea
  // colgando del calibre de arriba y no como otro calibre.
  salidaRow: { borderTopWidth: 0, paddingVertical: 3 },
  colSalidaLabel: { width: "46%", paddingLeft: 10, color: colors.muted, fontSize: 8 },
  colBulbs: { width: "18%", textAlign: "right" },
  colPercent: { width: "18%", textAlign: "right" },
  colBins: { width: "18%", textAlign: "right" },
  loteBlock: { marginBottom: 12 },
  loteTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 4 },
  loteTitle: { fontSize: 10.5, fontWeight: 700, color: colors.cyan },
  loteTotal: { fontSize: 8.5, color: colors.muted },
  detailLot: { width: "19%", fontWeight: 700 },
  detailCalibre: { width: "30%" },
  detailBulbs: { width: "13%", textAlign: "right" },
  detailPercent: { width: "10%", textAlign: "right" },
  detailBins: { width: "10%", textAlign: "right" },
  note: { color: colors.muted, fontSize: 8, lineHeight: 1.35, marginTop: 3 },
  footer: { position: "absolute", bottom: 18, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", color: colors.muted, fontSize: 7 },
});

function number(value: number) {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(value);
}

/**
 * Un servicio puede tener cientos de lotes; render por lote con estructuras que
 * no pueden partirse desborda el tiempo de la funcion serverless. Por eso las
 * secciones por lote se usan hasta este limite y mas alla se cae a una unica
 * tabla plana, que pagina barato.
 */
const MAX_LOT_SECTIONS = 40;

/**
 * Un bloque corto salta entero a la pagina siguiente en vez de partirse y dejar
 * filas huerfanas sin la cabecera de su lote. Por sobre este largo se permite
 * partir, porque un bloque mas alto que una pagina con wrap={false} se
 * renderizaria recortado.
 */
const UNSPLITTABLE_ROWS = 20;

function LoteSection({ lote }: { lote: ReportLote }) {
  return (
    <View style={styles.loteBlock} wrap={lote.rows.length > UNSPLITTABLE_ROWS}>
      <View style={styles.loteTitleRow}>
        <Text style={styles.loteTitle}>Lote / Lot {lote.codigoLote}</Text>
        <Text style={styles.loteTotal}>{number(lote.bulbs)} bulbos - {number(lote.percent)}% del total</Text>
      </View>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.colLabel}>Calibre / Size</Text><Text style={styles.colBulbs}>Bulbos</Text><Text style={styles.colPercent}>%</Text><Text style={styles.colBins}>Bins</Text>
        </View>
        {lote.rows.length === 0 ? (
          <View style={styles.tableRow}><Text style={styles.colLabel}>Sin datos para el periodo</Text></View>
        ) : lote.rows.map((row, index) => (
          <View key={row.key} style={[styles.tableRow, index % 2 ? styles.tableRowAlt : {}]} wrap={false}>
            <Text style={styles.colLabel}>{row.label}</Text>
            <Text style={styles.colBulbs}>{number(row.bulbs)}</Text>
            <Text style={styles.colPercent}>{number(row.percent)}%</Text>
            <Text style={styles.colBins}>{row.bins ? number(row.bins) : "-"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Tabla unica y paginable, para servicios con demasiados lotes. */
function FlatDetailTable({ lotes }: { lotes: ReportLote[] }) {
  const rows = lotes.flatMap((lote): Array<{ lote: ReportLote; row: ReportCalibreRow | null }> => {
    if (lote.rows.length === 0) {
      return [{ lote, row: null }];
    }
    return lote.rows.map((row) => ({ lote, row }));
  });

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader} fixed>
        <Text style={styles.detailLot}>Lote / Lot</Text><Text style={styles.detailCalibre}>Calibre / Size</Text><Text style={styles.detailBulbs}>Bulbos</Text><Text style={styles.detailPercent}>%</Text><Text style={styles.detailBins}>Bins</Text>
      </View>
      {rows.length === 0 ? (
        <View style={styles.tableRow}><Text style={styles.colLabel}>Sin datos para el periodo</Text></View>
      ) : rows.map(({ lote, row }, index) => (
        <View key={`${lote.loteId}-${row?.key ?? "empty"}`} style={[styles.tableRow, index % 2 ? styles.tableRowAlt : {}]} wrap={false}>
          <Text style={styles.detailLot}>{lote.codigoLote}</Text>
          <Text style={styles.detailCalibre}>{row?.label ?? "Sin datos para el periodo"}</Text>
          <Text style={styles.detailBulbs}>{row ? number(row.bulbs) : "-"}</Text>
          <Text style={styles.detailPercent}>{row ? `${number(row.percent)}%` : "-"}</Text>
          <Text style={styles.detailBins}>{row?.bins ? number(row.bins) : "-"}</Text>
        </View>
      ))}
    </View>
  );
}

function DetailTable({ lotes }: { lotes: ReportLote[] }) {
  if (lotes.length > MAX_LOT_SECTIONS) return <FlatDetailTable lotes={lotes} />;
  return (
    <View>
      {lotes.map((lote) => (
        <LoteSection key={lote.loteId} lote={lote} />
      ))}
    </View>
  );
}

export function ServiceReportDocument({ report }: { report: ServiceReport }): ReactElement {
  const label = report.kind === "daily" ? "Resumen diario / Daily summary" : "Resumen acumulado / Service total summary";
  return (
    <Document title={`${label} - ${report.serviceName}`} author="QUALIBLICK">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image src={getQualiblickLogoDataUri()} style={styles.logo} />
            <Text style={styles.brand}>REPORTERIA / REPORTING</Text>
          </View>
          <Text style={styles.title}>{label}</Text>
          <Text style={styles.subtitle}>{report.companyName} - {report.serviceName}{report.processName ? ` - ${report.processName}` : ""}</Text>
          <Text style={styles.subtitle}>Fecha reportada / Report date: {report.reportDate} | Generado / Generated: {new Date(report.generatedAt).toLocaleString("es-CL", { timeZone: "America/Santiago" })}</Text>
        </View>

        <View style={styles.cards}>
          {/* "Calibrados" y no "procesados": la merma quedo fuera de totalBulbs. */}
          <View style={styles.card}><Text style={styles.cardLabel}>Bulbos calibrados{"\n"}/ Graded bulbs</Text><Text style={styles.cardValue}>{number(report.totalBulbs)}</Text></View>
          {report.mermaBulbs > 0 && (
            <View style={styles.card}><Text style={styles.cardLabel}>Merma / Waste{"\n"}(fuera del total)</Text><Text style={styles.cardValue}>{number(report.mermaBulbs)}</Text></View>
          )}
          <View style={styles.card}><Text style={styles.cardLabel}>Lotes procesados{"\n"}/ Processed lots</Text><Text style={styles.cardValue}>{number(report.lotes.length)}</Text></View>
        </View>

        {report.rows.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Resumen por calibre / Size summary</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.colLabel}>Calibre / Size</Text><Text style={styles.colBulbs}>Bulbos</Text><Text style={styles.colPercent}>%</Text><Text style={styles.colBins}>Bins</Text>
              </View>
              {report.rows.map((row, index) => (
                <React.Fragment key={row.key}>
                  <View style={[styles.tableRow, index % 2 ? styles.tableRowAlt : {}]} wrap={false}>
                    <Text style={styles.colLabel}>{row.label}</Text>
                    <Text style={styles.colBulbs}>{number(row.bulbs)}</Text>
                    <Text style={styles.colPercent}>{number(row.percent)}%</Text>
                    <Text style={styles.colBins}>{row.bins ? number(row.bins) : "-"}</Text>
                  </View>
                  {/* Aporte de cada salida al calibre de arriba. El % es dentro
                      del calibre, no sobre el total del reporte. */}
                  {row.salidas.map((salida) => (
                    <View
                      key={`${row.key}-${salida.dispositivoNombre}`}
                      style={[styles.tableRow, index % 2 ? styles.tableRowAlt : {}, styles.salidaRow]}
                      wrap={false}
                    >
                      <Text style={styles.colSalidaLabel}>
                        {salida.label} · {salida.dispositivoNombre}
                      </Text>
                      <Text style={styles.colBulbs}>{number(salida.bulbs)}</Text>
                      <Text style={styles.colPercent}>{number(salida.percent)}%</Text>
                      <Text style={styles.colBins}>-</Text>
                    </View>
                  ))}
                </React.Fragment>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Detalle por lote / Lot detail</Text>
        {report.lotes.length === 0 ? <Text style={styles.note}>No se registraron bulbos procesados en este periodo / No bulbs were processed during this period.</Text> : <DetailTable lotes={report.lotes} />}
        <Text style={styles.note}>Los bins reflejan la asignacion manual vigente / Bins reflect the current manual assignment.</Text>

        <View style={styles.footer} fixed>
          <Text>QUALIBLICK - Reporte automatico / Automatic report</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderServiceReportPdf(report: ServiceReport) {
  return renderToBuffer(<ServiceReportDocument report={report} />);
}

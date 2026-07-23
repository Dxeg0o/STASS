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
  colBulbs: { width: "18%", textAlign: "right" },
  colPercent: { width: "18%", textAlign: "right" },
  colBins: { width: "18%", textAlign: "right" },
  lotHeader: { flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.soft, padding: 8, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  lotName: { fontWeight: 700, fontSize: 10 },
  lotMeta: { color: colors.muted, fontSize: 8 },
  activity: { backgroundColor: colors.cyanLight, padding: 7, margin: 6, borderRadius: 3 },
  activityLabel: { color: colors.cyan, fontSize: 8, fontWeight: 700, marginBottom: 3 },
  activityText: { color: colors.muted, fontSize: 8, lineHeight: 1.35 },
  note: { color: colors.muted, fontSize: 8, lineHeight: 1.35, marginTop: 3 },
  footer: { position: "absolute", bottom: 18, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", color: colors.muted, fontSize: 7 },
});

function number(value: number) {
  return new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 }).format(value);
}

function Table({ rows }: { rows: ReportCalibreRow[] }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={styles.colLabel}>Calibre / Size</Text>
        <Text style={styles.colBulbs}>Bulbos / Bulbs</Text>
        <Text style={styles.colPercent}>%</Text>
        <Text style={styles.colBins}>Bins</Text>
      </View>
      {rows.length === 0 ? (
        <View style={styles.tableRow}><Text style={styles.colLabel}>Sin datos para el periodo</Text></View>
      ) : rows.map((row, index) => (
        <View key={row.key} style={[styles.tableRow, index % 2 ? styles.tableRowAlt : {}]}>
          <Text style={styles.colLabel}>{row.label}</Text>
          <Text style={styles.colBulbs}>{number(row.bulbs)}</Text>
          <Text style={styles.colPercent}>{number(row.percent)}%</Text>
          <Text style={styles.colBins}>{row.bins ? number(row.bins) : "-"}</Text>
        </View>
      ))}
    </View>
  );
}

function LoteSection({ lote }: { lote: ReportLote }) {
  return (
    <View style={styles.table} wrap={false}>
      <View style={styles.lotHeader}>
        <Text style={styles.lotName}>Lote / Lot {lote.codigoLote}</Text>
        <Text style={styles.lotMeta}>{number(lote.bulbs)} bulbos / bulbs - {number(lote.percent)}% del periodo / period</Text>
      </View>
      <View style={styles.activity}>
        <Text style={styles.activityLabel}>Actividad / Activity</Text>
        <Text style={styles.activityText}>{lote.activeDays.length > 0 ? lote.activeDays.map((day) => `${day.date}: ${day.startTime} - ${day.endTime}`).join(" | ") : "Sin actividad / No activity"}</Text>
      </View>
      <View style={{ padding: 6 }}><Table rows={lote.rows} /></View>
    </View>
  );
}

export function ServiceReportDocument({ report }: { report: ServiceReport }): ReactElement {
  const label = report.kind === "daily" ? "Resumen diario / Daily summary" : "Resumen acumulado / Service total summary";
  const hoursOrDays = report.kind === "daily"
    ? { label: "Horas trabajadas / Hours worked", value: `${number(report.workedHours)} h` }
    : { label: "Días trabajados / Worked days", value: number(report.workedDays) };
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
          <View style={styles.card}><Text style={styles.cardLabel}>Bulbos procesados{"\n"}/ Processed bulbs</Text><Text style={styles.cardValue}>{number(report.totalBulbs)}</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>Lotes procesados{"\n"}/ Processed lots</Text><Text style={styles.cardValue}>{number(report.lotes.length)}</Text></View>
          <View style={styles.card}><Text style={styles.cardLabel}>{hoursOrDays.label.replace(" / ", "\n/ ")}</Text><Text style={styles.cardValue}>{hoursOrDays.value}</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Detalle por lote / Lot detail</Text>
        {report.lotes.length === 0 ? <Text style={styles.note}>No se registraron bulbos procesados en este periodo / No bulbs were processed during this period.</Text> : report.lotes.map((lote) => <LoteSection key={lote.loteId} lote={lote} />)}
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

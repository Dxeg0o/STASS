import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type { ReportCalibreRow, ReportLang, ReportLote, ServiceReport } from "./types";
import { getQualiblickLogoDataUri } from "./logo";
import { label as translate, strings, type ReportStrings } from "./i18n";

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
  colLabel: { width: "52%" },
  colUndeclared: { color: colors.muted },
  colBulbs: { width: "18%", textAlign: "right" },
  colPercent: { width: "15%", textAlign: "right" },
  colBins: { width: "15%", textAlign: "right" },
  totalRow: { fontWeight: 700, backgroundColor: colors.cyanLight },
  // Aire entre variedades. Va con el borde arriba, como una fila mas, para que
  // el corte se lea como parte de la tabla y no como el final de una.
  spacerRow: { height: 10, borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.white },
  detailVariedad: { width: "22%" },
  detailLot: { width: "20%", fontWeight: 700 },
  detailCalibre: { width: "16%" },
  detailBulbs: { width: "16%", textAlign: "right" },
  detailPercent: { width: "13%", textAlign: "right" },
  detailBins: { width: "13%", textAlign: "right" },
  note: { color: colors.muted, fontSize: 8, lineHeight: 1.35, marginTop: 3 },
  footer: { position: "absolute", bottom: 18, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", color: colors.muted, fontSize: 7 },
});

function makeNumber(lang: ReportLang) {
  const formatter = new Intl.NumberFormat(strings(lang).locale, { maximumFractionDigits: 1 });
  return (value: number) => formatter.format(value);
}

interface RenderContext {
  lang: ReportLang;
  t: ReportStrings;
  number: (value: number) => string;
}

/**
 * Una fila del detalle: un calibre del lote, su fila de total, o el aire que
 * separa una variedad de la siguiente.
 */
type DetailRow = {
  lote: ReportLote;
  row: ReportCalibreRow | null;
  total: boolean;
  spacer?: boolean;
};

function detailRows(lotes: ReportLote[]): DetailRow[] {
  let variedadAnterior: string | null | undefined;
  return lotes.flatMap((lote): DetailRow[] => {
    const corte =
      variedadAnterior !== undefined && lote.variedad !== variedadAnterior
        ? [{ lote, row: null, total: false, spacer: true }]
        : [];
    variedadAnterior = lote.variedad;
    return [
      ...corte,
      ...(lote.rows.length === 0
        ? [{ lote, row: null, total: false }]
        : [
            ...lote.rows.map((row) => ({ lote, row, total: false })),
            { lote, row: null, total: true },
          ]),
    ];
  });
}

/**
 * Tabla unica del detalle: variedad y lote se repiten en cada fila y cada lote
 * cierra con su total.
 *
 * Es una sola tabla plana y no una seccion por lote a proposito: un servicio
 * puede tener cientos de lotes, y las estructuras que no pueden partirse hacen
 * que el render desborde el tiempo de la funcion serverless. Plana pagina barato
 * y ademas es el formato en que el cliente lee el reporte.
 */
function DetailTable({ lotes, lang, t, number }: { lotes: ReportLote[] } & RenderContext) {
  const rows = detailRows(lotes);

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader} fixed>
        <Text style={styles.detailVariedad}>{t.variety}</Text>
        <Text style={styles.detailLot}>{t.lot}</Text>
        <Text style={styles.detailCalibre}>{t.size}</Text>
        <Text style={styles.detailBulbs}>{t.bulbs}</Text>
        <Text style={styles.detailPercent}>%</Text>
        <Text style={styles.detailBins}>{t.bins}</Text>
      </View>
      {rows.length === 0 ? (
        <View style={styles.tableRow}>
          <Text style={styles.colLabel}>{t.noData}</Text>
        </View>
      ) : (
        rows.map(({ lote, row, total, spacer }, index) => {
          if (spacer) {
            return <View key={`${lote.loteId}-spacer`} style={styles.spacerRow} />;
          }
          const bins = total ? lote.rows.reduce((sum, item) => sum + item.bins, 0) : row?.bins ?? 0;
          return (
            <View
              key={`${lote.loteId}-${total ? "total" : row?.key ?? "empty"}`}
              style={[
                styles.tableRow,
                index % 2 ? styles.tableRowAlt : {},
                total ? styles.totalRow : {},
              ]}
              wrap={false}
            >
              <Text style={styles.detailVariedad}>{lote.variedad ?? "-"}</Text>
              <Text style={styles.detailLot}>{lote.codigoLote}</Text>
              <Text
                style={[styles.detailCalibre, row?.declarado === false ? styles.colUndeclared : {}]}
              >
                {total ? t.lotTotal : row ? translate(row.label, lang) : t.noData}
              </Text>
              <Text style={styles.detailBulbs}>
                {total ? number(lote.bulbs) : row ? number(row.bulbs) : "-"}
              </Text>
              <Text style={styles.detailPercent}>
                {total ? `${number(lote.percent)}%` : row ? `${number(row.percent)}%` : "-"}
              </Text>
              <Text style={styles.detailBins}>{bins ? number(bins) : "-"}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}

export function ServiceReportDocument({
  report,
  lang = "en",
}: {
  report: ServiceReport;
  lang?: ReportLang;
}): ReactElement {
  const t = strings(lang);
  const number = makeNumber(lang);
  const title = report.kind === "daily" ? t.dailyTitle : t.totalTitle;
  const bins = report.lotes.reduce(
    (sum, lote) => sum + lote.rows.reduce((inner, row) => inner + row.bins, 0),
    0
  );
  return (
    <Document title={`${title} - ${report.serviceName}`} author="QUALIBLICK">
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <Image src={getQualiblickLogoDataUri()} style={styles.logo} />
            <Text style={styles.brand}>{t.reporting}</Text>
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {report.companyName} - {report.serviceName}
            {report.processName ? ` - ${report.processName}` : ""}
          </Text>
          <Text style={styles.subtitle}>
            {t.reportDate}: {report.reportDate} | {t.generated}:{" "}
            {new Date(report.generatedAt).toLocaleString(t.locale, {
              timeZone: "America/Santiago",
            })}
          </Text>
        </View>

        <View style={styles.cards}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t.bulbsProcessed}</Text>
            <Text style={styles.cardValue}>{number(report.totalBulbs)}</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{t.lots}</Text>
            <Text style={styles.cardValue}>{number(report.lotes.length)}</Text>
          </View>
          {bins > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{t.bins}</Text>
              <Text style={styles.cardValue}>{number(bins)}</Text>
            </View>
          )}
        </View>

        {/* Sin resumen por calibre a nivel de servicio: el reporte se rige por el
            lote. Agregar calibres entre lotes mezcla rangos que cada cierre
            demarco por separado, asi que la unica escala valida es la del lote. */}
        <Text style={styles.sectionTitle}>{t.lotDetail}</Text>
        <Text style={styles.note}>
          {report.calibreSource === "declarado" ? t.declaredNote : t.measuredNote}
        </Text>
        {report.lotes.length === 0 ? (
          <Text style={styles.note}>{t.noBulbs}</Text>
        ) : (
          <DetailTable lotes={report.lotes} lang={lang} t={t} number={number} />
        )}
        <Text style={styles.note}>{t.binsNote}</Text>

        <View style={styles.footer} fixed>
          <Text>{t.footer}</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderServiceReportPdf(report: ServiceReport, lang: ReportLang = "en") {
  return renderToBuffer(<ServiceReportDocument report={report} lang={lang} />);
}


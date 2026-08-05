import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import type { ServiceReport } from "@/lib/reporting/types";

interface ServiceReportEmailProps {
  daily: ServiceReport;
  total: ServiceReport;
  recipientName?: string | null;
}

const font = "Arial, Helvetica, sans-serif";

const num = (value: number) => value.toLocaleString("es-CL");
const pct = (value: number) => `${value.toLocaleString("es-CL")}%`;

const cell: React.CSSProperties = {
  fontSize: 12,
  padding: "7px 8px",
  borderBottom: "1px solid #E2E8F0",
  textAlign: "left",
};
const cellNum: React.CSSProperties = { ...cell, textAlign: "right" };
const th: React.CSSProperties = {
  ...cell,
  fontSize: 10,
  letterSpacing: 0.6,
  color: "#64748B",
  borderBottom: "2px solid #0E7490",
  textTransform: "uppercase",
};

/**
 * Detalle por calibre y, debajo de cada uno, el aporte de cada salida.
 *
 * Se arma con una <table> y estilos inline a proposito: los clientes de correo
 * no soportan flex ni grid de forma confiable. Las salidas van como filas hijas
 * en vez de columnas para que la tabla siga siendo legible en un celular.
 */
function CalibreTable({ report }: { report: ServiceReport }) {
  if (report.rows.length === 0) {
    return (
      <Text style={{ color: "#94A3B8", fontSize: 12, margin: "0 0 8px" }}>
        Sin datos para el periodo / No data for this period.
      </Text>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", margin: "0 0 6px" }}>
      <thead>
        <tr>
          <th style={th}>Calibre / Size</th>
          <th style={{ ...th, textAlign: "right" }}>Bulbos</th>
          <th style={{ ...th, textAlign: "right" }}>%</th>
          <th style={{ ...th, textAlign: "right" }}>Bins</th>
        </tr>
      </thead>
      <tbody>
        {report.rows.map((row) => [
          <tr key={row.key}>
            <td style={{ ...cell, fontWeight: 700 }}>{row.label}</td>
            <td style={{ ...cellNum, fontWeight: 700 }}>{num(row.bulbs)}</td>
            <td style={cellNum}>{pct(row.percent)}</td>
            <td style={cellNum}>{row.bins ? num(row.bins) : "-"}</td>
          </tr>,
          ...row.salidas.map((salida) => (
            <tr key={`${row.key}:${salida.dispositivoNombre}`}>
              <td style={{ ...cell, paddingLeft: 22, color: "#475569" }}>
                {salida.label}
                <span style={{ color: "#94A3B8" }}> · {salida.dispositivoNombre}</span>
              </td>
              <td style={{ ...cellNum, color: "#475569" }}>{num(salida.bulbs)}</td>
              <td style={{ ...cellNum, color: "#94A3B8" }}>{pct(salida.percent)}</td>
              <td style={cellNum}>-</td>
            </tr>
          )),
        ])}
        {/* La merma va al pie y rotulada "fuera del total": es descarte, no un
            calibre mas, y no esta sumada en los bulbos de arriba. */}
        {report.mermaBulbs > 0 && (
          <tr>
            <td style={{ ...cell, color: "#B45309", borderTop: "2px solid #E2E8F0" }}>
              Merma / Waste
              <span style={{ color: "#94A3B8" }}> · fuera del total / excluded</span>
            </td>
            <td style={{ ...cellNum, color: "#B45309", borderTop: "2px solid #E2E8F0" }}>
              {num(report.mermaBulbs)}
            </td>
            <td style={{ ...cellNum, borderTop: "2px solid #E2E8F0" }}>—</td>
            <td style={{ ...cellNum, borderTop: "2px solid #E2E8F0" }}>—</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

export default function ServiceReportEmail({ daily, total, recipientName }: ServiceReportEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{`Reporte / Report QUALIBLICK - ${daily.serviceName} - ${daily.reportDate}`}</Preview>
      <Body style={{ backgroundColor: "#F1F5F9", margin: 0, fontFamily: font, color: "#172033" }}>
        <Container style={{ maxWidth: 680, margin: "0 auto", backgroundColor: "#FFFFFF" }}>
          <Section style={{ backgroundColor: "#FFFFFF", padding: "30px 34px 22px", borderBottom: "5px solid #0E7490" }}>
            <Img src="cid:qualiblick-logo" alt="QUALIBLICK" width="190" style={{ display: "block", height: "auto" }} />
            <Text style={{ color: "#0E7490", fontSize: 11, letterSpacing: 2, margin: "14px 0 0" }}>REPORTERIA / REPORTING</Text>
            <Heading style={{ color: "#172033", fontSize: 25, margin: "8px 0 0" }}>Resumen de servicio / Service report</Heading>
            <Text style={{ color: "#0E7490", fontSize: 14, margin: "8px 0 0" }}>{daily.serviceName}</Text>
          </Section>
          <Section style={{ padding: "32px 34px 34px" }}>
            <Text style={{ fontSize: 14, margin: "0 0 18px" }}>Hola / Hello{recipientName ? ` ${recipientName}` : ""},</Text>
            <Text style={{ color: "#475569", fontSize: 14, lineHeight: "22px", margin: "0 0 4px" }}>
              Adjuntamos los reportes del servicio correspondientes al {daily.reportDate}: resumen diario y total acumulado, en PDF y en Excel.
            </Text>
            <Text style={{ color: "#475569", fontSize: 14, lineHeight: "22px", margin: "0 0 18px" }}>
              Attached are the service reports for {daily.reportDate}: the daily summary and the full service total, as PDF and Excel.
            </Text>
            <Row>
              <Column style={{ width: "50%", paddingRight: 6 }}>
                <Section style={{ backgroundColor: "#E0F2FE", padding: 14 }}>
                  <Text style={{ color: "#64748B", fontSize: 11, margin: 0 }}>RESUMEN DEL DIA / DAILY SUMMARY</Text>
                  <Text style={{ color: "#0E7490", fontSize: 24, fontWeight: 700, margin: "4px 0" }}>{daily.totalBulbs.toLocaleString("es-CL")}</Text>
                  <Text style={{ color: "#475569", fontSize: 12, margin: 0 }}>calibrados / graded - {daily.lotes.length} lotes / lots</Text>
                  {daily.mermaBulbs > 0 && (
                    <Text style={{ color: "#B45309", fontSize: 12, margin: "4px 0 0" }}>
                      + {daily.mermaBulbs.toLocaleString("es-CL")} merma / waste
                    </Text>
                  )}
                </Section>
              </Column>
              <Column style={{ width: "50%", paddingLeft: 6 }}>
                <Section style={{ backgroundColor: "#F8FAFC", padding: 14 }}>
                  <Text style={{ color: "#64748B", fontSize: 11, margin: 0 }}>TOTAL DEL SERVICIO / SERVICE TOTAL</Text>
                  <Text style={{ color: "#172033", fontSize: 24, fontWeight: 700, margin: "4px 0" }}>{total.totalBulbs.toLocaleString("es-CL")}</Text>
                  <Text style={{ color: "#475569", fontSize: 12, margin: 0 }}>calibrados / graded - {total.lotes.length} lotes / lots</Text>
                  {total.mermaBulbs > 0 && (
                    <Text style={{ color: "#B45309", fontSize: 12, margin: "4px 0 0" }}>
                      + {total.mermaBulbs.toLocaleString("es-CL")} merma / waste
                    </Text>
                  )}
                </Section>
              </Column>
            </Row>
            <Hr style={{ borderColor: "#E2E8F0", margin: "24px 0" }} />

            <Text style={{ color: "#172033", fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>
              Detalle del dia / Daily detail
            </Text>
            <Text style={{ color: "#94A3B8", fontSize: 11, margin: "0 0 10px" }}>
              {daily.calibreSource === "declarado"
                ? "Por calibre y salida. El % de cada salida es su peso dentro del calibre / By size and outlet. Each outlet's % is its share within the size."
                : "Por calibre medido / By measured size."}
            </Text>
            <CalibreTable report={daily} />

            <Text style={{ color: "#172033", fontSize: 14, fontWeight: 700, margin: "22px 0 10px" }}>
              Acumulado del servicio / Service total
            </Text>
            <CalibreTable report={total} />

            <Hr style={{ borderColor: "#E2E8F0", margin: "24px 0" }} />
            <Text style={{ color: "#475569", fontSize: 13, lineHeight: "20px" }}>
              {daily.calibreSource === "declarado"
                ? "Los adjuntos incluyen calibre declarado por salida, porcentaje y bins / Attachments include size declared by output, percentage and bins."
                : "Los adjuntos incluyen detalle por lote, calibre, porcentaje y bins / Attachments include lot, size, percentage and bins."}
            </Text>
            <Text style={{ color: "#94A3B8", fontSize: 11, lineHeight: "18px" }}>
              Mensaje generado automaticamente por QUALIBLICK / Automatically generated by QUALIBLICK.
            </Text>
          </Section>
          <Section style={{ backgroundColor: "#F8FAFC", padding: "22px 34px 26px" }}>
            <Text style={{ color: "#94A3B8", fontSize: 11, margin: 0 }}>QUALIBLICK</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

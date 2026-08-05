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
 * Detalle de UN lote: una fila por calibre, con la salida que lo saco.
 *
 * Dentro de un lote cada calibre pertenece a una sola salida, asi que van en la
 * misma fila en vez de como subfilas — no hay nada que desglosar. Ese 1 a 1 no
 * se cumple al agregar varios lotes: la misma salida corre calibres distintos en
 * lotes distintos, y por eso el detalle se presenta por lote y no sumado.
 *
 * Se arma con una <table> y estilos inline a proposito: los clientes de correo
 * no soportan flex ni grid de forma confiable.
 */
function LoteTable({ lote }: { lote: ServiceReport["lotes"][number] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", margin: "0 0 18px" }}>
      <thead>
        <tr>
          <th style={th}>Calibre / Size</th>
          <th style={th}>Salida / Outlet</th>
          <th style={{ ...th, textAlign: "right" }}>Bulbos</th>
          <th style={{ ...th, textAlign: "right" }}>%</th>
          <th style={{ ...th, textAlign: "right" }}>Bins</th>
        </tr>
      </thead>
      <tbody>
        {lote.rows.map((row) => (
          <tr key={row.key}>
            <td style={{ ...cell, fontWeight: 700 }}>{row.label}</td>
            <td style={{ ...cell, color: "#475569" }}>
              {row.salidas.length === 0
                ? "—"
                : row.salidas.map((s) => s.label).join(", ")}
            </td>
            <td style={{ ...cellNum, fontWeight: 700 }}>{num(row.bulbs)}</td>
            <td style={cellNum}>{pct(row.percent)}</td>
            <td style={cellNum}>{row.bins ? num(row.bins) : "-"}</td>
          </tr>
        ))}
        {/* La merma va al pie y rotulada "fuera del total": es descarte, no un
            calibre mas, y no esta sumada en los bulbos del lote. */}
        {lote.mermaBulbs > 0 && (
          <tr>
            <td style={{ ...cell, color: "#B45309", borderTop: "2px solid #E2E8F0" }}>
              Merma / Waste
            </td>
            <td style={{ ...cell, color: "#94A3B8", borderTop: "2px solid #E2E8F0" }}>
              fuera del total / excluded
            </td>
            <td style={{ ...cellNum, color: "#B45309", borderTop: "2px solid #E2E8F0" }}>
              {num(lote.mermaBulbs)}
            </td>
            <td style={{ ...cellNum, borderTop: "2px solid #E2E8F0" }}>—</td>
            <td style={{ ...cellNum, borderTop: "2px solid #E2E8F0" }}>—</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

/** Bloque por lote: encabezado con sus totales y su tabla de calibres. */
function DetallePorLote({ report }: { report: ServiceReport }) {
  if (report.lotes.length === 0) {
    return (
      <Text style={{ color: "#94A3B8", fontSize: 12, margin: "0 0 8px" }}>
        Sin datos para el periodo / No data for this period.
      </Text>
    );
  }

  return (
    <>
      {report.lotes.map((lote) => (
        <div key={lote.loteId}>
          <Text
            style={{
              color: "#0E7490",
              fontSize: 13,
              fontWeight: 700,
              margin: "14px 0 2px",
            }}
          >
            Lote / Lot {lote.codigoLote}
          </Text>
          <Text style={{ color: "#64748B", fontSize: 11, margin: "0 0 6px" }}>
            {num(lote.bulbs)} bulbos procesados / processed
            {lote.mermaBulbs > 0 ? ` · + ${num(lote.mermaBulbs)} merma / waste` : ""}
          </Text>
          <LoteTable lote={lote} />
        </div>
      ))}
    </>
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
                  <Text style={{ color: "#475569", fontSize: 12, margin: 0 }}>procesados / processed - {daily.lotes.length} lotes / lots</Text>
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
                  <Text style={{ color: "#475569", fontSize: 12, margin: 0 }}>procesados / processed - {total.lotes.length} lotes / lots</Text>
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
              Detalle del dia por lote / Daily detail by lot
            </Text>
            <Text style={{ color: "#94A3B8", fontSize: 11, margin: "0 0 4px" }}>
              {daily.calibreSource === "declarado"
                ? "El % es dentro del lote. La merma va aparte y no suma al total / % is within the lot. Waste is listed separately and excluded from the total."
                : "Por calibre medido / By measured size."}
            </Text>
            <DetallePorLote report={daily} />

            <Hr style={{ borderColor: "#E2E8F0", margin: "24px 0" }} />
            <Text style={{ color: "#172033", fontSize: 14, fontWeight: 700, margin: "0 0 2px" }}>
              Acumulado del servicio por lote / Service total by lot
            </Text>
            <Text style={{ color: "#94A3B8", fontSize: 11, margin: "0 0 4px" }}>
              Todo el servicio, no solo el dia reportado / Whole service, not just the reported day.
            </Text>
            <DetallePorLote report={total} />

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

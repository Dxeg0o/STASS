import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";

interface ProcessCompletedEmailProps {
  nombreAdmin?: string;
  nombreProceso?: string;
  nombreEmpresa?: string;
  fechaCompletado?: string;
  notas?: string;
}

export const ProcessCompletedEmail = ({
  nombreAdmin = "María González",
  nombreProceso = "Proceso Cosecha 2025",
  nombreEmpresa = "Agrícola del Sur",
  fechaCompletado = "02 de abril de 2026, 14:30",
  notas,
}: ProcessCompletedEmailProps) => {
  return (
    <Html lang="es">
      <Head />
      <Preview>✅ Proceso finalizado: {nombreProceso} — {nombreEmpresa} · QUALIBLICK</Preview>
      <Body style={main}>
        {/* Header de marca */}
        <Section style={header}>
          <Container style={headerInner}>
            <Img
              src={`${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/images/qb.png`}
              alt="QUALIBLICK"
              width={180}
              style={logoImg}
            />
            <Text style={logoSubtitle}>Gestión inteligente de producción</Text>
          </Container>
        </Section>

        <Container style={container}>
          {/* Banner de estado */}
          <Section style={statusBanner}>
            <Text style={statusBadge}>✓ &nbsp;PROCESO COMPLETADO</Text>
          </Section>

          {/* Ícono */}
          <Section style={iconSection}>
            <Text style={iconCircle}>✦</Text>
          </Section>

          <Heading style={h1}>{nombreProceso}</Heading>
          <Text style={subheading}>
            Este proceso ha sido marcado como finalizado en QUALIBLICK
          </Text>

          <Hr style={divider} />

          <Text style={text}>
            Hola <strong style={highlight}>{nombreAdmin}</strong>,
          </Text>
          <Text style={text}>
            Te confirmamos que el proceso{" "}
            <strong style={highlight}>{nombreProceso}</strong> de la empresa{" "}
            <strong style={highlight}>{nombreEmpresa}</strong> ha sido
            completado exitosamente y registrado en el sistema.
          </Text>

          {/* Detalles del proceso */}
          <Section style={detailsBox}>
            <Text style={detailsTitle}>Resumen del proceso</Text>
            <Hr style={innerDivider} />
            <Text style={detailRow}>
              <span style={detailIcon}>🏢</span>
              <span style={detailLabel}>Empresa</span>
              <span style={detailValue}>{nombreEmpresa}</span>
            </Text>
            <Text style={detailRow}>
              <span style={detailIcon}>⚙</span>
              <span style={detailLabel}>Proceso</span>
              <span style={detailValue}>{nombreProceso}</span>
            </Text>
            <Text style={detailRow}>
              <span style={detailIcon}>📅</span>
              <span style={detailLabel}>Completado</span>
              <span style={detailValue}>{fechaCompletado}</span>
            </Text>
            <Text style={detailRow}>
              <span style={detailIcon}>👤</span>
              <span style={detailLabel}>Notificado a</span>
              <span style={detailValue}>{nombreAdmin}</span>
            </Text>
            {notas && (
              <>
                <Hr style={innerDivider} />
                <Text style={notasLabel}>Notas adicionales</Text>
                <Text style={notasText}>{notas}</Text>
              </>
            )}
          </Section>

          {/* Indicador de éxito */}
          <Section style={successBar}>
            <Text style={successBarText}>
              ✓ &nbsp;Proceso registrado y archivado correctamente
            </Text>
          </Section>

          <Hr style={divider} />

          <Text style={mutedText}>
            Este es un correo automático generado por QUALIBLICK. No es necesario
            responder. Si tienes dudas sobre este proceso, contacta al
            administrador de tu organización.
          </Text>
        </Container>

        {/* Footer */}
        <Section style={footer}>
          <Text style={footerText}>
            © 2026 QUALIBLICK · Gestión inteligente de producción
          </Text>
          <Text style={footerSubText}>
            Este es un correo automático, por favor no respondas a este mensaje.
          </Text>
        </Section>
      </Body>
    </Html>
  );
};

/* ─── Estilos ─────────────────────────────────────────────────────────────── */

const main: React.CSSProperties = {
  backgroundColor: "#0f172a",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
  padding: "20px 0",
};

const header: React.CSSProperties = {
  backgroundColor: "#0f172a",
  textAlign: "center",
  padding: "32px 0 20px",
};

const headerInner: React.CSSProperties = {
  maxWidth: "560px",
  margin: "0 auto",
};

const logoImg: React.CSSProperties = {
  display: "block",
  margin: "0 auto 4px",
};

const logoSubtitle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "11px",
  letterSpacing: "2px",
  textTransform: "uppercase",
  margin: "4px 0 0",
};

const container: React.CSSProperties = {
  backgroundColor: "#1e293b",
  margin: "0 auto",
  padding: "40px",
  borderRadius: "12px",
  maxWidth: "560px",
  border: "1px solid #334155",
};

const statusBanner: React.CSSProperties = {
  backgroundColor: "#052e16",
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "24px",
  textAlign: "center",
  border: "1px solid #14532d",
};

const statusBadge: React.CSSProperties = {
  color: "#4ade80",
  fontSize: "13px",
  fontWeight: "700",
  letterSpacing: "2px",
  textTransform: "uppercase",
  margin: "0",
};

const iconSection: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "24px",
};

const iconCircle: React.CSSProperties = {
  display: "inline-block",
  color: "#22d3ee",
  backgroundColor: "#22d3ee18",
  border: "2px solid #22d3ee66",
  borderRadius: "50%",
  width: "64px",
  height: "64px",
  lineHeight: "64px",
  fontSize: "26px",
  textAlign: "center",
  margin: "0 auto",
};

const h1: React.CSSProperties = {
  color: "#f1f5f9",
  fontSize: "22px",
  fontWeight: "700",
  margin: "0 0 8px",
  textAlign: "center",
};

const subheading: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "14px",
  textAlign: "center",
  margin: "0 0 24px",
};

const divider: React.CSSProperties = {
  borderColor: "#334155",
  margin: "24px 0",
};

const innerDivider: React.CSSProperties = {
  borderColor: "#1e293b",
  margin: "12px 0",
};

const text: React.CSSProperties = {
  color: "#cbd5e1",
  fontSize: "15px",
  lineHeight: "26px",
  margin: "0 0 16px",
};

const highlight: React.CSSProperties = {
  color: "#22d3ee",
};

const detailsBox: React.CSSProperties = {
  backgroundColor: "#0f172a",
  borderRadius: "10px",
  padding: "20px 24px",
  margin: "20px 0",
  border: "1px solid #1e3a5f",
};

const detailsTitle: React.CSSProperties = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "2px",
  textTransform: "uppercase",
  margin: "0 0 4px",
};

const detailRow: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "14px",
  lineHeight: "28px",
  margin: "0",
};

const detailIcon: React.CSSProperties = {
  marginRight: "10px",
};

const detailLabel: React.CSSProperties = {
  color: "#475569",
  fontWeight: "600",
  marginRight: "8px",
};

const detailValue: React.CSSProperties = {
  color: "#e2e8f0",
};

const notasLabel: React.CSSProperties = {
  color: "#64748b",
  fontSize: "11px",
  fontWeight: "700",
  letterSpacing: "2px",
  textTransform: "uppercase",
  margin: "0 0 6px",
};

const notasText: React.CSSProperties = {
  color: "#cbd5e1",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
  fontStyle: "italic",
};

const successBar: React.CSSProperties = {
  backgroundColor: "#052e16",
  borderRadius: "8px",
  padding: "12px 20px",
  margin: "20px 0 0",
  border: "1px solid #14532d",
};

const successBarText: React.CSSProperties = {
  color: "#4ade80",
  fontSize: "13px",
  fontWeight: "600",
  margin: "0",
  textAlign: "center",
};

const mutedText: React.CSSProperties = {
  color: "#475569",
  fontSize: "13px",
  lineHeight: "22px",
  margin: "0",
  textAlign: "center",
};

const footer: React.CSSProperties = {
  textAlign: "center",
  padding: "20px 0 32px",
};

const footerText: React.CSSProperties = {
  color: "#334155",
  fontSize: "12px",
  margin: "0 0 4px",
};

const footerSubText: React.CSSProperties = {
  color: "#1e293b",
  fontSize: "11px",
  margin: "0",
};

export default ProcessCompletedEmail;

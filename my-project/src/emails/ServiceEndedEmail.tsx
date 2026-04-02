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

interface ServiceEndedEmailProps {
  nombreAdmin?: string;
  nombreServicio?: string;
  nombreEmpresa?: string;
  tipoServicio?: string;
  fechaCierre?: string;
}

export const ServiceEndedEmail = ({
  nombreAdmin = "María González",
  nombreServicio = "Línea de Conteo A",
  nombreEmpresa = "Agrícola del Sur",
  tipoServicio = "linea_conteo",
  fechaCierre = "02 de abril de 2026, 14:30",
}: ServiceEndedEmailProps) => {
  const tipoLabel = tipoServicio.replace(/_/g, " ");

  return (
    <Html lang="es">
      <Head />
      <Preview>🔴 Servicio finalizado: {nombreServicio} — {nombreEmpresa} · QUALIBLICK</Preview>
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
            <Text style={statusBadge}>■ &nbsp;SERVICIO FINALIZADO</Text>
          </Section>

          {/* Ícono */}
          <Section style={iconSection}>
            <Text style={iconCircle}>■</Text>
          </Section>

          <Heading style={h1}>{nombreServicio}</Heading>
          <Text style={subheading}>
            Este servicio ha sido marcado como finalizado en QUALIBLICK
          </Text>

          <Hr style={divider} />

          <Text style={text}>
            Hola <strong style={highlight}>{nombreAdmin}</strong>,
          </Text>
          <Text style={text}>
            Te confirmamos que el servicio{" "}
            <strong style={highlight}>{nombreServicio}</strong> de la empresa{" "}
            <strong style={highlight}>{nombreEmpresa}</strong> ha sido
            finalizado y registrado en el sistema.
          </Text>

          {/* Detalles del servicio */}
          <Section style={detailsBox}>
            <Text style={detailsTitle}>Resumen del servicio</Text>
            <Hr style={innerDivider} />
            <Text style={detailRow}>
              <span style={detailIcon}>🏢</span>
              <span style={detailLabel}>Empresa</span>
              <span style={detailValue}>{nombreEmpresa}</span>
            </Text>
            <Text style={detailRow}>
              <span style={detailIcon}>⚙</span>
              <span style={detailLabel}>Servicio</span>
              <span style={detailValue}>{nombreServicio}</span>
            </Text>
            <Text style={detailRow}>
              <span style={detailIcon}>🔖</span>
              <span style={detailLabel}>Tipo</span>
              <span style={{ ...detailValue, textTransform: "capitalize" }}>{tipoLabel}</span>
            </Text>
            <Text style={detailRow}>
              <span style={detailIcon}>📅</span>
              <span style={detailLabel}>Finalizado</span>
              <span style={detailValue}>{fechaCierre}</span>
            </Text>
            <Text style={detailRow}>
              <span style={detailIcon}>👤</span>
              <span style={detailLabel}>Notificado a</span>
              <span style={detailValue}>{nombreAdmin}</span>
            </Text>
          </Section>

          {/* Indicador */}
          <Section style={endBar}>
            <Text style={endBarText}>
              ■ &nbsp;Servicio registrado como finalizado correctamente
            </Text>
          </Section>

          <Hr style={divider} />

          <Text style={mutedText}>
            Este es un correo automático generado por QUALIBLICK. No es necesario
            responder. Si tienes dudas sobre este servicio, contacta al
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
  backgroundColor: "#1c0a0a",
  borderRadius: "8px",
  padding: "12px 16px",
  marginBottom: "24px",
  textAlign: "center",
  border: "1px solid #7f1d1d",
};

const statusBadge: React.CSSProperties = {
  color: "#f87171",
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
  color: "#f87171",
  backgroundColor: "#f8717118",
  border: "2px solid #f8717166",
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

const endBar: React.CSSProperties = {
  backgroundColor: "#1c0a0a",
  borderRadius: "8px",
  padding: "12px 20px",
  margin: "20px 0 0",
  border: "1px solid #7f1d1d",
};

const endBarText: React.CSSProperties = {
  color: "#f87171",
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

export default ServiceEndedEmail;

import React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Img,
} from "@react-email/components";

interface InvitationEmailProps {
  nombreEmpresa?: string;
  rol?: string;
  invitationUrl?: string;
  expiresAt?: string;
}

export const InvitationEmail = ({
  nombreEmpresa = "Agrícola del Sur",
  rol = "administrador",
  invitationUrl = "http://localhost:3000/registro-invitacion?token=preview",
  expiresAt = "09 de abril de 2026",
}: InvitationEmailProps) => {
  const rolLabel = rol === "administrador" ? "Administrador" : "Usuario";
  const rolColor = rol === "administrador" ? "#22d3ee" : "#a78bfa";

  return (
    <Html lang="es">
      <Head />
      <Preview>Te invitaron a unirte a {nombreEmpresa} en QUALIBLICK</Preview>
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
          {/* Ícono de invitación */}
          <Section style={iconSection}>
            <Text style={iconCircle}>✦</Text>
          </Section>

          {/* Título */}
          <Heading style={h1}>Tienes una invitación</Heading>
          <Text style={subheading}>
            Fuiste invitado a formar parte de una organización en QUALIBLICK
          </Text>

          <Hr style={divider} />

          {/* Cuerpo */}
          <Text style={text}>
            La empresa <strong style={highlight}>{nombreEmpresa}</strong> te ha
            invitado a unirte a su espacio de trabajo en{" "}
            <strong style={highlight}>QUALIBLICK</strong>.
          </Text>

          {/* Badge de rol */}
          <Section style={roleSection}>
            <Text style={roleLabel}>Tu rol será</Text>
            <Text style={{ ...rolBadge, backgroundColor: rolColor + "22", color: rolColor, borderColor: rolColor + "55" }}>
              {rolLabel}
            </Text>
          </Section>

          {/* Detalle de expiración */}
          <Section style={infoBox}>
            <Text style={infoRow}>
              <span style={infoIcon}>🏢</span>{" "}
              <span style={infoKey}>Empresa:</span>{" "}
              <span style={infoValue}>{nombreEmpresa}</span>
            </Text>
            <Text style={infoRow}>
              <span style={infoIcon}>⏰</span>{" "}
              <span style={infoKey}>Esta invitación expira:</span>{" "}
              <span style={infoValue}>{expiresAt}</span>
            </Text>
          </Section>

          {/* CTA */}
          <Section style={buttonSection}>
            <Button href={invitationUrl} style={button}>
              Aceptar invitación →
            </Button>
          </Section>

          <Hr style={divider} />

          <Text style={mutedText}>
            Si no esperabas esta invitación, puedes ignorar este correo de forma
            segura. No se realizará ninguna acción sin que hagas clic en el
            botón.
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
  fontSize: "26px",
  fontWeight: "700",
  margin: "0 0 8px",
  textAlign: "center",
};

const subheading: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "15px",
  textAlign: "center",
  margin: "0 0 24px",
};

const divider: React.CSSProperties = {
  borderColor: "#334155",
  margin: "24px 0",
};

const text: React.CSSProperties = {
  color: "#cbd5e1",
  fontSize: "15px",
  lineHeight: "26px",
  margin: "0 0 20px",
};

const highlight: React.CSSProperties = {
  color: "#22d3ee",
};

const roleSection: React.CSSProperties = {
  textAlign: "center",
  margin: "20px 0",
};

const roleLabel: React.CSSProperties = {
  color: "#64748b",
  fontSize: "11px",
  letterSpacing: "2px",
  textTransform: "uppercase",
  margin: "0 0 8px",
};

const rolBadge: React.CSSProperties = {
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "700",
  padding: "6px 20px",
  borderRadius: "999px",
  border: "1px solid",
  letterSpacing: "1px",
  textTransform: "uppercase",
  margin: "0",
};

const infoBox: React.CSSProperties = {
  backgroundColor: "#0f172a",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "20px 0",
  border: "1px solid #1e3a5f",
};

const infoRow: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0 0 6px",
};

const infoIcon: React.CSSProperties = {
  marginRight: "6px",
};

const infoKey: React.CSSProperties = {
  color: "#64748b",
  fontWeight: "600",
};

const infoValue: React.CSSProperties = {
  color: "#cbd5e1",
};

const buttonSection: React.CSSProperties = {
  textAlign: "center",
  margin: "28px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#22d3ee",
  borderRadius: "8px",
  color: "#0f172a",
  fontSize: "15px",
  fontWeight: "700",
  padding: "14px 36px",
  textDecoration: "none",
  display: "inline-block",
  letterSpacing: "0.5px",
};

const mutedText: React.CSSProperties = {
  color: "#475569",
  fontSize: "13px",
  lineHeight: "20px",
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

export default InvitationEmail;

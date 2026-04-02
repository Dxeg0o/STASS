import React from "react";
import {
  Body,
  Button,
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

interface ResetPasswordEmailProps {
  nombre?: string;
  resetUrl?: string;
}

export const ResetPasswordEmail = ({
  nombre = "Juan Pérez",
  resetUrl = "http://localhost:3000/reset-password?token=preview",
}: ResetPasswordEmailProps) => {
  return (
    <Html lang="es">
      <Head />
      <Preview>Restablece tu contraseña en QUALIBLICK</Preview>
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
          {/* Ícono */}
          <Section style={iconSection}>
            <Text style={iconCircle}>◎</Text>
          </Section>

          <Heading style={h1}>Restablecer contraseña</Heading>
          <Text style={subheading}>
            Recibimos una solicitud para cambiar tu contraseña
          </Text>

          <Hr style={divider} />

          <Text style={text}>
            Hola <strong style={highlight}>{nombre}</strong>,
          </Text>
          <Text style={text}>
            Alguien solicitó restablecer la contraseña asociada a tu cuenta en{" "}
            <strong style={highlight}>QUALIBLICK</strong>. Si fuiste tú, haz clic en
            el botón de abajo para continuar.
          </Text>

          {/* Aviso de seguridad */}
          <Section style={warningBox}>
            <Text style={warningText}>
              <span style={warningIcon}>⚠</span>{" "}
              Si no realizaste esta solicitud, ignora este correo. Tu contraseña
              no cambiará.
            </Text>
          </Section>

          {/* CTA */}
          <Section style={buttonSection}>
            <Button href={resetUrl} style={button}>
              Restablecer contraseña →
            </Button>
          </Section>

          {/* Info de expiración */}
          <Section style={infoBox}>
            <Text style={infoRow}>
              <span style={infoKey}>⏰ Expira en:</span>{" "}
              <span style={infoValue}>1 hora desde el envío</span>
            </Text>
            <Text style={infoRow}>
              <span style={infoKey}>🔒 Seguridad:</span>{" "}
              <span style={infoValue}>Este enlace es de un solo uso</span>
            </Text>
          </Section>

          <Hr style={divider} />

          <Text style={mutedText}>
            Si el botón no funciona, copia y pega el siguiente enlace en tu
            navegador:
          </Text>
          <Text style={urlText}>{resetUrl}</Text>
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
  margin: "0 0 16px",
};

const highlight: React.CSSProperties = {
  color: "#22d3ee",
};

const warningBox: React.CSSProperties = {
  backgroundColor: "#1c1208",
  border: "1px solid #78350f55",
  borderRadius: "8px",
  padding: "14px 18px",
  margin: "20px 0",
};

const warningText: React.CSSProperties = {
  color: "#fbbf24",
  fontSize: "13px",
  lineHeight: "22px",
  margin: "0",
};

const warningIcon: React.CSSProperties = {
  marginRight: "6px",
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

const infoKey: React.CSSProperties = {
  color: "#64748b",
  fontWeight: "600",
};

const infoValue: React.CSSProperties = {
  color: "#cbd5e1",
};

const mutedText: React.CSSProperties = {
  color: "#475569",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "0 0 8px",
  textAlign: "center",
};

const urlText: React.CSSProperties = {
  color: "#22d3ee",
  fontSize: "12px",
  wordBreak: "break-all",
  textAlign: "center",
  margin: "0",
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

export default ResetPasswordEmail;

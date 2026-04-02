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
      <Preview>Restablece tu contraseña</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Restablecer contraseña</Heading>
          <Text style={text}>Hola {nombre},</Text>
          <Text style={text}>
            Recibimos una solicitud para restablecer la contraseña de tu cuenta.
            Haz clic en el botón de abajo para crear una nueva contraseña.
          </Text>
          <Section style={buttonSection}>
            <Button href={resetUrl} style={button}>
              Restablecer contraseña
            </Button>
          </Section>
          <Text style={text}>
            Este enlace expirará en <strong>1 hora</strong>.
          </Text>
          <Text style={mutedText}>
            Si no solicitaste restablecer tu contraseña, puedes ignorar este
            correo. Tu contraseña no cambiará.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main: React.CSSProperties = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
};

const container: React.CSSProperties = {
  backgroundColor: "#ffffff",
  margin: "40px auto",
  padding: "40px",
  borderRadius: "8px",
  maxWidth: "560px",
  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
};

const h1: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "600",
  margin: "0 0 24px",
};

const text: React.CSSProperties = {
  color: "#444",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const mutedText: React.CSSProperties = {
  color: "#888",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "24px 0 0",
};

const buttonSection: React.CSSProperties = {
  margin: "24px 0",
};

const button: React.CSSProperties = {
  backgroundColor: "#18181b",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "15px",
  fontWeight: "500",
  padding: "12px 24px",
  textDecoration: "none",
  display: "inline-block",
};
export default ResetPasswordEmail;

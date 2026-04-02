import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
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
      <Preview>Proceso completado: {nombreProceso}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={badge}>
            <Text style={badgeText}>✓ Proceso completado</Text>
          </Section>
          <Heading style={h1}>{nombreProceso}</Heading>
          <Text style={text}>Hola {nombreAdmin},</Text>
          <Text style={text}>
            El proceso <strong>{nombreProceso}</strong> de{" "}
            <strong>{nombreEmpresa}</strong> ha sido marcado como completado.
          </Text>
          <Section style={detailsBox}>
            <Text style={detailRow}>
              <span style={label}>Empresa:</span> {nombreEmpresa}
            </Text>
            <Text style={detailRow}>
              <span style={label}>Proceso:</span> {nombreProceso}
            </Text>
            <Text style={detailRow}>
              <span style={label}>Fecha de completado:</span> {fechaCompletado}
            </Text>
            {notas && (
              <Text style={detailRow}>
                <span style={label}>Notas:</span> {notas}
              </Text>
            )}
          </Section>
          <Text style={mutedText}>
            Este es un correo automático. No es necesario responder.
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

const badge: React.CSSProperties = {
  marginBottom: "16px",
};

const badgeText: React.CSSProperties = {
  display: "inline-block",
  backgroundColor: "#dcfce7",
  color: "#15803d",
  fontSize: "13px",
  fontWeight: "600",
  padding: "4px 12px",
  borderRadius: "999px",
  margin: "0",
};

const h1: React.CSSProperties = {
  color: "#1a1a1a",
  fontSize: "22px",
  fontWeight: "600",
  margin: "0 0 20px",
};

const text: React.CSSProperties = {
  color: "#444",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0 0 16px",
};

const detailsBox: React.CSSProperties = {
  backgroundColor: "#f9fafb",
  borderRadius: "6px",
  padding: "16px 20px",
  margin: "20px 0",
};

const detailRow: React.CSSProperties = {
  color: "#444",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 6px",
};

const label: React.CSSProperties = {
  fontWeight: "600",
  color: "#1a1a1a",
};

const mutedText: React.CSSProperties = {
  color: "#888",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "24px 0 0",
};
export default ProcessCompletedEmail;

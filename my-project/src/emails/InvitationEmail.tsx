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

interface InvitationEmailProps {
  nombreEmpresa: string;
  rol: string;
  invitationUrl: string;
  expiresAt: string;
}

export function InvitationEmail({
  nombreEmpresa,
  rol,
  invitationUrl,
  expiresAt,
}: InvitationEmailProps) {
  const rolLabel = rol === "administrador" ? "Administrador" : "Usuario";

  return (
    <Html lang="es">
      <Head />
      <Preview>Te invitaron a unirte a {nombreEmpresa}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Invitación a {nombreEmpresa}</Heading>
          <Text style={text}>
            Fuiste invitado a unirte a <strong>{nombreEmpresa}</strong> con el
            rol de <strong>{rolLabel}</strong>.
          </Text>
          <Text style={text}>
            Haz clic en el botón de abajo para crear tu cuenta y comenzar.
          </Text>
          <Section style={buttonSection}>
            <Button href={invitationUrl} style={button}>
              Aceptar invitación
            </Button>
          </Section>
          <Text style={text}>
            Esta invitación expirará el <strong>{expiresAt}</strong>.
          </Text>
          <Text style={mutedText}>
            Si no esperabas esta invitación, puedes ignorar este correo.
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

const mutedText: React.CSSProperties = {
  color: "#888",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "24px 0 0",
};

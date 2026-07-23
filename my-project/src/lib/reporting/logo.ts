import { readFileSync } from "node:fs";
import { join } from "node:path";

const logoPath = join(process.cwd(), "public", "images", "Qualiblick.png");

export function getQualiblickLogo() {
  return readFileSync(logoPath);
}

export function getQualiblickLogoDataUri() {
  return `data:image/png;base64,${getQualiblickLogo().toString("base64")}`;
}

export function getQualiblickLogoAttachment() {
  return {
    filename: "qualiblick-logo.png",
    content: getQualiblickLogo(),
    contentId: "qualiblick-logo",
  };
}

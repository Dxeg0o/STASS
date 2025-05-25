import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "#0F3636", // color oscuro principal
        accent: "#FBC458", // amarillo/ámbar de acento
        light: "#ECE8E2", // tono crema suave
        white: "#FFFFFF", // blanco puro
      },
    },
  },
  plugins: [],
};
export default config;

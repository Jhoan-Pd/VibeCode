import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1400px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        heading: "hsl(var(--heading))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          hover: "hsl(var(--primary-hover))",
          active: "hsl(var(--primary-active))",
          foreground: "hsl(var(--primary-foreground))",
        },
        contrast: { DEFAULT: "hsl(var(--contrast))", hover: "hsl(var(--contrast-hover))", foreground: "hsl(var(--contrast-foreground))" },
        success: "hsl(var(--success))",
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
      },
      borderRadius: { lg: "var(--radius)", md: "calc(var(--radius) - 3px)", sm: "calc(var(--radius) - 6px)" },
      boxShadow: {
        btn: "var(--shadow-btn)",
        "btn-hover": "var(--shadow-btn-hover)",
        contrast: "var(--shadow-contrast)",
        card: "var(--shadow-card)",
      },
      transitionTimingFunction: { "out-expo": "var(--ease-out-expo)", "out-soft": "var(--ease-out-soft)" },
      fontFamily: {
        // Fuentes autoalojadas con @fontsource (sin CDN). Si no cargan, se usa la pila del sistema.
        sans: ["Inter Variable", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
        // Entre comillas: un nombre con un número ("4") sin comillas invalida toda la declaración CSS.
        display: ['"Source Serif 4 Variable"', "Georgia", "Cambria", '"Times New Roman"', "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "Liberation Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Navbar } from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VibeDecoder: entiende el código que generó la IA", template: "%s · VibeDecoder" },
  description:
    "Pega el código que te generó la IA: VibeDecoder lo explica línea por línea, lo dibuja en diagramas, señala sus riesgos y te pone un quiz para comprobar que lo entendiste.",
};

export const viewport: Viewport = { themeColor: "#0b0d14" };

// Aplica el tema guardado antes de pintar para evitar parpadeos. Oscuro por defecto.
const scriptTema = `try{if(localStorage.getItem('vd-theme')==='light')document.documentElement.classList.remove('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-screen font-sans">
        <Navbar />
        <main>{children}</main>
        <footer className="mt-24 border-t py-8 text-center text-sm text-muted-foreground print:hidden">
          VibeDecoder · Proyecto final de Programación Orientada a la Web
        </footer>
      </body>
    </html>
  );
}

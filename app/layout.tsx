import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ObservadorRevelar } from "@/components/motion/observador-revelar";
import { Navbar } from "@/components/navbar";
import "@fontsource-variable/inter";
import "@fontsource-variable/source-serif-4/opsz.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VibeDecoder: entiende el código que generó la IA", template: "%s · VibeDecoder" },
  description:
    "Pega el código que te generó la IA: VibeDecoder lo explica línea por línea, lo dibuja en diagramas, señala sus riesgos y te pone un quiz para comprobar que lo entendiste.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfc" },
    { media: "(prefers-color-scheme: dark)", color: "#16181d" },
  ],
};

// Aplica el tema guardado antes de pintar para evitar parpadeos. Claro por defecto; oscuro si la persona lo eligió.
// La clase vd-js habilita las animaciones de aparición al hacer scroll (sin JS el contenido se ve normal).
const scriptTema = `document.documentElement.classList.add('vd-js');try{if(localStorage.getItem('vd-theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body className="min-h-screen font-sans">
        <ObservadorRevelar />
        <Navbar />
        <main>{children}</main>
        <footer className="mt-24 border-t py-8 text-center text-sm text-muted-foreground print:hidden">
          VibeDecoder · Proyecto final de Programación Orientada a la Web
        </footer>
      </body>
    </html>
  );
}

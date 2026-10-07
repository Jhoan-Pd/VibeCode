import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Navbar } from "@/components/navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "VibeDecoder: entiende el código que generó la IA", template: "%s · VibeDecoder" },
  description:
    "Pega código generado por IA y obtén una explicación línea por línea, diagramas de flujo y un quiz para comprobar que realmente lo entendiste.",
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
        <footer className="mt-24 border-t py-8 text-center text-sm text-muted-foreground">
          VibeDecoder · Proyecto final de Programación Orientada a la Web
        </footer>
      </body>
    </html>
  );
}

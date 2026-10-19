"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

/** true cuando <html> tiene la clase "dark" (Monaco y Mermaid cambian de tema con esto). */
export function useIsDark(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false, // en el servidor se asume el modo claro, que es el predeterminado
  );
}

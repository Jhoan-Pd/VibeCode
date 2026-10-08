/**
 * Punto único de acceso a los prompts. Para cambiar de versión:
 *  1) copia lib/prompts/v1 a lib/prompts/v2 y edita,
 *  2) cambia las importaciones y PROMPT_VERSION aquí.
 * Cada análisis guarda la versión usada (columna versionPrompts).
 */
export const PROMPT_VERSION = "v1";

export { SISTEMA_BASE } from "./v1/sistema";
export { promptResumen } from "./v1/resumen";
export { promptExplicacion } from "./v1/explicacion";
export { promptDiagrama, promptDiagramasEstructurales, promptRepararDiagrama } from "./v1/diagrama";
export { promptGlosario } from "./v1/glosario";
export { promptAuditoria } from "./v1/auditoria";
export { promptQuiz } from "./v1/quiz";
export { SISTEMA_CHAT, promptChat, type MensajePrevio } from "./v1/chat";

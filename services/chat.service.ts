import "server-only";
import { contextoChat, limpiarRespuestaChat } from "@/lib/chat";
import { db } from "@/lib/db";
import { LLMError, type LLMProvider } from "@/lib/llm/types";
import { SISTEMA_CHAT, promptChat } from "@/lib/prompts";
import { ResumenSchema } from "@/schemas/analysis";
import type { ChatRequest, MensajeChatVista } from "@/schemas/chat";

/** Mensajes previos que se envían como contexto (los más recientes). */
const HISTORIAL_MAX = 8;

function aVista(m: { id: string; rol: "USUARIO" | "ASISTENTE"; contenido: string; lineaInicio: number | null; lineaFin: number | null; creadoEn: Date }): MensajeChatVista {
  return { id: m.id, rol: m.rol, contenido: m.contenido, lineaInicio: m.lineaInicio, lineaFin: m.lineaFin, creadoEn: m.creadoEn.toISOString() };
}

export async function listarMensajes(analisisId: string, usuarioId: string, limite = 50): Promise<MensajeChatVista[]> {
  const mensajes = await db.mensajeChat.findMany({
    where: { analisisId, usuarioId },
    orderBy: { creadoEn: "desc" },
    take: limite,
  });
  return mensajes.reverse().map(aVista);
}

/**
 * Chat contextual: el usuario pregunta sobre una línea o bloque. Se envía al LLM el código (o una
 * ventana si es muy largo), la selección, el resumen y los últimos mensajes. Solo se guarda la
 * pregunta si hubo respuesta, para que un fallo del proveedor no deje preguntas huérfanas.
 */
export async function responder(provider: LLMProvider, analisisId: string, usuarioId: string, peticion: ChatRequest) {
  const analisis = await db.analisis.findFirst({
    where: { id: analisisId, usuarioId },
    select: { codigo: true, lenguaje: true, nivel: true, resumen: true },
  });
  if (!analisis) return null;

  const historial = await db.mensajeChat.findMany({
    where: { analisisId, usuarioId },
    orderBy: { creadoEn: "desc" },
    take: HISTORIAL_MAX,
    select: { rol: true, contenido: true },
  });

  const seleccion = peticion.lineaInicio ? { inicio: peticion.lineaInicio, fin: peticion.lineaFin ?? peticion.lineaInicio } : null;
  const ctx = contextoChat(analisis.codigo, seleccion);
  const resumen = ResumenSchema.safeParse(analisis.resumen);

  const respuesta = await provider.generate({
    system: SISTEMA_CHAT,
    prompt: promptChat({
      codigoNumerado: ctx.codigoNumerado,
      lenguaje: analisis.lenguaje,
      nivel: analisis.nivel,
      proposito: resumen.success ? resumen.data.proposito : null,
      seleccion: ctx.seleccion,
      historial: historial.reverse(),
      pregunta: peticion.mensaje,
      recortado: ctx.recortado,
    }),
    temperature: 0.3,
    maxOutputTokens: 1200,
  });
  const contenido = limpiarRespuestaChat(respuesta.text);
  if (!contenido) throw new LLMError("Respuesta vacía en el chat", "BAD_RESPONSE");

  const lineaInicio = ctx.seleccion?.inicio ?? null;
  const lineaFin = ctx.seleccion?.fin ?? null;
  const ahora = Date.now();
  const [pregunta, contestacion] = await db.$transaction([
    db.mensajeChat.create({
      data: { analisisId, usuarioId, rol: "USUARIO", contenido: peticion.mensaje, lineaInicio, lineaFin, creadoEn: new Date(ahora) },
    }),
    // +1 ms garantiza el orden pregunta → respuesta al listar por fecha.
    db.mensajeChat.create({ data: { analisisId, usuarioId, rol: "ASISTENTE", contenido, lineaInicio, lineaFin, creadoEn: new Date(ahora + 1) } }),
  ]);
  return [aVista(pregunta), aVista(contestacion)];
}

export async function borrarConversacion(analisisId: string, usuarioId: string) {
  return db.mensajeChat.deleteMany({ where: { analisisId, usuarioId } });
}

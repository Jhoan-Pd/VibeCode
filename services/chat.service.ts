import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { contextoChat, limpiarRespuestaChat } from "@/lib/chat";
import { db } from "@/lib/db";
import { LLMError, type LLMProvider } from "@/lib/llm/types";
import { SISTEMA_CHAT, promptChat } from "@/lib/prompts";
import { ResumenSchema } from "@/schemas/analysis";
import type { ChatRequest, MensajeChatVista } from "@/schemas/chat";

/** Mensajes previos que se envían como contexto (los más recientes). */
const HISTORIAL_MAX = 8;

type MensajeBD = Prisma.MensajeChatGetPayload<object>;

function aVista(m: MensajeBD): MensajeChatVista {
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

  return guardarIntercambio({ analisisId, usuarioId, pregunta: peticion.mensaje, respuesta: contenido, seleccion: ctx.seleccion });
}

/** Guarda pregunta y respuesta juntas (transacción): o quedan las dos, o ninguna. */
async function guardarIntercambio(i: {
  analisisId: string;
  usuarioId: string;
  pregunta: string;
  respuesta: string;
  seleccion: { inicio: number; fin: number } | null;
}): Promise<MensajeChatVista[]> {
  const base = { analisisId: i.analisisId, usuarioId: i.usuarioId, lineaInicio: i.seleccion?.inicio ?? null, lineaFin: i.seleccion?.fin ?? null };
  const ahora = Date.now();
  const guardados = await db.$transaction([
    db.mensajeChat.create({ data: { ...base, rol: "USUARIO", contenido: i.pregunta, creadoEn: new Date(ahora) } }),
    // +1 ms garantiza el orden pregunta → respuesta al listar por fecha.
    db.mensajeChat.create({ data: { ...base, rol: "ASISTENTE", contenido: i.respuesta, creadoEn: new Date(ahora + 1) } }),
  ]);
  return guardados.map(aVista);
}

export async function borrarConversacion(analisisId: string, usuarioId: string) {
  return db.mensajeChat.deleteMany({ where: { analisisId, usuarioId } });
}

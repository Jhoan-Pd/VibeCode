/**
 * Validación de correos con mensajes que dicen QUÉ está mal (función pura, se usa en el
 * navegador mientras se escribe y en el servidor al registrar).
 *
 * Gmail, Outlook y casi todos los proveedores no aceptan tildes, «ñ» ni espacios en la dirección,
 * así que se rechazan con un mensaje claro en vez del genérico «Correo no válido».
 */

const FORMATO = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

/** Devuelve el problema del correo en lenguaje claro, o null si es válido. */
export function problemaCorreo(valor: string): string | null {
  const correo = valor.trim();
  if (!correo) return "Escribe tu correo.";
  if (/\s/.test(correo)) return "El correo no puede tener espacios.";

  const raros = [...new Set([...correo].filter((c) => c.charCodeAt(0) > 127))];
  if (raros.length > 0) {
    const lista = raros.map((c) => `«${c}»`).join(", ");
    const sugerencia = correo.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ñ/gi, "n");
    return `El correo no puede tener tildes ni «ñ» (tiene ${lista}). ¿Quisiste decir ${sugerencia}?`;
  }

  const arrobas = correo.split("@").length - 1;
  if (arrobas === 0) return "Al correo le falta la «@» (ejemplo: nombre@gmail.com).";
  if (arrobas > 1) return "El correo solo puede tener una «@».";
  const [usuario, dominio] = correo.split("@");
  if (!usuario) return "Falta la parte antes de la «@».";
  if (!dominio || !dominio.includes(".")) return "Falta el dominio después de la «@» (ejemplo: gmail.com).";
  if (correo.length > 200) return "El correo es demasiado largo.";
  if (!FORMATO.test(correo)) return "Revisa el correo: debe tener la forma nombre@dominio.com.";
  return null;
}

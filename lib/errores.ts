/**
 * Error de dominio cuyo mensaje es seguro y útil para mostrarlo tal cual a la persona
 * (por ejemplo «Este análisis no tiene ese diagrama»). Lleva el código HTTP con el que responder.
 * Cualquier otro error se considera interno y se reemplaza por un mensaje genérico.
 */
export class ErrorVisible extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ErrorVisible";
  }
}

import type { Bloque, Resumen } from "@/schemas/analysis";

/**
 * Análisis de demostración PRECALCULADO para la landing: se muestra sin login y sin llamar al LLM.
 * Usa exactamente la misma estructura de datos que un análisis real (se valida en los tests).
 */

const LINEAS = [
  "// Reintenta peticiones HTTP con espera exponencial",
  "async function fetchWithRetry(url, options = {}, retries = 3, delay = 500) {",
  "  for (let attempt = 0; attempt <= retries; attempt++) {",
  "    try {",
  "      const response = await fetch(url, options);",
  "      if (!response.ok) {",
  "        throw new Error(`HTTP ${response.status}`);",
  "      }",
  "      return await response.json();",
  "    } catch (error) {",
  "      if (attempt === retries) {",
  "        throw error;",
  "      }",
  "      const wait = delay * 2 ** attempt;",
  "      await new Promise((resolve) => setTimeout(resolve, wait));",
  "    }",
  "  }",
  "}",
  "",
  "const cache = new Map();",
  "",
  "function memoizeAsync(fn) {",
  "  return async function (key, ...args) {",
  "    if (cache.has(key)) {",
  "      return cache.get(key);",
  "    }",
  "    const promise = fn(...args).catch((err) => {",
  "      cache.delete(key);",
  "      throw err;",
  "    });",
  "    cache.set(key, promise);",
  "    return promise;",
  "  };",
  "}",
  "",
  "const getUser = memoizeAsync((id) =>",
  "  fetchWithRetry(`https://api.example.com/users/${id}`)",
  ");",
];

export const DEMO_CODIGO = LINEAS.join("\n");

export const DEMO_RESUMEN: Resumen = {
  proposito:
    "Define un cliente HTTP resistente a fallos y una caché en memoria. `fetchWithRetry` repite una petición que falla esperando cada vez el doble de tiempo; `memoizeAsync` guarda las promesas ya pedidas para no repetir llamadas idénticas; y `getUser` combina ambas para consultar usuarios de una API.",
  entradas: [
    "`url` (string): dirección a consultar",
    "`options` (objeto, opcional): opciones de `fetch` como método, cabeceras o cuerpo",
    "`retries` (número, 3 por defecto) y `delay` (ms, 500 por defecto): controlan los reintentos",
    "`id` (usuario) que recibe `getUser`",
  ],
  salidas: [
    "Una promesa que resuelve con el JSON de la respuesta",
    "Lanza el último error si se agotan los reintentos",
    "Efecto secundario: llena el `Map` global `cache`",
  ],
  dependencias: [
    "`fetch` (API nativa del navegador y de Node 18+)",
    "`Map`, `Promise` y `setTimeout` (JavaScript estándar, sin librerías externas)",
    "API remota `https://api.example.com` (ejemplo)",
  ],
};

export const DEMO_BLOQUES: Bloque[] = [
  {
    lineaInicio: 1,
    lineaFin: 2,
    titulo: "Función con parámetros por defecto",
    explicacion:
      "Declara `fetchWithRetry` como función `async`, así que devuelve una promesa y puede usar `await`. Los parámetros con valor por defecto hacen que solo `url` sea obligatorio: por defecto reintenta 3 veces y espera 500 ms.",
  },
  {
    lineaInicio: 3,
    lineaFin: 4,
    titulo: "Bucle de intentos",
    explicacion:
      "Recorre `attempt` desde 0 hasta `retries` incluido, es decir, hace 1 intento inicial más 3 reintentos (4 en total). El `try` agrupa todo lo que puede fallar en cada vuelta.",
  },
  {
    lineaInicio: 5,
    lineaFin: 9,
    titulo: "Petición y validación de la respuesta",
    explicacion:
      "Llama a `fetch` y espera la respuesta. Ojo: `fetch` NO falla con errores HTTP como 404 o 500 (solo con errores de red), por eso se comprueba `response.ok` a mano y se lanza un `Error` propio. Si todo va bien, devuelve el cuerpo ya convertido a JSON.",
  },
  {
    lineaInicio: 10,
    lineaFin: 13,
    titulo: "Último intento: propagar el error",
    explicacion:
      "Cualquier fallo del bloque `try` cae aquí. Si ya era el último intento (`attempt === retries`) vuelve a lanzar el error para que lo maneje quien llamó a la función. Si no, sigue hacia la espera.",
  },
  {
    lineaInicio: 14,
    lineaFin: 15,
    titulo: "Espera exponencial (backoff)",
    explicacion:
      "Calcula la espera como `delay * 2 ** attempt`: 500 ms, 1 s, 2 s... Esto evita saturar un servidor que ya está fallando. `new Promise` + `setTimeout` es el truco habitual para hacer una pausa que se pueda `await`ar.",
  },
  {
    lineaInicio: 16,
    lineaFin: 18,
    titulo: "Cierre del bucle y de la función",
    explicacion:
      "Cierra el `try/catch`, el `for` y la función. En la práctica nunca se llega al final sin `return` ni `throw`: el último intento siempre hace una de las dos cosas.",
  },
  {
    lineaInicio: 20,
    lineaFin: 20,
    titulo: "Caché global",
    explicacion:
      "Crea un `Map` a nivel de módulo que guardará los resultados por clave. Al ser global vive mientras viva el módulo y se comparte entre todas las llamadas.",
  },
  {
    lineaInicio: 22,
    lineaFin: 23,
    titulo: "Función de orden superior",
    explicacion:
      "`memoizeAsync` recibe una función `fn` y devuelve otra función. La función devuelta recuerda (`closure`) tanto `fn` como `cache`, aunque `memoizeAsync` ya haya terminado de ejecutarse. Eso es lo que permite reutilizar la caché en cada llamada.",
  },
  {
    lineaInicio: 24,
    lineaFin: 26,
    titulo: "Acierto de caché",
    explicacion:
      "Si la clave ya está en el `Map`, devuelve lo guardado. Lo guardado es una PROMESA, no el valor final: si dos llamadas piden lo mismo a la vez, ambas comparten la misma petición en curso en lugar de lanzar dos.",
  },
  {
    lineaInicio: 27,
    lineaFin: 30,
    titulo: "Guardar la promesa y limpiar si falla",
    explicacion:
      "Ejecuta `fn` y engancha un `.catch`: si falla, borra la clave de la caché y relanza el error. Sin esto, un error temporal quedaría cacheado para siempre y todas las llamadas siguientes fallarían.",
  },
  {
    lineaInicio: 31,
    lineaFin: 34,
    titulo: "Registrar y devolver la promesa",
    explicacion:
      "Guarda la promesa en la caché y la devuelve. Se guarda inmediatamente (sin esperar a que termine) para que las llamadas concurrentes del bloque anterior ya la encuentren.",
  },
  {
    lineaInicio: 36,
    lineaFin: 38,
    titulo: "Uso: getUser",
    explicacion:
      "Compone las dos piezas: `getUser(id)` consulta la API con reintentos y, gracias a `memoizeAsync`, solo lo hace una vez por `id` mientras la petición tenga éxito. Atención: la caché no expira ni tiene límite de tamaño, algo a vigilar en producción.",
  },
];

export const DEMO_DIAGRAMA = {
  titulo: "Flujo de fetchWithRetry",
  mermaid: `flowchart TD
  A(["Inicio: fetchWithRetry(url)"]) --> B["attempt = 0"]
  B --> C{"attempt <= retries?"}
  C -->|"sí"| D["fetch(url, options)"]
  D --> E{"response.ok?"}
  E -->|"sí"| F(["Devuelve response.json()"])
  E -->|"no"| G["Lanza Error HTTP"]
  G --> H{"attempt === retries?"}
  H -->|"sí"| I(["Propaga el error"])
  H -->|"no"| J["Espera delay * 2^attempt"]
  J --> K["attempt++"]
  K --> C
  C -->|"no"| L(["Fin"])`,
};

export const DEMO_ANALISIS = {
  titulo: "fetchWithRetry + memoizeAsync (ejemplo)",
  lenguaje: "javascript",
  nivel: "INTERMEDIO" as const,
  codigo: DEMO_CODIGO,
  resumen: DEMO_RESUMEN,
  bloques: DEMO_BLOQUES,
  diagrama: DEMO_DIAGRAMA,
};

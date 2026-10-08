import { aPreguntaPublica, type PreguntaGuardada, type QuizLLM } from "@/schemas/quiz";
import type { Bloque, Resumen } from "@/schemas/analysis";
import type { AnalisisVista, ConceptoVista, DiagramaVista, HallazgoVista } from "@/schemas/vista";
import { prepararPreguntas } from "./quiz";

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

export const DEMO_SECUENCIA = {
  titulo: "Qué pasa al llamar a getUser",
  mermaid: `sequenceDiagram
  participant App as Aplicación
  participant M as getUser memoizado
  participant C as cache Map
  participant F as fetchWithRetry
  participant API as api.example.com
  App->>M: getUser(7)
  M->>C: has(7)
  alt ya está en caché
    C-->>M: promesa guardada
  else no está
    M->>F: fetchWithRetry(url)
    M->>C: set(7, promesa)
    loop hasta 4 intentos con espera creciente
      F->>API: GET /users/7
      API-->>F: respuesta HTTP
    end
    F-->>M: JSON del usuario o error
  end
  M-->>App: promesa con el usuario`,
};

export const DEMO_CONCEPTOS: ConceptoVista[] = [
  {
    nombre: "async/await",
    explicacion: "Permite escribir código asíncrono como si fuera secuencial: `await` pausa la función hasta que la promesa de `fetch` se resuelve, sin bloquear el resto del programa.",
    lineaInicio: 2,
    lineaFin: 5,
  },
  {
    nombre: "try/catch",
    explicacion: "Captura los errores lanzados dentro del bloque `try` (de red o el `throw` del estado HTTP) para decidir si se reintenta o se propaga el error.",
    lineaInicio: 4,
    lineaFin: 10,
  },
  {
    nombre: "Plantillas de texto",
    explicacion: "Las comillas invertidas permiten insertar valores con `${...}` dentro de un texto, como el código de estado HTTP o el `id` en la URL.",
    lineaInicio: 7,
    lineaFin: 7,
  },
  {
    nombre: "Backoff exponencial",
    explicacion: "Estrategia de reintentos en la que cada espera duplica la anterior (500, 1000, 2000 ms...) para no saturar un servidor que está fallando.",
    lineaInicio: 14,
    lineaFin: 15,
  },
  {
    nombre: "Promesas",
    explicacion: "Objetos que representan un valor futuro. `new Promise` con `setTimeout` crea una pausa que se puede esperar con `await`.",
    lineaInicio: 15,
    lineaFin: 15,
  },
  {
    nombre: "Map",
    explicacion: "Colección clave-valor nativa de JavaScript. Aquí guarda una promesa por cada clave ya pedida; `has`, `get`, `set` y `delete` la consultan y modifican.",
    lineaInicio: 20,
    lineaFin: 20,
  },
  {
    nombre: "Closures",
    explicacion: "La función que devuelve `memoizeAsync` recuerda `fn` aunque `memoizeAsync` ya haya terminado: cada función memoizada lleva consigo su propia `fn`.",
    lineaInicio: 22,
    lineaFin: 33,
  },
  {
    nombre: "Memoización",
    explicacion: "Guardar el resultado de una llamada para reutilizarlo cuando se repiten los mismos argumentos. Guardar la promesa (y no el valor) evita peticiones duplicadas simultáneas.",
    lineaInicio: 23,
    lineaFin: 32,
  },
  {
    nombre: "Parámetros rest y spread",
    explicacion: "`...args` agrupa los argumentos restantes en un arreglo y `fn(...args)` los vuelve a separar al llamar a la función original.",
    lineaInicio: 23,
    lineaFin: 27,
  },
];

export const DEMO_HALLAZGOS: HallazgoVista[] = [
  {
    tipo: "MALA_PRACTICA",
    severidad: "MEDIA",
    titulo: "Caché global compartida entre funciones",
    descripcion:
      "`cache` está fuera de `memoizeAsync`, así que TODAS las funciones memoizadas comparten el mismo `Map`. Si otra función usa la clave `7`, recibirá el usuario en lugar de su propio resultado.",
    sugerencia: "Crea el `Map` dentro de `memoizeAsync` (`const cache = new Map();` como primera línea) para que cada función tenga su propia caché.",
    lineaInicio: 20,
    lineaFin: 20,
  },
  {
    tipo: "MANEJO_ERRORES",
    severidad: "MEDIA",
    titulo: "Reintenta errores que no se arreglan reintentando",
    descripcion:
      "Cualquier respuesta no exitosa provoca reintentos, incluidos 400, 401 o 404. Un usuario inexistente generará 4 peticiones y unos 3,5 segundos de espera inútiles.",
    sugerencia: "Reintenta solo errores de red y códigos 5xx o 429; para los 4xx lanza el error de inmediato (por ejemplo, revisando `response.status >= 500`).",
    lineaInicio: 6,
    lineaFin: 15,
  },
  {
    tipo: "SEGURIDAD",
    severidad: "BAJA",
    titulo: "El id se inserta en la URL sin codificar",
    descripcion: "Si `id` viene del usuario, valores como `../admin` o `7?x=1` cambian la ruta o los parámetros de la petición.",
    sugerencia: "Codifica el valor: `${encodeURIComponent(id)}`.",
    lineaInicio: 37,
    lineaFin: 37,
  },
  {
    tipo: "MALA_PRACTICA",
    severidad: "BAJA",
    titulo: "La caché crece sin límite",
    descripcion: "Las respuestas correctas nunca se eliminan ni expiran: en un proceso de larga duración la memoria crece y los datos pueden quedar desactualizados.",
    sugerencia: "Añade un tiempo de expiración o un tamaño máximo (por ejemplo, una caché LRU).",
    lineaInicio: 31,
    lineaFin: 31,
  },
  {
    tipo: "MANEJO_ERRORES",
    severidad: "BAJA",
    titulo: "fetch sin tiempo límite",
    descripcion: "Si el servidor no responde, `fetch` puede quedarse esperando mucho tiempo y los reintentos nunca llegan.",
    sugerencia: "Pasa una señal de cancelación: `fetch(url, { ...options, signal: AbortSignal.timeout(5000) })`.",
    lineaInicio: 5,
    lineaFin: 5,
  },
];

const DEMO_QUIZ_LLM: QuizLLM = {
  preguntas: [
    {
      tipo: "QUE_IMPRIME",
      enunciado: "Con los valores por defecto (`delay = 500`), ¿cuánto espera la función antes del intento con `attempt = 2`, es decir, después de que falle `attempt = 1`?",
      opciones: ["500 ms", "1000 ms", "2000 ms", "1500 ms"],
      correcta: 1,
      explicacion: "La espera se calcula con el intento que acaba de fallar: `500 * 2 ** 1 = 1000` ms (línea 14). Antes del siguiente sería 2000 ms.",
      lineaInicio: 14,
      lineaFin: 15,
      concepto: "Backoff exponencial",
    },
    {
      tipo: "OPCION_MULTIPLE",
      enunciado: "¿Cuántas peticiones hace como máximo `fetchWithRetry` con `retries = 3`?",
      opciones: ["3", "4", "5", "Las que hagan falta hasta que funcione"],
      correcta: 1,
      explicacion: "El bucle va de `attempt = 0` a `attempt <= retries`, es decir 0, 1, 2 y 3: cuatro peticiones (línea 3).",
      lineaInicio: 3,
      lineaFin: 3,
      concepto: "Bucles",
    },
    {
      tipo: "VERDADERO_FALSO",
      enunciado: "Si llamas a `getUser(7)` dos veces seguidas, antes de que termine la primera petición, se hacen dos peticiones HTTP.",
      correcta: false,
      explicacion: "La promesa se guarda en la caché en cuanto se crea (línea 31), así que la segunda llamada recibe la misma promesa pendiente.",
      lineaInicio: 24,
      lineaFin: 32,
      concepto: "Memoización",
    },
    {
      tipo: "OPCION_MULTIPLE",
      enunciado: "¿Para qué sirve `cache.delete(key)` dentro del `catch` de la línea 27?",
      opciones: [
        "Para liberar memoria cuando la petición tiene éxito",
        "Para que un error no quede guardado y la próxima llamada vuelva a intentarlo",
        "Para que JavaScript no muestre el error en consola",
      ],
      correcta: 1,
      explicacion: "Si no se borrara, la promesa rechazada quedaría en caché y todas las llamadas futuras con esa clave fallarían sin reintentar.",
      lineaInicio: 27,
      lineaFin: 30,
      concepto: "Manejo de errores",
    },
    {
      tipo: "QUE_PASA_SI",
      enunciado: "¿Qué pasa si eliminas la línea 12 (`throw error;`)?",
      opciones: [
        "Tras el último intento fallido la función termina devolviendo `undefined` sin avisar del error",
        "La función reintenta para siempre",
        "Se produce un error de sintaxis",
        "No cambia nada",
      ],
      correcta: 0,
      explicacion: "Sin el `throw`, después del último intento se espera, el bucle termina porque `attempt` supera `retries` y la función acaba sin `return`: devuelve `undefined`.",
      lineaInicio: 10,
      lineaFin: 13,
      concepto: "Manejo de errores",
    },
    {
      tipo: "VERDADERO_FALSO",
      enunciado: "Dos funciones distintas creadas con `memoizeAsync` comparten la misma caché.",
      correcta: true,
      explicacion: "`cache` se declara una sola vez fuera de `memoizeAsync` (línea 20), por eso es compartida: es el primer hallazgo de la auditoría.",
      lineaInicio: 20,
      lineaFin: 22,
      concepto: "Closures",
    },
    {
      tipo: "ORDENAR",
      enunciado: "La primera petición falla y la segunda funciona. Ordena lo que ocurre dentro de `fetchWithRetry`.",
      pasos: [
        "Se llama a `fetch` con `attempt = 0`",
        "Se entra al `catch` porque la petición falló",
        "Se calcula una espera de 500 ms",
        "Se espera con `setTimeout`",
        "Se repite `fetch` con `attempt = 1` y se devuelve el JSON",
      ],
      explicacion: "Es el recorrido de las líneas 3 a 15 en el primer intento y de la 5 a la 9 en el segundo.",
      lineaInicio: 3,
      lineaFin: 15,
      concepto: "async/await",
    },
  ],
};

/** Preguntas de la demo CON respuestas: la demo califica en el navegador (no hay nada que proteger). */
export const DEMO_PREGUNTAS: PreguntaGuardada[] = prepararPreguntas(DEMO_QUIZ_LLM.preguntas).map((p, i) => ({ ...p, id: `demo-${i + 1}` }));
export { DEMO_QUIZ_LLM };

export const DEMO_DIAGRAMAS: DiagramaVista[] = [
  { tipo: "FLUJO", ...DEMO_DIAGRAMA },
  { tipo: "SECUENCIA", ...DEMO_SECUENCIA },
];

export const DEMO_VISTA: AnalisisVista = {
  codigo: DEMO_CODIGO,
  lenguaje: "javascript",
  resumen: DEMO_RESUMEN,
  bloques: DEMO_BLOQUES,
  diagramas: DEMO_DIAGRAMAS,
  conceptos: DEMO_CONCEPTOS,
  hallazgos: DEMO_HALLAZGOS,
  quiz: { id: "demo", preguntas: DEMO_PREGUNTAS.map(aPreguntaPublica), intentos: [] },
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

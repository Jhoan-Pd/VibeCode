# Revisión de código: 5 vueltas de mejora

Revisión profunda de VibeDecoder buscando clean code, patrones de diseño y estructuras de datos adecuadas.
Cada vuelta tiene un foco. Cada cambio va en su propio commit (`git log ddaab05..HEAD`) para que se pueda revisar por separado.

**Criterio de cada cambio:** la conducta visible se mantiene igual, salvo los errores que están marcados como _fix_. Al cerrar cada vuelta se corrieron `tsc`, las pruebas de Vitest, `next build` y las suites e2e y de interfaz (Playwright).

| | Antes | Después |
|---|---|---|
| Pruebas unitarias | 142 en 22 archivos | 182 en 29 archivos |
| `analysis-viewer.tsx` | 366 líneas | 153 líneas |
| `analyze-form.tsx` | 359 líneas | 124 líneas |
| `quiz-panel.tsx` | 390 líneas | 91 líneas |
| Proveedores LLM (Gemini + Groq) | 269 líneas con la lógica de reintentos duplicada | 158 líneas, más una base común de 125 |

---

## Vuelta 1: capa HTTP (rutas de la API)

Problema: cada ruta repetía el mismo prólogo. Comprobaba la sesión, esperaba los `params`, validaba el cuerpo con Zod, verificaba la propiedad del análisis, descontaba cupo y traducía los errores.

**Patrón Decorator: `conUsuario(handler)`** (`lib/api.ts`)
- Comprueba la sesión y resuelve los parámetros dinámicos.
- Convierte cualquier excepción no prevista en un 500 con un mensaje genérico. El detalle queda solo en el log.

**Helpers comunes**
- `leerCuerpo(req, esquema)` devuelve `{ datos } | { respuesta }`.
- `respuestaDeError(e)` responde a cualquier error capturado en una ruta.
- `esAnalisisPropio(id, usuario)` verifica la propiedad del análisis.

**Reservar y compensar: `conCupo(usuario, recurso, acción)`**
- Descuenta el cupo antes de ejecutar la acción.
- Si la acción falla, lo devuelve.
- _fix_: pedir un diagrama de un análisis inexistente ya no gasta cupo.

**Error de dominio: `ErrorVisible`**
- Su mensaje es seguro para mostrarlo al usuario y lleva su propio código HTTP.
- Ejemplo: los errores del Gist (400, 404, 422, 429) salen con su mensaje y código en vez de un 502 genérico.

**Única fuente de verdad: `TIPOS_MERMAID`**
- De esta constante salen el tipo TypeScript, el `z.enum` y el orden de las pestañas.

**Gist**
- El servicio `obtenerArchivosGist` contiene la lógica de GitHub.
- La protección anti-SSRF (`extraerIdGist`) es una función pura con pruebas.

## Vuelta 2: servicios y LLM

**Template Method en los generadores**
- `GeneradorBase.preparar()` numera el código.
- `GeneradorBase.consultar()` llama al LLM con el sistema base.
- Cada generador solo define su prompt y su validación.

**Template Method en los proveedores: `ProveedorHttp<Cuerpo>`** (`lib/llm/http.ts`)
- La base hace el POST con timeout y hasta 3 intentos: 429 con espera corta y 5xx con backoff.
- También traduce a `LLMError` los códigos HTTP comunes.
- `GeminiProvider` y `GroqProvider` solo describen su API: cómo armar la petición, cómo leer la respuesta y sus errores propios.

**Patrón Repository: `analisisRepo`**
- Tiene todo el acceso a Postgres de las etapas.
- Cada «reemplazar» borra y crea dentro de una transacción.
- `AnalisisService` ya no importa Prisma.

**Patrón Strategy: `Record<Etapa, EstrategiaEtapa>`**
- Sustituye al `switch` de las etapas.
- TypeScript exige una estrategia por etapa, así que agregar una etapa es agregar una entrada.

**Otros cambios**
- `lib/metadatos.ts` separa el título automático y la resolución del lenguaje.
- `omitir()` clona un análisis sin la identidad de sus filas hijas.
- `comoCandidato()` nombra la regla de reutilización de la caché.
- `guardarIntercambio()` separa la persistencia del chat de la llamada al LLM.

## Vuelta 3: estructuras de datos y algoritmos

| Dónde | Antes | Después |
|---|---|---|
| Cobertura de bloques (`validarBloques`) | Cada línea preguntaba a todos los bloques: O(L·B) | Arreglo de diferencias con suma acumulada: O(L+B), probado contra la versión ingenua |
| Respuesta de ORDENAR | `permutacion.indexOf` por paso: O(n²) | Permutación inversa: O(n) |
| Dominio por concepto | Potencia `d^(n-1-i)` por respuesta, más copias y `reverse` | Recurrencia `S ← S·d + x` en una pasada, sin potencias |
| Detección de lenguaje | Ordenar todos los puntajes para quedarse con el mayor | `maxPor`: O(n) |
| Duplicados (glosario, repaso, preguntas) | `Set` armado a mano en cada sitio | `unicosPor`, `agruparPor`, `contarPor` (Map/Set, O(n)), con pruebas |
| Rangos del LLM | Dos copias de la misma regla (quiz y validación) | `recortarRango()` única |
| Reglas Mermaid | Tres mapas y un ternario anidado | Una tabla `REGLAS` por tipo de diagrama |

## Vuelta 4: componentes React

**`pedirJson()`** (`lib/client/api.ts`)
- Es el único punto donde la interfaz llama a `/api`.
- Devuelve una unión discriminada `{ ok: true, datos } | { ok: false, error }` y nunca lanza.
- Reemplaza el manejo de errores repetido en 10 llamadas a `fetch` (perfil, registro, chat, diagramas, compartir, regenerar, eliminar, quiz y Gist).
- _fix_: borrar el chat o eliminar un análisis sin conexión ya no deja una promesa rechazada sin manejar.
- _fix_: si la cuenta se crea pero falla el inicio de sesión automático, la persona va a `/login` con un aviso. Antes se le decía que la cuenta no se había creado.

**Hooks con el estado; componentes solo con la presentación**
- `useQuiz`, con un `Calificador` discriminado: `servidor | local | ninguno`.
- `useAnalisis`: `useReducer` sobre un reducer puro, `aplicarEvento()`, y `desenlace()` para decidir qué hacer al terminar.
- `useFuenteCodigo`: editor, archivo y Gist.
- `useEditorSincronizado`: la sincronización Monaco ↔ panel, en ambos sentidos.

**Lógica pura en `lib/`, con pruebas**
- `quiz-cliente.ts`, `progreso-analisis.ts` y `visor.ts`.
- El índice línea → bloque pasa a ser un `Int32Array` denso. Se consulta en cada movimiento del mouse, con acceso O(1) y sin hashing.

**Subcomponentes**
- `PreguntaQuiz`, `ResumenQuiz`, `IntentosAnteriores`.
- `FuenteArchivo`, `FuenteGist`, `AjustesAnalisis`.
- `ExplicacionesPanel`, `ResumenCard`.

## Vuelta 5: tipado, constantes y código muerto

**Compilador más estricto**
- Se activaron `noUnusedLocals`, `noUnusedParameters` y `noFallthroughCasesInSwitch`. El código ya los cumple.

**Código muerto eliminado**
- `isLanguageId`, `EstadoAnalisisUI`, `DiagramasEstructurales` y `DEMO_ANALISIS`.
- Se dejaron privadas las funciones que solo se usaban dentro de su archivo.

**Menos casts (`as`)**
- `registroPorClave()` concentra el único cast que hace falta para construir un registro completo.
- `lenguajeElegido()` valida el valor del `<select>`.
- Se quitó un cast innecesario del tipo de pregunta.

**Constantes únicas**
- `LOCALE`, con formateadores compartidos y reutilizados: `formatearNumero` y `formatearFechaCorta`.
- `PUNTOS_EVOLUCION`, `MAX_LINEAS_DIAGRAMA`, `CONCURRENCIA_BLOQUES` y otras.

**Correcciones (_fix_)**
- Dos registros simultáneos con el mismo correo chocaban con la restricción única (P2002) y devolvían 500. Ahora responden 409, «ya existe una cuenta».
- El hash de relleno de bcrypt (costo 12, cientos de ms) se calculaba al importar el módulo y frenaba cada arranque en frío. Ahora se calcula la primera vez que se necesita.

---

## Patrones usados, en resumen

| Patrón | Dónde |
|---|---|
| Decorator | `conUsuario` (rutas), `ProveedorConRespaldo` (LLM) |
| Template Method | `GeneradorBase`, `ProveedorHttp` |
| Strategy | Registro de etapas en `AnalisisService` |
| Repository | `analisisRepo` |
| Factory | `crearProveedorDesdeEntorno` |
| Proxy (inicialización perezosa) | Cliente de Prisma en `lib/db.ts` |
| Reducer / máquina de estados | `aplicarEvento` y `desenlace` del progreso del análisis |
| Observer | Sincronización editor ↔ panel (listeners de Monaco) |
| Unión discriminada (Result) | `pedirJson`, `conCupo`, `Calificador`, `Desenlace` |

# Handoff de interfaz: paleta, tipografía y movimiento

Referencia visual: [twain.ai](https://www.twain.ai/), revisada el 19 de octubre de 2026. Los valores se tomaron de sus estilos con las herramientas del navegador (variables CSS, estilos calculados y `@keyframes`) y se adaptaron a los tokens de VibeDecoder.

La regla fue copiar la **paleta y el movimiento** sin agregar piezas que no tengan función en VibeDecoder. Por eso no se trasladaron sus logos de clientes, testimonios, métricas, el visual 3D del hero ni el aviso de cookies.

## Resumen

| Aspecto | Antes | Ahora |
|---|---|---|
| Tema por defecto | Oscuro, violeta y cian | **Claro**: fondo casi blanco, texto grafito, títulos azul marino y un solo azul para las acciones. El oscuro sigue disponible y se recuerda por persona. |
| Tipografía | Fuentes del sistema | **Inter** para el texto y **Source Serif 4** para los títulos, en peso normal. Twain usa Graphik y Produkt, que son comerciales; se eligieron equivalentes libres (OFL) autoalojados con `@fontsource`. |
| Botones | Planos | Azul con sombras en capas; hover más oscuro y con más sombra. Variante oscura (`contrast`) para la barra de navegación. |
| Movimiento | Ninguno, salvo el spinner | Entrada del hero por líneas, palabra que cambia, aparición al hacer scroll, fundido entre pestañas, paneles que bajan, mensajes que suben y esqueletos con brillo. |

## Tokens de diseño

Están definidos en `app/globals.css` (formato HSL de shadcn) y expuestos en `tailwind.config.ts`.

### Color, modo claro

| Token | Valor | Origen en twain.ai | Uso |
|---|---|---|---|
| `--background` | `0 0% 99%` (#FCFCFC) | fondo de secciones | Fondo de página |
| `--foreground` | `223 14% 10%` (#16181D) | `--color-text` | Texto |
| `--heading` | `205 74% 9%` (#061A28) | color de los `h1` | Títulos (`.vd-title`) |
| `--primary` | `220 68% 48%` (#275FCE) | `--btn-primary-color-bg-base` | Botón principal, enlaces y resaltados |
| `--primary-hover` | `219 70% 37%` | `…-bg-hover` | Hover del botón principal |
| `--primary-active` | `215 70% 26%` | `…-bg-active` | Botón presionado |
| `--contrast` | `200 10% 19%` | `--btn-secondary-color-bg` | Botón oscuro de la navegación |
| `--muted-foreground` | `205 7% 34%` | gris de texto secundario | Descripciones |
| `--secondary` / `--muted` | `180 3% 95%` | fondos neutros | Tabs, chips y código en línea |
| `--accent` | `215 70% 26%` | azul marino de énfasis | Código en línea |
| `--destructive` | `354 62% 47%` | rojo de advertencias | Errores y borrar |
| `--success` | `119 33% 26%` | verde de las métricas | Estados correctos |
| `--border` / `--input` | `210 10% 90%` / `210 9% 86%` | — | Bordes casi invisibles; el relieve lo dan las sombras |
| `--radius` | `0.75rem` (12 px) | radio más usado en tarjetas | Tarjetas; los botones usan `md` = 9 px, igual que `--btn-border-radius` |

### Color, modo oscuro

El fondo es `223 14% 10%` (#16181D, el de `html.twain-theme-dark`), el texto `180 8% 97%` y las tarjetas `220 12% 13%`. El primario se mantiene (`220 68% 48%`) y su hover es `223 63% 59%`, igual que en `.twain-theme-dark`. El código en línea pasa a `223 63% 72%` para tener contraste.

### Sombras

| Token | Uso |
|---|---|
| `shadow-btn` / `shadow-btn-hover` | Botón principal: varias sombras suaves y un borde interior (inset) que da relieve sin bordes duros. Son las capas de `--btn-primary-shadow-*`, reducidas. |
| `shadow-contrast` | Botón oscuro |
| `shadow-card` | Tarjetas: anillo de 1 px al 4 % más una sombra difusa |

### Tipografía

| Token | Valor | Uso |
|---|---|---|
| `font-sans` | Inter Variable → pila del sistema | Todo el texto. `letter-spacing: -0.01em` en `body`, igual que `--letter-spacing-base`. |
| `font-display` | "Source Serif 4 Variable" → Georgia | Títulos con `.vd-title`: peso 400, tracking −0.02em, color `--heading` |
| Título del hero | 48 → 60 → 84 px (`text-5xl` / `sm:text-6xl` / `lg:text-[5.25rem]`), `leading-[0.95]` | En la referencia el `h1` mide 84 px con `line-height` 0.88 |
| Títulos de sección | 30 → 48 px | En la referencia, 60 px |

El nombre de la serif va entre comillas en `tailwind.config.ts`. Sin comillas, el "4" invalida la declaración CSS y el navegador cae a la fuente heredada.

## Componentes

| Componente | Variante | Notas |
|---|---|---|
| `Button` | `default` | `bg-primary`, `shadow-btn`. Hover: `bg-primary-hover` y `shadow-btn-hover`. Active: `bg-primary-active` sin sombra y escala 0,97 con rebote (clase `.vd-btn`, común a todas las variantes). |
| `Button` | `contrast` (nueva) | Grafito con texto claro. Se usa para «Crear cuenta» y «Nuevo análisis» en la barra, como el «Sign up» de la referencia. |
| `Button` | `outline` | Fondo de tarjeta y borde `input`. Hover: `bg-secondary`. |
| `Card` | — | `border-border/70`, `shadow-card`, radio de 12 px |
| `Skeleton` | — | `.vd-skeleton`: un brillo recorre la barra en 1,4 s, en lugar del parpadeo de `animate-pulse` |
| `PalabraCambiante` | — | `components/motion/palabra-cambiante.tsx` (ver Movimiento) |
| `ObservadorRevelar` | — | `components/motion/observador-revelar.tsx`, montado una vez en el layout |

## Movimiento

Las curvas son de salida suave: `--ease-out-expo` = `cubic-bezier(0.16, 1, 0.3, 1)` y `--ease-out-soft` = `cubic-bezier(0.22, 0.61, 0.36, 1)`; la presión de los botones usa `--ease-spring`. Ninguna animación dura más de un segundo.

| Elemento | Disparador | Animación | Duración | Curva |
|---|---|---|---|---|
| Hero: insignia, las dos líneas del título, subtítulo y CTA | Carga de la página | Sube 32 px y aparece (`.vd-enter`), escalonado cada 75 ms | 800 ms | out-expo |
| Avión de papel y palabra «copiar / pegar» del título | Cada 3,2 s | Un avión de papel entra por arriba a la izquierda, baja y cruza la palabra siguiendo una curva de Bézier (`lib/vuelo.ts`); apunta según la tangente y se inclina (alabeo) al girar. A su paso, una máscara borra la palabra vieja y descubre la nueva, que se aclara desde 4 px de desenfoque | 1800 ms | seno (frena al cruzar la palabra) |
| Títulos, tarjetas de «Cómo funciona», funciones, demo y CTA final | Al entrar en pantalla | Sube 14 px y aparece (`[data-revelar]`), escalonado cada 70 ms dentro de cada grupo | 600 ms opacidad / 800 ms posición | out-soft / out-expo |
| Paneles del visor (código, diagramas, glosario, auditoría, quiz) | Cambio de pestaña | Fundido (`.vd-fade`) | 200 ms | ease-out |
| Panel «Compartir» | Al abrirse | Baja 6 px y aparece (`.vd-drop`) | 180 ms | out-soft |
| Mensajes del chat y resultado del quiz | Al aparecer | Suben 6 px y aparecen (`.vd-pop`) | 240 ms | out-soft |
| Esqueletos de carga | Mientras cargan | Brillo de izquierda a derecha | 1,4 s en bucle | ease-in-out |
| Hallazgos de la auditoría y conceptos del glosario | Al abrir la pestaña | Suben 24 px y aparecen (`.vd-card-enter`), escalonados cada 60 / 50 ms | 500 ms | out-expo |
| Etapas del análisis en curso | Al completarse cada etapa | La marca verde «cae» desde 1,8× (`.vd-check-in`); si la etapa falla, el ícono se sacude | 150 ms | ease-in-out |
| Botón de enviar del chat (ícono de avión de papel) | Al enviar | El avión sale volando hacia arriba a la derecha y entra uno nuevo desde abajo (`.vd-send-fly`); luego aparece el spinner | 700 ms | out-expo |
| Respuesta nueva del chat | Al llegar | Sus párrafos, listas y bloques de código aparecen uno tras otro (`.vd-partes`), cada 90 ms | 350 ms | out-soft |
| Ícono «Copiado» (enlace público y código Mermaid) | Al copiar | Latido 1 → 1,25 → 1 (`.vd-pulse`) | 300 ms | ease-out |
| Avisos de error del login, el registro y el formulario de análisis | Al aparecer | Sacudida vertical de ±6 px (`.vd-shake`) | 300 ms | ease-out |
| Desplegables (`<details>`: código Mermaid, tabla del progreso) | Al abrirse | El contenido baja 6 px y aparece | 150 ms | ease-out |
| Botones y enlaces | Hover | Color, fondo y sombra | 150 ms | ease-out |
| Botones | Presión (`:active`) | Se encogen al 97 % y vuelven con un rebote leve (`.vd-btn`) | 300 ms | `--ease-spring` = `cubic-bezier(0.34, 1.35, 0.64, 1)`, la misma curva de la referencia |

Equivalencias con la referencia: `vd-slide-up-fade` es `anim-slide-up-and-fade(-20/-32)`, `vd-slide-down-fade` es `anim-slide-down-and-fade`, `vd-fade-in` es `anim-fade-in` y `vd-shimmer` es `anim-placeholder-animation`. La palabra que cambia con el avión reproduce el `morphing-word` + `paper-plane` del hero de la referencia. Las demás: `vd-card-enter` = `anim-warnings-card-enter`, `vd-check-in` = `anim-checkbox-check-in`, `vd-pulse` = `anim-icon-pulse`, `vd-shake` = `anim-vertical-shake` (a ±6 px en vez de ±8), `vd-partes` = `animated-text__part.__fade-in` y el desplegable = `anim-collapsible-open`.

En la referencia el avión es un modelo 3D (Three.js) y las letras se funden con un filtro SVG de umbral (`feColorMatrix`). Aquí el avión es un SVG propio de tres pliegues en los tonos del azul primario, y el cambio de palabra usa máscaras CSS con borde suave: el filtro de umbral se probó, pero con una serif de trazo fino rompía las letras.

## Estados y casos límite

- **Sin JavaScript:** la clase `vd-js` la agrega el script del `<head>`; sin ella, `[data-revelar]` no oculta nada y todo se ve.
- **«Reducir movimiento» activado:** las animaciones duran 0,01 ms, las secciones aparecen visibles y la palabra no cambia.
- **Contenido cargado después** (en el cliente): `ObservadorRevelar` vigila con `MutationObserver` los `[data-revelar]` nuevos, para que ninguno quede oculto.
- **Bloques altos** (la demo): basta con que asome un píxel para que aparezcan, así no queda un hueco bajo el hero.
- **Palabras de distinto largo:** todas las capas ocupan el ancho de la más larga («copiar»), así las máscaras coinciden y el título no salta al cambiar.
- **Vuelo fuera de la palabra:** el avión sale de los límites de la palabra; el hero recorta en horizontal (`overflow-x: clip`) para que nunca aparezca scroll lateral (probado a 390 px).
- **Respuestas antiguas del chat:** solo se animan las que llegan en la sesión; las que ya estaban al abrir el chat aparecen sin animación.
- **Impresión y PDF:** la vista para imprimir fuerza el modo claro y oculta la navegación (sin cambios).

## Comportamiento responsive

| Ancho | Cambios |
|---|---|
| Escritorio (≥ 1024 px) | Título del hero a 84 px; funciones en 3 columnas |
| Tableta (640–1023 px) | Título a 60 px; funciones en 2 columnas |
| Móvil (< 640 px) | Título a 48 px; una columna; botones del hero apilados. Probado sin scroll horizontal a 390 px. |

## Accesibilidad

- La palabra que cambia tiene un texto fijo para lectores de pantalla («copiar»); las capas animadas y el avión van con `aria-hidden`.
- Con «reducir movimiento» el avión no se muestra y la palabra no cambia; el resto de animaciones dura 0,01 ms.
- Contraste en modo claro: el texto #16181D sobre #FCFCFC supera 15:1; el azul primario #275FCE con texto blanco es aproximadamente 5:1 (AA para texto normal).
- El foco visible usa `--ring`, que es el azul primario.
- No hay animaciones en bucle salvo la palabra del título, que se detiene con «reducir movimiento», y los esqueletos de carga.

## Archivos

`app/globals.css` (tokens, keyframes y utilidades), `lib/vuelo.ts` (trayectoria del avión), `components/motion/avion-papel.tsx`, `tailwind.config.ts`, `app/layout.tsx` (fuentes, tema por defecto y observador), `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/misc.tsx`, `components/motion/*`, `lib/movimiento.ts`, `app/page.tsx` y `components/mermaid-diagram.tsx` (tema de los diagramas).

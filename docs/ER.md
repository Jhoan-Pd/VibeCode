# Diagrama entidad-relación

Las 12 tablas del esquema (`prisma/schema.prisma`). Todas las relaciones hijas usan `ON DELETE CASCADE`: al borrar un análisis se borran sus explicaciones, diagramas, hallazgos, quizzes y chat.

```mermaid
erDiagram
    USUARIOS ||--o{ ANALISIS : "crea"
    USUARIOS ||--o{ INTENTOS_QUIZ : "realiza"
    USUARIOS ||--o{ MENSAJES_CHAT : "escribe"
    USUARIOS ||--o{ USO_DIARIO : "consume"
    ANALISIS ||--o{ EXPLICACIONES_LINEA : "se explica en"
    ANALISIS ||--o{ CONCEPTOS : "usa"
    ANALISIS ||--o{ DIAGRAMAS : "se dibuja en"
    ANALISIS ||--o{ HALLAZGOS_AUDITORIA : "recibe"
    ANALISIS ||--o{ QUIZZES : "genera"
    ANALISIS ||--o{ MENSAJES_CHAT : "se conversa en"
    QUIZZES ||--o{ PREGUNTAS : "incluye"
    QUIZZES ||--o{ INTENTOS_QUIZ : "recibe"
    INTENTOS_QUIZ ||--o{ RESPUESTAS_USUARIO : "registra"
    PREGUNTAS ||--o{ RESPUESTAS_USUARIO : "se responde en"

    USUARIOS {
        string id PK
        string nombre
        string email UK
        string passwordHash "null si entra solo con GitHub"
        string githubId UK
        string imagen
        enum nivel "PRINCIPIANTE, INTERMEDIO, AVANZADO"
        datetime creadoEn
    }
    ANALISIS {
        string id PK
        string usuarioId FK
        string titulo
        text codigo
        string lenguaje
        string hash "SHA-256 codigo + nivel (cache)"
        enum nivel
        enum estado "PENDIENTE, PROCESANDO, COMPLETO, ERROR"
        json resumen "proposito, entradas, salidas, dependencias"
        string errorMensaje
        string modelo
        string versionPrompts
        string origenCacheId "analisis copiado desde la cache"
        string tokenPublico UK "enlace publico de solo lectura"
        datetime creadoEn
        datetime actualizadoEn
    }
    EXPLICACIONES_LINEA {
        string id PK
        string analisisId FK
        int orden
        int lineaInicio
        int lineaFin
        string titulo
        text explicacion
    }
    CONCEPTOS {
        string id PK
        string analisisId FK
        string nombre
        text explicacion
        int lineaInicio
        int lineaFin
    }
    DIAGRAMAS {
        string id PK
        string analisisId FK
        enum tipo "FLUJO, CLASES, SECUENCIA"
        string titulo
        text codigoMermaid
        datetime creadoEn
    }
    HALLAZGOS_AUDITORIA {
        string id PK
        string analisisId FK
        enum tipo "SEGURIDAD, MALA_PRACTICA, CODIGO_MUERTO, MANEJO_ERRORES, ALUCINACION"
        enum severidad "BAJA, MEDIA, ALTA, CRITICA"
        string titulo
        text descripcion
        text sugerencia
        int lineaInicio
        int lineaFin
    }
    QUIZZES {
        string id PK
        string analisisId FK
        datetime creadoEn
    }
    PREGUNTAS {
        string id PK
        string quizId FK
        int orden
        enum tipo "OPCION_MULTIPLE, QUE_IMPRIME, VERDADERO_FALSO, QUE_PASA_SI, ORDENAR"
        text enunciado
        json opciones
        json respuestaCorrecta
        text explicacion
        int lineaInicio
        int lineaFin
        string concepto
    }
    INTENTOS_QUIZ {
        string id PK
        string quizId FK
        string usuarioId FK
        int aciertos
        int total
        float porcentaje
        string nivelComprension
        datetime creadoEn
    }
    RESPUESTAS_USUARIO {
        string id PK
        string intentoId FK
        string preguntaId FK
        json respuesta
        boolean correcta
    }
    MENSAJES_CHAT {
        string id PK
        string analisisId FK
        string usuarioId FK
        enum rol "USUARIO, ASISTENTE"
        text contenido
        int lineaInicio
        int lineaFin
        datetime creadoEn
    }
    USO_DIARIO {
        string id PK
        string usuarioId FK
        date fecha
        int cantidad "analisis nuevos del dia"
        int consultasIA "regeneraciones, quizzes nuevos y chat"
    }
```

Restricciones únicas relevantes: `usuarios.email`, `usuarios.githubId`, `diagramas(analisisId, tipo)`, `respuestas_usuario(intentoId, preguntaId)` y `uso_diario(usuarioId, fecha)` (una fila por usuario y día para el límite diario de la Fase 2).

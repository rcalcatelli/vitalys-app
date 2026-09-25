# Diagramas del Sistema — Vitalys App

> **2.ª Entrega — Trabajo Final Integrador**  
> Tecnicatura Universitaria en Programación · UTN · 2026  
> Integrantes: Renzo Calcatelli · Pablo Basualdo Arcati · Tutora: Sofía Raia

---

## 1. Diagrama de Casos de Uso

```mermaid
graph TD
    subgraph Actores
        SP([SOCIO_PACIENTE])
        PR([PROFESIONAL])
        AD([ADMIN])
    end

    subgraph Auth
        UC01[Registrarse]
        UC02[Iniciar sesión]
        UC03[Cerrar sesión]
    end

    subgraph Personas
        UC04[Gestionar perfil propio]
        UC05[ABM de personas]
    end

    subgraph Profesionales
        UC06[Listar profesionales]
        UC07[ABM de profesionales]
        UC08[Gestionar disponibilidad propia]
        UC09[Gestionar disponibilidad de cualquier profesional]
    end

    subgraph Turnos
        UC10[Consultar slots disponibles]
        UC11[Reservar turno de consultorio]
        UC12[Reservar turno de gym]
        UC13[Cancelar turno propio]
        UC14[Cancelar cualquier turno]
        UC15[Ver agenda propia]
        UC16[Ver mis turnos]
        UC17[Marcar completado / ausencia]
    end

    subgraph Pagos
        UC18[Ver estado de cuenta propio]
        UC19[Ver estado de cuenta de cualquier persona]
        UC20[Registrar pago]
    end

    subgraph Morosidad
        UC21[Registrar excepción de morosidad]
    end

    subgraph Notificaciones
        UC22[Ver historial de notificaciones]
    end

    SP --> UC01
    SP --> UC02
    SP --> UC03
    SP --> UC04
    SP --> UC10
    SP --> UC11
    SP --> UC12
    SP --> UC13
    SP --> UC16
    SP --> UC18

    PR --> UC02
    PR --> UC03
    PR --> UC06
    PR --> UC08
    PR --> UC10
    PR --> UC15
    PR --> UC17

    AD --> UC02
    AD --> UC03
    AD --> UC05
    AD --> UC07
    AD --> UC09
    AD --> UC10
    AD --> UC11
    AD --> UC12
    AD --> UC14
    AD --> UC19
    AD --> UC20
    AD --> UC21
    AD --> UC22
```

---

## 2. Diagrama de Estados del Turno

```mermaid
stateDiagram-v2
    [*] --> RESERVADO : Reserva exitosa\n(persona / admin)

    RESERVADO --> COMPLETADO : Atención finalizada\n(profesional / admin)

    RESERVADO --> AUSENTE : Paciente no se presentó\n(profesional / admin)

    RESERVADO --> CANCELADO_EN_TIEMPO : Cancelación con ≥ 24 h\n(persona / admin)\nEl slot queda libre

    RESERVADO --> CANCELADO_TARDE : Cancelación con < 24 h\n(persona / admin)\nEl slot permanece bloqueado

    COMPLETADO --> [*]
    AUSENTE --> [*]
    CANCELADO_EN_TIEMPO --> [*]
    CANCELADO_TARDE --> [*]

    note right of RESERVADO
        Estado inicial.
        El horario está bloqueado.
    end note

    note right of CANCELADO_TARDE
        El horario sigue bloqueado.
        Se incluye en el EXCLUDE constraint.
    end note
```

---

## 3. Diagrama de Secuencia — Reservar un turno

```mermaid
sequenceDiagram
    actor U as Usuario (Socio / Admin)
    participant API as TurnoController
    participant TS as TurnoService
    participant PS as PagoService
    participant DB as Base de datos

    U->>API: POST /api/turnos {persona_id, profesional_id, inicio, tipo_turno}

    API->>TS: reservarTurno(request, usuarioActual)

    alt tipo_turno = GYM y es_socio_gym = true
        TS->>PS: calcularMorosidad(persona_id)
        PS->>DB: SELECT MAX(periodo) FROM pagos WHERE persona_id=? AND concepto='CUOTA_MENSUAL'
        DB-->>PS: ultimo_periodo
        PS-->>TS: diasMora (int)
        alt diasMora > 10
            TS-->>API: MorosidadException
            API-->>U: 422 "Cuota vencida hace X días. No puede reservar turno de gym."
        end
    end

    TS->>DB: SELECT disponibilidad activa del profesional para ese día/hora
    DB-->>TS: franja horaria

    alt horario fuera de disponibilidad
        TS-->>API: DisponibilidadException
        API-->>U: 422 "Horario fuera de la disponibilidad del profesional"
    end

    TS->>DB: INSERT INTO turnos (estado=RESERVADO, reservado_por_usuario_id=...)
    Note over TS,DB: El EXCLUDE GIST rechaza si hay solapamiento
    alt solapamiento detectado por EXCLUDE
        DB-->>TS: PSQLException (constraint violation)
        TS-->>API: SolapamientoException
        API-->>U: 409 "El horario ya no está disponible"
    end

    DB-->>TS: turno creado (id)
    TS->>TS: enviar email CONFIRMACION_TURNO (asíncrono)
    TS-->>API: TurnoDTO
    API-->>U: 201 Created {turnoId, inicio, fin, estado}
```

---

## 4. Diagrama de Secuencia — Cancelar un turno

```mermaid
sequenceDiagram
    actor U as Usuario (Socio / Admin)
    participant API as TurnoController
    participant TS as TurnoService
    participant DB as Base de datos

    U->>API: PATCH /api/turnos/{id}/cancelar {motivo}

    API->>TS: cancelarTurno(id, motivo, usuarioActual)

    TS->>DB: SELECT turno WHERE id=?
    DB-->>TS: turno (estado, persona_id, inicio)

    alt turno no en estado RESERVADO
        TS-->>API: EstadoInvalidoException
        API-->>U: 422 "Solo se pueden cancelar turnos en estado RESERVADO"
    end

    alt usuarioActual es SOCIO_PACIENTE y turno.persona_id ≠ usuarioActual.persona_id
        TS-->>API: AccesoDenegadoException
        API-->>U: 403 "Solo podés cancelar tus propios turnos"
    end

    TS->>TS: calcularAnticipacion(turno.inicio, NOW())

    alt anticipacion >= 24h
        TS->>DB: UPDATE turnos SET estado=CANCELADO_EN_TIEMPO,\ncancelado_en=NOW(), cancelado_por_usuario_id=?, motivo=?
        DB-->>TS: ok
        TS->>TS: enviar email AVISO_CANCELACION (asíncrono)
        TS-->>API: TurnoDTO {estado: CANCELADO_EN_TIEMPO}
        API-->>U: 200 OK "Turno cancelado en tiempo. Slot liberado."
    else anticipacion < 24h
        TS->>DB: UPDATE turnos SET estado=CANCELADO_TARDE,\ncancelado_en=NOW(), cancelado_por_usuario_id=?, motivo=?
        DB-->>TS: ok
        TS->>TS: enviar email AVISO_CANCELACION (asíncrono)
        TS-->>API: TurnoDTO {estado: CANCELADO_TARDE}
        API-->>U: 200 OK "Cancelación tardía. El horario no se libera."
    end
```

---

## 5. Diagrama de Clases del Dominio

```mermaid
classDiagram
    class Usuario {
        +Long id
        +String email
        +String passwordHash
        +RolUsuario rol
        +Boolean activo
    }

    class Persona {
        +Long id
        +String nombre
        +String apellido
        +String dni
        +String telefono
        +LocalDate fechaNacimiento
        +EstadoPersona estado
        +Boolean esSocioGym
        +LocalDate fechaAlta
        +LocalDate fechaBaja
        +estaActiva() Boolean
        +tieneCuotaAlDia() Boolean
    }

    class Profesional {
        +Long id
        +String nombre
        +String apellido
        +Especialidad especialidad
        +Integer duracionTurnoMinutos
        +Boolean activo
        +getSlotsDisponibles(LocalDate) List~LocalDateTime~
    }

    class DisponibilidadProfesional {
        +Long id
        +DayOfWeek diaSemana
        +LocalTime horaInicio
        +LocalTime horaFin
        +Boolean activo
        +contieneHorario(LocalTime) Boolean
    }

    class Turno {
        +Long id
        +TipoTurno tipoTurno
        +ZonedDateTime inicio
        +ZonedDateTime fin
        +EstadoTurno estado
        +ZonedDateTime canceladoEn
        +String motivoCancelacion
        +cancelarEnTiempo(String motivo, Usuario actor)
        +cancelarTarde(String motivo, Usuario actor)
        +completar()
        +marcarAusencia()
    }

    class ExcepcionMorosidad {
        +Long id
        +String motivo
        +LocalDate validaHasta
        +Boolean estaVigente() 
    }

    class Pago {
        +Long id
        +ConceptoPago concepto
        +BigDecimal monto
        +LocalDate periodo
        +ZonedDateTime fechaPago
        +esCuotaMensual() Boolean
        +esSesion() Boolean
    }

    class Notificacion {
        +Long id
        +TipoNotificacion tipo
        +String emailDestino
        +ZonedDateTime enviadoEn
        +Boolean exitoso
        +String detalleError
    }

    Usuario "1" --> "0..1" Persona : identidad
    Usuario "1" --> "0..1" Profesional : identidad
    Persona "1" --> "*" Turno : reserva
    Profesional "1" --> "*" Turno : atiende
    Profesional "1" --> "*" DisponibilidadProfesional : disponibilidad
    Turno "1" --> "0..1" Pago : sesion
    Persona "1" --> "*" Pago : historial
    Persona "1" --> "*" Notificacion : recibe
    Turno "1" --> "*" Notificacion : genera
    Persona "1" --> "*" ExcepcionMorosidad : excepciones
    Usuario "1" --> "*" ExcepcionMorosidad : autoriza
```

---

## 6. Diagrama de Arquitectura y Despliegue

```mermaid
graph TB
    subgraph Internet
        NAV[🌐 Navegador del usuario]
    end

    subgraph Vercel["☁️ Vercel (Frontend)"]
        REACT["React + TypeScript\n/api/... → Render"]
    end

    subgraph Render["☁️ Render (Backend)"]
        SB["Spring Boot (Java 17)\nREST API :8080\nJWT Auth · Spring Security\nSpring Data JPA"]
        NOTIF["Servicio de notificaciones\n(tarea programada @Scheduled)"]
    end

    subgraph Supabase["☁️ Supabase (Base de datos)"]
        PG["PostgreSQL 16\nConexión: pooling\nbackups automáticos"]
    end

    subgraph Email["✉️ Proveedor SMTP"]
        SMTP["Resend / SendGrid\n(tier gratuito)"]
    end

    NAV -->|HTTPS| REACT
    REACT -->|HTTPS REST JSON\nAuthorization: Bearer JWT| SB
    SB -->|JDBC / connection pool\nSSL| PG
    NOTIF -->|SMTP| SMTP
    SMTP -->|email| NAV
    SB --> NOTIF
```

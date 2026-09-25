# 🏥 Vitalys App

Aplicación web para la gestión integral de un centro de salud híbrido que combina **gimnasio** y **consultorios profesionales** (Nutrición, Psicología y Kinesiología). Centraliza en una única plataforma la identidad de socios y pacientes, la agenda de turnos, el registro de pagos y las notificaciones.

> 🎓 **Trabajo Final Integrador** — Tecnicatura Universitaria en Programación (UTN)

---

## 👥 Integrantes

| Nombre                | Legajo   | GitHub                                                 |
| --------------------- | -------- | ------------------------------------------------------ |
| Renzo Calcatelli      | _100960_ | [@rcalcatelli](https://github.com/rcalcatelli)         |
| Pablo Basualdo Arcati | _100153_ | [@pbasualdoarcati](https://github.com/pbasualdoarcati) |

**Tutora:** Sofía Raia

---

## 🎯 Problema y alcance

Los centros de salud híbridos gestionan socios de gimnasio y pacientes de consultorios con sistemas separados (o planillas), lo que genera datos duplicados, superposición de turnos y cobros difíciles de rastrear. **Vitalys** unifica esa gestión en una sola aplicación web responsive.

### Módulos (MVP)

1. 🔐 **Autenticación y roles** — socio/paciente, profesional y administración
2. 👤 **Gestión de personas** — alta, baja lógica, modificación y consulta (identidad unificada socio/paciente)
3. 🩺 **Gestión de profesionales** — ABM y disponibilidad horaria por especialidad
4. 📅 **Agenda de turnos** — reserva y cancelación con reglas de negocio (24 h, deuda gym)
5. 💳 **Registro de pagos** — cuotas de gimnasio y sesiones de consultorio
6. 📧 **Notificaciones** — confirmaciones y recordatorios por email

### Fuera de alcance (versión futura)

- Ficha clínica digital
- Reserva de clases grupales con cupos
- Pasarela de pagos online
- Publicación en tiendas móviles (App Store / Play Store)

---

## 🛠️ Stack tecnológico

| Capa          | Tecnología                              |
| ------------- | --------------------------------------- |
| Backend       | Java 17 · Spring Boot · Spring Data JPA |
| Frontend      | React · TypeScript                      |
| Base de datos | PostgreSQL (Supabase)                   |
| Despliegue    | Vercel (frontend) · Render (backend)    |
| Versionado    | Git · GitHub                            |

---

## 📁 Estructura del repositorio

```
vitalys-app/
├── backend/          → API REST (Spring Boot)
├── frontend/         → Cliente web (React + TypeScript)
├── db/
│   ├── ddl/
│   │   └── vitalys_ddl.sql   → Script de creación del esquema PostgreSQL
│   └── dml/          → Datos de prueba (próximamente)
└── docs/
    ├── 01-propuesta/
    │   └── propuesta-proyecto-rfc.md   → Propuesta de proyecto (1.ª entrega)
    ├── 02-diseno/
    │   ├── diagrama-er.mermaid         → Diagrama entidad-relación (2.ª entrega)
    │   └── modulos.md                  → Listado de módulos y endpoints (2.ª entrega)
    └── metodologia/  → Planificación Scrum, riesgos y pruebas
```

---

## 🗄️ Base de datos

El esquema usa **PostgreSQL** con las siguientes tablas principales:

| Tabla                        | Descripción                                           |
| ---------------------------- | ----------------------------------------------------- |
| `usuarios`                   | Credenciales y rol de acceso al sistema               |
| `personas`                   | Identidad única socio/paciente (soft-delete)          |
| `profesionales`              | Profesionales con especialidad y duración de turno    |
| `disponibilidad_profesional` | Franjas horarias semanales por profesional            |
| `turnos`                     | Reservas con ciclo de vida y auditoría de cancelación |
| `pagos`                      | Cuotas de gym y sesiones de consultorio               |
| `notificaciones`             | Log de emails enviados                                |

Ver script completo: [`db/ddl/vitalys_ddl.sql`](db/ddl/vitalys_ddl.sql)  
Ver diagrama ER: [`docs/02-diseno/diagrama-er.mermaid`](docs/02-diseno/diagrama-er.mermaid)

---

## 🚀 Instalación y ejecución

> ⚙️ _Se completará al iniciar el desarrollo._

```bash
# Backend
cd backend
./mvnw spring-boot:run

# Frontend
cd frontend
npm install
npm run dev
```

---

## 🌐 Despliegue

| Servicio | URL         | Estado |
| -------- | ----------- | ------ |
| Frontend | _pendiente_ | 🔜     |
| Backend  | _pendiente_ | 🔜     |

---

## 📅 Hoja de ruta

- [x] Conformación del equipo y elección de tutora
- [x] **1.ª entrega** — Propuesta y repositorio (30/08)
- [x] **2.ª entrega** — Esquema de BD y módulos (27/09)
- [ ] **Entrega final** — Informe, video y despliegue (14/11)
- [ ] Defensa oral

---

## 📋 Minutas de reuniones

| Fecha      | Participantes         | Tema                                  | Resumen                                                                                                                                                                                                                                               |
| ---------- | --------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 21/09/2026 | Renzo · Pablo · Sofía | Revisión del RFC-002 y diseño de BD   | Tutora aprueba PostgreSQL (Opción A) y el DDL existente. Solicita ajustes: tipos ENUM faltantes, estado AUSENTE, constraint de cancelación, diccionario de datos, requerimientos y diagramas. Correcciones aplicadas en #6 y #7. |

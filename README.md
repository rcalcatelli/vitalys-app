# 🏥 Vitalys App

Aplicación web para la gestión integral de un centro de salud híbrido que combina **gimnasio** y **consultorios profesionales** (Nutrición, Psicología y Kinesiología). Centraliza en una única plataforma la identidad de socios y pacientes, la agenda de turnos, el registro de pagos y las notificaciones.

> 🎓 **Trabajo Final Integrador** — Tecnicatura Universitaria en Programación (UTN)

---

## 👥 Integrantes

| Nombre | Legajo | GitHub |
|---|---|---|
| Renzo Calcatelli | _completar_ | [@usuario](https://github.com/usuario) |
| Pablo Basualdo Arcati | _completar_ | [@usuario](https://github.com/usuario) |

**Tutora:** Sofía Raia

---

## 🎯 Problema y alcance

Los centros de salud híbridos gestionan socios de gimnasio y pacientes de consultorios con sistemas separados (o planillas), lo que genera datos duplicados, superposición de turnos y cobros difíciles de rastrear. **Vitalys** unifica esa gestión en una sola aplicación web responsive.

### Módulos (MVP)

1. 🔐 **Autenticación y roles** — socio/paciente, profesional y administración
2. 👤 **Gestión de socios y pacientes** — alta, baja, modificación y consulta
3. 📅 **Agenda de turnos** — disponibilidad por profesional, reserva y cancelación
4. 💳 **Registro de pagos** — cuotas de gimnasio y sesiones de consultorio
5. 📧 **Notificaciones** — confirmaciones y recordatorios por email

### Fuera de alcance (versión futura)

- Ficha clínica digital
- Publicación en tiendas móviles (App Store / Play Store)

---

## 🛠️ Stack tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Java 17 · Spring Boot · Spring Data JPA |
| Frontend | React · TypeScript |
| Base de datos | PostgreSQL (Supabase) |
| Despliegue | Vercel (frontend) · Render (backend) |
| Versionado | Git · GitHub |

---

## 📁 Estructura del repositorio

```
vitalys-app/
├── backend/     → API REST (Spring Boot)
├── frontend/    → Cliente web (React + TypeScript)
├── db/
│   ├── ddl/     → Scripts de creación de esquema
│   └── dml/     → Datos de prueba
└── docs/
    ├── 01-propuesta/   → Propuesta de proyecto (1.ª entrega)
    ├── 02-diseno/      → Esquema de BD y módulos (2.ª entrega)
    └── metodologia/    → Planificación (Scrum, riesgos, pruebas)
```

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

| Servicio | URL | Estado |
|---|---|---|
| Frontend | _pendiente_ | 🔜 |
| Backend | _pendiente_ | 🔜 |

---

## 📅 Hoja de ruta

- [x] Conformación del equipo y elección de tutora
- [ ] **1.ª entrega** — Propuesta y repositorio (30/08)
- [ ] **2.ª entrega** — Esquema de BD y módulos (27/09)
- [ ] **Entrega final** — Informe, video y despliegue (14/11)
- [ ] Defensa oral

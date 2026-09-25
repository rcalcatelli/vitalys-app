# Matriz de Riesgos — Vitalys App

> **2.ª Entrega — Trabajo Final Integrador**  
> Tecnicatura Universitaria en Programación · UTN · 2026  
> Integrantes: Renzo Calcatelli · Pablo Basualdo Arcati · Tutora: Sofía Raia

---

## Escala de evaluación

| Probabilidad | Valor | Impacto         | Valor |
|--------------|-------|-----------------|-------|
| Baja (raro)  | 1     | Bajo (tolerable)| 1     |
| Media         | 2     | Medio (retraso) | 2     |
| Alta (seguro) | 3     | Alto (crítico)  | 3     |

**Nivel de riesgo = Probabilidad × Impacto**  
🟢 1–2: aceptable · 🟡 3–4: monitorear · 🔴 6–9: mitigar activamente

---

## Registro de riesgos

| ID    | Riesgo                                                                         | Prob. | Imp. | Nivel      | Mitigación                                                                                                                         | Responsable       |
|-------|--------------------------------------------------------------------------------|-------|------|------------|------------------------------------------------------------------------------------------------------------------------------------|-------------------|
| RG-01 | Free tier de Render duerme el backend (~30–50 s de arranque en frío)          | 3     | 1    | 🟡 3       | Precalentar el servicio antes de demos; documentado en README; usar UptimeRobot para ping periódico                               | R. Calcatelli     |
| RG-02 | Proyecto gratuito de Supabase se pausa tras 7 días de inactividad             | 2     | 2    | 🟡 4       | Actividad periódica; reactivar la semana previa a entregas y defensa                                                              | P. Basualdo Arcati |
| RG-03 | Superposición del TFI con parciales y entregas de otras materias              | 3     | 2    | 🔴 6       | Sprints con tareas nice-to-have como buffer; planificar la carga al inicio de cada sprint y eliminar nice-to-have ante el primer día de atraso | Ambos |
| RG-04 | Integración Spring Boot ↔ Supabase (SSL, connection pooling)                  | 1     | 2    | 🟢 2       | Conexión probada en Sprint 1 antes de construir módulos; documentada en application.properties                                    | R. Calcatelli     |
| RG-05 | Bug en validación de solapamiento (EXCLUDE GIST + estados)                    | 1     | 3    | 🟡 3       | Tests de integración específicos para solapamiento; constraint en BD como red de seguridad independiente del código               | R. Calcatelli     |
| RG-06 | Proveedor SMTP gratuito con límite de envíos (Resend: 100/día en free tier)  | 2     | 1    | 🟢 2       | Suficiente para pruebas; documentar límite en README; notificaciones asíncronas no bloquean el flujo                             | R. Calcatelli     |
| RG-07 | Regla de morosidad mal implementada (cálculo de días)                         | 1     | 2    | 🟢 2       | Función aislada `calcularMorosidad` con tests unitarios; casos documentados en RN-01 con ejemplos numéricos                      | P. Basualdo Arcati |
| RG-08 | Sprint 5 (pagos + notificaciones) demasiado cargado                           | 2     | 2    | 🟡 4       | Si Sprint 4 termina tarde, notificaciones (solo recordatorio) se posponen; confirmación y aviso de cancelación son prioritarios   | Ambos             |
| RG-09 | Módulo de autenticación (CORS + JWT) retrasa Sprint 2                         | 1     | 2    | 🟢 2       | Desglose detallado de tareas en Sprint 2; Spring Security config documentada por el equipo en Programación III                   | P. Basualdo Arcati |
| RG-10 | Sin backups automáticos en planes gratuitos                                   | 1     | 2    | 🟢 2       | Scripts DDL + seed.sql en `/db`; cualquier integrante puede recrear la BD en <15 min                                             | Ambos             |
| RG-11 | Cambio de requisitos de la cátedra posterior al inicio del desarrollo         | 1     | 3    | 🟡 3       | Módulos desacoplados facilitan el ajuste; RFC como artefacto de cambio de alcance con aprobación de la tutora                   | Ambos             |
| RG-12 | Un integrante queda impedido de trabajar (enfermedad, examen, urgencia)       | 1     | 3    | 🟡 3       | Ambos tienen visibilidad sobre la totalidad del stack (no hay división hard por capa); revisión de PRs asegura que ninguno sea un single point of failure | Ambos |

---

## Riesgos descartados (y por qué)

| Riesgo descartado                                | Motivo del descarte                                                                                |
|--------------------------------------------------|-----------------------------------------------------------------------------------------------------|
| Cambio de stack tecnológico                      | Cerrado en RFC-002 (aprobado 21/09/2026); ajuste requeriría nueva RFC                              |
| Escala de producción (miles de usuarios)         | La escala esperada es de cientos de personas; planes gratuitos son suficientes con amplio margen   |
| Integración con pasarela de pagos real           | Explícitamente fuera del alcance del MVP (solo registro manual de pagos)                           |
| Brecha de seguridad en producción                | Datos académicos; medidas proporcionales documentadas en RFC-001 (bcrypt, JWT, HTTPS)              |

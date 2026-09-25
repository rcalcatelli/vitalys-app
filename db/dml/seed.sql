-- =============================================================================
-- Vitalys App — DML Datos de Prueba (seed.sql)
-- 2.ª Entrega — Trabajo Final Integrador
-- Tecnicatura Universitaria en Programación · UTN · 2026
-- Autores: Renzo Calcatelli · Pablo Basualdo Arcati
-- =============================================================================
-- Este script asume que el DDL ya fue ejecutado (vitalys_ddl.sql).
-- Orden: usuarios → personas/profesionales → disponibilidad → turnos → pagos → notificaciones
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. USUARIOS
--    Contraseñas hasheadas con bcrypt (costo 10). Texto plano en comentarios
--    para facilitar el desarrollo local. NUNCA usar texto plano en producción.
-- ---------------------------------------------------------------------------

-- Admin
INSERT INTO usuarios (email, password_hash, rol) VALUES
  ('admin@vitalys.com',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lbvy', 'ADMIN');
  -- password: Admin1234!

-- Profesionales
INSERT INTO usuarios (email, password_hash, rol) VALUES
  ('nutricion@vitalys.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lbvy', 'PROFESIONAL'),
  ('psico@vitalys.com',     '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lbvy', 'PROFESIONAL'),
  ('kine@vitalys.com',      '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lbvy', 'PROFESIONAL');

-- Socios / Pacientes
INSERT INTO usuarios (email, password_hash, rol) VALUES
  ('maria.perez@mail.com',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lbvy', 'SOCIO_PACIENTE'),
  ('juan.garcia@mail.com',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lbvy', 'SOCIO_PACIENTE'),
  ('lucia.rojas@mail.com',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lbvy', 'SOCIO_PACIENTE'),
  ('carlos.soto@mail.com',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lbvy', 'SOCIO_PACIENTE'),
  ('ana.fernandez@mail.com',  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lbvy', 'SOCIO_PACIENTE'),
  ('pedro.gomez@mail.com',    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lbvy', 'SOCIO_PACIENTE');
  -- password para todos: Admin1234!

-- ---------------------------------------------------------------------------
-- 2. PROFESIONALES (3 especialidades)
-- ---------------------------------------------------------------------------

INSERT INTO profesionales (usuario_id, nombre, apellido, especialidad, duracion_turno_minutos) VALUES
  ((SELECT id FROM usuarios WHERE email = 'nutricion@vitalys.com'), 'Valentina', 'Méndez',  'NUTRICION',    30),
  ((SELECT id FROM usuarios WHERE email = 'psico@vitalys.com'),     'Rodrigo',   'Almirón', 'PSICOLOGIA',   50),
  ((SELECT id FROM usuarios WHERE email = 'kine@vitalys.com'),      'Florencia', 'Rueda',   'KINESIOLOGIA', 45);

-- ---------------------------------------------------------------------------
-- 3. PERSONAS
--    - María Pérez: socio gym AL DÍA (cuota septiembre pagada)
--    - Juan García: socio gym MOROSO (última cuota julio; hoy 25/09 → >10 días)
--    - Lucía Rojas: socio gym AL DÍA pero con excepción ya usada
--    - Carlos Soto: SOLO paciente de consultorio (es_socio_gym = false)
--    - Ana Fernández: socio gym, cuota agosto pagada (mora exacta <10 días)
--    - Pedro Gómez: dado de BAJA LÓGICA
-- ---------------------------------------------------------------------------

INSERT INTO personas (usuario_id, nombre, apellido, dni, telefono, fecha_nacimiento, estado, es_socio_gym, fecha_alta, fecha_baja) VALUES
  ((SELECT id FROM usuarios WHERE email = 'maria.perez@mail.com'),
   'María', 'Pérez', '38100001', '11-2001-0001', '1995-03-12', 'ACTIVO', true,  '2024-01-10', NULL),

  ((SELECT id FROM usuarios WHERE email = 'juan.garcia@mail.com'),
   'Juan', 'García', '38100002', '11-2002-0002', '1990-07-22', 'ACTIVO', true,  '2023-05-15', NULL),

  ((SELECT id FROM usuarios WHERE email = 'lucia.rojas@mail.com'),
   'Lucía', 'Rojas', '38100003', '11-2003-0003', '1998-11-05', 'ACTIVO', true,  '2024-03-01', NULL),

  ((SELECT id FROM usuarios WHERE email = 'carlos.soto@mail.com'),
   'Carlos', 'Soto', '38100004', '11-2004-0004', '1985-04-18', 'ACTIVO', false, '2025-02-20', NULL),

  ((SELECT id FROM usuarios WHERE email = 'ana.fernandez@mail.com'),
   'Ana', 'Fernández', '38100005', '11-2005-0005', '2000-09-30', 'ACTIVO', true,  '2025-06-01', NULL),

  ((SELECT id FROM usuarios WHERE email = 'pedro.gomez@mail.com'),
   'Pedro', 'Gómez', '38100006', '11-2006-0006', '1988-12-01', 'INACTIVO', false, '2023-01-10', '2025-08-15');

-- ---------------------------------------------------------------------------
-- 4. DISPONIBILIDAD DE PROFESIONALES
--    Valentina (Nutrición): Lunes y Miércoles 09:00–13:00
--    Rodrigo (Psicología):  Martes y Jueves   14:00–19:00
--    Florencia (Kinesiología): Lunes, Miércoles, Viernes 08:00–12:00
-- ---------------------------------------------------------------------------

INSERT INTO disponibilidad_profesional (profesional_id, dia_semana, hora_inicio, hora_fin) VALUES
  -- Valentina
  ((SELECT id FROM profesionales WHERE apellido = 'Méndez'),  1, '09:00', '13:00'),  -- Lunes
  ((SELECT id FROM profesionales WHERE apellido = 'Méndez'),  3, '09:00', '13:00'),  -- Miércoles
  -- Rodrigo
  ((SELECT id FROM profesionales WHERE apellido = 'Almirón'), 2, '14:00', '19:00'),  -- Martes
  ((SELECT id FROM profesionales WHERE apellido = 'Almirón'), 4, '14:00', '19:00'),  -- Jueves
  -- Florencia
  ((SELECT id FROM profesionales WHERE apellido = 'Rueda'),   1, '08:00', '12:00'),  -- Lunes
  ((SELECT id FROM profesionales WHERE apellido = 'Rueda'),   3, '08:00', '12:00'),  -- Miércoles
  ((SELECT id FROM profesionales WHERE apellido = 'Rueda'),   5, '08:00', '12:00'); -- Viernes

-- ---------------------------------------------------------------------------
-- 5. PAGOS — cuotas mensuales
--    (registrado_por_usuario = admin)
-- ---------------------------------------------------------------------------

-- María Pérez: cuotas jul/ago/sep 2026 — AL DÍA
INSERT INTO pagos (persona_id, concepto, monto, periodo, registrado_por_usuario) VALUES
  ((SELECT id FROM personas WHERE dni = '38100001'), 'CUOTA_MENSUAL', 15000.00, '2026-07-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com')),
  ((SELECT id FROM personas WHERE dni = '38100001'), 'CUOTA_MENSUAL', 15000.00, '2026-08-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com')),
  ((SELECT id FROM personas WHERE dni = '38100001'), 'CUOTA_MENSUAL', 16000.00, '2026-09-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'));

-- Juan García: solo cuota julio — MOROSO (agosto y septiembre sin pagar)
-- Hoy 25/09 → cuota agosto venció el 01/09, mora 24 días > 10 → bloqueado para gym
INSERT INTO pagos (persona_id, concepto, monto, periodo, registrado_por_usuario) VALUES
  ((SELECT id FROM personas WHERE dni = '38100002'), 'CUOTA_MENSUAL', 15000.00, '2026-07-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'));

-- Lucía Rojas: cuotas jul/ago/sep — AL DÍA
INSERT INTO pagos (persona_id, concepto, monto, periodo, registrado_por_usuario) VALUES
  ((SELECT id FROM personas WHERE dni = '38100003'), 'CUOTA_MENSUAL', 15000.00, '2026-07-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com')),
  ((SELECT id FROM personas WHERE dni = '38100003'), 'CUOTA_MENSUAL', 15000.00, '2026-08-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com')),
  ((SELECT id FROM personas WHERE dni = '38100003'), 'CUOTA_MENSUAL', 16000.00, '2026-09-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'));

-- Ana Fernández: cuotas jul/ago — mora <10 días (sep sin pagar; vence 01/10; hoy 25/09 → sin mora aún)
INSERT INTO pagos (persona_id, concepto, monto, periodo, registrado_por_usuario) VALUES
  ((SELECT id FROM personas WHERE dni = '38100005'), 'CUOTA_MENSUAL', 15000.00, '2026-07-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com')),
  ((SELECT id FROM personas WHERE dni = '38100005'), 'CUOTA_MENSUAL', 15000.00, '2026-08-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'));

-- ---------------------------------------------------------------------------
-- 6. TURNOS — todos los estados representados
-- ---------------------------------------------------------------------------

-- T1: RESERVADO — María con Valentina (Nutrición) el lunes 28/10/2026 09:00
INSERT INTO turnos (persona_id, profesional_id, tipo_turno, inicio, fin, estado, reservado_por_usuario_id)
VALUES (
  (SELECT id FROM personas WHERE dni = '38100001'),
  (SELECT id FROM profesionales WHERE apellido = 'Méndez'),
  'CONSULTORIO',
  '2026-10-28 09:00:00-03',
  '2026-10-28 09:30:00-03',
  'RESERVADO',
  (SELECT id FROM usuarios WHERE email = 'maria.perez@mail.com')
);

-- T2: COMPLETADO — Carlos con Rodrigo (Psicología) el martes 15/09/2026 14:00
INSERT INTO turnos (persona_id, profesional_id, tipo_turno, inicio, fin, estado, reservado_por_usuario_id)
VALUES (
  (SELECT id FROM personas WHERE dni = '38100004'),
  (SELECT id FROM profesionales WHERE apellido = 'Almirón'),
  'CONSULTORIO',
  '2026-09-15 14:00:00-03',
  '2026-09-15 14:50:00-03',
  'COMPLETADO',
  (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com')
);

-- T3: AUSENTE — Lucía con Florencia (Kinesiología), 22/09/2026
INSERT INTO turnos (persona_id, profesional_id, tipo_turno, inicio, fin, estado, reservado_por_usuario_id)
VALUES (
  (SELECT id FROM personas WHERE dni = '38100003'),
  (SELECT id FROM profesionales WHERE apellido = 'Rueda'),
  'CONSULTORIO',
  '2026-09-22 08:00:00-03',
  '2026-09-22 08:45:00-03',
  'AUSENTE',
  (SELECT id FROM usuarios WHERE email = 'lucia.rojas@mail.com')
);

-- T4: CANCELADO_EN_TIEMPO — Ana con Valentina, canceló con 48 h de anticipación
INSERT INTO turnos (
  persona_id, profesional_id, tipo_turno, inicio, fin, estado,
  reservado_por_usuario_id, cancelado_en, cancelado_por_usuario_id, motivo_cancelacion
) VALUES (
  (SELECT id FROM personas WHERE dni = '38100005'),
  (SELECT id FROM profesionales WHERE apellido = 'Méndez'),
  'CONSULTORIO',
  '2026-09-24 09:00:00-03',
  '2026-09-24 09:30:00-03',
  'CANCELADO_EN_TIEMPO',
  (SELECT id FROM usuarios WHERE email = 'ana.fernandez@mail.com'),
  '2026-09-22 10:00:00-03',
  (SELECT id FROM usuarios WHERE email = 'ana.fernandez@mail.com'),
  'Surgió un imprevisto laboral.'
);

-- T5: CANCELADO_TARDE — Juan con Rodrigo, canceló con 3 h de anticipación (bloqueado)
INSERT INTO turnos (
  persona_id, profesional_id, tipo_turno, inicio, fin, estado,
  reservado_por_usuario_id, cancelado_en, cancelado_por_usuario_id, motivo_cancelacion
) VALUES (
  (SELECT id FROM personas WHERE dni = '38100002'),
  (SELECT id FROM profesionales WHERE apellido = 'Almirón'),
  'CONSULTORIO',
  '2026-09-23 14:00:00-03',
  '2026-09-23 14:50:00-03',
  'CANCELADO_TARDE',
  (SELECT id FROM usuarios WHERE email = 'juan.garcia@mail.com'),
  '2026-09-23 11:00:00-03',
  (SELECT id FROM usuarios WHERE email = 'juan.garcia@mail.com'),
  'No me siento bien.'
);

-- T6: GYM — María, turno de gimnasio (sin profesional), RESERVADO
INSERT INTO turnos (persona_id, profesional_id, tipo_turno, inicio, fin, estado, reservado_por_usuario_id)
VALUES (
  (SELECT id FROM personas WHERE dni = '38100001'),
  NULL,
  'GYM',
  '2026-10-29 08:00:00-03',
  '2026-10-29 09:00:00-03',
  'RESERVADO',
  (SELECT id FROM usuarios WHERE email = 'maria.perez@mail.com')
);

-- T7: GYM — Lucía, turno de gym COMPLETADO
INSERT INTO turnos (persona_id, profesional_id, tipo_turno, inicio, fin, estado, reservado_por_usuario_id)
VALUES (
  (SELECT id FROM personas WHERE dni = '38100003'),
  NULL,
  'GYM',
  '2026-09-20 10:00:00-03',
  '2026-09-20 11:00:00-03',
  'COMPLETADO',
  (SELECT id FROM usuarios WHERE email = 'lucia.rojas@mail.com')
);

-- ---------------------------------------------------------------------------
-- 7. PAGOS — sesiones de consultorio
-- ---------------------------------------------------------------------------

-- Pago de la sesión completada de Carlos (T2)
INSERT INTO pagos (persona_id, concepto, monto, turno_id, registrado_por_usuario) VALUES (
  (SELECT id FROM personas WHERE dni = '38100004'),
  'SESION_CONSULTORIO',
  8000.00,
  (SELECT id FROM turnos WHERE persona_id = (SELECT id FROM personas WHERE dni = '38100004')
     AND estado = 'COMPLETADO' LIMIT 1),
  (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com')
);

-- ---------------------------------------------------------------------------
-- 8. EXCEPCIONES DE MOROSIDAD
--    Juan García tiene una excepción puntual vigente hasta 30/09/2026
--    para poder asistir a una clase de gym mientras regulariza su cuota.
-- ---------------------------------------------------------------------------

INSERT INTO excepciones_morosidad (persona_id, autorizado_por, motivo, valida_hasta) VALUES (
  (SELECT id FROM personas WHERE dni = '38100002'),
  (SELECT id FROM usuarios WHERE email  = 'admin@vitalys.com'),
  'El socio se comprometió a abonar las cuotas adeudadas antes del 30/09/2026. Se autoriza acceso temporario al gym.',
  '2026-09-30'
);

-- ---------------------------------------------------------------------------
-- 9. NOTIFICACIONES — registro histórico de envíos
-- ---------------------------------------------------------------------------

-- Confirmación del turno T1 (María, reservado)
INSERT INTO notificaciones (persona_id, turno_id, tipo, email_destino, exitoso) VALUES (
  (SELECT id FROM personas WHERE dni = '38100001'),
  (SELECT id FROM turnos WHERE persona_id = (SELECT id FROM personas WHERE dni = '38100001')
     AND tipo_turno = 'CONSULTORIO' AND estado = 'RESERVADO' LIMIT 1),
  'CONFIRMACION_TURNO',
  'maria.perez@mail.com',
  true
);

-- Aviso cancelación de Ana (T4)
INSERT INTO notificaciones (persona_id, turno_id, tipo, email_destino, exitoso) VALUES (
  (SELECT id FROM personas WHERE dni = '38100005'),
  (SELECT id FROM turnos WHERE persona_id = (SELECT id FROM personas WHERE dni = '38100005')
     AND estado = 'CANCELADO_EN_TIEMPO' LIMIT 1),
  'AVISO_CANCELACION',
  'ana.fernandez@mail.com',
  true
);

-- Aviso cancelación tardía de Juan (T5)
INSERT INTO notificaciones (persona_id, turno_id, tipo, email_destino, exitoso) VALUES (
  (SELECT id FROM personas WHERE dni = '38100002'),
  (SELECT id FROM turnos WHERE persona_id = (SELECT id FROM personas WHERE dni = '38100002')
     AND estado = 'CANCELADO_TARDE' LIMIT 1),
  'AVISO_CANCELACION',
  'juan.garcia@mail.com',
  false,  -- simulamos fallo del proveedor SMTP
  'Connection timeout: SMTP server unreachable'
);

-- Recordatorio pendiente para el turno T1 (María, 28/10) — simulado como ya enviado
INSERT INTO notificaciones (persona_id, turno_id, tipo, email_destino, exitoso) VALUES (
  (SELECT id FROM personas WHERE dni = '38100001'),
  (SELECT id FROM turnos WHERE persona_id = (SELECT id FROM personas WHERE dni = '38100001')
     AND tipo_turno = 'CONSULTORIO' AND estado = 'RESERVADO' LIMIT 1),
  'RECORDATORIO',
  'maria.perez@mail.com',
  true
);

COMMIT;

-- =============================================================================
-- Verificaciones rápidas (ejecutar por separado para validar el seed)
-- =============================================================================
-- SELECT u.email, u.rol, p.nombre, p.apellido, p.es_socio_gym, p.estado
--   FROM usuarios u LEFT JOIN personas p ON p.usuario_id = u.id ORDER BY u.id;
--
-- SELECT t.id, pe.apellido AS persona, pr.apellido AS profesional,
--        t.tipo_turno, t.estado, t.inicio
--   FROM turnos t
--   JOIN personas pe ON pe.id = t.persona_id
--   LEFT JOIN profesionales pr ON pr.id = t.profesional_id
--  ORDER BY t.inicio;
--
-- SELECT pa.concepto, pe.apellido, pa.periodo, pa.monto
--   FROM pagos pa JOIN personas pe ON pe.id = pa.persona_id ORDER BY pa.id;
-- =============================================================================

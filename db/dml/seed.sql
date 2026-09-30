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
--    Hash verificado: generado con `SELECT crypt('Admin1234!', gen_salt('bf', 10));`
--    (pgcrypto) para que coincida exactamente con la contraseña documentada.
-- ---------------------------------------------------------------------------

-- Admin
INSERT INTO usuarios (email, password_hash, rol) VALUES
  ('admin@vitalys.com',     '$2a$10$Fh8mw/F8THWCUvqdJCxQBOwm6ad.bdInfxizLUCkK1AZDNIoBCsli', 'ADMIN');
  -- password: Admin1234!

-- Profesionales
INSERT INTO usuarios (email, password_hash, rol) VALUES
  ('nutricion@vitalys.com', '$2a$10$Fh8mw/F8THWCUvqdJCxQBOwm6ad.bdInfxizLUCkK1AZDNIoBCsli', 'PROFESIONAL'),
  ('psico@vitalys.com',     '$2a$10$Fh8mw/F8THWCUvqdJCxQBOwm6ad.bdInfxizLUCkK1AZDNIoBCsli', 'PROFESIONAL'),
  ('kine@vitalys.com',      '$2a$10$Fh8mw/F8THWCUvqdJCxQBOwm6ad.bdInfxizLUCkK1AZDNIoBCsli', 'PROFESIONAL');

-- Socios / Pacientes
INSERT INTO usuarios (email, password_hash, rol) VALUES
  ('maria.perez@mail.com',    '$2a$10$Fh8mw/F8THWCUvqdJCxQBOwm6ad.bdInfxizLUCkK1AZDNIoBCsli', 'SOCIO_PACIENTE'),
  ('juan.garcia@mail.com',    '$2a$10$Fh8mw/F8THWCUvqdJCxQBOwm6ad.bdInfxizLUCkK1AZDNIoBCsli', 'SOCIO_PACIENTE'),
  ('lucia.rojas@mail.com',    '$2a$10$Fh8mw/F8THWCUvqdJCxQBOwm6ad.bdInfxizLUCkK1AZDNIoBCsli', 'SOCIO_PACIENTE'),
  ('carlos.soto@mail.com',    '$2a$10$Fh8mw/F8THWCUvqdJCxQBOwm6ad.bdInfxizLUCkK1AZDNIoBCsli', 'SOCIO_PACIENTE'),
  ('ana.fernandez@mail.com',  '$2a$10$Fh8mw/F8THWCUvqdJCxQBOwm6ad.bdInfxizLUCkK1AZDNIoBCsli', 'SOCIO_PACIENTE'),
  ('pedro.gomez@mail.com',    '$2a$10$Fh8mw/F8THWCUvqdJCxQBOwm6ad.bdInfxizLUCkK1AZDNIoBCsli', 'SOCIO_PACIENTE');
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
--    Los cuatro socios de gimnasio cubren los cuatro caminos de RN-01, tomando
--    como referencia el 28/09/2026 y el umbral por defecto de 6 períodos
--    (configuracion_gym.meses_tolerancia_morosidad):
--
--    - María Pérez:    AL DÍA — socia desde 07/2026, cuotas 07, 08 y 09 pagadas.
--                      0 períodos impagos.
--    - Lucía Rojas:    AL DÍA — socia desde 09/2026, sin cuotas registradas. Su
--                      primer período todavía no lleva 10 días de vencido, así
--                      que NO acumula deuda: verifica que RN-01 no bloquea a un
--                      socio desde el primer día.
--    - Ana Fernández:  CON DEUDA POR DEBAJO DEL UMBRAL — socia desde 03/2026,
--                      salteó 03 y 04 y pagó de 05 a 08. Acumula 2 impagos: los
--                      pagos posteriores NO compensan los meses salteados, pero
--                      con 2 < 6 conserva el acceso y solo se la notifica.
--    - Juan García:    SUSPENDIDO — socio desde 01/2026, pagó solo 07 y 08.
--                      Acumula exactamente 6 impagos (01 a 06): alcanza el
--                      umbral y queda bloqueado para gym. Es el único con una
--                      excepción de morosidad autorizada por el ADMIN (sección 8).
--
--    - Carlos Soto:    SOLO paciente de consultorio (es_socio_gym = false)
--    - Pedro Gómez:    dado de BAJA LÓGICA
-- ---------------------------------------------------------------------------

-- fecha_inicio_membresia: solo para socios de gym (es_socio_gym = true). NO
-- coincide con fecha_alta, y es justamente el motivo por el que V4 agregó la
-- columna: una persona puede ser cliente del centro desde hace años y haberse
-- asociado al gimnasio hace pocos meses. Derivar la mora de fecha_alta haría
-- aparecer como deudores a socios que recién se incorporaron.
INSERT INTO personas (usuario_id, nombre, apellido, dni, telefono, fecha_nacimiento, estado, es_socio_gym, fecha_alta, fecha_inicio_membresia, fecha_baja) VALUES
  ((SELECT id FROM usuarios WHERE email = 'maria.perez@mail.com'),
   'María', 'Pérez', '38100001', '11-2001-0001', '1995-03-12', 'ACTIVO', true,  '2024-01-10', '2026-07-01', NULL),

  ((SELECT id FROM usuarios WHERE email = 'juan.garcia@mail.com'),
   'Juan', 'García', '38100002', '11-2002-0002', '1990-07-22', 'ACTIVO', true,  '2023-05-15', '2026-01-01', NULL),

  ((SELECT id FROM usuarios WHERE email = 'lucia.rojas@mail.com'),
   'Lucía', 'Rojas', '38100003', '11-2003-0003', '1998-11-05', 'ACTIVO', true,  '2024-03-01', '2026-09-01', NULL),

  ((SELECT id FROM usuarios WHERE email = 'carlos.soto@mail.com'),
   'Carlos', 'Soto', '38100004', '11-2004-0004', '1985-04-18', 'ACTIVO', false, '2025-02-20', NULL, NULL),

  ((SELECT id FROM usuarios WHERE email = 'ana.fernandez@mail.com'),
   'Ana', 'Fernández', '38100005', '11-2005-0005', '2000-09-30', 'ACTIVO', true,  '2025-06-01', '2026-03-01', NULL),

  ((SELECT id FROM usuarios WHERE email = 'pedro.gomez@mail.com'),
   'Pedro', 'Gómez', '38100006', '11-2006-0006', '1988-12-01', 'INACTIVO', false, '2023-01-10', NULL, '2025-08-15');

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

-- Referencia de cálculo (RN-01), tomando el 28/09/2026 como "hoy": un período P
-- se cuenta como impago si NOW() > (P + 1 mes + 10 días). Por eso el período
-- 2026-09 todavía NO se evalúa (vence el 11/10/2026), y el último período
-- computable es 2026-08.

-- María Pérez: socia desde 07/2026, cuotas 07, 08 y 09 pagadas.
-- Períodos evaluados: 07 y 08 → 0 impagos. AL DÍA.
INSERT INTO pagos (persona_id, concepto, monto, periodo, registrado_por_usuario) VALUES
  ((SELECT id FROM personas WHERE dni = '38100001'), 'CUOTA_MENSUAL', 15000.00, '2026-07-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com')),
  ((SELECT id FROM personas WHERE dni = '38100001'), 'CUOTA_MENSUAL', 15000.00, '2026-08-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com')),
  ((SELECT id FROM personas WHERE dni = '38100001'), 'CUOTA_MENSUAL', 16000.00, '2026-09-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'));

-- Juan García: socio desde 01/2026, pagó solo 07 y 08.
-- Períodos evaluados: 01 a 08 → impagos 01, 02, 03, 04, 05 y 06 = 6.
-- Alcanza exactamente el umbral (6) → SUSPENDIDO para gym. Caso de borde: el
-- bloqueo se dispara con "alcanza o supera", no con "supera".
INSERT INTO pagos (persona_id, concepto, monto, periodo, registrado_por_usuario) VALUES
  ((SELECT id FROM personas WHERE dni = '38100002'), 'CUOTA_MENSUAL', 15000.00, '2026-07-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com')),
  ((SELECT id FROM personas WHERE dni = '38100002'), 'CUOTA_MENSUAL', 15000.00, '2026-08-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'));

-- Lucía Rojas: socia desde 09/2026, SIN cuotas registradas.
-- Su único período (09) vence el 11/10/2026 → todavía no se evalúa: 0 impagos.
-- Verifica que un socio recién incorporado no queda bloqueado desde el primer día.

-- Ana Fernández: socia desde 03/2026, salteó 03 y 04 y pagó de 05 a 08.
-- Períodos evaluados: 03 a 08 → impagos 03 y 04 = 2. Los pagos de 05 a 08 NO
-- compensan los meses salteados (RN-01), pero 2 < 6 → CON DEUDA sin bloqueo:
-- conserva el acceso al gym y solo se la notifica.
INSERT INTO pagos (persona_id, concepto, monto, periodo, registrado_por_usuario) VALUES
  ((SELECT id FROM personas WHERE dni = '38100005'), 'CUOTA_MENSUAL', 14000.00, '2026-05-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com')),
  ((SELECT id FROM personas WHERE dni = '38100005'), 'CUOTA_MENSUAL', 14000.00, '2026-06-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com')),
  ((SELECT id FROM personas WHERE dni = '38100005'), 'CUOTA_MENSUAL', 15000.00, '2026-07-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com')),
  ((SELECT id FROM personas WHERE dni = '38100005'), 'CUOTA_MENSUAL', 15000.00, '2026-08-01',
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'));

-- ---------------------------------------------------------------------------
-- 6. TURNOS — todos los estados representados
-- ---------------------------------------------------------------------------

-- T1: RESERVADO — María con Valentina (Nutrición) el miércoles 28/10/2026 09:00.
-- Valentina atiende lunes y miércoles de 09:00 a 13:00, así que la franja es válida.
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

-- T3: AUSENTE — Lucía con Florencia (Kinesiología), 23/09/2026
-- Nota: originalmente 22/09 (martes); Florencia solo atiende Lun/Mié/Vie.
-- Se corrige a 23/09 (miércoles), dentro de su disponibilidad.
INSERT INTO turnos (persona_id, profesional_id, tipo_turno, inicio, fin, estado, reservado_por_usuario_id)
VALUES (
  (SELECT id FROM personas WHERE dni = '38100003'),
  (SELECT id FROM profesionales WHERE apellido = 'Rueda'),
  'CONSULTORIO',
  '2026-09-23 08:00:00-03',
  '2026-09-23 08:45:00-03',
  'AUSENTE',
  (SELECT id FROM usuarios WHERE email = 'lucia.rojas@mail.com')
);

-- T4: CANCELADO_EN_TIEMPO — Ana con Valentina, canceló con varios días de anticipación
-- Nota: originalmente 24/09 (jueves); Valentina solo atiende Lun/Mié.
-- Se corrige a 28/09 (lunes), dentro de su disponibilidad; se mantiene el
-- aviso de cancelación (22/09) con largo margen (>24h → CANCELADO_EN_TIEMPO).
INSERT INTO turnos (
  persona_id, profesional_id, tipo_turno, inicio, fin, estado,
  reservado_por_usuario_id, cancelado_en, cancelado_por_usuario, motivo_cancelacion
) VALUES (
  (SELECT id FROM personas WHERE dni = '38100005'),
  (SELECT id FROM profesionales WHERE apellido = 'Méndez'),
  'CONSULTORIO',
  '2026-09-28 09:00:00-03',
  '2026-09-28 09:30:00-03',
  'CANCELADO_EN_TIEMPO',
  (SELECT id FROM usuarios WHERE email = 'ana.fernandez@mail.com'),
  '2026-09-22 10:00:00-03',
  (SELECT id FROM usuarios WHERE email = 'ana.fernandez@mail.com'),
  'Surgió un imprevisto laboral.'
);

-- T5: CANCELADO_TARDE que SÍ libera el horario — Juan con Rodrigo, avisó 3 h antes.
-- Nota: originalmente 23/09 (miércoles); Rodrigo solo atiende Mar/Jue.
-- Se corrige a 24/09 (jueves), dentro de su disponibilidad; se mantiene el
-- aviso de cancelación con 3 h de margen (<24h → CANCELADO_TARDE).
-- El aviso llegó ANTES del inicio (11:00 < 14:00), así que el horario vuelve a
-- estar disponible pese a ser una cancelación tardía: el estado registra la
-- anticipación del aviso, no decide la ocupación (RN-02, RN-03). Comparar con T8.
INSERT INTO turnos (
  persona_id, profesional_id, tipo_turno, inicio, fin, estado,
  reservado_por_usuario_id, cancelado_en, cancelado_por_usuario, motivo_cancelacion
) VALUES (
  (SELECT id FROM personas WHERE dni = '38100002'),
  (SELECT id FROM profesionales WHERE apellido = 'Almirón'),
  'CONSULTORIO',
  '2026-09-24 14:00:00-03',
  '2026-09-24 14:50:00-03',
  'CANCELADO_TARDE',
  (SELECT id FROM usuarios WHERE email = 'juan.garcia@mail.com'),
  '2026-09-24 11:00:00-03',
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
  '2026-09-19 10:00:00-03',
  '2026-09-19 11:00:00-03',
  'COMPLETADO',
  (SELECT id FROM usuarios WHERE email = 'lucia.rojas@mail.com')
);

-- T8: GYM — Ana canceló con la franja YA EMPEZADA (turno 09:00, aviso 09:01).
-- Contracara de T5: acá el lugar NO se libera y sigue contando para el cupo de
-- esa franja y para el límite de un turno de gym por día. Es el mismo criterio
-- que rige AUSENTE: una vez iniciada la franja, el lugar se consumió (RN-02,
-- RN-03, RN-08). Relevado en el Centro Deportivo Jerárquicos: "si el turno es a
-- las 14:00 y a las 14:01 cancelan, quedan bloqueados para ambos".
INSERT INTO turnos (
  persona_id, profesional_id, tipo_turno, inicio, fin, estado,
  reservado_por_usuario_id, cancelado_en, cancelado_por_usuario, motivo_cancelacion
) VALUES (
  (SELECT id FROM personas WHERE dni = '38100005'),
  NULL,
  'GYM',
  '2026-09-23 09:00:00-03',
  '2026-09-23 10:00:00-03',
  'CANCELADO_TARDE',
  (SELECT id FROM usuarios WHERE email = 'ana.fernandez@mail.com'),
  '2026-09-23 09:01:00-03',
  (SELECT id FROM usuarios WHERE email = 'ana.fernandez@mail.com'),
  'Avisé cuando la franja ya había arrancado.'
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
--    Juan García es el ÚNICO socio con excepción. Es coherente con su estado:
--    acumula 6 períodos impagos, alcanzó el umbral y quedó SUSPENDIDO para gym
--    (RN-01). La excepción es el mecanismo por el que el ADMIN levanta esa
--    suspensión sin desactivar la regla (RN-09).
--
--    Ningún otro socio tiene excepción, y ninguno la necesita: María y Lucía no
--    tienen deuda computable, y Ana tiene deuda pero por debajo del umbral, así
--    que nunca estuvo bloqueada.
--
--    Es POR PERÍODO (un_solo_uso = FALSE, el valor por defecto): vale para
--    cualquier turno de gimnasio hasta valida_hasta. La alternativa sería
--    un_solo_uso = TRUE, que habilita una sola reserva y se agota al usarse.
--
--    turno_id queda en NULL a propósito, y NO porque falte el dato: no es un
--    dato de alta (RN-23). La excepción sirve para PODER reservar, así que en el
--    momento en que se la otorga el turno todavía no existe. Esa columna la
--    completa el servicio cuando la excepción se consume.
-- ---------------------------------------------------------------------------

INSERT INTO excepciones_morosidad (persona_id, autorizado_por, motivo, valida_hasta) VALUES (
  (SELECT id FROM personas WHERE dni = '38100002'),
  (SELECT id FROM usuarios WHERE email  = 'admin@vitalys.com'),
  'El socio se comprometió a abonar las cuotas adeudadas antes del 31/10/2026. Se autoriza acceso temporario al gym.',
  '2026-10-31'
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
INSERT INTO notificaciones (persona_id, turno_id, tipo, email_destino, exitoso, detalle_error) VALUES (
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

-- ---------------------------------------------------------------------------
-- 10. FERIADOS — días en que el gimnasio no abre (RN-14)
--
--     El calendario real NO se carga acá: lo sincroniza el importador contra el
--     dataset oficial del Ministerio del Interior (RF-38). Escribir feriados a
--     mano no escala — los trasladables se corren cada año y aparecen feriados
--     por decreto que ninguna lista fija puede anticipar.
--
--     Estas filas son datos de prueba para ejercitar los dos caminos de la
--     tabla. Ninguna se superpone con los turnos del seed.
-- ---------------------------------------------------------------------------

-- Importados (así los deja el sincronizador). Fechas reales de 2026 tomadas de
-- la fuente oficial; se incluye a propósito un trasladable que NO cayó en su
-- fecha nominal y un feriado creado por decreto, que son justamente los casos
-- que una lista escrita a mano no contempla.
INSERT INTO feriados (fecha, descripcion, tipo, cierra_gimnasio, origen, sincronizado_en) VALUES
  ('2026-11-23', 'Día de la Soberanía Nacional (20/11)',        'TRASLADABLE',  TRUE,  'OFICIAL', NOW()),
  ('2026-11-09', 'Visita de Su Santidad el Papa León XIV',      'INAMOVIBLE',   TRUE,  'OFICIAL', NOW()),
  ('2026-12-07', 'Día no laborable con fines turísticos',       'TURISTICO',    TRUE,  'OFICIAL', NOW()),
  ('2026-12-08', 'Inmaculada Concepción de María',              'INAMOVIBLE',   TRUE,  'OFICIAL', NOW()),
  ('2026-12-25', 'Navidad',                                      'INAMOVIBLE',   TRUE,  'OFICIAL', NOW()),
  -- NO_LABORABLE: festividad religiosa de quien la profesa. El gimnasio ABRE.
  ('2026-09-21', 'Día del Perdón',                               'NO_LABORABLE', FALSE, 'OFICIAL', NOW());

-- Cargado por el ADMIN: un cierre propio del centro, que la fuente oficial no
-- conoce. Se clasifica con el tipo que mejor lo describe y origen MANUAL.
INSERT INTO feriados (fecha, descripcion, tipo, cierra_gimnasio, origen) VALUES
  ('2026-11-02', 'Cierre por mantenimiento de la sala de máquinas', 'TURISTICO', TRUE, 'MANUAL');

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

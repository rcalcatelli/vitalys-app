-- =============================================================================
-- Vitalys App — DML Datos de Prueba (seed.sql)
-- 2.ª Entrega — Trabajo Final Integrador
-- Tecnicatura Universitaria en Programación · UTN · 2026
-- Autores: Renzo Calcatelli · Pablo Basualdo Arcati
-- =============================================================================
-- Este script asume que las migraciones de db/migration ya se aplicaron (Flyway).
-- Orden: usuarios → profesionales → feriados → fechas de referencia → personas
--        → disponibilidad → pagos → turnos → excepciones → notificaciones
--
-- FECHAS RELATIVAS. Ninguna fecha que intervenga en una regla está escrita a
-- mano: todas se calculan contra el día en que se carga el script (ver la tabla
-- temporal seed_ref, sección 2b). La morosidad (RN-01) y el estado de un turno
-- dependen de NOW(); con fechas fijas, el mismo seed que hoy muestra a un socio
-- "al día" lo muestra moroso un mes después, y los comentarios dejan de decir la
-- verdad. Así, cada caso de prueba muestra siempre lo que su comentario promete,
-- se cargue el día que se cargue. SeedIT lo verifica en el CI.
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
-- 2a. FERIADOS — días en que el gimnasio no abre (RN-14)
--
--     El calendario real NO se carga acá: lo sincroniza el importador contra el
--     dataset oficial del Ministerio del Interior (RF-38). Escribir feriados a
--     mano no escala — los trasladables se corren cada año y aparecen feriados
--     por decreto que ninguna lista fija puede anticipar.
--
--     Estas filas son datos de prueba para ejercitar los dos caminos de la
--     tabla. Se cargan ANTES que los turnos porque las fechas de los turnos de
--     gimnasio se eligen salteando estos días (seed_ref): un turno de gimnasio
--     en un feriado lo rechaza el trigger trg_turno_gym.
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

-- ---------------------------------------------------------------------------
-- 2b. FECHAS DE REFERENCIA (seed_ref)
--     Una sola fila con el "hoy" de la carga y los días que usan los turnos.
--     mes = primer día del mes actual; los períodos de cuota se expresan como
--     mes - N meses. Los turnos futuros caen a partir de una semana, los pasados
--     entre una y tres semanas atrás, siempre en un día en que el profesional
--     atiende (sección 4). Los de gimnasio, además, en un día que no sea feriado.
-- ---------------------------------------------------------------------------

CREATE TEMP TABLE seed_ref ON COMMIT DROP AS
WITH h AS (SELECT (NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date AS hoy),
dias AS (
    SELECT d::date AS dia, EXTRACT(ISODOW FROM d)::int AS dow,
           EXISTS (SELECT 1 FROM feriados f WHERE f.fecha = d::date AND f.cierra_gimnasio) AS cerrado
    FROM h, generate_series(h.hoy - 27, h.hoy + 27, INTERVAL '1 day') AS d
)
SELECT
    h.hoy,
    date_trunc('month', h.hoy)::date AS mes,
    -- futuros
    (SELECT MIN(dia) FROM dias WHERE dia >= h.hoy + 7 AND dow = 3)                          AS prox_miercoles,
    (SELECT MIN(dia) FROM dias WHERE dia >= h.hoy + 7 AND dow = 4 AND NOT cerrado)          AS prox_jueves_gym,
    -- pasados
    (SELECT MAX(dia) FROM dias WHERE dia <= h.hoy - 14 AND dow = 2)                         AS pas_martes,
    (SELECT MAX(dia) FROM dias WHERE dia <= h.hoy - 7  AND dow = 1)                         AS pas_lunes,
    (SELECT MAX(dia) FROM dias WHERE dia <= h.hoy - 7  AND dow = 3)                         AS pas_miercoles,
    (SELECT MAX(dia) FROM dias WHERE dia <= h.hoy - 7  AND dow = 4)                         AS pas_jueves,
    (SELECT MAX(dia) FROM dias WHERE dia <= h.hoy - 7  AND dow = 6 AND NOT cerrado)         AS pas_sabado_gym,
    (SELECT MAX(dia) FROM dias WHERE dia <= h.hoy - 7  AND dow = 5 AND NOT cerrado)         AS pas_viernes_gym
FROM h;

-- ---------------------------------------------------------------------------
-- 3. PERSONAS
--    Los cuatro socios de gimnasio cubren los cuatro caminos de RN-01 con el
--    umbral por defecto de 6 períodos (configuracion_gym.meses_tolerancia_morosidad).
--    Las membresías y las cuotas se cuentan desde el mes de la carga (mes), así
--    que cada caso da siempre el mismo resultado, sin importar el día:
--
--    - María Pérez:    AL DÍA — socia desde hace 3 meses, con todas las cuotas
--                      pagas, incluida la del mes actual. 0 períodos impagos.
--    - Lucía Rojas:    SOCIA NUEVA — se asoció este mes y todavía no pagó. Su
--                      único período no venció (vence el 1° del mes próximo, más
--                      10 días de gracia): 0 impagos. Verifica que RN-01 no
--                      bloquea a un socio desde el primer día.
--    - Ana Fernández:  CON DEUDA POR DEBAJO DEL UMBRAL — socia desde hace 6 meses,
--                      salteó sus dos primeros meses y pagó todos los siguientes.
--                      2 impagos: los pagos posteriores NO compensan los meses
--                      salteados, pero con 2 < 6 conserva el acceso.
--    - Juan García:    SUSPENDIDO — socio desde hace 8 meses, pagó solo los dos
--                      últimos. 6 impagos: alcanza el umbral y queda bloqueado
--                      para gym. Es el único con una excepción de morosidad
--                      vigente (sección 8), que le permite reservar igual.
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
   'María', 'Pérez', '38100001', '11-2001-0001', '1995-03-12', 'ACTIVO', true,  '2024-01-10', (SELECT (mes - INTERVAL '3 months')::date FROM seed_ref), NULL),

  ((SELECT id FROM usuarios WHERE email = 'juan.garcia@mail.com'),
   'Juan', 'García', '38100002', '11-2002-0002', '1990-07-22', 'ACTIVO', true,  '2023-05-15', (SELECT (mes - INTERVAL '8 months')::date FROM seed_ref), NULL),

  ((SELECT id FROM usuarios WHERE email = 'lucia.rojas@mail.com'),
   'Lucía', 'Rojas', '38100003', '11-2003-0003', '1998-11-05', 'ACTIVO', true,  '2024-03-01', (SELECT mes FROM seed_ref), NULL),

  ((SELECT id FROM usuarios WHERE email = 'carlos.soto@mail.com'),
   'Carlos', 'Soto', '38100004', '11-2004-0004', '1985-04-18', 'ACTIVO', false, '2025-02-20', NULL, NULL),

  ((SELECT id FROM usuarios WHERE email = 'ana.fernandez@mail.com'),
   'Ana', 'Fernández', '38100005', '11-2005-0005', '2000-09-30', 'ACTIVO', true,  '2025-06-01', (SELECT (mes - INTERVAL '6 months')::date FROM seed_ref), NULL),

  ((SELECT id FROM usuarios WHERE email = 'pedro.gomez@mail.com'),
   'Pedro', 'Gómez', '38100006', '11-2006-0006', '1988-12-01', 'INACTIVO', false, '2023-01-10', NULL, '2025-08-15'),

  -- Laura Benítez: la persona de recepción (admin@vitalys.com). Es la ficha del ADMIN: da nombre
  -- a la sesión (/api/auth/me) y es quien figura en "Autorizada por ..." de las excepciones. No es
  -- un socio ni un paciente: el listado de Personas solo muestra usuarios SOCIO_PACIENTE.
  ((SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'),
   'Laura', 'Benítez', '30555001', '11-2007-0007', '1987-02-14', 'ACTIVO', false, '2023-01-02', NULL, NULL);

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

-- Referencia de cálculo (RN-01): un período P se cuenta como impago si
-- NOW() > (P + 1 mes + 10 días) y no tiene cuota. El período del mes actual
-- nunca se evalúa todavía, y el del mes anterior depende del día: por eso cada
-- caso deja ese período pago o fuera de la cuenta, y el resultado no cambia con
-- la fecha de carga.

-- María Pérez: socia desde mes - 3, cuotas de mes - 3 a mes pagas. 0 impagos. AL DÍA.
INSERT INTO pagos (persona_id, concepto, monto, periodo, registrado_por_usuario, medio) VALUES
  ((SELECT id FROM personas WHERE dni = '38100001'), 'CUOTA_MENSUAL', 15000.00, (SELECT (mes - INTERVAL '3 months')::date FROM seed_ref),
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'), 'TRANSFERENCIA'),
  ((SELECT id FROM personas WHERE dni = '38100001'), 'CUOTA_MENSUAL', 15000.00, (SELECT (mes - INTERVAL '2 months')::date FROM seed_ref),
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'), 'TRANSFERENCIA'),
  ((SELECT id FROM personas WHERE dni = '38100001'), 'CUOTA_MENSUAL', 15000.00, (SELECT (mes - INTERVAL '1 months')::date FROM seed_ref),
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'), 'TRANSFERENCIA'),
  ((SELECT id FROM personas WHERE dni = '38100001'), 'CUOTA_MENSUAL', 15000.00, (SELECT mes FROM seed_ref),
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'), 'TRANSFERENCIA');

-- Juan García: socio desde mes - 8, pagó solo mes - 2 y mes - 1.
-- Impagos: mes - 8 a mes - 3 = 6. Alcanza exactamente el umbral (6) → SUSPENDIDO
-- para gym. Caso de borde: el bloqueo se dispara con "alcanza o supera".
INSERT INTO pagos (persona_id, concepto, monto, periodo, registrado_por_usuario, medio) VALUES
  ((SELECT id FROM personas WHERE dni = '38100002'), 'CUOTA_MENSUAL', 15000.00, (SELECT (mes - INTERVAL '2 months')::date FROM seed_ref),
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'), 'EFECTIVO'),
  ((SELECT id FROM personas WHERE dni = '38100002'), 'CUOTA_MENSUAL', 15000.00, (SELECT (mes - INTERVAL '1 months')::date FROM seed_ref),
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'), 'EFECTIVO');

-- Lucía Rojas: socia desde este mes, SIN cuotas registradas. Su único período
-- todavía no venció: 0 impagos. Un socio recién incorporado no queda bloqueado.

-- Ana Fernández: socia desde mes - 6, salteó mes - 6 y mes - 5 y pagó de mes - 4
-- a mes. Impagos: 2. Los pagos posteriores NO compensan los meses salteados
-- (RN-01), pero 2 < 6 → CON DEUDA sin bloqueo: conserva el acceso al gym.
INSERT INTO pagos (persona_id, concepto, monto, periodo, registrado_por_usuario, medio) VALUES
  ((SELECT id FROM personas WHERE dni = '38100005'), 'CUOTA_MENSUAL', 15000.00, (SELECT (mes - INTERVAL '4 months')::date FROM seed_ref),
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'), 'EFECTIVO'),
  ((SELECT id FROM personas WHERE dni = '38100005'), 'CUOTA_MENSUAL', 15000.00, (SELECT (mes - INTERVAL '3 months')::date FROM seed_ref),
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'), 'EFECTIVO'),
  ((SELECT id FROM personas WHERE dni = '38100005'), 'CUOTA_MENSUAL', 15000.00, (SELECT (mes - INTERVAL '2 months')::date FROM seed_ref),
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'), 'EFECTIVO'),
  ((SELECT id FROM personas WHERE dni = '38100005'), 'CUOTA_MENSUAL', 15000.00, (SELECT (mes - INTERVAL '1 months')::date FROM seed_ref),
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'), 'EFECTIVO'),
  ((SELECT id FROM personas WHERE dni = '38100005'), 'CUOTA_MENSUAL', 15000.00, (SELECT mes FROM seed_ref),
   (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'), 'EFECTIVO');

-- ---------------------------------------------------------------------------
-- 6. TURNOS — todos los estados representados
--    Los días salen de seed_ref: los RESERVADOS siempre quedan en el futuro y
--    los cerrados (completado, ausente, cancelados) siempre en el pasado.
-- ---------------------------------------------------------------------------

-- T1: RESERVADO — María con Valentina (Nutrición), el próximo miércoles a partir
-- de una semana, 09:00. Valentina atiende lunes y miércoles de 09:00 a 13:00.
INSERT INTO turnos (persona_id, profesional_id, tipo_turno, inicio, fin, estado, reservado_por_usuario_id)
VALUES (
  (SELECT id FROM personas WHERE dni = '38100001'),
  (SELECT id FROM profesionales WHERE apellido = 'Méndez'),
  'CONSULTORIO',
  (SELECT (prox_miercoles + TIME '09:00') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  (SELECT (prox_miercoles + TIME '09:30') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  'RESERVADO',
  (SELECT id FROM usuarios WHERE email = 'maria.perez@mail.com')
);

-- T2: COMPLETADO — Carlos con Rodrigo (Psicología), un martes de hace dos o tres
-- semanas, 14:00. Rodrigo atiende martes y jueves de 14:00 a 19:00.
INSERT INTO turnos (persona_id, profesional_id, tipo_turno, inicio, fin, estado, reservado_por_usuario_id)
VALUES (
  (SELECT id FROM personas WHERE dni = '38100004'),
  (SELECT id FROM profesionales WHERE apellido = 'Almirón'),
  'CONSULTORIO',
  (SELECT (pas_martes + TIME '14:00') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  (SELECT (pas_martes + TIME '14:50') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  'COMPLETADO',
  (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com')
);

-- T3: AUSENTE — Lucía con Florencia (Kinesiología), el miércoles de hace una o
-- dos semanas, 08:00. Florencia atiende lunes, miércoles y viernes de 08:00 a 12:00.
INSERT INTO turnos (persona_id, profesional_id, tipo_turno, inicio, fin, estado, reservado_por_usuario_id)
VALUES (
  (SELECT id FROM personas WHERE dni = '38100003'),
  (SELECT id FROM profesionales WHERE apellido = 'Rueda'),
  'CONSULTORIO',
  (SELECT (pas_miercoles + TIME '08:00') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  (SELECT (pas_miercoles + TIME '08:45') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  'AUSENTE',
  (SELECT id FROM usuarios WHERE email = 'lucia.rojas@mail.com')
);

-- T4: CANCELADO_EN_TIEMPO — Ana con Valentina, el lunes de hace una o dos
-- semanas, 09:00. Avisó seis días antes (>24 h → CANCELADO_EN_TIEMPO).
INSERT INTO turnos (
  persona_id, profesional_id, tipo_turno, inicio, fin, estado,
  reservado_por_usuario_id, cancelado_en, cancelado_por_usuario, motivo_cancelacion
) VALUES (
  (SELECT id FROM personas WHERE dni = '38100005'),
  (SELECT id FROM profesionales WHERE apellido = 'Méndez'),
  'CONSULTORIO',
  (SELECT (pas_lunes + TIME '09:00') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  (SELECT (pas_lunes + TIME '09:30') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  'CANCELADO_EN_TIEMPO',
  (SELECT id FROM usuarios WHERE email = 'ana.fernandez@mail.com'),
  (SELECT (pas_lunes - 6 + TIME '10:00') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  (SELECT id FROM usuarios WHERE email = 'ana.fernandez@mail.com'),
  'Surgió un imprevisto laboral.'
);

-- T5: CANCELADO_TARDE que SÍ libera el horario — Juan con Rodrigo, el jueves de
-- hace una o dos semanas, 14:00; avisó a las 11:00 (3 h antes, <24 h → TARDE).
-- El aviso llegó ANTES del inicio, así que el horario vuelve a estar disponible
-- pese a ser una cancelación tardía: el estado registra la anticipación del
-- aviso, no decide la ocupación (RN-02, RN-03). Comparar con T8.
INSERT INTO turnos (
  persona_id, profesional_id, tipo_turno, inicio, fin, estado,
  reservado_por_usuario_id, cancelado_en, cancelado_por_usuario, motivo_cancelacion
) VALUES (
  (SELECT id FROM personas WHERE dni = '38100002'),
  (SELECT id FROM profesionales WHERE apellido = 'Almirón'),
  'CONSULTORIO',
  (SELECT (pas_jueves + TIME '14:00') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  (SELECT (pas_jueves + TIME '14:50') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  'CANCELADO_TARDE',
  (SELECT id FROM usuarios WHERE email = 'juan.garcia@mail.com'),
  (SELECT (pas_jueves + TIME '11:00') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  (SELECT id FROM usuarios WHERE email = 'juan.garcia@mail.com'),
  'No me siento bien.'
);

-- T6: GYM — María, turno de gimnasio (sin profesional) RESERVADO, el próximo
-- jueves hábil a partir de una semana, 08:00.
INSERT INTO turnos (persona_id, profesional_id, tipo_turno, inicio, fin, estado, reservado_por_usuario_id)
VALUES (
  (SELECT id FROM personas WHERE dni = '38100001'),
  NULL,
  'GYM',
  (SELECT (prox_jueves_gym + TIME '08:00') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  (SELECT (prox_jueves_gym + TIME '09:00') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  'RESERVADO',
  (SELECT id FROM usuarios WHERE email = 'maria.perez@mail.com')
);

-- T7: GYM — María, turno de gimnasio COMPLETADO, el sábado de hace una o dos
-- semanas, 10:00 (el sábado abre de 09:00 a 12:00).
INSERT INTO turnos (persona_id, profesional_id, tipo_turno, inicio, fin, estado, reservado_por_usuario_id)
VALUES (
  (SELECT id FROM personas WHERE dni = '38100001'),
  NULL,
  'GYM',
  (SELECT (pas_sabado_gym + TIME '10:00') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  (SELECT (pas_sabado_gym + TIME '11:00') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  'COMPLETADO',
  (SELECT id FROM usuarios WHERE email = 'maria.perez@mail.com')
);

-- T8: GYM — Ana canceló con la franja YA EMPEZADA (turno 09:00, aviso 09:01), el
-- viernes de hace una o dos semanas. Contracara de T5: acá el lugar NO se libera
-- y sigue contando para el cupo de esa franja y para el límite de un turno de
-- gym por día. Es el mismo criterio que rige AUSENTE: una vez iniciada la
-- franja, el lugar se consumió (RN-02, RN-03, RN-08). Relevado en el Centro
-- Deportivo Jerárquicos: "si el turno es a las 14:00 y a las 14:01 cancelan,
-- quedan bloqueados para ambos".
INSERT INTO turnos (
  persona_id, profesional_id, tipo_turno, inicio, fin, estado,
  reservado_por_usuario_id, cancelado_en, cancelado_por_usuario, motivo_cancelacion
) VALUES (
  (SELECT id FROM personas WHERE dni = '38100005'),
  NULL,
  'GYM',
  (SELECT (pas_viernes_gym + TIME '09:00') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  (SELECT (pas_viernes_gym + TIME '10:00') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  'CANCELADO_TARDE',
  (SELECT id FROM usuarios WHERE email = 'ana.fernandez@mail.com'),
  (SELECT (pas_viernes_gym + TIME '09:01') AT TIME ZONE 'America/Argentina/Buenos_Aires' FROM seed_ref),
  (SELECT id FROM usuarios WHERE email = 'ana.fernandez@mail.com'),
  'Avisé cuando la franja ya había arrancado.'
);

-- ---------------------------------------------------------------------------
-- 7. PAGOS — sesiones de consultorio
-- ---------------------------------------------------------------------------

-- Pago de la sesión completada de Carlos (T2)
INSERT INTO pagos (persona_id, concepto, monto, turno_id, registrado_por_usuario, medio) VALUES (
  (SELECT id FROM personas WHERE dni = '38100004'),
  'SESION_CONSULTORIO',
  8000.00,
  (SELECT id FROM turnos WHERE persona_id = (SELECT id FROM personas WHERE dni = '38100004')
     AND estado = 'COMPLETADO' LIMIT 1),
  (SELECT id FROM usuarios WHERE email = 'admin@vitalys.com'),
  'TRANSFERENCIA'
);

-- ---------------------------------------------------------------------------
-- 8. EXCEPCIONES DE MOROSIDAD
--    Juan García es el ÚNICO socio con excepción. Es coherente con su estado:
--    acumula 6 períodos impagos, alcanzó el umbral y quedó SUSPENDIDO para gym
--    (RN-01). Vence a los 30 días de la carga, así que siempre está vigente. La excepción es el mecanismo por el que el ADMIN levanta esa
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
  'El socio se comprometió a abonar las cuotas adeudadas dentro de los próximos 30 días. Se autoriza acceso temporario al gym.',
  (SELECT hoy + 30 FROM seed_ref)
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

-- Recordatorio del turno T1 (María) — simulado como ya enviado
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

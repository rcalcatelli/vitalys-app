-- =============================================================================
-- Vitalys App — V9: 21:00 y 12:00 son la HORA DE CIERRE, no el último inicio
--
-- Devolución de la 2.ª entrega (punto 5): la base aceptaba turnos de gimnasio
-- que empiezan a las 21:00 de lunes a viernes y a las 12:00 los sábados, es
-- decir que terminan a las 22:00 y a las 13:00. El wireframe W-08 termina en la
-- franja de 20:00 a 21:00. La tutora pidió aclarar cuál de las dos lecturas
-- vale.
--
-- No era un descuido: V2 y RN-14 decían "(inicio)" de forma explícita y
-- coincidían entre sí. Lo que nunca se unificó es que el resto de la
-- documentación —modulos.md, CA-08-1, W-08— escribe "de 07:00 a 21:00", que es
-- como se lee un horario de apertura. Dos lecturas coherentes conviviendo.
--
-- DECISIÓN: 21:00 y 12:00 son la hora de CIERRE. Nadie entrena después de que
-- el gimnasio cerró, y ofrecer una franja de 12:00 a 13:00 un sábado que se
-- anuncia "de 09:00 a 12:00" contradice lo que el socio lee en pantalla. El
-- último inicio posible pasa a ser 20:00 de lunes a viernes y 11:00 los
-- sábados: 14 franjas por día hábil y 3 los sábados.
--
-- Se expresa con un intervalo semiabierto [apertura, cierre) en lugar de
-- BETWEEN. BETWEEN incluye los dos extremos, y sobre la hora de cierre eso
-- habilita una franja entera fuera de horario — que es exactamente el error que
-- se está corrigiendo. El intervalo semiabierto además espeja la forma en que
-- ya se modela la franja del turno, [inicio, fin).
--
-- La función la invoca el CHECK chk_turno_gym_grilla, que la evalúa en cada
-- INSERT/UPDATE: no hace falta recrear la restricción. Sí hace falta verificar
-- que ninguna fila existente quede violando la regla nueva, porque PostgreSQL
-- no revalida las filas ya cargadas al redefinir una función. Eso lo hace el
-- bloque de control del final, que aborta la migración si encuentra alguna.
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_franja_gym_valida(p_inicio TIMESTAMPTZ, p_fin TIMESTAMPTZ)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
    SELECT p_fin - p_inicio = INTERVAL '1 hour'
       AND date_trunc('hour', l.ts) = l.ts
       AND (
            -- Lunes a viernes: abre 07:00, cierra 21:00 -> último inicio 20:00
            (EXTRACT(ISODOW FROM l.ts) BETWEEN 1 AND 5
                 AND l.ts::time >= TIME '07:00' AND l.ts::time < TIME '21:00')
            -- Sábado: abre 09:00, cierra 12:00 -> último inicio 11:00
         OR (EXTRACT(ISODOW FROM l.ts) = 6
                 AND l.ts::time >= TIME '09:00' AND l.ts::time < TIME '12:00')
       )
    FROM (SELECT p_inicio AT TIME ZONE 'America/Argentina/Buenos_Aires' AS ts) AS l;
$$;

COMMENT ON FUNCTION fn_franja_gym_valida(TIMESTAMPTZ, TIMESTAMPTZ) IS
    'Franja válida del gimnasio: 60 minutos exactos, con inicio en hora en punto '
    'y dentro del horario de apertura, evaluado en hora de Argentina. Lunes a '
    'viernes abre 07:00 y cierra 21:00 (último inicio 20:00); sábados abre 09:00 '
    'y cierra 12:00 (último inicio 11:00); domingo cerrado. La franja completa '
    'tiene que terminar antes o justo en la hora de cierre (RN-14).';

COMMENT ON CONSTRAINT chk_turno_gym_grilla ON turnos IS
    'Todo turno GYM cae en una franja válida de la grilla (RN-14). El horario '
    'declarado es de apertura a cierre: el último turno termina cuando el '
    'gimnasio cierra, no una hora después.';

-- -----------------------------------------------------------------------------
-- Control: ninguna fila existente puede quedar violando la grilla nueva.
-- Redefinir la función no revalida las filas ya cargadas.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    v_invalidos INT;
BEGIN
    SELECT COUNT(*) INTO v_invalidos
    FROM   turnos
    WHERE  tipo_turno = 'GYM'
      AND  NOT fn_franja_gym_valida(inicio, fin);

    IF v_invalidos > 0 THEN
        RAISE EXCEPTION
            'Hay % turno(s) de gimnasio fuera de la grilla nueva (última franja 20:00-21:00 L-V, 11:00-12:00 sáb). Reubicarlos antes de aplicar esta migración.',
            v_invalidos;
    END IF;
END $$;

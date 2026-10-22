-- =============================================================================
-- Vitalys App — V14: medio de pago
--
-- Cambio `pagos` (Sprint 5). El ADMIN registra a mano cada cobro (no hay pasarela
-- en el MVP) y tiene que dejar constancia de CÓMO se cobró: efectivo, transferencia,
-- débito o crédito. Mercado Pago llegará después con un ALTER TYPE ... ADD VALUE en
-- una migración aparte (no puede ir en la misma transacción que su primer uso).
--
-- La columna se agrega NOT NULL con DEFAULT 'EFECTIVO' para backfillear las filas que
-- ya existan (bases cargadas con el seed, Supabase) y se le quita el DEFAULT enseguida:
-- de acá en más cada INSERT tiene que decir el medio, nunca se asume uno.
-- =============================================================================

CREATE TYPE medio_pago AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'DEBITO', 'CREDITO');

ALTER TABLE pagos ADD COLUMN medio medio_pago NOT NULL DEFAULT 'EFECTIVO';
ALTER TABLE pagos ALTER COLUMN medio DROP DEFAULT;

COMMENT ON COLUMN pagos.medio IS 'Medio con el que se cobró, cargado a mano por el ADMIN (sin pasarela).';

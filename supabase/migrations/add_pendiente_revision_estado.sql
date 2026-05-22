    -- Migration: Add 'pendiente_revision' state to prestamos_equipo
    -- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New Query)
    --
    -- Context: When a user marks an equipment as returned via the app, the loan
    -- transitions to 'pendiente_revision' instead of 'devuelto'. The admin then
    -- reviews the physical condition of the returned equipment and either:
    --   1. Confirms it's OK → estado: 'devuelto', equipo: 'disponible'
    --   2. Marks it as damaged → estado: 'devuelto' with novedad, equipo: 'mantenimiento'
    --   3. Reassigns a similar device to the user → marks original as devuelto,
    --      creates a new 'activo' loan with the replacement equipment.

    -- Step 1: Remove the old CHECK constraint (if it exists)
    ALTER TABLE prestamos_equipo
    DROP CONSTRAINT IF EXISTS prestamos_equipo_estado_check;

    -- Step 2: Add the new CHECK constraint that includes 'pendiente_revision'
    ALTER TABLE prestamos_equipo
    ADD CONSTRAINT prestamos_equipo_estado_check
    CHECK (estado IN ('activo', 'vencido', 'devuelto', 'pendiente_revision'));

    -- Step 3: Verify (optional — can be run separately to confirm)
    -- SELECT DISTINCT estado FROM prestamos_equipo ORDER BY estado;

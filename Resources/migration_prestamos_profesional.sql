-- ═══════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Sistema profesional de gestión de préstamos de equipos
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Agregar columnas de condición y documentación
ALTER TABLE prestamos_equipo
  ADD COLUMN IF NOT EXISTS condicion_entrega      TEXT NOT NULL DEFAULT 'bueno'
    CHECK (condicion_entrega IN ('nuevo','excelente','bueno','regular','dano_leve')),
  ADD COLUMN IF NOT EXISTS condicion_devolucion   TEXT
    CHECK (condicion_devolucion IN ('excelente','bueno','regular','dano_leve','dano_grave','perdido')),
  ADD COLUMN IF NOT EXISTS foto_devolucion_url    TEXT,
  ADD COLUMN IF NOT EXISTS observaciones_devolucion TEXT,
  ADD COLUMN IF NOT EXISTS novedad                BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tipo_novedad           TEXT
    CHECK (tipo_novedad IN ('dano_fisico','dano_software','perdida','faltante_accesorio','entrega_tardia','otro')),
  ADD COLUMN IF NOT EXISTS descripcion_novedad    TEXT,
  ADD COLUMN IF NOT EXISTS notas_admin            TEXT,
  ADD COLUMN IF NOT EXISTS num_acta               TEXT;

-- 2. Generar num_acta para préstamos existentes
UPDATE prestamos_equipo
SET num_acta = 'ACT-' || TO_CHAR(COALESCE(created_at, NOW()), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(id::TEXT), 1, 6))
WHERE num_acta IS NULL;

-- 3. Restricción única en num_acta
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'prestamos_equipo_num_acta_unique'
  ) THEN
    ALTER TABLE prestamos_equipo ADD CONSTRAINT prestamos_equipo_num_acta_unique UNIQUE (num_acta);
  END IF;
END $$;

-- 4. Función + trigger para generar num_acta automáticamente al insertar
CREATE OR REPLACE FUNCTION generate_num_acta()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.num_acta IS NULL THEN
    NEW.num_acta := 'ACT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(MD5(NEW.id::TEXT), 1, 6));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_num_acta ON prestamos_equipo;
CREATE TRIGGER trigger_generate_num_acta
  BEFORE INSERT ON prestamos_equipo
  FOR EACH ROW EXECUTE FUNCTION generate_num_acta();

-- 5. FK usuario_id → public.usuarios (necesario para joins PostgREST)
-- Si ya existe una FK a auth.users, la reemplazamos para que PostgREST pueda
-- auto-detectar la relación con la tabla de perfiles.
ALTER TABLE prestamos_equipo
  DROP CONSTRAINT IF EXISTS prestamos_equipo_usuario_id_fkey;

ALTER TABLE prestamos_equipo
  ADD CONSTRAINT prestamos_equipo_usuario_id_fkey
  FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE;

-- 7. Crear bucket de almacenamiento para fotos de devolución (ejecutar si no existe)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('prestamos', 'prestamos', true)
-- ON CONFLICT (id) DO NOTHING;

-- 8. Policy para fotos de devolución — usuarios autenticados pueden subir
-- CREATE POLICY "Usuarios pueden subir fotos de devolucion"
--   ON storage.objects FOR INSERT TO authenticated
--   WITH CHECK (bucket_id = 'prestamos');

-- CREATE POLICY "Fotos de devolucion son publicas"
--   ON storage.objects FOR SELECT TO public
--   USING (bucket_id = 'prestamos');

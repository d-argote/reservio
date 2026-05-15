-- ============================================================
-- Migración 003: Préstamos de Equipo
-- Sprint 3 — Solicitar, asignar y devolver equipos
--
-- Ejecutar en: Supabase → SQL Editor → Run
-- ============================================================

-- 1. Sala de ubicación permanente en equipos
ALTER TABLE public.equipos
  ADD COLUMN IF NOT EXISTS sala_id UUID
    REFERENCES public.salas(id) ON DELETE SET NULL;

-- 2. Tabla de préstamos
CREATE TABLE IF NOT EXISTS public.prestamos_equipo (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id          UUID         NOT NULL REFERENCES public.equipos(id) ON DELETE CASCADE,
  usuario_id         UUID         NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  sala_id            UUID         REFERENCES public.salas(id)           ON DELETE SET NULL,
  fecha_inicio       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  fecha_fin_esperada TIMESTAMPTZ  NOT NULL,
  fecha_devolucion   TIMESTAMPTZ,
  estado             TEXT         NOT NULL DEFAULT 'activo'
                                  CHECK (estado IN ('activo', 'devuelto', 'vencido')),
  notas              TEXT,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 3. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_pe_usuario  ON public.prestamos_equipo (usuario_id);
CREATE INDEX IF NOT EXISTS idx_pe_equipo   ON public.prestamos_equipo (equipo_id);
CREATE INDEX IF NOT EXISTS idx_pe_estado   ON public.prestamos_equipo (estado);
CREATE INDEX IF NOT EXISTS idx_pe_fin      ON public.prestamos_equipo (fecha_fin_esperada);

-- 4. Row Level Security
ALTER TABLE public.prestamos_equipo ENABLE ROW LEVEL SECURITY;

-- Los usuarios ven únicamente sus propios préstamos
CREATE POLICY "prestamos_select_own"
  ON public.prestamos_equipo FOR SELECT
  USING (auth.uid() = usuario_id);

-- Los usuarios crean sus propios préstamos
CREATE POLICY "prestamos_insert_own"
  ON public.prestamos_equipo FOR INSERT
  WITH CHECK (auth.uid() = usuario_id);

-- Los usuarios actualizan sus propios préstamos (para devolver)
CREATE POLICY "prestamos_update_own"
  ON public.prestamos_equipo FOR UPDATE
  USING (auth.uid() = usuario_id);

-- Admins ven todo (via service_role — no necesita policy adicional)

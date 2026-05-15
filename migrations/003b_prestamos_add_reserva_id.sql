-- ============================================================
-- Migración 003b: Agregar reserva_id a prestamos_equipo
-- Ejecutar en: Supabase → SQL Editor → Run
-- ============================================================

-- Agregar columna reserva_id (nullable primero para no romper filas existentes)
ALTER TABLE public.prestamos_equipo
  ADD COLUMN IF NOT EXISTS reserva_id UUID
    REFERENCES public.reservas(id) ON DELETE CASCADE;

-- Índice de rendimiento
CREATE INDEX IF NOT EXISTS idx_pe_reserva
  ON public.prestamos_equipo (reserva_id);

-- Ejecutar en Supabase Studio local (localhost:54323)
-- Verificar que existe política SELECT pública para los buckets

-- Para bucket 'equipos':
CREATE POLICY "Public read equipos" ON storage.objects
FOR SELECT USING (bucket_id = 'equipos');

-- Para bucket 'salas':  
CREATE POLICY "Public read salas" ON storage.objects
FOR SELECT USING (bucket_id = 'salas');
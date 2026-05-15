-- ═══════════════════════════════════════════════════════════════════
-- SEED: 20 Salas + 20 Equipos — ITAM Reservio
-- Ejecutar en el SQL Editor de Supabase
-- ═══════════════════════════════════════════════════════════════════

-- ─── SALAS ─────────────────────────────────────────────────────────

INSERT INTO public.salas (nombre, descripcion, capacidad, ubicacion, estado) VALUES
  ('Sala de Conferencias A',    'Sala ejecutiva con pantalla 4K y sistema de videoconferencia.',  20, 'Edificio Principal, Piso 2', 'disponible'),
  ('Sala de Conferencias B',    'Sala equipada con proyector y pizarrón interactivo.',             16, 'Edificio Principal, Piso 2', 'disponible'),
  ('Sala Board ITAM',           'Sala de juntas directivas con mesa ovalada y sillones premium.', 12, 'Torre Administrativa, Piso 4', 'disponible'),
  ('Laboratorio de Cómputo 1',  'Lab con 30 estaciones Dell, acceso a software MATLAB y SPSS.',   30, 'Edificio Centro de Cómputo, PB', 'disponible'),
  ('Laboratorio de Cómputo 2',  'Lab con 30 estaciones HP, acceso a Adobe Creative Suite.',       30, 'Edificio Centro de Cómputo, Piso 1', 'disponible'),
  ('Aula Multimedia 101',       'Aula con proyector dual, sistema de audio y capacidad ambiental.',35, 'Edificio Académico, Piso 1', 'disponible'),
  ('Aula Multimedia 201',       'Aula con pantalla interactiva Smart Board de 86 pulgadas.',       40, 'Edificio Académico, Piso 2', 'disponible'),
  ('Sala de Estudio Grupal A',  'Espacio colaborativo con mesas modulares y pizarrones blancos.',  10, 'Biblioteca, Piso 1', 'disponible'),
  ('Sala de Estudio Grupal B',  'Sala silenciosa para trabajo en equipo con enchufes en mesa.',     8, 'Biblioteca, Piso 1', 'disponible'),
  ('Sala de Estudio Grupal C',  'Sala con paredes de vidrio y acceso a impresora en red.',          8, 'Biblioteca, Piso 2', 'disponible'),
  ('Sala de Posgrado 1',        'Sala para seminarios de maestría y doctorado con mesas en U.',    20, 'Edificio Posgrado, Piso 1', 'disponible'),
  ('Sala de Posgrado 2',        'Sala de defensa de tesis con sistema de grabación integrado.',    15, 'Edificio Posgrado, Piso 1', 'disponible'),
  ('Auditorio Norte',           'Auditorio principal con sonido envolvente y acceso para sillas.', 120,'Edificio Principal, PB',    'disponible'),
  ('Auditorio Sur',             'Auditorio secundario, ideal para presentaciones de proyectos.',    80, 'Edificio Académico, PB',    'disponible'),
  ('Sala de Innovación',        'Espacio maker con mesas altas, pantallas móviles y pizarrones.',  18, 'Centro de Innovación, PB',  'disponible'),
  ('Sala de Capacitación TI',   'Sala especializada en formación tecnológica con 20 laptops.',     20, 'Edificio Centro de Cómputo, Piso 2', 'disponible'),
  ('Cubículo de Investigación 1','Espacio para investigadores con escritorios individuales.',        6, 'Edificio Posgrado, Piso 2', 'disponible'),
  ('Cubículo de Investigación 2','Espacio para proyectos de investigación conjunta.',                6, 'Edificio Posgrado, Piso 2', 'disponible'),
  ('Sala de Reuniones Ejecutiva','Sala premium con equipo de telepresencia Cisco Webex.',           8, 'Torre Administrativa, Piso 3', 'mantenimiento'),
  ('Sala Creativa Digital',     'Estudio de diseño con iMacs y tabletas gráficas Wacom.',          12, 'Centro de Innovación, Piso 1', 'disponible');


-- ─── EQUIPOS ───────────────────────────────────────────────────────

INSERT INTO public.equipos (nombre, categoria, sistema_operativo, marca, tipo_equipo, estado, numero_serie) VALUES
  -- Laptops Windows
  ('Dell Latitude 5520 #1',    'ordenador', 'windows', 'dell',   'portatil',   'disponible',   'DL-LAT5520-001'),
  ('Dell Latitude 5520 #2',    'ordenador', 'windows', 'dell',   'portatil',   'disponible',   'DL-LAT5520-002'),
  ('HP EliteBook 840 G9 #1',   'ordenador', 'windows', 'hp',     'portatil',   'disponible',   'HP-EB840G9-001'),
  ('HP EliteBook 840 G9 #2',   'ordenador', 'windows', 'hp',     'portatil',   'reservado',    'HP-EB840G9-002'),
  ('Lenovo ThinkPad X1 Carbon #1','ordenador','windows','lenovo','portatil',   'disponible',   'LV-X1C-001'),
  ('Lenovo ThinkPad X1 Carbon #2','ordenador','windows','lenovo','portatil',   'mantenimiento','LV-X1C-002'),
  -- Laptops macOS
  ('MacBook Pro 14" M3 #1',    'ordenador', 'macos',   'apple',  'portatil',   'disponible',   'AP-MBP14M3-001'),
  ('MacBook Pro 14" M3 #2',    'ordenador', 'macos',   'apple',  'portatil',   'disponible',   'AP-MBP14M3-002'),
  ('MacBook Air M2 #1',        'ordenador', 'macos',   'apple',  'portatil',   'reservado',    'AP-MBA-M2-001'),
  -- iMac escritorio
  ('iMac 24" M3 #1',           'ordenador', 'macos',   'apple',  'escritorio', 'disponible',   'AP-IMAC24-001'),
  -- Tablets
  ('iPad Pro 12.9" #1',        'movil',     'ios',     'apple',  'tablet',     'disponible',   'AP-IPADPRO-001'),
  ('iPad Pro 12.9" #2',        'movil',     'ios',     'apple',  'tablet',     'disponible',   'AP-IPADPRO-002'),
  ('Samsung Galaxy Tab S9 #1', 'movil',     'android', 'samsung','tablet',     'disponible',   'SS-TABS9-001'),
  -- Periféricos
  ('Proyector Epson EB-L200 #1','periferico', null,    'Epson',  'proyector',  'disponible',   'EP-EBL200-001'),
  ('Proyector Epson EB-L200 #2','periferico', null,    'Epson',  'proyector',  'disponible',   'EP-EBL200-002'),
  ('Monitor LG 27" 4K #1',     'periferico', null,    'LG',     'monitor',    'disponible',   'LG-27UK850-001'),
  ('Monitor LG 27" 4K #2',     'periferico', null,    'LG',     'monitor',    'mantenimiento','LG-27UK850-002'),
  ('Webcam Logitech C920 #1',  'periferico', null,    'Logitech','webcam',     'disponible',   'LT-C920-001'),
  ('Impresora HP LaserJet Pro','periferico', null,     'HP',     'impresora',  'disponible',   'HP-LJPRO-001'),
  -- Mobiliario
  ('Pizarrón Interactivo Smart Board 75"', 'mobiliario', null, 'Smart',  'pizarron', 'disponible', 'SM-BOARD75-001');


-- ═══════════════════════════════════════════════════════════════════
-- SEED: 20 Reservas + Reserva_Equipos — ITAM Reservio
-- Requiere: salas y equipos ya insertados + al menos 1 usuario en
--           public.usuarios (tabla espejo de auth.users del proyecto)
-- ═══════════════════════════════════════════════════════════════════

DO $$
DECLARE
  -- ── Salas ────────────────────────────────────────────────────────
  v_conf_a      uuid;
  v_conf_b      uuid;
  v_board       uuid;
  v_lab1        uuid;
  v_lab2        uuid;
  v_aula101     uuid;
  v_aula201     uuid;
  v_estudio_a   uuid;
  v_estudio_b   uuid;
  v_posgrado1   uuid;
  v_posgrado2   uuid;
  v_innovacion  uuid;
  v_cap_ti      uuid;
  v_creativa    uuid;

  -- ── Equipos ──────────────────────────────────────────────────────
  v_eq_dell1    uuid;
  v_eq_dell2    uuid;
  v_eq_hp2      uuid;   -- estado reservado
  v_eq_lenovo1  uuid;
  v_eq_mbp1     uuid;
  v_eq_mbp2     uuid;
  v_eq_mba1     uuid;   -- estado reservado
  v_eq_ipad1    uuid;
  v_eq_ipad2    uuid;
  v_eq_proy1    uuid;
  v_eq_proy2    uuid;
  v_eq_webcam   uuid;

  -- ── Usuarios (tomados de public.usuarios) ────────────────────────
  v_u1          uuid;
  v_u2          uuid;
  v_u3          uuid;

  -- ── IDs de reservas (para vincular equipos) ──────────────────────
  v_r1  uuid; v_r2  uuid; v_r3  uuid; v_r4  uuid; v_r5  uuid;
  v_r6  uuid; v_r7  uuid; v_r8  uuid; v_r9  uuid; v_r10 uuid;
  v_r11 uuid; v_r12 uuid; v_r13 uuid; v_r14 uuid; v_r15 uuid;
  v_r16 uuid; v_r17 uuid; v_r18 uuid; v_r19 uuid; v_r20 uuid;

BEGIN

  -- ── Resolver IDs de salas ─────────────────────────────────────────
  SELECT id INTO v_conf_a     FROM public.salas WHERE nombre = 'Sala de Conferencias A'    LIMIT 1;
  SELECT id INTO v_conf_b     FROM public.salas WHERE nombre = 'Sala de Conferencias B'    LIMIT 1;
  SELECT id INTO v_board      FROM public.salas WHERE nombre = 'Sala Board ITAM'            LIMIT 1;
  SELECT id INTO v_lab1       FROM public.salas WHERE nombre = 'Laboratorio de Cómputo 1'  LIMIT 1;
  SELECT id INTO v_lab2       FROM public.salas WHERE nombre = 'Laboratorio de Cómputo 2'  LIMIT 1;
  SELECT id INTO v_aula101    FROM public.salas WHERE nombre = 'Aula Multimedia 101'        LIMIT 1;
  SELECT id INTO v_aula201    FROM public.salas WHERE nombre = 'Aula Multimedia 201'        LIMIT 1;
  SELECT id INTO v_estudio_a  FROM public.salas WHERE nombre = 'Sala de Estudio Grupal A'  LIMIT 1;
  SELECT id INTO v_estudio_b  FROM public.salas WHERE nombre = 'Sala de Estudio Grupal B'  LIMIT 1;
  SELECT id INTO v_posgrado1  FROM public.salas WHERE nombre = 'Sala de Posgrado 1'        LIMIT 1;
  SELECT id INTO v_posgrado2  FROM public.salas WHERE nombre = 'Sala de Posgrado 2'        LIMIT 1;
  SELECT id INTO v_innovacion FROM public.salas WHERE nombre = 'Sala de Innovación'        LIMIT 1;
  SELECT id INTO v_cap_ti     FROM public.salas WHERE nombre = 'Sala de Capacitación TI'  LIMIT 1;
  SELECT id INTO v_creativa   FROM public.salas WHERE nombre = 'Sala Creativa Digital'     LIMIT 1;

  -- ── Resolver IDs de equipos ───────────────────────────────────────
  SELECT id INTO v_eq_dell1   FROM public.equipos WHERE numero_serie = 'DL-LAT5520-001'  LIMIT 1;
  SELECT id INTO v_eq_dell2   FROM public.equipos WHERE numero_serie = 'DL-LAT5520-002'  LIMIT 1;
  SELECT id INTO v_eq_hp2     FROM public.equipos WHERE numero_serie = 'HP-EB840G9-002'  LIMIT 1;
  SELECT id INTO v_eq_lenovo1 FROM public.equipos WHERE numero_serie = 'LV-X1C-001'      LIMIT 1;
  SELECT id INTO v_eq_mbp1    FROM public.equipos WHERE numero_serie = 'AP-MBP14M3-001'  LIMIT 1;
  SELECT id INTO v_eq_mbp2    FROM public.equipos WHERE numero_serie = 'AP-MBP14M3-002'  LIMIT 1;
  SELECT id INTO v_eq_mba1    FROM public.equipos WHERE numero_serie = 'AP-MBA-M2-001'   LIMIT 1;
  SELECT id INTO v_eq_ipad1   FROM public.equipos WHERE numero_serie = 'AP-IPADPRO-001'  LIMIT 1;
  SELECT id INTO v_eq_ipad2   FROM public.equipos WHERE numero_serie = 'AP-IPADPRO-002'  LIMIT 1;
  SELECT id INTO v_eq_proy1   FROM public.equipos WHERE numero_serie = 'EP-EBL200-001'   LIMIT 1;
  SELECT id INTO v_eq_proy2   FROM public.equipos WHERE numero_serie = 'EP-EBL200-002'   LIMIT 1;
  SELECT id INTO v_eq_webcam  FROM public.equipos WHERE numero_serie = 'LT-C920-001'     LIMIT 1;

  -- ── Resolver IDs de usuarios ──────────────────────────────────────
  -- Toma los primeros 3 usuarios disponibles; si hay menos usa el mismo.
  SELECT id INTO v_u1 FROM public.usuarios ORDER BY created_at LIMIT 1 OFFSET 0;
  SELECT id INTO v_u2 FROM public.usuarios ORDER BY created_at LIMIT 1 OFFSET 1;
  SELECT id INTO v_u3 FROM public.usuarios ORDER BY created_at LIMIT 1 OFFSET 2;
  IF v_u1 IS NULL THEN
    RAISE EXCEPTION 'No hay usuarios en public.usuarios. Registra al menos uno antes de ejecutar este seed.';
  END IF;
  IF v_u2 IS NULL THEN v_u2 := v_u1; END IF;
  IF v_u3 IS NULL THEN v_u3 := v_u1; END IF;

  -- ════════════════════════════════════════════════════════════════
  -- RESERVAS — mix de pasadas / hoy / futuras y estados variados
  -- ════════════════════════════════════════════════════════════════

  -- ── Pasadas (abril 2026) ─────────────────────────────────────────
  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u1, v_conf_a,    'Reunión de Planeación Q2',          '2026-04-07', '09:00', '11:00', 'confirmada')
    RETURNING id INTO v_r1;

  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u2, v_aula101,   'Clase de Economía Avanzada',        '2026-04-09', '10:00', '12:00', 'confirmada')
    RETURNING id INTO v_r2;

  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u3, v_lab1,      'Taller MATLAB — Finanzas',          '2026-04-14', '08:00', '10:00', 'confirmada')
    RETURNING id INTO v_r3;

  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u1, v_board,     'Sesión de Consejo Directivo',       '2026-04-16', '15:00', '17:00', 'confirmada')
    RETURNING id INTO v_r4;

  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u2, v_posgrado2, 'Defensa de Tesis — Carlos López',   '2026-04-23', '10:00', '13:00', 'confirmada')
    RETURNING id INTO v_r5;

  -- ── Pasadas (mayo 2026, sem 1-2) ─────────────────────────────────
  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u3, v_conf_b,    'Presentación de Proyecto Final',    '2026-05-05', '14:00', '16:00', 'confirmada')
    RETURNING id INTO v_r6;

  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u1, v_innovacion,'Sprint Review — Startup ITAM',      '2026-05-07', '09:00', '11:30', 'confirmada')
    RETURNING id INTO v_r7;

  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u2, v_aula201,   'Exposición de Diseño Digital',      '2026-05-12', '11:00', '13:00', 'confirmada')
    RETURNING id INTO v_r8;

  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u3, v_estudio_a, 'Estudio Grupal — Micro II',         '2026-05-13', '16:00', '18:00', 'cancelada')
    RETURNING id INTO v_r9;

  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u1, v_cap_ti,    'Capacitación Supabase & Next.js',   '2026-05-14', '09:00', '12:00', 'confirmada')
    RETURNING id INTO v_r10;

  -- ── Hoy (15 mayo 2026) ───────────────────────────────────────────
  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u2, v_conf_a,    'Demo Day — Proyectos Semestre',     '2026-05-15', '10:00', '12:00', 'confirmada')
    RETURNING id INTO v_r11;

  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u3, v_lab2,      'Práctica Adobe Creative Suite',     '2026-05-15', '14:00', '17:00', 'confirmada')
    RETURNING id INTO v_r12;

  -- ── Futuras — semana del 18 mayo ─────────────────────────────────
  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u1, v_posgrado1, 'Seminario de Investigación',        '2026-05-18', '09:00', '11:00', 'confirmada')
    RETURNING id INTO v_r13;

  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u2, v_board,     'Revisión de Presupuesto Anual',     '2026-05-19', '15:00', '17:00', 'pendiente')
    RETURNING id INTO v_r14;

  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u3, v_aula101,   'Clase de Econometría Aplicada',     '2026-05-20', '08:00', '10:00', 'confirmada')
    RETURNING id INTO v_r15;

  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u1, v_creativa,  'Workshop de UX/UI Design',          '2026-05-21', '10:00', '14:00', 'confirmada')
    RETURNING id INTO v_r16;

  -- ── Futuras — semana del 25 mayo ─────────────────────────────────
  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u2, v_conf_b,    'Kick-off Proyecto de Graduación',   '2026-05-25', '13:00', '15:00', 'pendiente')
    RETURNING id INTO v_r17;

  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u3, v_innovacion,'Hackathon ITAM — Sesión Vespertina','2026-05-26', '14:00', '20:00', 'confirmada')
    RETURNING id INTO v_r18;

  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u1, v_estudio_b, 'Repaso Final — Mercados Financieros','2026-05-28', '17:00', '19:00', 'pendiente')
    RETURNING id INTO v_r19;

  INSERT INTO public.reservas (usuario_id, sala_id, titulo, fecha, hora_inicio, hora_fin, estado)
    VALUES (v_u2, v_posgrado1, 'Examen de Comprensión Oral',        '2026-05-29', '09:00', '11:00', 'confirmada')
    RETURNING id INTO v_r20;

  -- ════════════════════════════════════════════════════════════════
  -- RESERVA_EQUIPOS — equipos vinculados a reservas activas/futuras
  -- Los equipos con estado='reservado' DEBEN aparecer aquí.
  -- ════════════════════════════════════════════════════════════════

  -- r3: Taller MATLAB — Dell #1 + Lenovo #1
  INSERT INTO public.reserva_equipos (reserva_id, equipo_id) VALUES (v_r3,  v_eq_dell1);
  INSERT INTO public.reserva_equipos (reserva_id, equipo_id) VALUES (v_r3,  v_eq_lenovo1);

  -- r7: Sprint Review — MacBook Pro #1
  INSERT INTO public.reserva_equipos (reserva_id, equipo_id) VALUES (v_r7,  v_eq_mbp1);

  -- r10: Capacitación TI — Dell #2 + MacBook Pro #2
  INSERT INTO public.reserva_equipos (reserva_id, equipo_id) VALUES (v_r10, v_eq_dell2);
  INSERT INTO public.reserva_equipos (reserva_id, equipo_id) VALUES (v_r10, v_eq_mbp2);

  -- r11: Demo Day (hoy) — HP EliteBook #2 (reservado) + Proyector #1
  INSERT INTO public.reserva_equipos (reserva_id, equipo_id) VALUES (v_r11, v_eq_hp2);
  INSERT INTO public.reserva_equipos (reserva_id, equipo_id) VALUES (v_r11, v_eq_proy1);

  -- r12: Práctica Creative (hoy) — MacBook Air M2 (reservado) + iPad #1
  INSERT INTO public.reserva_equipos (reserva_id, equipo_id) VALUES (v_r12, v_eq_mba1);
  INSERT INTO public.reserva_equipos (reserva_id, equipo_id) VALUES (v_r12, v_eq_ipad1);

  -- r13: Seminario — iPad #2 + Webcam
  INSERT INTO public.reserva_equipos (reserva_id, equipo_id) VALUES (v_r13, v_eq_ipad2);
  INSERT INTO public.reserva_equipos (reserva_id, equipo_id) VALUES (v_r13, v_eq_webcam);

  -- r16: Workshop UX — MacBook Pro #1 + Proyector #2
  INSERT INTO public.reserva_equipos (reserva_id, equipo_id) VALUES (v_r16, v_eq_mbp1);
  INSERT INTO public.reserva_equipos (reserva_id, equipo_id) VALUES (v_r16, v_eq_proy2);

  -- r18: Hackathon — Dell #1 + Dell #2 + Lenovo #1
  INSERT INTO public.reserva_equipos (reserva_id, equipo_id) VALUES (v_r18, v_eq_dell1);
  INSERT INTO public.reserva_equipos (reserva_id, equipo_id) VALUES (v_r18, v_eq_dell2);
  INSERT INTO public.reserva_equipos (reserva_id, equipo_id) VALUES (v_r18, v_eq_lenovo1);

  RAISE NOTICE 'Seed completado: 20 reservas + equipos vinculados insertados correctamente.';

END $$;


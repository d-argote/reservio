const fs = require('fs');

const page = fs.readFileSync('app/main-menu/page.tsx', 'utf8');
const lines = page.split('\n');

function getBlock(startStr, endStr) {
  const start = lines.findIndex(l => l.includes(startStr));
  const end = lines.findIndex((l, i) => i > start && l.includes(endStr));
  if (start === -1 || end === -1) return [];
  return lines.slice(start, end);
}

function getBlockRegex(startRegex, endRegex) {
  const start = lines.findIndex(l => startRegex.test(l));
  const end = lines.findIndex((l, i) => i > start && endRegex.test(l));
  if (start === -1 || end === -1) return [];
  return lines.slice(start, end);
}

// Imports for AdminTab
let adminTabContent = `
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { supabase } from '@/lib/supabase/client'
import {
  getUsuarios, updateUserRole,
  getEquipos, getEquiposRetornos, recalcularEstadosEquiposDB, getPrestamosAdmin, getAlertasEquiposAdmin, getPrestamosAdminHistorial,
  createEquipo, updateEquipo, deleteEquipo, uploadImagen,
  getSalasAdmin, createSala, updateSala, deleteSala,
  devolucionAdmin, confirmarRevision, reasignarEquipo, getReportData,
  type PrestamoEquipoAdmin, type AlertaEquipoAdmin, type ReportData
} from '@/features/admin/actions'
import type { UsuarioAdmin, Equipo, SalaAdmin } from '@/features/admin/types'
import { TIPO_EQUIPO_LABELS, TIPO_EQUIPO_OPTIONS } from '@/lib/equipo-catalogo'
import {
  formatFecha, formatDuracion, generarCodigoActivo, getBogotaNow,
  CONDICION_LABEL, CONDICION_COLOR, CONDICION_ICON, NOVEDAD_LABEL,
  CONDICIONES_ENTREGA, CONDICIONES_DEVOLUCION, TIPOS_NOVEDAD,
  SkeletonSummaryCard, SkeletonRoomCard,
  adminValidateNombre, adminValidateEmail, adminValidatePassword, AdminPasswordRequirements
} from './helpers'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler)

export interface AdminTabProps {
  userProfile: { nombre: string; rol: string } | null
  showGlobalError: (msg: string) => void
}

export function AdminTab({ userProfile, showGlobalError }: AdminTabProps) {
`;

// Extract states
const states1 = getBlock('// ── HU-06: Admin — Usuarios', '// ── Sprint 3: Usuario actual + operaciones reservas');
const states2 = getBlock('// ── Sprint 3: Reportes', '// ── Historial de reservas del usuario');

adminTabContent += states1.join('\n') + '\n';
adminTabContent += states2.join('\n') + '\n';

// Extract functions
const funcs1 = getBlock('const loadUsuarios = useCallback(async () => {', 'const handleAdminTab = useCallback(() => {');
const funcs2 = getBlock('const loadReports = useCallback(async () => {', 'const loadHistorialReservas = useCallback(async () => {');
const funcs3 = getBlock('const handleExportPDF = () => {', 'const navItems = [');

adminTabContent += funcs1.join('\n') + '\n';
adminTabContent += funcs2.join('\n') + '\n';
adminTabContent += funcs3.join('\n') + '\n';

// UseEffects for AdminTab
adminTabContent += `
  useEffect(() => {
    loadUsuarios()
    loadEquipos()
    loadSalasAdmin()
    loadReports()
  }, [loadUsuarios, loadEquipos, loadSalasAdmin, loadReports])
`;

// Extract JSX
const jsxStart = lines.findIndex(l => l.includes("{activeTab === 'admin' && ("));
// JSX ends before Bottom nav
const jsxEnd = lines.findIndex((l, i) => i > jsxStart && l.includes("{/* ── Bottom nav (mobile) ────────────────────────────────── */}"));

const jsxLines = lines.slice(jsxStart + 1, jsxEnd - 4); // Strip the wrapper slightly

// Wait, the Admin modals are below Bottom Nav!
const modalsStart = lines.findIndex(l => l.includes("{/* ── MODALES ADMIN Y DEMÁS ── */}")) || lines.findIndex(l => l.includes("{/* ══ MODAL: DEVOLUCIÓN ADMIN"));
const modalsEnd = lines.length - 2; // Before final `}` of component
const modalsLines = lines.slice(5973, modalsEnd); // Using explicit line number found earlier

adminTabContent += `
  return (
    <>
      ${jsxLines.join('\n')}
      ${modalsLines.join('\n')}
    </>
  )
}
`;

fs.writeFileSync('app/main-menu/_components/AdminTab.tsx', adminTabContent);
console.log('AdminTab.tsx generated successfully.');

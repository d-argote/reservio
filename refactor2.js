const fs = require('fs');

function extractCode() {
  const code = fs.readFileSync('app/main-menu/page.tsx', 'utf8');
  let lines = code.split('\n');
  
  // Create an array to keep track of lines to keep in page.tsx
  let keepLines = new Array(lines.length).fill(true);
  
  const findLine = (str, startIdx = 0) => {
      if (startIdx === -1) return -1;
      for (let i = startIdx; i < lines.length; i++) {
          if (lines[i].includes(str)) return i;
      }
      return -1;
  };
  
  const extractSection = (startStr, endStr) => {
    const s = findLine(startStr);
    if (s === -1) return [];
    let e = findLine(endStr, s);
    // if endStr not found, just return empty to avoid error
    if (e === -1) e = s; 
    
    // Mark for deletion
    for(let i=s; i<e; i++) keepLines[i] = false;
    
    return lines.slice(s, e);
  };

  // We need Admin states:
  const adminStates = extractSection('// ── HU-06: Admin — Usuarios', '// ── Sprint 3: Usuario actual + operaciones reservas');
  const reportStates = extractSection('// ── Sprint 3: Reportes', '// ── Historial de reservas del usuario');
  
  // Admin functions
  // from loadUsuarios to handleRoleChange... wait, the user CRUD, sala CRUD
  // Let's find specific functions and delete them.
  const adminFuncsStart = findLine('const loadUsuarios = useCallback(async () => {');
  const adminFuncsEnd = findLine('const fetchReservas = useCallback(async (uid: string) => {');
  let adminFuncs = [];
  if (adminFuncsStart !== -1 && adminFuncsEnd !== -1) {
      adminFuncs = lines.slice(adminFuncsStart, adminFuncsEnd);
      for(let i = adminFuncsStart; i < adminFuncsEnd; i++) keepLines[i] = false;
  }
  
  // Reports functions
  const reportFuncsStart = findLine('const handlePageChangeReservas = (newPage: number) => setReportPageReservas(newPage)');
  const reportFuncsEnd = findLine('// ── Render ────────────────────────────────────────────────────────');
  let reportFuncs = [];
  if (reportFuncsStart !== -1 && reportFuncsEnd !== -1) {
      reportFuncs = lines.slice(reportFuncsStart, reportFuncsEnd);
      for(let i = reportFuncsStart; i < reportFuncsEnd; i++) keepLines[i] = false;
  }

  // Admin Tab JSX
  const adminTabJSXStart = findLine("{activeTab === 'admin' && (");
  const adminTabJSXEnd = findLine("{/* ── TOASTS Y MODALES GLOBALES ── */}");
  let adminTabJSX = [];
  if (adminTabJSXStart !== -1 && adminTabJSXEnd !== -1) {
     // Wait, the bottom nav is before the modals!
     // We need the admin tab content and the admin modals.
     // Let's just put all Admin logic inside AdminTab.tsx.
  }
  
  console.log("Found:", adminStates.length, reportStates.length, adminFuncs.length, reportFuncs.length);
}

extractCode();

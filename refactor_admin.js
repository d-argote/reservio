const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'app', 'main-menu', 'page.tsx');

let content = fs.readFileSync(pagePath, 'utf8');
const lines = content.split('\n');

function findLine(str, startIdx = 0) {
    if (startIdx === -1) return -1;
    for (let i = startIdx; i < lines.length; i++) {
        if (lines[i].includes(str)) return i + 1; // 1-indexed for grep style
    }
    return -1;
}

const stateStart = findLine('// ── HU-06: Admin — Usuarios');
const stateEnd = findLine('// ── Sprint 3: Usuario actual + operaciones reservas');

const funcStart = findLine('const loadUsuarios = useCallback');
const funcEnd = findLine('// ── Historial de reservas del usuario');

const uiAdminSubtabsStart = findLine('{/* ── ADMIN SUB-TABS ── */}');
const uiAdminSubtabsEnd = findLine('{/* ── TABS CONTENT ── */}', uiAdminSubtabsStart);

const uiAdminContentUsers = findLine("{adminSubTab === 'users' && (");
const uiAdminContentEquipment = findLine("{adminSubTab === 'equipment' && (() => {");
const uiAdminContentRooms = findLine("{adminSubTab === 'rooms' && (");
const uiAdminContentReports = findLine("{adminSubTab === 'reports' && (() => {");

console.log(JSON.stringify({
    stateStart, stateEnd, funcStart, funcEnd, uiAdminSubtabsStart, uiAdminSubtabsEnd,
    uiAdminContentUsers, uiAdminContentEquipment, uiAdminContentRooms, uiAdminContentReports
}, null, 2));

const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'app', 'main-menu', 'page.tsx');
let lines = fs.readFileSync(pagePath, 'utf8').split('\n');

function findLine(str, startIdx = 0) {
    if (startIdx === -1) return -1;
    for (let i = startIdx; i < lines.length; i++) {
        if (lines[i].includes(str)) return i;
    }
    return -1;
}

// 1. STATE EXTRACTION (464 to 606, plus 618-628 for reports)
const s1 = findLine('  // ── HU-06: Admin — Usuarios');
const e1 = findLine('  // ── Sprint 3: Usuario actual + operaciones reservas');
const s2 = findLine('  // ── Sprint 3: Reportes');
const e2 = findLine('  // ── Historial de reservas del usuario');

// 2. FUNCTIONS EXTRACTION
const f1 = findLine('  // ── HU-06: Cargar usuarios');
const endFuncs = findLine('  return ('); 

// 3. UI EXTRACTION
// The admin tab JSX starts around 2992. Let's find exactly where TabContent for admin is.
// Let's look for `<TabContent tabKey={activeTab === 'admin' ? \`admin-${adminSubTab}\` : activeTab}>`
const tabContentAdmin = findLine('tabKey={activeTab === \'admin\' ?');

console.log({
    s1, e1, s2, e2, f1, endFuncs, tabContentAdmin
});

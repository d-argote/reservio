# Sistema de Gestión de Inventario y Reserva de Equipos (ITAM)
## Documentación Técnica y Modelo de Datos

### 1. Modelo de Datos (Esquema Relacional)

Para asegurar la integridad y trazabilidad, utilizaremos un enfoque relacional. A continuación, el esquema en formato JSON representativo para un objeto `Equipo`.

```json
{
  "assets": [
    {
      "id": "UUID",
      "asset_tag": "IT-2023-001", // ID Interno
      "serial_number": "SN1234567890", // Único
      "mac_address": "00:0A:95:9D:68:16",
      "hierarchy": {
        "category_id": "ORDENADOR", // Ordenador, Móvil
        "os_id": "WINDOWS_11",      // Dependiente de categoría
        "brand_id": "DELL",
        "model_type": "PORTATIL"   // Portátil, Tablet, Desktop
      },
      "lifecycle": {
        "status": "DISPONIBLE", // Enum: DISPONIBLE, EN_USO, MANTENIMIENTO, DAÑADO, BAJA
        "entry_date": "2023-10-01T10:00:00Z",
        "last_maintenance": "2023-12-15T08:30:00Z"
      },
      "current_allocation": {
        "user_id": null,
        "checkout_date": null,
        "due_date": null
      }
    }
  ],
  "transactions": [
    {
      "id": "UUID",
      "asset_id": "UUID_EQUIPO",
      "user_id": "UUID_USUARIO",
      "type": "CHECK_OUT", // CHECK_OUT, CHECK_IN
      "timestamp": "2024-01-20T09:00:00Z",
      "expected_return": "2024-01-22T17:00:00Z",
      "notes": "Reserva para laboratorio de redes"
    }
  ]
}
```

### 2. Máquina de Estados (Lifecycle Management)

Para evitar errores lógicos (como reservar un equipo dañado), implementamos una máquina de estados finitos (FSM):

*   **DISPONIBLE:** Estado inicial. Permite transición a `EN_USO` (Reserva) o `MANTENIMIENTO`.
*   **EN_USO:** Bloqueado para nuevas reservas. Solo transiciona a `DISPONIBLE` (tras Check-in) o `DAÑADO`.
*   **MANTENIMIENTO / DAÑADO:** Bloqueado para reservas. Solo transiciona a `DISPONIBLE` tras validación técnica.
*   **DADO DE BAJA:** Estado terminal. No permite más transiciones.

### 3. Lógica de Filtros en Cascada (React Pseudo-code)

```javascript
const [filters, setFilters] = useState({
  category: '',
  os: '',
  brand: '',
  type: ''
});

// Regla de Oro: Reset Automático
const handleFilterChange = (level, value) => {
  const newFilters = { ...filters, [level]: value };
  
  if (level === 'category') {
    newFilters.os = '';
    newFilters.brand = '';
    newFilters.type = '';
  } else if (level === 'os') {
    newFilters.brand = '';
    newFilters.type = '';
  } else if (level === 'brand') {
    newFilters.type = '';
  }
  
  setFilters(newFilters);
};

// Renderizado condicional de selects
return (
  <>
    <Select value={filters.category} onChange={(e) => handleFilterChange('category', e.target.value)} />
    <Select 
      disabled={!filters.category} 
      value={filters.os} 
      onChange={(e) => handleFilterChange('os', e.target.value)} 
    />
    {/* ... sucesivos filtros */}
  </>
);
```
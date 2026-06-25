import { useState, useEffect, useCallback } from 'react';
import api from '../../context/AuthContext';

export default function Empleados() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get(`/empleados${search ? `?search=${encodeURIComponent(search)}` : ''}`);
      setRows(r.data);
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="md:ml-56 space-y-4">
      <h1 className="text-xl font-bold">Empleados ({rows.length})</h1>
      <input className="input" placeholder="Buscar por número o nombre..." value={search}
        onChange={e => setSearch(e.target.value)} />
      {loading && <p className="text-center text-gray-400 py-8">Cargando...</p>}
      <div className="space-y-2">
        {rows.map(e => (
          <div key={e.id} className="card">
            <p className="font-semibold">{e.nombre_completo}</p>
            <p className="text-xs text-gray-500">#{e.numero_empleado} · {e.posicion}</p>
            <p className="text-xs text-gray-400">{e.departamento} · {e.plaza}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

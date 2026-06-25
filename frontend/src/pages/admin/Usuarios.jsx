import { useState, useEffect } from 'react';
import api from '../../context/AuthContext';
import Modal from '../../components/Modal';

export default function Usuarios() {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ username:'', password:'', nombre:'', rol:'auditor' });
  const [error, setError] = useState('');

  const cargar = () => api.get('/usuarios').then(r => setUsers(r.data)).catch(() => {});
  useEffect(() => { cargar(); }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/usuarios', form);
      setModal(false);
      setForm({ username:'', password:'', nombre:'', rol:'auditor' });
      cargar();
    } catch (e) { setError(e.response?.data?.error || 'Error'); }
  };

  const toggleActive = async (u) => {
    await api.patch(`/usuarios/${u.id}`, { is_active: !u.is_active });
    cargar();
  };

  return (
    <div className="md:ml-56 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Usuarios</h1>
        <button onClick={() => setModal(true)} className="bg-brand-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-800">+ Nuevo</button>
      </div>
      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="card flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{u.nombre}</p>
              <p className="text-xs text-gray-500">@{u.username} · <span className="capitalize">{u.rol}</span></p>
            </div>
            <button onClick={() => toggleActive(u)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {u.is_active ? 'Activo' : 'Inactivo'}
            </button>
          </div>
        ))}
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo usuario">
        <form onSubmit={guardar} className="space-y-3">
          {[['username','Usuario','text'],['password','Contraseña','password'],['nombre','Nombre completo','text']].map(([k,l,t]) => (
            <div key={k}>
              <label className="label">{l}</label>
              <input className="input" type={t} value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} required />
            </div>
          ))}
          <div>
            <label className="label">Rol</label>
            <select className="input" value={form.rol} onChange={e => setForm(p => ({ ...p, rol: e.target.value }))}>
              <option value="auditor">Auditor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn-primary">Crear usuario</button>
        </form>
      </Modal>
    </div>
  );
}

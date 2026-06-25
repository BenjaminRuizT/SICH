import { useState, useEffect } from 'react';
import api from '../../context/AuthContext';
import Modal from '../../components/Modal';

const EMPTY_FORM = { username: '', password: '', nombre: '', rol: 'auditor' };

export default function Usuarios() {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState({ nombre: '', rol: '', password: '' });
  const [error, setError] = useState('');

  const cargar = () => api.get('/usuarios').then(r => setUsers(r.data)).catch(() => {});
  useEffect(() => { cargar(); }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/usuarios', form);
      setModal(false);
      setForm(EMPTY_FORM);
      cargar();
    } catch (e) { setError(e.response?.data?.error || 'Error'); }
  };

  const openEdit = (u) => {
    setEditTarget(u);
    setEditForm({ nombre: u.nombre, rol: u.rol, password: '' });
    setError('');
  };

  const guardarEdit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const payload = { nombre: editForm.nombre, rol: editForm.rol };
      if (editForm.password) payload.password = editForm.password;
      await api.patch(`/usuarios/${editTarget.id}`, payload);
      setEditTarget(null);
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
        <button onClick={() => { setModal(true); setError(''); }}
          className="bg-brand-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-800">
          + Nuevo
        </button>
      </div>

      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className="card flex items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{u.nombre}</p>
              <p className="text-xs text-gray-500">@{u.username} · <span className="capitalize">{u.rol}</span></p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => openEdit(u)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200">
                Editar
              </button>
              <button onClick={() => toggleActive(u)}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${u.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                {u.is_active ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal nuevo usuario */}
      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo usuario">
        <form onSubmit={guardar} className="space-y-3">
          {[['username', 'Usuario', 'text'], ['password', 'Contraseña', 'password'], ['nombre', 'Nombre completo', 'text']].map(([k, l, t]) => (
            <div key={k}>
              <label className="label">{l}</label>
              <input className="input" type={t} value={form[k]}
                onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))} required />
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

      {/* Modal editar usuario */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Editar: ${editTarget?.username}`}>
        <form onSubmit={guardarEdit} className="space-y-3">
          <div>
            <label className="label">Nombre completo</label>
            <input className="input" type="text" value={editForm.nombre}
              onChange={e => setEditForm(p => ({ ...p, nombre: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Rol</label>
            <select className="input" value={editForm.rol}
              onChange={e => setEditForm(p => ({ ...p, rol: e.target.value }))}>
              <option value="auditor">Auditor</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <div>
            <label className="label">Nueva contraseña <span className="text-gray-400 font-normal">(dejar vacío para no cambiar)</span></label>
            <input className="input" type="password" value={editForm.password}
              onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
              placeholder="••••••••" />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn-primary">Guardar cambios</button>
        </form>
      </Modal>
    </div>
  );
}

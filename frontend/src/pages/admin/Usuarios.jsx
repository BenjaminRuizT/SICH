import { useState, useEffect } from 'react';
import api from '../../context/AuthContext';
import Modal from '../../components/Modal';

const EMPTY_FORM = { username: '', password: '', nombre: '', rol: 'auditor' };

const EyeIcon = ({ open }) => open ? (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
) : (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

export default function Usuarios() {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState({ nombre: '', rol: '', password: '' });
  const [error, setError] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showEditPwd, setShowEditPwd] = useState(false);

  const cargar = () => api.get('/usuarios').then(r => setUsers(r.data)).catch(() => {});
  useEffect(() => { cargar(); }, []);

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/usuarios', form);
      setModal(false);
      setForm(EMPTY_FORM);
      setShowPwd(false);
      cargar();
    } catch (e) { setError(e.response?.data?.error || 'Error'); }
  };

  const openEdit = (u) => {
    setEditTarget(u);
    setEditForm({ nombre: u.nombre, rol: u.rol, password: '' });
    setShowEditPwd(false);
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

  const eliminar = async (u) => {
    if (!window.confirm(`¿Eliminar permanentemente a "${u.nombre}" (@${u.username})?\n\nEsta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/usuarios/${u.id}`);
      cargar();
    } catch (e) { alert(e.response?.data?.error || 'Error al eliminar'); }
  };

  return (
    <div className="md:ml-56 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Usuarios</h1>
        <button onClick={() => { setModal(true); setError(''); setShowPwd(false); }}
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
              <button onClick={() => eliminar(u)}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold bg-red-50 text-red-600 hover:bg-red-100">
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal nuevo usuario */}
      <Modal open={modal} onClose={() => { setModal(false); setShowPwd(false); }} title="Nuevo usuario">
        <form onSubmit={guardar} className="space-y-3">
          <div>
            <label className="label">Usuario</label>
            <input className="input" type="text" value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Contraseña</label>
            <div className="relative">
              <input className="input pr-10" type={showPwd ? 'text' : 'password'} value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <EyeIcon open={showPwd} />
              </button>
            </div>
          </div>
          <div>
            <label className="label">Nombre completo</label>
            <input className="input" type="text" value={form.nombre}
              onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))} required />
          </div>
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
      <Modal open={!!editTarget} onClose={() => { setEditTarget(null); setShowEditPwd(false); }} title={`Editar: ${editTarget?.username}`}>
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
            <label className="label">
              Nueva contraseña <span className="text-gray-400 font-normal">(dejar vacío para no cambiar)</span>
            </label>
            <div className="relative">
              <input className="input pr-10" type={showEditPwd ? 'text' : 'password'} value={editForm.password}
                onChange={e => setEditForm(p => ({ ...p, password: e.target.value }))}
                placeholder="••••••••" />
              <button type="button" onClick={() => setShowEditPwd(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <EyeIcon open={showEditPwd} />
              </button>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <button type="submit" className="btn-primary">Guardar cambios</button>
        </form>
      </Modal>
    </div>
  );
}

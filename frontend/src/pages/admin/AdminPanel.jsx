import { NavLink } from 'react-router-dom';

const ITEMS = [
  { to: '/admin/usuarios',     label: '👥 Usuarios',              desc: 'Gestionar cuentas de acceso' },
  { to: '/admin/empleados',    label: '🏢 Empleados',             desc: 'Ver y gestionar catálogo de empleados' },
  { to: '/admin/importar',     label: '📥 Importar datos',        desc: 'Cargar MAF y plantilla desde Excel o JSON' },
  { to: '/admin/sin-validar',  label: '🔍 Sin validar',           desc: 'Herramientas que aún no tienen revisión registrada' },
  { to: '/admin/reset',        label: '🗑 Resetear aplicación',   desc: 'Borrar datos con opciones de conservación' },
];

export default function AdminPanel() {
  return (
    <div className="md:ml-56 space-y-4">
      <h1 className="text-xl font-bold">Administración</h1>
      <div className="grid gap-3">
        {ITEMS.map(item => (
          <NavLink key={item.to} to={item.to}
            className={`card flex items-center gap-4 hover:border-brand-300 hover:shadow-md transition-all ${item.to.includes('reset') ? 'border-red-100 hover:border-red-300' : ''}`}>
            <span className="text-3xl">{item.label.split(' ')[0]}</span>
            <div>
              <p className="font-semibold">{item.label.split(' ').slice(1).join(' ')}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </div>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

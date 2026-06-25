import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../context/AuthContext';
import PhotoCapture from '../components/PhotoCapture';
import SignatureCanvas from '../components/SignatureCanvas';

const PASOS = ['Empleado','Confirmar datos','Herramientas','Revisión auto','Revisión equipo','Resumen'];

export default function NuevaRevision() {
  const navigate = useNavigate();
  const [paso, setPaso] = useState(0);
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [empleado, setEmpleado] = useState(null);
  const [editEmpleado, setEditEmpleado] = useState({});
  const [herramientas, setHerramientas] = useState([]);
  const [revisarAuto, setRevisarAuto] = useState(false);
  const [revisarEquipo, setRevisarEquipo] = useState(false);
  const [autoSelec, setAutoSelec] = useState(null);
  const [equipoSelec, setEquipoSelec] = useState(null);
  const [autoForm, setAutoForm] = useState({ no_serie:'', placas:'', codigo_barras:'', kilometraje:'', poliza_seguro:'', licencia_numero:'', llanta_refaccion:null, comentarios:'', foto_condiciones:[], foto_licencia:null, foto_tarjeta_circulacion:null, firma_carta_responsiva:null });
  const [equipoForm, setEquipoForm] = useState({ codigo_barras:'', marca:'', modelo:'', serie:'', foto_equipo:null, comentarios:'' });
  const [sending, setSending] = useState(false);
  const [config, setConfig] = useState({});

  useEffect(() => {
    api.get('/config').then(r => setConfig(r.data)).catch(() => {});
  }, []);

  const buscar = useCallback(async (q) => {
    setQuery(q);
    if (q.length < 2) { setResultados([]); return; }
    const r = await api.get(`/empleados/search?q=${encodeURIComponent(q)}`).catch(() => ({ data: [] }));
    setResultados(r.data);
  }, []);

  const seleccionar = async (emp) => {
    setEmpleado(emp);
    setEditEmpleado({ ...emp });
    const h = await api.get(`/herramientas/empleado/${emp.id}`).catch(() => ({ data: [] }));
    setHerramientas(h.data);
    const autos = h.data.filter(x => x.tipo === 'auto');
    const equipos = h.data.filter(x => x.tipo !== 'auto');
    if (autos.length) { setRevisarAuto(true); setAutoSelec(autos[0]); setAutoForm(f => ({ ...f, no_serie: autos[0].serie || '', placas: '', codigo_barras: autos[0].codigo_barras || '' })); }
    if (equipos.length) { setRevisarEquipo(true); setEquipoSelec(equipos[0]); setEquipoForm(f => ({ ...f, codigo_barras: equipos[0].codigo_barras || '', marca: equipos[0].marca || '', modelo: equipos[0].modelo || '', serie: equipos[0].serie || '' })); }
    setResultados([]);
    setQuery('');
    setPaso(1);
  };

  const confirmarEmpleado = async () => {
    if (editEmpleado.nombre_completo !== empleado.nombre_completo ||
        editEmpleado.posicion !== empleado.posicion ||
        editEmpleado.departamento !== empleado.departamento ||
        editEmpleado.plaza !== empleado.plaza) {
      await api.patch(`/empleados/${empleado.id}`, editEmpleado).catch(() => {});
    }
    setEmpleado({ ...empleado, ...editEmpleado });
    setPaso(2);
  };

  const finalizarPasos = () => {
    if (paso === 2) {
      if (revisarAuto) { setPaso(3); return; }
      if (revisarEquipo) { setPaso(4); return; }
      setPaso(5);
    } else if (paso === 3) {
      if (revisarEquipo) { setPaso(4); return; }
      setPaso(5);
    } else if (paso === 4) {
      setPaso(5);
    }
  };

  const enviar = async () => {
    setSending(true);
    try {
      await api.post('/revisiones', {
        empleado_id: empleado.id,
        empleado_snapshot: editEmpleado,
        observaciones: '',
        auto: revisarAuto ? { ...autoForm, herramienta_id: autoSelec?.id, herramienta_snapshot: autoSelec } : null,
        equipo: revisarEquipo ? { ...equipoForm, herramienta_id: equipoSelec?.id, herramienta_snapshot: equipoSelec } : null,
      });
      navigate('/historial', { state: { success: true } });
    } catch (e) {
      alert('Error al guardar: ' + (e.response?.data?.error || e.message));
    } finally { setSending(false); }
  };

  const deptos = config.departamentos || [];
  const plazas = config.plazas || [];

  return (
    <div className="md:ml-56 max-w-2xl">
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex gap-1 mb-2">
          {[0,1,2,3,4,5].filter(i => {
            if (i === 3 && !revisarAuto) return false;
            if (i === 4 && !revisarEquipo) return false;
            return true;
          }).map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= paso ? 'bg-brand-600' : 'bg-gray-200'}`} />
          ))}
        </div>
        <p className="text-sm text-gray-500">Paso {paso + 1} — {PASOS[paso]}</p>
      </div>

      {/* PASO 0: Buscar empleado */}
      {paso === 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Buscar empleado</h2>
          <input className="input" placeholder="Número de empleado, nombre o apellido..."
            value={query} onChange={e => buscar(e.target.value)} autoFocus />
          {resultados.length > 0 && (
            <div className="card p-0 divide-y">
              {resultados.map(emp => (
                <button key={emp.id} onClick={() => seleccionar(emp)}
                  className="w-full text-left px-4 py-3 hover:bg-brand-50 transition-colors">
                  <p className="font-semibold text-gray-900">{emp.nombre_completo}</p>
                  <p className="text-xs text-gray-500">#{emp.numero_empleado} · {emp.posicion}</p>
                  <p className="text-xs text-gray-400">{emp.departamento} · {emp.plaza}</p>
                </button>
              ))}
            </div>
          )}
          {query.length >= 2 && resultados.length === 0 && (
            <p className="text-center text-gray-400 py-6">Sin resultados para "{query}"</p>
          )}
        </div>
      )}

      {/* PASO 1: Confirmar datos del empleado */}
      {paso === 1 && empleado && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Confirmar datos del empleado</h2>
          <div className="card bg-brand-50 border-brand-200">
            <p className="text-xs text-brand-600 font-semibold mb-1">EMPLEADO SELECCIONADO</p>
            <p className="font-bold text-gray-900">{empleado.nombre_completo}</p>
            <p className="text-sm text-gray-500">#{empleado.numero_empleado}</p>
          </div>
          <div>
            <label className="label">Nombre completo</label>
            <input className="input" value={editEmpleado.nombre_completo || ''}
              onChange={e => setEditEmpleado(p => ({ ...p, nombre_completo: e.target.value }))} />
          </div>
          <div>
            <label className="label">Posición</label>
            <input className="input" value={editEmpleado.posicion || ''}
              onChange={e => setEditEmpleado(p => ({ ...p, posicion: e.target.value }))} />
          </div>
          <div>
            <label className="label">Departamento</label>
            <select className="input" value={editEmpleado.departamento || ''}
              onChange={e => setEditEmpleado(p => ({ ...p, departamento: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {deptos.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Plaza</label>
            <select className="input" value={editEmpleado.plaza || ''}
              onChange={e => setEditEmpleado(p => ({ ...p, plaza: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {plazas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setPaso(0)} className="btn-secondary flex-1">Atrás</button>
            <button onClick={confirmarEmpleado} className="btn-primary flex-1">Confirmar y continuar</button>
          </div>
        </div>
      )}

      {/* PASO 2: Seleccionar herramientas */}
      {paso === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Herramientas a revisar</h2>
          {herramientas.length > 0 ? (
            <p className="text-sm text-gray-500">Herramientas asignadas en el sistema (se pueden modificar)</p>
          ) : (
            <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">No hay herramientas registradas para este empleado en el MAF. Puedes capturar información manualmente.</p>
          )}

          {/* Auto */}
          <div className={`card border-2 cursor-pointer transition-colors ${revisarAuto ? 'border-brand-500 bg-brand-50' : 'border-gray-200'}`}
            onClick={() => setRevisarAuto(v => !v)}>
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${revisarAuto ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}>
                {revisarAuto && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <div>
                <p className="font-semibold">🚗 Automóvil</p>
                {autoSelec ? (
                  <p className="text-xs text-gray-500">{autoSelec.marca} {autoSelec.modelo} {autoSelec.anio} · CB: {autoSelec.codigo_barras}</p>
                ) : <p className="text-xs text-gray-400">Captura manual</p>}
              </div>
            </div>
          </div>

          {/* Equipo */}
          <div className={`card border-2 cursor-pointer transition-colors ${revisarEquipo ? 'border-brand-500 bg-brand-50' : 'border-gray-200'}`}
            onClick={() => setRevisarEquipo(v => !v)}>
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${revisarEquipo ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}>
                {revisarEquipo && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <div>
                <p className="font-semibold">💻 Equipo de cómputo</p>
                {equipoSelec ? (
                  <p className="text-xs text-gray-500">{equipoSelec.marca} {equipoSelec.modelo} · CB: {equipoSelec.codigo_barras}</p>
                ) : <p className="text-xs text-gray-400">Captura manual</p>}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setPaso(1)} className="btn-secondary flex-1">Atrás</button>
            <button onClick={finalizarPasos} disabled={!revisarAuto && !revisarEquipo} className="btn-primary flex-1">
              Continuar
            </button>
          </div>
        </div>
      )}

      {/* PASO 3: Revisión auto */}
      {paso === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Revisión del automóvil</h2>
          {autoSelec && (
            <div className="card bg-brand-50 border-brand-200 text-sm">
              <p className="font-semibold">{autoSelec.marca} {autoSelec.modelo} {autoSelec.anio}</p>
              <p className="text-gray-500">Serie: {autoSelec.serie || '—'}</p>
            </div>
          )}
          {[['no_serie','No. de Serie'],['placas','Placas'],['codigo_barras','Código de Barras'],['kilometraje','Kilometraje'],['poliza_seguro','Póliza de Seguro'],['licencia_numero','No. Licencia']].map(([k,lbl]) => (
            <div key={k}>
              <label className="label">{lbl}</label>
              <input className="input" type={k === 'kilometraje' ? 'number' : 'text'}
                value={autoForm[k]} onChange={e => setAutoForm(p => ({ ...p, [k]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="label">Llanta de refacción</label>
            <div className="flex gap-3">
              {['Sí','No'].map(v => (
                <button key={v} type="button"
                  onClick={() => setAutoForm(p => ({ ...p, llanta_refaccion: v === 'Sí' }))}
                  className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-colors ${autoForm.llanta_refaccion === (v === 'Sí') ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-300 text-gray-600'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
          <PhotoCapture label="Fotos de condiciones del auto" multiple onCapture={v => setAutoForm(p => ({ ...p, foto_condiciones: v }))} value={autoForm.foto_condiciones} />
          <PhotoCapture label="Foto de licencia de conducir" onCapture={v => setAutoForm(p => ({ ...p, foto_licencia: v }))} value={autoForm.foto_licencia ? [autoForm.foto_licencia] : []} />
          <PhotoCapture label="Foto de tarjeta de circulación" onCapture={v => setAutoForm(p => ({ ...p, foto_tarjeta_circulacion: v }))} value={autoForm.foto_tarjeta_circulacion ? [autoForm.foto_tarjeta_circulacion] : []} />
          <SignatureCanvas label="Firma carta responsiva" onSave={v => setAutoForm(p => ({ ...p, firma_carta_responsiva: v }))} />
          <div>
            <label className="label">Comentarios</label>
            <textarea className="input min-h-[80px] resize-none" value={autoForm.comentarios}
              onChange={e => setAutoForm(p => ({ ...p, comentarios: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setPaso(2)} className="btn-secondary flex-1">Atrás</button>
            <button onClick={finalizarPasos} className="btn-primary flex-1">Continuar</button>
          </div>
        </div>
      )}

      {/* PASO 4: Revisión equipo */}
      {paso === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Revisión del equipo de cómputo</h2>
          {[['codigo_barras','Código de Barras'],['marca','Marca'],['modelo','Modelo'],['serie','No. de Serie']].map(([k,lbl]) => (
            <div key={k}>
              <label className="label">{lbl}</label>
              <input className="input" value={equipoForm[k]}
                onChange={e => setEquipoForm(p => ({ ...p, [k]: e.target.value }))} />
            </div>
          ))}
          <PhotoCapture label="Foto del equipo" onCapture={v => setEquipoForm(p => ({ ...p, foto_equipo: v }))} value={equipoForm.foto_equipo ? [equipoForm.foto_equipo] : []} />
          <div>
            <label className="label">Comentarios</label>
            <textarea className="input min-h-[80px] resize-none" value={equipoForm.comentarios}
              onChange={e => setEquipoForm(p => ({ ...p, comentarios: e.target.value }))} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setPaso(revisarAuto ? 3 : 2)} className="btn-secondary flex-1">Atrás</button>
            <button onClick={() => setPaso(5)} className="btn-primary flex-1">Continuar</button>
          </div>
        </div>
      )}

      {/* PASO 5: Resumen y confirmar */}
      {paso === 5 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Resumen de la revisión</h2>
          <div className="card space-y-2">
            <p className="font-semibold text-brand-800">👤 Empleado</p>
            <p className="font-bold">{editEmpleado.nombre_completo}</p>
            <p className="text-sm text-gray-500">#{editEmpleado.numero_empleado} · {editEmpleado.posicion}</p>
            <p className="text-sm text-gray-500">{editEmpleado.departamento} · {editEmpleado.plaza}</p>
          </div>
          {revisarAuto && (
            <div className="card space-y-2">
              <p className="font-semibold text-brand-800">🚗 Automóvil</p>
              <div className="text-sm text-gray-600 grid grid-cols-2 gap-1">
                <span>Placas: <b>{autoForm.placas || '—'}</b></span>
                <span>Km: <b>{autoForm.kilometraje || '—'}</b></span>
                <span>Serie: <b>{autoForm.no_serie || '—'}</b></span>
                <span>Llanta ref.: <b>{autoForm.llanta_refaccion == null ? '—' : autoForm.llanta_refaccion ? 'Sí' : 'No'}</b></span>
                <span>Póliza: <b>{autoForm.poliza_seguro || '—'}</b></span>
                <span>Licencia: <b>{autoForm.licencia_numero || '—'}</b></span>
              </div>
              <div className="flex gap-2 text-xs">
                {autoForm.foto_condiciones?.length > 0 && <span className="text-green-600">✓ {autoForm.foto_condiciones.length} foto(s) condiciones</span>}
                {autoForm.foto_licencia && <span className="text-green-600">✓ Foto licencia</span>}
                {autoForm.foto_tarjeta_circulacion && <span className="text-green-600">✓ Foto tarjeta circ.</span>}
                {autoForm.firma_carta_responsiva && <span className="text-green-600">✓ Firma capturada</span>}
              </div>
            </div>
          )}
          {revisarEquipo && (
            <div className="card space-y-2">
              <p className="font-semibold text-brand-800">💻 Equipo de cómputo</p>
              <div className="text-sm text-gray-600 grid grid-cols-2 gap-1">
                <span>CB: <b>{equipoForm.codigo_barras || '—'}</b></span>
                <span>Marca: <b>{equipoForm.marca || '—'}</b></span>
                <span>Modelo: <b>{equipoForm.modelo || '—'}</b></span>
                <span>Serie: <b>{equipoForm.serie || '—'}</b></span>
              </div>
              {equipoForm.foto_equipo && <span className="text-xs text-green-600">✓ Foto capturada</span>}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={() => setPaso(revisarEquipo ? 4 : revisarAuto ? 3 : 2)} className="btn-secondary flex-1">Atrás</button>
            <button onClick={enviar} disabled={sending} className="btn-primary flex-1">
              {sending ? 'Guardando...' : '✅ Confirmar revisión'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

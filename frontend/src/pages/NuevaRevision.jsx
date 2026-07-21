import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../context/AuthContext';
import PhotoCapture from '../components/PhotoCapture';
import SignatureCanvas from '../components/SignatureCanvas';
import DamagePanel from '../components/DamagePanel';

const PASOS = ['Empleado', 'Confirmar datos', 'Herramientas', 'Revisión auto', 'Revisión equipo', 'Resumen'];

function YesNo({ label, value, onChange, required }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
      <div className="flex gap-3">
        {['Sí', 'No'].map(v => (
          <button key={v} type="button"
            onClick={() => onChange(v === 'Sí')}
            className={`flex-1 py-3 rounded-xl border-2 font-semibold transition-colors text-sm ${value === (v === 'Sí') ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-300 text-gray-600 hover:border-brand-300'}`}>
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

function BarcodeSearch({ tipo, onSelect, currentCb }) {
  const [q, setQ] = useState(currentCb || '');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const timer = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const search = useCallback(async (val) => {
    setQ(val);
    clearTimeout(timer.current);
    if (val.length < 2) { setResults([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const r = await api.get(`/herramientas/search?q=${encodeURIComponent(val)}&tipo=${tipo}`).catch(() => ({ data: [] }));
      setResults(r.data);
      setOpen(r.data.length > 0);
    }, 300);
  }, [tipo]);

  const select = (item) => {
    setQ(item.codigo_barras || '');
    setOpen(false);
    setResults([]);
    onSelect(item);
  };

  return (
    <div className="relative" ref={ref}>
      <label className="label">Código de barras<span className="text-red-500 ml-1">*</span></label>
      <input className="input" value={q}
        onChange={e => search(e.target.value)}
        placeholder="Escanea o escribe el código de barras..."
      />
      {open && (
        <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
          {results.map(r => (
            <button key={r.id} type="button" onClick={() => select(r)}
              className="w-full text-left px-4 py-2.5 hover:bg-brand-50 text-sm border-b border-gray-100 last:border-0">
              <span className="font-semibold">{r.codigo_barras}</span>
              <span className="text-gray-500 ml-2">{r.marca} {r.modelo} {r.anio || ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const MODELOS_AUTO = [
  'Chevrolet Aveo',
  'Nissan Versa',
  'Chevrolet Beat',
  'Toyota Avanza',
  'BYD Dolphin mini',
];

const emptyAuto = {
  codigo_barras: '', no_modelo: '', no_serie: '', placas: '', kilometraje: '',
  domicilio: '', codigo_postal: '',
  poliza_seguro: null, licencia: null, llanta_refaccion: null, gato_cruceta: null,
  comentarios: '',
  foto_condiciones: [], foto_licencia: null, foto_licencia_reverso: null,
  foto_tarjeta_circulacion: null, foto_poliza_seguro: null,
  danos: [], firma_empleado: null, firma_auditor: null,
  nombre_responsable_rh: '', firma_responsable_rh: null,
};

const emptyEquipo = {
  codigo_barras: '', marca: '', modelo: '', serie: '',
  foto_equipo: null, comentarios: '',
  danos: [], firma_empleado: null, firma_auditor: null,
  nombre_responsable_rh: '', firma_responsable_rh: null,
};

export default function NuevaRevision() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
  const [autoForm, setAutoForm] = useState(emptyAuto);
  const [equipoForm, setEquipoForm] = useState(emptyEquipo);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [savedId, setSavedId] = useState(null);
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
    if (autos.length) {
      setRevisarAuto(true);
      setAutoSelec(autos[0]);
      setAutoForm(f => ({ ...f, no_serie: autos[0].serie || '', codigo_barras: autos[0].codigo_barras || '', no_modelo: autos[0].modelo || '', placas: autos[0].placas || '' }));
    }
    if (equipos.length) {
      setRevisarEquipo(true);
      setEquipoSelec(equipos[0]);
      setEquipoForm(f => ({ ...f, codigo_barras: equipos[0].codigo_barras || '', marca: equipos[0].marca || '', modelo: equipos[0].modelo || '', serie: equipos[0].serie || '' }));
    }
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

  const validateAuto = () => {
    const e = {};
    if (!autoForm.codigo_barras) e.codigo_barras = 'Requerido';
    if (!autoForm.no_modelo) e.no_modelo = 'Requerido';
    if (!autoForm.placas) e.placas = 'Requerido';
    if (!autoForm.no_serie) e.no_serie = 'Requerido';
    if (!autoForm.kilometraje) e.kilometraje = 'Requerido';
    if (!autoForm.domicilio) e.domicilio = 'Requerido';
    if (autoForm.poliza_seguro === null) e.poliza_seguro = 'Requerido';
    if (autoForm.licencia === null) e.licencia = 'Requerido';
    if (autoForm.llanta_refaccion === null) e.llanta_refaccion = 'Requerido';
    if (autoForm.gato_cruceta === null) e.gato_cruceta = 'Requerido';
    if (!autoForm.firma_empleado) e.firma_empleado = 'Firma requerida';
    if (!autoForm.firma_auditor) e.firma_auditor = 'Firma requerida';
    if (!autoForm.nombre_responsable_rh) e.nombre_responsable_rh = 'Requerido';
    if (!autoForm.firma_responsable_rh) e.firma_responsable_rh = 'Firma requerida';
    return e;
  };

  const validateEquipo = () => {
    const e = {};
    if (!equipoForm.codigo_barras) e.codigo_barras = 'Requerido';
    if (!equipoForm.marca) e.marca = 'Requerido';
    if (!equipoForm.modelo) e.modelo = 'Requerido';
    if (!equipoForm.serie) e.serie = 'Requerido';
    if (!equipoForm.firma_empleado) e.firma_empleado = 'Firma requerida';
    if (!equipoForm.nombre_responsable_rh) e.nombre_responsable_rh = 'Requerido';
    if (!equipoForm.firma_responsable_rh) e.firma_responsable_rh = 'Firma requerida';
    return e;
  };

  const finalizarPasos = () => {
    if (paso === 2) {
      if (revisarAuto) { setErrors({}); setPaso(3); return; }
      if (revisarEquipo) { setErrors({}); setPaso(4); return; }
      setPaso(5);
    } else if (paso === 3) {
      const errs = validateAuto();
      if (Object.keys(errs).length) { setErrors(errs); return; }
      setErrors({});
      if (revisarEquipo) {
        setEquipoForm(f => ({
          ...f,
          nombre_responsable_rh: f.nombre_responsable_rh || autoForm.nombre_responsable_rh,
          firma_responsable_rh: f.firma_responsable_rh || autoForm.firma_responsable_rh,
        }));
        setPaso(4); return;
      }
      setPaso(5);
    } else if (paso === 4) {
      const errs = validateEquipo();
      if (Object.keys(errs).length) { setErrors(errs); return; }
      setErrors({});
      setPaso(5);
    }
  };

  const enviar = async () => {
    setSending(true);
    try {
      const res = await api.post('/revisiones', {
        empleado_id: empleado.id,
        empleado_snapshot: editEmpleado,
        observaciones: '',
        auto: revisarAuto ? { ...autoForm, herramienta_id: autoSelec?.id, herramienta_snapshot: autoSelec } : null,
        equipo: revisarEquipo ? { ...equipoForm, herramienta_id: equipoSelec?.id, herramienta_snapshot: equipoSelec } : null,
      });
      setSavedId(res.data.id);
    } catch (e) {
      alert('Error al guardar: ' + (e.response?.data?.error || e.message));
    } finally { setSending(false); }
  };

  const deptos = config.departamentos || [];
  const plazas = config.plazas || [];

  const nombreEmp = editEmpleado.nombre_completo || empleado?.nombre_completo || '';
  const nombreAuditor = user?.nombre || '';

  if (savedId) {
    return (
      <div className="md:ml-56 max-w-2xl">
        <div className="card text-center space-y-4">
          <div className="text-5xl">✅</div>
          <h2 className="text-xl font-bold text-gray-900">Revisión guardada</h2>
          <p className="text-gray-500 text-sm">ID de revisión: <strong>#{savedId}</strong></p>
          <div className="flex flex-col gap-2">
            {revisarAuto && (
              <a href={`/carta/auto/${savedId}`} target="_blank" rel="noreferrer" className="btn-primary">
                🚗 Ver / Imprimir Carta Compromiso (Auto)
              </a>
            )}
            {revisarEquipo && (
              <a href={`/carta/equipo/${savedId}`} target="_blank" rel="noreferrer" className="btn-primary">
                💻 Ver / Imprimir Carta Responsiva (Equipo)
              </a>
            )}
            <button onClick={() => navigate('/historial')} className="btn-secondary">Ver historial</button>
            <button onClick={() => navigate('/nueva')} className="text-sm text-brand-600 hover:underline">+ Nueva revisión</button>
          </div>
        </div>
      </div>
    );
  }

  const Err = ({ field }) => errors[field] ? <p className="text-red-500 text-xs mt-1">{errors[field]}</p> : null;

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
          <div><label className="label">Nombre completo</label>
            <input className="input" value={editEmpleado.nombre_completo || ''}
              onChange={e => setEditEmpleado(p => ({ ...p, nombre_completo: e.target.value }))} /></div>
          <div><label className="label">Posición</label>
            <input className="input" value={editEmpleado.posicion || ''}
              onChange={e => setEditEmpleado(p => ({ ...p, posicion: e.target.value }))} /></div>
          <div><label className="label">Departamento</label>
            <select className="input" value={editEmpleado.departamento || ''}
              onChange={e => setEditEmpleado(p => ({ ...p, departamento: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {deptos.map(d => <option key={d} value={d}>{d}</option>)}
            </select></div>
          <div><label className="label">Plaza</label>
            <select className="input" value={editEmpleado.plaza || ''}
              onChange={e => setEditEmpleado(p => ({ ...p, plaza: e.target.value }))}>
              <option value="">Seleccionar...</option>
              {plazas.map(p => <option key={p} value={p}>{p}</option>)}
            </select></div>
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
          {herramientas.length === 0 && (
            <p className="text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">No hay herramientas registradas. Puedes capturar información manualmente.</p>
          )}
          <div className={`card border-2 cursor-pointer transition-colors ${revisarAuto ? 'border-brand-500 bg-brand-50' : 'border-gray-200'}`}
            onClick={() => setRevisarAuto(v => !v)}>
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${revisarAuto ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}>
                {revisarAuto && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <div>
                <p className="font-semibold">🚗 Automóvil</p>
                {autoSelec ? <p className="text-xs text-gray-500">{autoSelec.marca} {autoSelec.modelo} · CB: {autoSelec.codigo_barras}</p>
                  : <p className="text-xs text-gray-400">Captura manual</p>}
              </div>
            </div>
          </div>
          <div className={`card border-2 cursor-pointer transition-colors ${revisarEquipo ? 'border-brand-500 bg-brand-50' : 'border-gray-200'}`}
            onClick={() => setRevisarEquipo(v => !v)}>
            <div className="flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${revisarEquipo ? 'bg-brand-600 border-brand-600' : 'border-gray-300'}`}>
                {revisarEquipo && <span className="text-white text-xs font-bold">✓</span>}
              </div>
              <div>
                <p className="font-semibold">💻 Equipo de cómputo</p>
                {equipoSelec ? <p className="text-xs text-gray-500">{equipoSelec.marca} {equipoSelec.modelo} · CB: {equipoSelec.codigo_barras}</p>
                  : <p className="text-xs text-gray-400">Captura manual</p>}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setPaso(1)} className="btn-secondary flex-1">Atrás</button>
            <button onClick={finalizarPasos} disabled={!revisarAuto && !revisarEquipo} className="btn-primary flex-1">Continuar</button>
          </div>
        </div>
      )}

      {/* PASO 3: Revisión auto */}
      {paso === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Revisión del automóvil</h2>

          {/* Barcode search */}
          <BarcodeSearch tipo="auto" currentCb={autoForm.codigo_barras}
            onSelect={item => {
              setAutoSelec(item);
              setAutoForm(f => ({
                ...f,
                codigo_barras: item.codigo_barras || '',
                no_modelo: item.modelo || '',
                no_serie: item.serie || '',
                placas: item.placas || '',
              }));
            }} />
          <Err field="codigo_barras" />

          {autoSelec && (
            <div className="card bg-brand-50 border-brand-200 text-sm">
              <p className="font-semibold">{autoSelec.marca} {autoSelec.modelo} {autoSelec.anio}</p>
              <p className="text-gray-500">No. Activo: {autoSelec.no_activo || '—'} · Serie: {autoSelec.serie || '—'}</p>
            </div>
          )}

          <div>
            <label className="label">Modelo del auto<span className="text-red-500 ml-1">*</span></label>
            <select className="input" value={autoForm.no_modelo}
              onChange={e => setAutoForm(p => ({ ...p, no_modelo: e.target.value }))}>
              <option value="">Seleccionar modelo...</option>
              {MODELOS_AUTO.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <Err field="no_modelo" />
          </div>

          <div>
            <label className="label">No. de Serie<span className="text-red-500 ml-1">*</span></label>
            <input className="input" type="text" value={autoForm.no_serie}
              onChange={e => setAutoForm(p => ({ ...p, no_serie: e.target.value }))} />
            <Err field="no_serie" />
          </div>

          <div>
            <label className="label">Placas<span className="text-red-500 ml-1">*</span></label>
            <input className="input" type="text" value={autoForm.placas}
              onChange={e => setAutoForm(p => ({ ...p, placas: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }))}
              placeholder="Ej. ABC123A" maxLength={10} />
            <Err field="placas" />
          </div>

          <div>
            <label className="label">Kilometraje<span className="text-red-500 ml-1">*</span></label>
            <input className="input" type="text" inputMode="numeric" value={autoForm.kilometraje}
              onChange={e => setAutoForm(p => ({ ...p, kilometraje: e.target.value.replace(/\D/g, '') }))}
              placeholder="Ej. 25000" />
            <Err field="kilometraje" />
          </div>

          <div>
            <label className="label">Domicilio del empleado<span className="text-red-500 ml-1">*</span></label>
            <input className="input" type="text" value={autoForm.domicilio}
              onChange={e => setAutoForm(p => ({ ...p, domicilio: e.target.value }))}
              placeholder="Calle, número, colonia, ciudad..." />
            <Err field="domicilio" />
          </div>

          <div>
            <label className="label">Código Postal</label>
            <input className="input" type="text" inputMode="numeric" value={autoForm.codigo_postal}
              onChange={e => setAutoForm(p => ({ ...p, codigo_postal: e.target.value.replace(/\D/g, '').slice(0, 5) }))}
              placeholder="Ej. 22000" maxLength={5} />
          </div>

          <YesNo label="Póliza de seguro" value={autoForm.poliza_seguro}
            onChange={v => setAutoForm(p => ({ ...p, poliza_seguro: v }))} required />
          <Err field="poliza_seguro" />

          <YesNo label="Licencia de conducir" value={autoForm.licencia}
            onChange={v => setAutoForm(p => ({ ...p, licencia: v }))} required />
          <Err field="licencia" />

          <YesNo label="Llanta de refacción" value={autoForm.llanta_refaccion}
            onChange={v => setAutoForm(p => ({ ...p, llanta_refaccion: v }))} required />
          <Err field="llanta_refaccion" />

          <YesNo label="Gato / Cruceta" value={autoForm.gato_cruceta}
            onChange={v => setAutoForm(p => ({ ...p, gato_cruceta: v }))} required />
          <Err field="gato_cruceta" />

          {/* Damage panel */}
          <div className="card">
            <p className="label mb-3">Panel de daños — Auto</p>
            <DamagePanel type="auto" value={autoForm.danos} onChange={v => setAutoForm(p => ({ ...p, danos: v }))} />
          </div>

          {/* Photos */}
          <div>
            <PhotoCapture label="Fotos de condiciones del auto" multiple maxPhotos={5}
              onCapture={v => setAutoForm(p => ({ ...p, foto_condiciones: v }))}
              value={autoForm.foto_condiciones}
              sublabel="Máximo 5 fotos — opcional" />
          </div>

          <div>
            <p className="label">Licencia de conducir</p>
            <div className="grid grid-cols-2 gap-3">
              <PhotoCapture label="Frente"
                onCapture={v => setAutoForm(p => ({ ...p, foto_licencia: v }))}
                value={autoForm.foto_licencia} />
              <PhotoCapture label="Reverso"
                onCapture={v => setAutoForm(p => ({ ...p, foto_licencia_reverso: v }))}
                value={autoForm.foto_licencia_reverso} />
            </div>
          </div>

          <div>
            <PhotoCapture label="Tarjeta de circulación"
              onCapture={v => setAutoForm(p => ({ ...p, foto_tarjeta_circulacion: v }))}
              value={autoForm.foto_tarjeta_circulacion} />
          </div>

          <div>
            <PhotoCapture label="Póliza de seguro"
              onCapture={v => setAutoForm(p => ({ ...p, foto_poliza_seguro: v }))}
              value={autoForm.foto_poliza_seguro} />
          </div>

          <div>
            <label className="label">Comentarios</label>
            <textarea className="input min-h-[80px] resize-none" value={autoForm.comentarios}
              onChange={e => setAutoForm(p => ({ ...p, comentarios: e.target.value }))} />
          </div>

          {/* Firmas para carta compromiso */}
          <div className="card space-y-4">
            <p className="font-semibold text-sm text-gray-700">Firmas para carta compromiso</p>
            <SignatureCanvas label="Firma del empleado" signerName={nombreEmp}
              onSave={v => setAutoForm(p => ({ ...p, firma_empleado: v }))} />
            <Err field="firma_empleado" />
            <SignatureCanvas label="Firma del auditor (registro interno)" signerName={nombreAuditor}
              onSave={v => setAutoForm(p => ({ ...p, firma_auditor: v }))} />
            <Err field="firma_auditor" />
          </div>

          {/* Responsable de RH */}
          <div className="card space-y-4">
            <p className="font-semibold text-sm text-gray-700">Responsable de RH</p>
            <div>
              <label className="label">Nombre del responsable de RH<span className="text-red-500 ml-1">*</span></label>
              <input className="input" type="text" value={autoForm.nombre_responsable_rh}
                onChange={e => setAutoForm(p => ({ ...p, nombre_responsable_rh: e.target.value }))}
                placeholder="Nombre completo..." />
              <Err field="nombre_responsable_rh" />
            </div>
            <SignatureCanvas label="Firma del responsable de RH" signerName={autoForm.nombre_responsable_rh}
              onSave={v => setAutoForm(p => ({ ...p, firma_responsable_rh: v }))} />
            <Err field="firma_responsable_rh" />
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              Por favor completa todos los campos obligatorios antes de continuar.
            </div>
          )}

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

          <BarcodeSearch tipo="laptop" currentCb={equipoForm.codigo_barras}
            onSelect={item => {
              setEquipoSelec(item);
              setEquipoForm(f => ({
                ...f,
                codigo_barras: item.codigo_barras || '',
                marca: item.marca || '',
                modelo: item.modelo || '',
                serie: item.serie || '',
              }));
            }} />
          <Err field="codigo_barras" />

          {[['marca','Marca'],['modelo','Modelo'],['serie','No. de Serie']].map(([k, lbl]) => (
            <div key={k}>
              <label className="label">{lbl}<span className="text-red-500 ml-1">*</span></label>
              <input className="input" value={equipoForm[k]}
                onChange={e => setEquipoForm(p => ({ ...p, [k]: e.target.value }))} />
              <Err field={k} />
            </div>
          ))}

          {/* Damage panel */}
          <div className="card">
            <p className="label mb-3">Panel de daños — Equipo</p>
            <DamagePanel type="laptop" value={equipoForm.danos} onChange={v => setEquipoForm(p => ({ ...p, danos: v }))} />
          </div>

          <div>
            <PhotoCapture label="Foto del equipo"
              onCapture={v => setEquipoForm(p => ({ ...p, foto_equipo: v }))}
              value={equipoForm.foto_equipo} />
            <Err field="foto_equipo" />
          </div>

          <div>
            <label className="label">Comentarios</label>
            <textarea className="input min-h-[80px] resize-none" value={equipoForm.comentarios}
              onChange={e => setEquipoForm(p => ({ ...p, comentarios: e.target.value }))} />
          </div>

          {/* Firmas */}
          <div className="card space-y-4">
            <p className="font-semibold text-sm text-gray-700">Firmas para carta responsiva</p>
            <SignatureCanvas label="Firma del empleado (Recibe)" signerName={nombreEmp}
              onSave={v => setEquipoForm(p => ({ ...p, firma_empleado: v }))} />
            <Err field="firma_empleado" />
            <SignatureCanvas label="Firma del auditor (Testigo — GTE Jr. Administrativo)" signerName={nombreAuditor}
              onSave={v => setEquipoForm(p => ({ ...p, firma_auditor: v }))} />
          </div>

          {/* Responsable de RH */}
          <div className="card space-y-4 border-2 border-brand-200">
            <p className="font-semibold text-sm text-gray-700">Responsable de RH — requerido para carta</p>
            {equipoForm.firma_responsable_rh && (
              <div className="flex items-center gap-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                <img src={equipoForm.firma_responsable_rh} alt="Firma RH" className="h-10 object-contain" />
                <p className="text-xs text-green-700">Firma cargada del paso anterior. Firme abajo para reemplazarla.</p>
              </div>
            )}
            <div>
              <label className="label">Nombre del responsable de RH<span className="text-red-500 ml-1">*</span></label>
              <input className="input" type="text" value={equipoForm.nombre_responsable_rh}
                onChange={e => setEquipoForm(p => ({ ...p, nombre_responsable_rh: e.target.value }))}
                placeholder="Nombre completo..." />
              <Err field="nombre_responsable_rh" />
            </div>
            <SignatureCanvas label="Firma del responsable de RH" signerName={equipoForm.nombre_responsable_rh}
              onSave={v => setEquipoForm(p => ({ ...p, firma_responsable_rh: v }))} />
            <Err field="firma_responsable_rh" />
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              Por favor completa todos los campos obligatorios antes de continuar.
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => { setErrors({}); setPaso(revisarAuto ? 3 : 2); }} className="btn-secondary flex-1">Atrás</button>
            <button onClick={finalizarPasos} className="btn-primary flex-1">Continuar</button>
          </div>
        </div>
      )}

      {/* PASO 5: Resumen */}
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
                <span>Modelo: <b>{autoForm.no_modelo || '—'}</b></span>
                <span>Placas: <b>{autoForm.placas || '—'}</b></span>
                <span>Serie: <b>{autoForm.no_serie || '—'}</b></span>
                <span>Km: <b>{autoForm.kilometraje || '—'}</b></span>
                <span>Póliza: <b>{autoForm.poliza_seguro == null ? '—' : autoForm.poliza_seguro ? 'Sí' : 'No'}</b></span>
                <span>Licencia: <b>{autoForm.licencia == null ? '—' : autoForm.licencia ? 'Sí' : 'No'}</b></span>
                <span>Llanta ref.: <b>{autoForm.llanta_refaccion == null ? '—' : autoForm.llanta_refaccion ? 'Sí' : 'No'}</b></span>
                <span>Gato/Cruceta: <b>{autoForm.gato_cruceta == null ? '—' : autoForm.gato_cruceta ? 'Sí' : 'No'}</b></span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {autoForm.foto_condiciones?.length > 0 && <span className="text-green-600">✓ {autoForm.foto_condiciones.length} foto(s)</span>}
                {autoForm.foto_licencia && <span className="text-green-600">✓ Licencia frente</span>}
                {autoForm.foto_licencia_reverso && <span className="text-green-600">✓ Licencia reverso</span>}
                {autoForm.foto_tarjeta_circulacion && <span className="text-green-600">✓ Tarjeta circ.</span>}
                {autoForm.foto_poliza_seguro && <span className="text-green-600">✓ Póliza seguro</span>}
                {autoForm.danos.length > 0 && <span className="text-orange-600">⚠ {autoForm.danos.length} daño(s)</span>}
                {autoForm.firma_empleado && <span className="text-green-600">✓ Firma empleado</span>}
                {autoForm.firma_auditor && <span className="text-green-600">✓ Firma auditor</span>}
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
              <div className="flex flex-wrap gap-2 text-xs">
                {equipoForm.foto_equipo && <span className="text-green-600">✓ Foto</span>}
                {equipoForm.danos.length > 0 && <span className="text-orange-600">⚠ {equipoForm.danos.length} daño(s)</span>}
                {equipoForm.firma_empleado && <span className="text-green-600">✓ Firma empleado</span>}
                {equipoForm.firma_auditor && <span className="text-green-600">✓ Firma auditor</span>}
              </div>
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

import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { APP_VERSION } from '../version';

const TZ = 'America/Tijuana';
const today = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', timeZone: TZ });

const SECTIONS_AUDITOR = [
  { num: '01', title: 'Inicio de sesión y seguridad de la cuenta' },
  { num: '02', title: 'Panel de inicio (Dashboard)' },
  { num: '03', title: 'Mi Firma de auditor' },
  { num: '04', title: 'Cómo realizar una revisión correctamente' },
  { num: '05', title: 'Historial de revisiones' },
  { num: '06', title: 'Lista Sin Validar' },
  { num: '07', title: 'Confidencialidad y protección de datos' },
];
const SECTIONS_ADMIN = [
  ...SECTIONS_AUDITOR,
  { num: '08', title: 'Gestión de usuarios' },
  { num: '09', title: 'Empleados y catálogo MAF' },
  { num: '10', title: 'Configuración del sistema' },
  { num: '11', title: 'Exportación de datos (Excel y ZIP)' },
  { num: '12', title: 'Operaciones de reset' },
];

const Tip = ({ children }) => (
  <div className="flex gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
    <span className="shrink-0 text-base leading-none">💡</span>
    <span>{children}</span>
  </div>
);
const Warning = ({ children }) => (
  <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
    <span className="shrink-0 text-base leading-none">⚠️</span>
    <span>{children}</span>
  </div>
);
const Alert = ({ children }) => (
  <div className="flex gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-900">
    <span className="shrink-0 text-base leading-none">🔒</span>
    <span>{children}</span>
  </div>
);
const AdminBadge = () => (
  <span className="ml-2 text-[9px] font-bold bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded uppercase">Solo Admin</span>
);

const Step = ({ num, title, children }) => (
  <div className="flex gap-3 text-xs">
    <span className="font-mono font-bold text-white bg-[#134e4a] px-2 py-1 rounded text-center w-8 shrink-0 h-fit">{num}</span>
    <div className="space-y-1">
      <p className="font-semibold text-gray-800">{title}</p>
      <div className="text-gray-600">{children}</div>
    </div>
  </div>
);

const Section = ({ num, title, adminOnly = false, children }) => (
  <section id={`sec-${String(num).padStart(2, '0')}`} className="print-section mb-10 scroll-mt-6">
    <div className="flex items-baseline gap-3 mb-4 pb-2 border-b-2 border-[#134e4a]">
      <span className="text-xs font-mono font-bold text-[#134e4a] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
        {String(num).padStart(2, '0')}
      </span>
      <h2 className="text-base font-bold text-[#134e4a] uppercase tracking-widest">{title}</h2>
      {adminOnly && <AdminBadge />}
    </div>
    {children}
  </section>
);

export default function Manual() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'admin';
  const [viewMode, setViewMode] = useState(isAdmin ? 'admin' : 'auditor');
  const showAdmin = viewMode === 'admin' && isAdmin;
  const sections = showAdmin ? SECTIONS_ADMIN : SECTIONS_AUDITOR;

  return (
    <div className="md:ml-56 print:ml-0 pb-16">
      {/* Barra de acciones */}
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Manual de Usuario</h1>
          <p className="text-xs text-gray-500 mt-0.5">SICH v{APP_VERSION} · {today}</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => setViewMode('auditor')}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors ${viewMode === 'auditor' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
              >
                Vista Auditor
              </button>
              <button
                onClick={() => setViewMode('admin')}
                className={`text-xs px-3 py-1.5 rounded-lg font-semibold border transition-colors ${viewMode === 'admin' ? 'bg-[#134e4a] text-white border-[#134e4a]' : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'}`}
              >
                Vista Administrador
              </button>
            </>
          )}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-[#134e4a] hover:bg-teal-800 text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir / PDF
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-8 print:shadow-none print:border-0 print:rounded-none print:p-0 max-w-4xl">

        {/* Portada */}
        <div className="flex items-start justify-between mb-8 pb-6 border-b-4 border-[#134e4a]">
          <div className="flex items-center gap-4">
            <img src="/oxxo.png" alt="OXXO" className="h-10 object-contain" />
            <div className="border-l-2 border-gray-200 pl-4">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Cadena Comercial OXXO, S.A. de C.V.</p>
              <p className="text-[10px] text-gray-400">Zona Pacífico · Uso interno</p>
            </div>
          </div>
          <div className="text-right">
            <h1 className="text-lg font-black text-[#134e4a] uppercase tracking-widest leading-tight">
              Manual de Usuario
            </h1>
            <p className="text-[11px] font-mono text-gray-500 mt-1">
              SICH v{APP_VERSION} · {showAdmin ? 'Perfil: Administrador' : 'Perfil: Auditor'}
            </p>
          </div>
        </div>

        {/* Índice */}
        <div className="mb-10 print-section">
          <div className="flex items-baseline gap-3 mb-4 pb-2 border-b-2 border-[#134e4a]">
            <span className="text-xs font-mono font-bold text-[#134e4a] bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">—</span>
            <h2 className="text-base font-bold text-[#134e4a] uppercase tracking-widest">Contenido</h2>
          </div>
          <ol className="space-y-1">
            {sections.map(({ num, title }) => (
              <li key={num}>
                <a
                  href={`#sec-${num}`}
                  onClick={e => { e.preventDefault(); document.getElementById(`sec-${num}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                  className="print:no-underline flex items-baseline gap-0 text-xs group hover:text-[#134e4a] text-gray-700 transition-colors"
                >
                  <span className="font-mono font-bold text-[#134e4a] w-8 shrink-0">{num}</span>
                  <span className="group-hover:underline underline-offset-2">{title}</span>
                  <span className="flex-1 border-b border-dotted border-gray-300 mx-2 mb-0.5" />
                  <span className="font-mono text-[10px] text-gray-400 shrink-0">§ {num}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>

        {/* ── 01 INICIO DE SESIÓN ── */}
        <Section num={1} title="Inicio de sesión y seguridad de la cuenta">
          <div className="space-y-4 text-xs">
            <div className="space-y-3">
              <Step num="1" title="Acceder a la aplicación">
                Abre el navegador y visita la dirección del sistema. Ingresa tu <strong>nombre de usuario</strong> y <strong>contraseña</strong> asignados por el administrador.
              </Step>
              <Step num="2" title="Contraseña segura">
                <p>Tu contraseña debe cumplir los siguientes requisitos:</p>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  <li>Mínimo <strong>8 caracteres</strong></li>
                  <li>Al menos una <strong>letra mayúscula</strong></li>
                  <li>Al menos un <strong>número</strong></li>
                </ul>
              </Step>
              <Step num="3" title="Cambiar contraseña">
                Haz clic en tu <strong>nombre</strong> en la parte superior derecha de la pantalla. Se abrirá un cuadro para cambiar tu contraseña.
              </Step>
              <Step num="4" title="Cerrar sesión">
                Usa el botón <strong>Salir</strong> en la barra superior para cerrar tu sesión correctamente.
              </Step>
            </div>
            <Warning>
              Si ingresas tu contraseña incorrectamente 5 veces seguidas, tu cuenta quedará bloqueada por 15 minutos. Si necesitas desbloquearla antes, comunícate con el administrador.
            </Warning>
            <Alert>
              <strong>No compartas tu contraseña con nadie.</strong> Eres responsable de las revisiones registradas con tu cuenta. El sistema registra la IP y el dispositivo de cada acceso.
            </Alert>
            <Tip>
              El sistema cierra la sesión automáticamente después de un período de inactividad (normalmente 20 minutos). Guarda tu trabajo antes de alejarte del dispositivo.
            </Tip>
          </div>
        </Section>

        {/* ── 02 DASHBOARD ── */}
        <Section num={2} title="Panel de inicio (Dashboard)">
          <div className="space-y-3 text-xs">
            <p className="text-gray-700">El panel de inicio muestra un resumen de tu actividad y acceso rápido a las funciones principales.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['📊 Estadísticas', 'Revisiones realizadas hoy y en total.'],
                ['✍️ Mi Firma', 'Guarda o actualiza tu firma digital pre-capturada para usarla en las revisiones sin necesidad de firmar cada vez.'],
                ['➕ Nueva Revisión', 'Acceso directo al formulario de auditoría.'],
                ['📋 Historial', 'Consulta todas las revisiones registradas.'],
              ].map(([titulo, desc]) => (
                <div key={titulo} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <p className="font-semibold text-gray-800 mb-1">{titulo}</p>
                  <p className="text-gray-600">{desc}</p>
                </div>
              ))}
            </div>
            {showAdmin && (
              <div className="border border-red-100 rounded-lg p-3 bg-red-50">
                <p className="font-semibold text-red-800 mb-1">🔴 Cuentas bloqueadas <AdminBadge /></p>
                <p className="text-red-700">Si hay usuarios con cuenta bloqueada, el Dashboard mostrará una alerta con el número de cuentas bloqueadas. Ve a <strong>Admin → Usuarios</strong> para desbloquearlas.</p>
              </div>
            )}
          </div>
        </Section>

        {/* ── 03 MI FIRMA ── */}
        <Section num={3} title="Mi Firma de auditor">
          <div className="space-y-3 text-xs">
            <p className="text-gray-700">La firma pre-guardada te permite agilizar las revisiones: en lugar de firmar en el canvas en cada auditoría, el sistema precarga tu firma automáticamente.</p>
            <div className="space-y-2">
              {[
                ['Guardar firma', 'En el Dashboard, haz clic en el área "Mi Firma". Se abrirá un cuadro donde puedes dibujar tu firma con el dedo o el ratón. Haz clic en "Guardar" cuando estés conforme.'],
                ['Cómo se usa en revisiones', 'En los pasos de firma (auto o equipo), si tienes una firma guardada, el sistema la mostrará automáticamente. Puedes usarla tal cual o tocar "Usar firma diferente en esta revisión" para capturar una nueva.'],
                ['Actualizar firma', 'Para cambiar tu firma, ve al Dashboard → Mi Firma y dibuja una nueva. La anterior se reemplaza.'],
                ['Eliminar firma', 'Si no deseas tener firma pre-guardada, usa el botón "Eliminar" en el modal de Mi Firma.'],
              ].map(([titulo, desc], i) => (
                <Step key={i} num={String(i + 1).padStart(2, '0')} title={titulo}>{desc}</Step>
              ))}
            </div>
            <Tip>
              La firma se almacena cifrada en la base de datos. Solo tú y el administrador pueden verla como imagen en el contexto del sistema.
            </Tip>
          </div>
        </Section>

        {/* ── 04 NUEVA REVISIÓN ── */}
        <Section num={4} title="Cómo realizar una revisión correctamente">
          <div className="space-y-4 text-xs">
            <p className="text-gray-700">El proceso de auditoría se realiza paso a paso. No es posible omitir pasos requeridos.</p>

            <div className="space-y-3">
              <Step num="01" title="Buscar al empleado">
                Escribe el nombre o número de empleado en el buscador. Selecciona al empleado correcto de la lista de sugerencias. Verifica que el nombre, plaza y posición correspondan a la persona que tienes frente a ti.
              </Step>
              <Step num="02" title="Confirmar datos del empleado">
                Revisa la información desplegada: nombre completo, número de empleado, plaza, posición y departamento. Si los datos no corresponden, notifica al administrador.
              </Step>
              <Step num="03" title="Revisión del vehículo (si aplica)">
                <div className="space-y-2">
                  <p>Completa los siguientes campos con la información física del vehículo:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li><strong>Placas y No. de serie</strong> — transcribe directamente de la unidad</li>
                    <li><strong>Kilometraje</strong> — anota el kilometraje actual del tablero</li>
                    <li><strong>Póliza de seguro</strong> — indica si cuenta con ella (Sí/No); puedes capturar foto</li>
                    <li><strong>Licencia vigente</strong> — verifica que la licencia de conducir esté vigente</li>
                    <li><strong>Tarjeta de circulación</strong> — indica si el empleado la tiene consigo</li>
                    <li><strong>Llanta de refacción</strong> — confirma su presencia en el vehículo</li>
                    <li><strong>Gato / Cruceta</strong> — confirma su presencia</li>
                    <li><strong>Foto de licencia</strong> (anverso y reverso) — captura si se requiere evidencia</li>
                    <li><strong>Domicilio y C.P.</strong> — datos del empleado para la carta responsiva</li>
                    <li><strong>Daños</strong> — registra cualquier daño existente usando el panel de etiquetas</li>
                    <li><strong>Observaciones</strong> — agrega cualquier comentario relevante</li>
                  </ul>
                </div>
              </Step>
              <Step num="04" title="Firmas del vehículo">
                <div className="space-y-1">
                  <p>Captura la firma del empleado en el canvas táctil. Luego captura (o confirma) tu firma como auditor.</p>
                  <p>Si el empleado se niega a firmar, registra la situación en el campo de observaciones y notifica al administrador.</p>
                </div>
              </Step>
              <Step num="05" title="Revisión del equipo de cómputo (si aplica)">
                <div className="space-y-2">
                  <p>Completa los datos del equipo asignado:</p>
                  <ul className="list-disc pl-4 space-y-0.5">
                    <li><strong>Código de barras / No. activo</strong> — escanea o escribe manualmente</li>
                    <li><strong>Marca, modelo y serie</strong> — anota directamente del equipo</li>
                    <li><strong>Estado del equipo</strong> — registra daños si existen usando el panel de etiquetas</li>
                    <li><strong>Foto de evidencia</strong> — obligatoria si se registran daños</li>
                  </ul>
                </div>
              </Step>
              <Step num="06" title="Resumen y confirmación">
                El sistema muestra un resumen completo de todos los datos capturados. Revisa que todo sea correcto antes de guardar. <strong>Una vez guardada, la revisión no puede modificarse</strong> (solo el administrador puede eliminar el registro).
              </Step>
            </div>

            <Warning>
              Captura los datos directamente de las fuentes físicas (tablero, documentos, etiquetas del equipo). No transcribas de revisiones anteriores ni de notas externas.
            </Warning>
            <Tip>
              Si el empleado tiene tanto vehículo como equipo de cómputo asignados, el sistema te permitirá revisar ambos en la misma sesión. No es necesario hacer dos revisiones separadas.
            </Tip>
          </div>
        </Section>

        {/* ── 05 HISTORIAL ── */}
        <Section num={5} title="Historial de revisiones">
          <div className="space-y-3 text-xs">
            <p className="text-gray-700">El historial muestra todas las revisiones registradas, ordenadas por fecha.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['🔍 Buscar', 'Usa el buscador para filtrar por nombre de empleado, número o auditor.'],
                ['📅 Filtrar por fecha', 'Selecciona un rango de fechas para ver solo las revisiones del período.'],
                ['👁️ Ver detalle', 'Haz clic en una revisión para ver todos sus datos, fotos y firmas.'],
                ['📄 Ver carta', 'Desde el detalle, puedes abrir la carta responsiva en una nueva pestaña e imprimirla o exportarla como PDF.'],
              ].map(([titulo, desc]) => (
                <div key={titulo} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <p className="font-semibold text-gray-800 mb-1">{titulo}</p>
                  <p className="text-gray-600">{desc}</p>
                </div>
              ))}
            </div>
            {showAdmin && (
              <div className="border border-red-100 rounded-lg p-3 bg-red-50">
                <p className="font-semibold text-red-800 mb-1">🗑️ Eliminar revisión <AdminBadge /></p>
                <p className="text-red-700">El administrador puede eliminar un registro desde el detalle de la revisión en el historial. Esta acción es <strong>permanente e irreversible</strong>: elimina la revisión y todas sus fotos, firmas y datos asociados.</p>
              </div>
            )}
            <p className="text-gray-700 font-semibold mt-2">Exportar ZIP de cartas responsivas</p>
            <p className="text-gray-600">Si tienes permiso habilitado, puedes exportar un archivo ZIP con las cartas responsivas de todas las revisiones filtradas. El ZIP incluye un PDF por empleado y un Excel de resumen. El proceso se ejecuta en segundo plano: puedes navegar o refrescar la página sin perder el avance.</p>
          </div>
        </Section>

        {/* ── 06 SIN VALIDAR ── */}
        <Section num={6} title="Lista Sin Validar">
          <div className="space-y-3 text-xs">
            <p className="text-gray-700">Esta lista muestra las herramientas del catálogo MAF que <strong>no tienen una revisión registrada</strong> en el sistema.</p>
            <div className="space-y-2">
              <p className="text-gray-600">Usa esta lista para identificar:</p>
              <ul className="list-disc pl-4 space-y-1 text-gray-600">
                <li>Vehículos o equipos que aún no han sido auditados</li>
                <li>Herramientas asignadas a empleados que no han pasado por revisión</li>
                <li>Pendientes para programar próximas auditorías</li>
              </ul>
            </div>
            <Tip>
              Filtra por tipo (auto / equipo) o por plaza para organizar tus revisiones pendientes.
            </Tip>
          </div>
        </Section>

        {/* ── 07 CONFIDENCIALIDAD ── */}
        <Section num={7} title="Confidencialidad y protección de datos">
          <div className="space-y-4 text-xs">

            <div className="bg-[#134e4a] text-white rounded-xl p-4 space-y-2">
              <p className="font-bold text-sm">¿Qué información maneja SICH?</p>
              <ul className="space-y-1">
                {[
                  'Nombre completo y número de empleado',
                  'Domicilio y código postal del empleado',
                  'Fotografía de licencia de conducir (anverso y reverso)',
                  'Firma digital del empleado y del auditor',
                  'Datos del vehículo: placas, serie, póliza de seguro',
                  'Fotografías del estado del equipo de cómputo',
                  'Historial de accesos (IP y hora de inicio y cierre de sesión)',
                ].map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-teal-300 shrink-0">›</span>
                    <span className="text-teal-100">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="font-semibold text-gray-800 mb-2">¿Cómo está protegida la información?</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { icono: '🔐', titulo: 'Cifrado en reposo', desc: 'Las fotos y firmas digitales se almacenan cifradas en la base de datos (AES-256-GCM). Sin la clave de cifrado, los datos son ilegibles aunque alguien acceda directamente al servidor.' },
                  { icono: '🌐', titulo: 'Cifrado en tránsito', desc: 'Toda la comunicación entre tu dispositivo y el servidor viaja encriptada (HTTPS). Nadie puede interceptar los datos en la red.' },
                  { icono: '🔑', titulo: 'Acceso autenticado', desc: 'Solo usuarios con cuenta activa pueden acceder. La sesión se cierra automáticamente por inactividad y después de 5 intentos fallidos la cuenta se bloquea.' },
                  { icono: '📝', titulo: 'Registro de accesos', desc: 'El sistema registra cada inicio y cierre de sesión con IP y dispositivo. El administrador puede revisar este historial ante cualquier sospecha de acceso no autorizado.' },
                  { icono: '🛡️', titulo: 'Control por roles', desc: 'Solo ves y puedes hacer lo que tu rol (auditor o administrador) tiene autorizado. No es posible acceder a funciones fuera de tu perfil.' },
                  { icono: '📄', titulo: 'Cartas responsivas', desc: 'Las cartas no se guardan como archivos en el servidor. Cada vez que abres una carta, el sistema la genera al momento con los datos de la revisión. El PDF solo existe en tu navegador.' },
                ].map(({ icono, titulo, desc }) => (
                  <div key={titulo} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <p className="font-semibold text-gray-800 mb-1">{icono} {titulo}</p>
                    <p className="text-gray-600">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-gray-800">Tus responsabilidades como usuario</p>
              {[
                ['No compartas tu contraseña', 'Cada auditor tiene su propia cuenta. Compartir acceso genera registros con tu nombre que pueden comprometerte legalmente.'],
                ['Cierra sesión al terminar', 'Si te alejas del dispositivo, usa el botón "Salir" o espera el cierre automático. No dejes la sesión abierta en equipos compartidos.'],
                ['Captura datos reales', 'La información registrada en cada revisión tiene validez legal al ser parte de la carta responsiva firmada por el empleado.'],
                ['No hagas capturas de pantalla de datos personales', 'Los datos de los empleados (firmas, fotos de licencia) son confidenciales. No los compartas fuera del sistema.'],
                ['Reporta anomalías', 'Si detectas accesos sospechosos, datos incorrectos o cualquier problema en el sistema, notifica inmediatamente al administrador.'],
              ].map(([titulo, desc], i) => (
                <div key={i} className="flex gap-3">
                  <span className="font-mono font-bold text-[#134e4a] bg-teal-50 border border-teal-200 px-2 py-1 rounded text-[10px] h-fit shrink-0 w-8 text-center">{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <p className="font-semibold text-gray-800">{titulo}</p>
                    <p className="text-gray-600">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <Alert>
              Los datos personales de los empleados son tratados exclusivamente para fines de auditoría interna conforme a la <strong>Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP)</strong>. No están disponibles para terceros ni se usan con otro fin.
            </Alert>
          </div>
        </Section>

        {/* ── 08 GESTIÓN DE USUARIOS (admin) ── */}
        {showAdmin && (
          <Section num={8} title="Gestión de usuarios" adminOnly>
            <div className="space-y-4 text-xs">
              <p className="text-gray-700">Desde <strong>Admin → Usuarios</strong> puedes administrar todas las cuentas de acceso al sistema.</p>
              <div className="space-y-2">
                {[
                  ['Crear usuario', 'Haz clic en "Nuevo usuario". Define nombre, usuario, contraseña y rol (admin o auditor). El sistema valida los requisitos de contraseña antes de guardar.'],
                  ['Activar / desactivar', 'Usa el interruptor en la fila del usuario para bloquear el acceso sin eliminar la cuenta ni su historial de revisiones.'],
                  ['Permisos de exportación', 'Para cada auditor puedes habilitar o deshabilitar el permiso de "Exportar responsivas ZIP". Los administradores siempre tienen este permiso.'],
                  ['Cambiar contraseña de otro usuario', 'Haz clic en el ícono de llave en la fila del usuario. Establece una contraseña temporal que cumpla los requisitos mínimos.'],
                  ['Desbloquear cuentas', 'Si un usuario tiene la cuenta bloqueada por intentos fallidos, aparecerá un indicador rojo. Haz clic en el botón de desbloqueo para restaurar el acceso inmediatamente.'],
                  ['Eliminar usuario', 'Esta acción es permanente. El sistema protege la eliminación del último administrador activo para evitar que el sistema quede sin acceso de administración.'],
                ].map(([titulo, desc], i) => (
                  <Step key={i} num={String(i + 1).padStart(2, '0')} title={titulo}>{desc}</Step>
                ))}
              </div>
              <Warning>
                Al desactivar o eliminar un usuario, sus revisiones registradas en el historial permanecen intactas. Los registros históricos no se ven afectados.
              </Warning>
            </div>
          </Section>
        )}

        {/* ── 09 EMPLEADOS Y MAF (admin) ── */}
        {showAdmin && (
          <Section num={9} title="Empleados y catálogo MAF" adminOnly>
            <div className="space-y-4 text-xs">
              <div>
                <p className="font-semibold text-gray-800 mb-2">Catálogo de empleados</p>
                <div className="space-y-2">
                  {[
                    ['Ver empleados', 'Admin → Empleados muestra el catálogo completo con búsqueda por nombre, número o plaza.'],
                    ['Importar empleados', 'Desde Admin → Importar Datos, descarga la plantilla Excel, completa los datos y sube el archivo. El sistema hace un upsert: empleados existentes se actualizan, nuevos se agregan.'],
                  ].map(([titulo, desc], i) => (
                    <Step key={i} num={String(i + 1).padStart(2, '0')} title={titulo}>{desc}</Step>
                  ))}
                </div>
              </div>
              <div>
                <p className="font-semibold text-gray-800 mb-2">Catálogo MAF (Herramientas)</p>
                <div className="space-y-2">
                  {[
                    ['Ver herramientas', 'Admin → Herramientas lista autos y equipos de cómputo asignados, con el historial de revisiones de cada activo.'],
                    ['Importar herramientas', 'Igual que empleados: descarga plantilla Excel, llena los campos y sube. Incluye tipo (auto/equipo), código de barras, marca, modelo, serie y plaza.'],
                  ].map(([titulo, desc], i) => (
                    <Step key={i} num={String(i + 1).padStart(2, '0')} title={titulo}>{desc}</Step>
                  ))}
                </div>
              </div>
              <Tip>
                La lista "Sin Validar" toma los datos de este catálogo. Si hay herramientas que no aparecen en Sin Validar, verifica que estén importadas correctamente.
              </Tip>
            </div>
          </Section>
        )}

        {/* ── 10 CONFIGURACIÓN (admin) ── */}
        {showAdmin && (
          <Section num={10} title="Configuración del sistema" adminOnly>
            <div className="space-y-3 text-xs">
              <p className="text-gray-700">Desde <strong>Admin → Configuración</strong> puedes ajustar los parámetros que afectan a toda la aplicación.</p>
              <div className="space-y-2">
                {[
                  ['Ciudad de revisión', 'OBLIGATORIO. Aparece en todas las cartas responsivas. Sin este campo configurado, el sistema no permite registrar nuevas revisiones.'],
                  ['Nombre del Responsable de RH', 'OBLIGATORIO (si firma no es opcional). Nombre que aparece en la carta como responsable de Recursos Humanos.'],
                  ['Firma del Responsable de RH', 'Dibuja o actualiza la firma digital del RH. Esta firma se inyecta automáticamente en todas las cartas. Si cambia el responsable, actualiza la firma aquí.'],
                  ['Modo firma RH opcional', 'Si se activa, permite registrar revisiones sin firma RH. Los documentos quedan marcados como "pendientes de firma". Luego puedes aplicar la firma a todos los pendientes desde esta misma página.'],
                  ['Tiempo de inactividad', 'Minutos de inactividad antes del cierre automático de sesión (rango: 1–480 min, default: 20 min).'],
                  ['Permisos de exportación ZIP', 'Habilita o deshabilita el permiso de exportar cartas responsivas en ZIP para cada auditor individualmente.'],
                ].map(([titulo, desc], i) => (
                  <Step key={i} num={String(i + 1).padStart(2, '0')} title={titulo}>{desc}</Step>
                ))}
              </div>
              <Alert>
                Si cambias la firma del Responsable de RH, las revisiones ya registradas con la firma anterior conservarán la firma que tenían al momento de la revisión. Solo los documentos nuevos usarán la firma actualizada. Para actualizar documentos anteriores usa "Aplicar firma a documentos pendientes".
              </Alert>
            </div>
          </Section>
        )}

        {/* ── 11 EXPORTACIÓN (admin) ── */}
        {showAdmin && (
          <Section num={11} title="Exportación de datos (Excel y ZIP)" adminOnly>
            <div className="space-y-4 text-xs">
              <div>
                <p className="font-semibold text-gray-800 mb-2">Exportar Excel de revisiones</p>
                <p className="text-gray-600 mb-2">Desde el Historial → botón "Exportar Excel", descarga un archivo con todas las revisiones del período seleccionado. Incluye datos del empleado, vehículo y equipo en columnas separadas.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-800 mb-2">Exportar ZIP de cartas responsivas</p>
                <div className="space-y-2">
                  {[
                    ['Iniciar exportación', 'En el Historial, aplica los filtros de fecha deseados y haz clic en "Exportar ZIP". El sistema inicia el proceso en segundo plano.'],
                    ['Monitorear el progreso', 'Una barra de progreso muestra el avance (ej. "Generando carpetas... 15 / 43 — 35%)"). Puedes navegar a otros módulos sin interrumpir el proceso.'],
                    ['Descargar el archivo', 'Cuando el estado cambie a "Listo", aparece el botón "Descargar". El ZIP incluye una carpeta por empleado con sus cartas en PDF y un Excel de resumen.'],
                    ['Cancelar', 'Si decides cancelar antes de que termine, usa el botón "Cancelar". Los archivos generados hasta ese momento se descartan.'],
                  ].map(([titulo, desc], i) => (
                    <Step key={i} num={String(i + 1).padStart(2, '0')} title={titulo}>{desc}</Step>
                  ))}
                </div>
              </div>
              <Tip>
                El archivo ZIP tiene validez por 1 hora desde que se generó. Si no lo descargas en ese tiempo, deberás generarlo nuevamente.
              </Tip>
            </div>
          </Section>
        )}

        {/* ── 12 RESET (admin) ── */}
        {showAdmin && (
          <Section num={12} title="Operaciones de reset" adminOnly>
            <div className="space-y-3 text-xs">
              <p className="text-gray-700">Desde <strong>Admin → Reset</strong> puedes eliminar datos del sistema con opciones granulares.</p>
              <div className="space-y-2">
                {[
                  ['Revisiones', 'Elimina todos los registros de auditoría (revisiones, fotos, firmas). Los catálogos de empleados y herramientas NO se afectan.'],
                  ['Empleados', 'Elimina el catálogo de empleados. Requiere que no haya revisiones activas o que se eliminen revisiones primero.'],
                  ['Herramientas (MAF)', 'Elimina el catálogo de herramientas asignadas.'],
                  ['Configuración del sistema', 'Restablece los parámetros configurables (ciudad, firma RH, inactividad) a sus valores iniciales.'],
                ].map(([titulo, desc], i) => (
                  <Step key={i} num={String(i + 1).padStart(2, '0')} title={titulo}>{desc}</Step>
                ))}
              </div>
              <Alert>
                <strong>Las operaciones de reset son PERMANENTES e IRREVERSIBLES.</strong> El sistema solicita confirmación doble antes de ejecutar cualquier operación de borrado. Asegúrate de tener respaldo de la información antes de proceder.
              </Alert>
            </div>
          </Section>
        )}

        {/* Pie de página */}
        <div className="border-t-2 border-[#134e4a] pt-4 mt-8 flex items-center justify-between text-[10px] text-gray-400">
          <span>SICH v{APP_VERSION} · {showAdmin ? 'Perfil: Administrador' : 'Perfil: Auditor'} · Cadena Comercial OXXO, S.A. de C.V.</span>
          <span>{today}</span>
        </div>
      </div>

      <style>{`
        @media print {
          .print-section { page-break-inside: avoid; }
          body { font-size: 11px; }
          @page { margin: 1.5cm; size: A4; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>
    </div>
  );
}

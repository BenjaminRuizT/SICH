"""
SICH — Script de importación de datos desde Excel
Uso: python3 scripts/importar.py [--api URL] [--token TOKEN]

Sin flags: genera JSON en scripts/output/ para subir desde el panel admin.
Con --api y --token: llama a la API directamente.
"""

import sys
if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import pandas as pd
import json
import re
import os
import argparse
import unicodedata

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
OUTPUT_DIR = os.path.join(BASE_DIR, 'output')

PLANTILLA_PATH = r'C:\Users\3650428\Downloads\Plantilla administrativa ZONA PACÍFICO S.26.xlsx'
MAF_PATH = r'C:\Users\3650428\Downloads\MAF_AUDITORIA_HERRAMIENTAS.xlsx'

# ---------------------------------------------------------------------------
# Normalizaciones
# ---------------------------------------------------------------------------

PLAZA_MAP = {
    'Este': 'Tijuana Este',
    'Centro': 'Tijuana Centro',
    'Tijuana Este': 'Tijuana Este',
    'Tijuana Centro': 'Tijuana Centro',
    'Región': 'Región',
    'Region': 'Región',
    'Playas': 'Playas',
    'Ensenada': 'Ensenada',
    'Oficinas Región': 'Oficinas Región',
}

DEPARTAMENTOS_VALIDOS = [
    'ADMINISTRATIVO', 'APERTURAS', 'RECLUTAMIENTO Y SELECCIÓN', 'CONSERVACIÓN',
    'MERCADEO', 'RECURSOS HUMANOS', 'ADMON PERSONAL', 'PROCESOS OPERATIVOS',
    'OPERACIONES', 'PROTECCIÓN PATRIMONIAL', 'MANTENIMIENTO', 'ENTRENAMIENTO',
    'DLLO INFRAESTRUCTURA Y DISEÑO', 'PLAZA EMP',
]

DEPTO_SUFIJOS = [
    ' REGION TIJUANA OHAP', ' REGION TIJUANA', ' REGION',
    ' TIJUANA CENTRO', ' TIJUANA ESTE', ' PLAYAS', ' ENSENADA', ' TIJUANA',
]

MARCA_MODELO_MAP = {
    'CHEVROLET AVEO':        ('Chevrolet', 'Aveo'),
    'CHEVROLET AVEO SEDAN':  ('Chevrolet', 'Aveo'),
    'CHECROLET AVEO':        ('Chevrolet', 'Aveo'),
    'TOYOTA AVANZA':         ('Toyota',    'Avanza'),
    'TOYOTA HILUX':          ('Toyota',    'Hilux'),
    'TOYOTA RAV4':           ('Toyota',    'RAV4'),
    'NISSAN VERSA':          ('Nissan',    'Versa'),
    'NISSAN':                ('Nissan',    ''),
    'DOLPHIN S.L':           ('BYD',       'Dolphin'),
    'BYD':                   ('BYD',       'Dolphin'),
    'VOLKSWAGEN':            ('Volkswagen',''),
    'MAZDA':                 ('Mazda',     ''),
    'SPORTAGES':             ('Kia',       'Sportage'),
}

TIPO_MAP = {
    'AUTO OFICIAL UTILITARIO': 'auto',
    'AUTO OFICIAL UTILITARIO (EJECUTIVO)': 'auto',
    'AUTO UTILITARIO ELECTRICO': 'auto',
    'LAP TOP': 'laptop',
}


def clean(val):
    """Limpiar valor de celda a string sin caracteres de control Unicode."""
    if pd.isna(val):
        return ''
    s = str(val).strip()
    # Quitar RTL override y caracteres invisibles
    s = ''.join(c for c in s if not unicodedata.category(c).startswith('C') or c in ('\n', '\t'))
    return s.strip()


def normalize_plaza(raw):
    raw = clean(raw)
    return PLAZA_MAP.get(raw, raw)


def normalize_depto(raw):
    raw = clean(raw).upper()
    # Quitar sufijo de plaza/región
    for suf in DEPTO_SUFIJOS:
        if raw.endswith(suf.upper()):
            raw = raw[:len(raw) - len(suf)].strip()
            break
    # Quitar número al final (OPERACIONES 4 → OPERACIONES)
    raw = re.sub(r'\s+\d+$', '', raw).strip()
    # Comparar contra lista válida (insensible a acentos para mayor robustez)
    def no_accent(s):
        return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    raw_na = no_accent(raw)
    for d in DEPARTAMENTOS_VALIDOS:
        if no_accent(d.upper()) == raw_na or no_accent(d.upper()).startswith(raw_na):
            return d
    return raw.title()


def normalize_auto_marca_modelo(marca_raw, modelo_raw):
    marca_raw_upper = clean(marca_raw).upper()
    modelo_raw_clean = clean(modelo_raw)

    if marca_raw_upper in MARCA_MODELO_MAP:
        marca, modelo = MARCA_MODELO_MAP[marca_raw_upper]
    else:
        parts = marca_raw_upper.split()
        marca = parts[0].capitalize() if parts else ''
        modelo = ''

    # Procesar modelo_raw: si es año, ignorar; si tiene nombre, extraer
    if modelo_raw_clean:
        try:
            year = int(float(modelo_raw_clean))
            if 2000 <= year <= 2030:
                pass  # Es año, lo manejamos por Anio Adq
            else:
                if not modelo:
                    modelo = modelo_raw_clean
        except ValueError:
            # 'AVEO 2023' → 'Aveo', 'SENTRA 2023' → 'Sentra', etc.
            m = re.sub(r'\s+\d{4}$', '', modelo_raw_clean).strip()
            if m and not modelo:
                modelo = m.capitalize()

    return marca, modelo


def parse_anio(val):
    try:
        y = int(float(str(val)))
        return y if 2000 <= y <= 2030 else None
    except (ValueError, TypeError):
        return None


# ---------------------------------------------------------------------------
# Empleados
# ---------------------------------------------------------------------------

def procesar_empleados():
    print(f"Leyendo: {PLANTILLA_PATH}")
    df = pd.read_excel(PLANTILLA_PATH)

    empleados = []
    for _, row in df.iterrows():
        num = clean(row.get('Nº personal', ''))
        if not num or num in ('nan', ''):
            continue
        # Nº personal viene como float (ej. 87090.0) → '87090'
        try:
            num = str(int(float(num)))
        except ValueError:
            pass

        nombre = clean(row.get('Empleados', ''))
        if not nombre:
            continue

        empleados.append({
            'numero_empleado': num,
            'nombre_completo': nombre,
            'posicion': clean(row.get('Descripción de Posición', '')),
            'departamento': normalize_depto(row.get('Unidad org.', '')),
            'plaza': normalize_plaza(row.get('Plaza', '')),
            'region': clean(row.get('Región', 'Tijuana')),
        })

    print(f"  → {len(empleados)} empleados procesados")
    return empleados


# ---------------------------------------------------------------------------
# Herramientas (MAF)
# ---------------------------------------------------------------------------

def procesar_herramientas(empleados):
    print(f"Leyendo: {MAF_PATH}")
    df = pd.read_excel(MAF_PATH)

    # Índice nombre → empleado_id (para linkeo)
    emp_index = {}
    for e in empleados:
        emp_index[e['nombre_completo'].upper().strip()] = e['numero_empleado']

    def buscar_empleado(desc_adicional):
        """Intenta encontrar el número de empleado por nombre."""
        if not desc_adicional:
            return None
        cand = desc_adicional.upper().strip()
        if cand in emp_index:
            return emp_index[cand]
        # Buscar coincidencia parcial (apellidos)
        for nombre, num in emp_index.items():
            parts = cand.split()
            if len(parts) >= 2 and all(p in nombre for p in parts[-2:]):
                return num
        return None

    herramientas = []
    for _, row in df.iterrows():
        desc = clean(row.get('Descripcion', ''))
        tipo = TIPO_MAP.get(desc.upper(), None)
        if not tipo:
            tipo = 'computo' if 'PC' in desc.upper() or 'COMP' in desc.upper() else 'laptop'

        cb = clean(row.get('Codigo Barras', ''))
        no_activo = clean(row.get('No Activo', ''))
        plaza_raw = clean(row.get('PLAZA', ''))
        plaza_desc = clean(row.get('Plaza Desc', ''))
        desc_adicional = clean(row.get('Desc Adicional', ''))
        desc_puesto = clean(row.get('Desc Puesto', ''))
        serie = clean(row.get('Serie', ''))
        anio = parse_anio(row.get('Anio Adq', ''))

        if tipo == 'auto':
            marca, modelo = normalize_auto_marca_modelo(
                row.get('Marca', ''),
                row.get('Modelo', ''),
            )
            if not anio:
                anio = parse_anio(row.get('Modelo', ''))
        else:
            marca_raw = clean(row.get('Marca', ''))
            modelo_raw = clean(row.get('Modelo', ''))
            # Para laptops: Marca puede estar en Modelo o vice versa
            if not marca_raw and modelo_raw and modelo_raw.upper().startswith('HP'):
                marca_raw = 'HP'
                modelo_raw = modelo_raw[3:].strip()
            BRAND_CASE = {'HP': 'HP', 'DELL': 'Dell', 'APPLE': 'Apple', 'LENOVO': 'Lenovo', 'ASUS': 'Asus'}
            marca = BRAND_CASE.get(marca_raw.upper(), marca_raw.title()) if marca_raw else ''
            modelo = modelo_raw if modelo_raw else ''

        # Intentar linkear empleado por nombre
        emp_num = buscar_empleado(desc_adicional)

        herramientas.append({
            'tipo': tipo,
            'codigo_barras': cb,
            'no_activo': no_activo,
            'marca': marca,
            'modelo': modelo,
            'anio': anio,
            'serie': serie,
            'descripcion_maf': desc,
            'plaza': normalize_plaza(plaza_raw),
            'plaza_desc': plaza_desc,
            'asignado_a_raw': desc_adicional,
            'desc_puesto': desc_puesto,
            'numero_empleado_asignado': emp_num,  # La API lo usa para linkear empleado_id
        })

    autos = sum(1 for h in herramientas if h['tipo'] == 'auto')
    laptops = sum(1 for h in herramientas if h['tipo'] != 'auto')
    linked = sum(1 for h in herramientas if h['numero_empleado_asignado'])
    print(f"  → {len(herramientas)} herramientas ({autos} autos, {laptops} laptops/cómputo)")
    print(f"  → {linked} vinculadas a empleado por nombre")

    return herramientas


# ---------------------------------------------------------------------------
# Export / API call
# ---------------------------------------------------------------------------

def guardar_json(empleados, herramientas):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    emp_path = os.path.join(OUTPUT_DIR, 'empleados.json')
    her_path = os.path.join(OUTPUT_DIR, 'herramientas.json')
    with open(emp_path, 'w', encoding='utf-8') as f:
        json.dump(empleados, f, ensure_ascii=False, indent=2)
    with open(her_path, 'w', encoding='utf-8') as f:
        json.dump(herramientas, f, ensure_ascii=False, indent=2)
    print(f"\nJSON guardados en:")
    print(f"  {emp_path}")
    print(f"  {her_path}")
    print("\n→ Sube estos archivos desde Admin → Importar datos (botón 'Cargar archivo JSON')")


def llamar_api(empleados, herramientas, api_url, token):
    import urllib.request
    headers = {'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}

    def post(endpoint, payload):
        data = json.dumps(payload).encode('utf-8')
        req = urllib.request.Request(f"{api_url.rstrip('/')}{endpoint}", data=data, headers=headers, method='POST')
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read())

    print("Importando empleados...")
    r = post('/api/empleados/import', {'empleados': empleados})
    print(f"  ✅ {r}")

    print("Importando herramientas...")
    r = post('/api/herramientas/import', {'herramientas': herramientas})
    print(f"  ✅ {r}")


def main():
    parser = argparse.ArgumentParser(description='SICH — Importación de datos Excel')
    parser.add_argument('--api', help='URL base de la API (ej. https://sich.up.railway.app)', default='')
    parser.add_argument('--token', help='JWT token de admin para autenticación', default='')
    args = parser.parse_args()

    empleados = procesar_empleados()
    herramientas = procesar_herramientas(empleados)

    if args.api and args.token:
        llamar_api(empleados, herramientas, args.api, args.token)
    else:
        guardar_json(empleados, herramientas)


if __name__ == '__main__':
    main()

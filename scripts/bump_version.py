"""
Uso: python scripts/bump_version.py 1.4.0
Actualiza la versión en frontend/src/version.js y backend/src/server.js
"""
import sys, re, datetime, os

def update_file(path, pattern, replacement):
    with open(path, encoding='utf-8') as f:
        content = f.read()
    new_content = re.sub(pattern, replacement, content)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f'  ✅ {path}')

if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Uso: python scripts/bump_version.py <version>')
        sys.exit(1)

    version = sys.argv[1].strip()
    today = datetime.date.today().isoformat()
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

    update_file(
        os.path.join(root, 'frontend', 'src', 'version.js'),
        r"APP_VERSION = '[^']*'",
        f"APP_VERSION = '{version}'"
    )
    update_file(
        os.path.join(root, 'frontend', 'src', 'version.js'),
        r"APP_BUILD_DATE = '[^']*'",
        f"APP_BUILD_DATE = '{today}'"
    )
    update_file(
        os.path.join(root, 'backend', 'src', 'server.js'),
        r"version: '[^']*'",
        f"version: '{version}'"
    )

    print(f'\nv{version} aplicada. Siguiente paso: git add -A && git commit -m "chore: bump v{version}"')

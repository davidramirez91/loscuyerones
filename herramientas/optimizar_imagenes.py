"""Optimiza nuevas imágenes de productos a WebP.

Uso:
    python herramientas/optimizar_imagenes.py ruta/a/imagen.png

Crea una versión grande y una miniatura dentro de static/img/productos.
No modifica los JSON automáticamente para evitar sobrescribir datos del catálogo.
"""
from pathlib import Path
import sys
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PRODUCTS = ROOT / "static/img/productos"

if len(sys.argv) != 2:
    raise SystemExit("Uso: python herramientas/optimizar_imagenes.py ruta/a/imagen.png")

source = Path(sys.argv[1]).resolve()
if not source.exists():
    raise SystemExit(f"No existe: {source}")

relative_folder = input("Subcarpeta destino (ceramica, barro, amigurumis...): ").strip().strip("/")
name = input(f"Nombre de salida sin extensión [{source.stem}]: ").strip() or source.stem
name = "-".join(name.lower().replace("_", " ").split())

image = Image.open(source)
if image.mode not in ("RGB", "RGBA"):
    image = image.convert("RGBA")

full_dir = PRODUCTS / relative_folder
thumb_dir = PRODUCTS / "miniaturas" / relative_folder
full_dir.mkdir(parents=True, exist_ok=True)
thumb_dir.mkdir(parents=True, exist_ok=True)

full = image.copy()
full.thumbnail((1400, 1400), Image.Resampling.LANCZOS)
full_path = full_dir / f"{name}.webp"
full.save(full_path, "WEBP", quality=84, method=3)

thumb = image.copy()
thumb.thumbnail((520, 520), Image.Resampling.LANCZOS)
thumb_path = thumb_dir / f"{name}.webp"
thumb.save(thumb_path, "WEBP", quality=72, method=3)

print("Imagen:", full_path.relative_to(ROOT).as_posix())
print("Miniatura:", thumb_path.relative_to(ROOT).as_posix())

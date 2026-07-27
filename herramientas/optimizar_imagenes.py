"""Optimiza imágenes de productos y actualiza automáticamente el catálogo JSON.

Uso recomendado desde la carpeta principal del proyecto:

    python herramientas/optimizar_imagenes.py "ruta/a/la/imagen.jpg"
    Ejemplo:
    python herramientas/optimizar_imagenes.py "C:/Users/drami/Downloads/cuy_futbolista.png"

También puede ejecutarse sin indicar la imagen; en ese caso, el programa pedirá
la ruta por teclado:

    python herramientas/optimizar_imagenes.py

El programa:
- convierte la imagen a WebP;
- crea una versión grande y una miniatura;
- guarda ambas en la categoría seleccionada;
- agrega el producto al archivo JSON correspondiente;
- asigna automáticamente el siguiente ID disponible.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps, UnidentifiedImageError


# -----------------------------------------------------------------------------
# Rutas generales del proyecto
# -----------------------------------------------------------------------------
ROOT = Path(__file__).resolve().parents[1]
PRODUCTS_DIR = ROOT / "static" / "img" / "productos"

# Tamaños máximos. Se conserva la proporción original de la fotografía.
FULL_MAX_SIZE = (1400, 1400)
THUMB_MAX_SIZE = (520, 520)

# Configuración de categorías.
# La carpeta y el nombre del JSON no siempre coinciden, por eso se definen aquí.
CATEGORY_OPTIONS: dict[str, dict[str, str]] = {
    "C": {
        "label": "Cerámica",
        "folder": "ceramica",
        "json": "ceramica.json",
    },
    "B": {
        "label": "Barro",
        "folder": "barro",
        "json": "barro.json",
    },
    "A": {
        "label": "Amigurumis",
        "folder": "amigurumis",
        "json": "amigurumis.json",
    },
    "CP": {
        "label": "Cerámica con plantas",
        "folder": "ceramica_plantas",
        "json": "ceramica_planta.json",
    },
}

# Tipos disponibles para el catálogo.
TYPE_OPTIONS: dict[str, str] = {
    "M": "Maceta",
    "MM": "Mini maceta",
    "MCP": "Mini maceta con planta",
    "P": "Plato",
    "PI": "Porta-incienso",
    "A": "Alcancía",
    "AM": "Amigurumi",
    "AZ": "Azucarera",
    "V": "Vaso",
    "O": "Olla",
    "VA": "Vasija",
    "C": "Cántaro",
    "D": "Decorativo",
    "OT": "Otro",
}


def parse_arguments() -> argparse.Namespace:
    """Lee la ruta opcional de la imagen desde la línea de comandos."""
    parser = argparse.ArgumentParser(
        description="Optimiza una imagen y agrega el producto a su catálogo JSON."
    )
    parser.add_argument(
        "imagen",
        nargs="?",
        help="Ruta de la fotografía del producto (JPG, PNG, WebP, etc.).",
    )
    return parser.parse_args()


def ask_source_path(argument: str | None) -> Path:
    """Obtiene y valida la ruta de la imagen original."""
    raw_path = argument

    while not raw_path:
        raw_path = input("Ruta de la imagen: ").strip()
        if not raw_path:
            print("Debe ingresar la ruta de una imagen.")

    # Permite pegar rutas rodeadas por comillas desde Windows.
    source = Path(raw_path.strip().strip(
        '"').strip("'")).expanduser().resolve()

    if not source.exists():
        raise FileNotFoundError(f"No existe la imagen: {source}")
    if not source.is_file():
        raise ValueError(f"La ruta no corresponde a un archivo: {source}")

    return source


def select_category() -> dict[str, str]:
    """Solicita la categoría. Enter selecciona Cerámica por defecto."""
    print("\nCategoría del producto:")
    print("  C  = Cerámica (predeterminado)")
    print("  B  = Barro")
    print("  A  = Amigurumis")
    print("  CP = Cerámica con plantas")

    while True:
        code = input("Seleccione la categoría [C]: ").strip().upper() or "C"
        category = CATEGORY_OPTIONS.get(code)
        if category:
            return category
        print("Categoría no válida. Escriba C, B, A o CP.")


def ask_nonempty(message: str) -> str:
    """Solicita un texto obligatorio."""
    while True:
        value = input(message).strip()
        if value:
            return value
        print("Este dato es obligatorio.")


def select_product_type() -> str:
    """Solicita el tipo del producto mediante un código corto."""
    print("\nTipo de producto:")
    print("  M   = Maceta")
    print("  MM  = Mini maceta")
    print("  MCP = Mini maceta con planta")
    print("  P   = Plato")
    print("  PI  = Porta-incienso")
    print("  A   = Alcancía")
    print("  AM  = Amigurumi")
    print("  AZ  = Azucarera")
    print("  V   = Vaso")
    print("  O   = Olla")
    print("  VA  = Vasija")
    print("  C   = Cántaro")
    print("  D   = Decorativo")
    print("  OT  = Otro")

    while True:
        code = input("Seleccione el tipo: ").strip().upper()
        product_type = TYPE_OPTIONS.get(code)

        if not product_type:
            print("Tipo no válido. Escriba uno de los códigos mostrados.")
            continue

        if code == "OT":
            return ask_nonempty("Escriba el tipo del producto: ")

        return product_type


def normalize_price(raw_price: str) -> str:
    """Convierte valores como 5, 5.5, 5,50 o USD 5 en 'usd 5.00'."""
    cleaned = raw_price.strip().lower()
    cleaned = cleaned.replace("usd", "").replace("$", "").replace(" ", "")
    cleaned = cleaned.replace(",", ".")

    try:
        amount = Decimal(cleaned)
    except InvalidOperation as exc:
        raise ValueError("El precio debe ser un número válido.") from exc

    if amount < 0:
        raise ValueError("El precio no puede ser negativo.")

    amount = amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    return f"usd {amount:.2f}"


def ask_price() -> str:
    """Solicita y valida el precio del producto."""
    while True:
        raw_price = input("Precio en USD (ej. 5 o 5,50): ").strip()
        try:
            return normalize_price(raw_price)
        except ValueError as error:
            print(error)


def slugify(text: str) -> str:
    """Crea un nombre de archivo seguro a partir del nombre del producto."""
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_text.lower()).strip("-")
    return slug or "producto"


def get_unique_slug(base_slug: str, full_dir: Path, thumb_dir: Path) -> str:
    """Evita sobrescribir imágenes si ya existe un archivo con el mismo nombre."""
    candidate = base_slug
    counter = 2

    while (
        (full_dir / f"{candidate}.webp").exists()
        or (thumb_dir / f"{candidate}.webp").exists()
    ):
        candidate = f"{base_slug}-{counter}"
        counter += 1

    return candidate


def load_catalog(json_path: Path) -> list[dict[str, Any]]:
    """Carga el catálogo y verifica que tenga una lista JSON válida."""
    if not json_path.exists():
        return []

    try:
        with json_path.open("r", encoding="utf-8") as file:
            data = json.load(file)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"El archivo JSON está mal formado: {json_path}\n"
            f"Línea {exc.lineno}, columna {exc.colno}: {exc.msg}"
        ) from exc

    if not isinstance(data, list):
        raise ValueError(
            f"El catálogo debe contener una lista JSON: {json_path}")

    return data


def get_next_id(catalog: list[dict[str, Any]]) -> int:
    """Obtiene el ID mayor del catálogo y devuelve el siguiente."""
    ids: list[int] = []

    for product in catalog:
        try:
            ids.append(int(product.get("id", 0)))
        except (TypeError, ValueError):
            continue

    return max(ids, default=0) + 1


def save_catalog_atomic(json_path: Path, catalog: list[dict[str, Any]]) -> None:
    """Guarda el JSON de forma segura para reducir el riesgo de corrupción."""
    json_path.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = json_path.with_suffix(json_path.suffix + ".tmp")

    with temporary_path.open("w", encoding="utf-8", newline="\n") as file:
        json.dump(catalog, file, ensure_ascii=False, indent=2)
        file.write("\n")

    temporary_path.replace(json_path)


def prepare_image(source: Path) -> Image.Image:
    """Abre la imagen, corrige su orientación y normaliza el modo de color."""
    try:
        with Image.open(source) as original:
            image = ImageOps.exif_transpose(original).copy()
    except UnidentifiedImageError as exc:
        raise ValueError(
            f"El archivo no es una imagen válida: {source}") from exc

    has_transparency = (
        image.mode in ("RGBA", "LA")
        or (image.mode == "P" and "transparency" in image.info)
    )

    if has_transparency:
        return image.convert("RGBA")

    return image.convert("RGB")


def save_webp_versions(
    image: Image.Image,
    full_path: Path,
    thumb_path: Path,
) -> None:
    """Crea la imagen principal y la miniatura en formato WebP."""
    full_path.parent.mkdir(parents=True, exist_ok=True)
    thumb_path.parent.mkdir(parents=True, exist_ok=True)

    full = image.copy()
    full.thumbnail(FULL_MAX_SIZE, Image.Resampling.LANCZOS)
    full.save(full_path, "WEBP", quality=84, method=6)

    thumb = image.copy()
    thumb.thumbnail(THUMB_MAX_SIZE, Image.Resampling.LANCZOS)
    thumb.save(thumb_path, "WEBP", quality=72, method=6)


def create_product_record(
    product_id: int,
    name: str,
    product_type: str,
    dimensions: str,
    price: str,
    full_path: Path,
    thumb_path: Path,
) -> dict[str, Any]:
    """Construye el objeto que se agregará al catálogo JSON."""
    return {
        "id": product_id,
        "nombre": name,
        "tipo": product_type,
        "dimensiones": dimensions,
        "precio": price,
        "imagen": full_path.relative_to(ROOT).as_posix(),
        "miniatura": thumb_path.relative_to(ROOT).as_posix(),
    }


def main() -> None:
    """Ejecuta el proceso completo."""
    args = parse_arguments()
    source = ask_source_path(args.imagen)
    category = select_category()

    print(f"\nCategoría seleccionada: {category['label']}")

    name = ask_nonempty("Nombre del producto: ")
    product_type = select_product_type()
    dimensions = ask_nonempty("Dimensiones (ej. 80x100x120mm): ")
    price = ask_price()

    json_path = PRODUCTS_DIR / category["json"]
    catalog = load_catalog(json_path)
    next_id = get_next_id(catalog)

    full_dir = PRODUCTS_DIR / category["folder"]
    thumb_dir = PRODUCTS_DIR / "miniaturas" / category["folder"]

    base_slug = slugify(name)
    final_slug = get_unique_slug(base_slug, full_dir, thumb_dir)

    full_path = full_dir / f"{final_slug}.webp"
    thumb_path = thumb_dir / f"{final_slug}.webp"

    image = prepare_image(source)

    # Si ocurre un error al actualizar el JSON, se eliminan las imágenes nuevas
    # para que el catálogo no quede a medias.
    try:
        save_webp_versions(image, full_path, thumb_path)

        product = create_product_record(
            product_id=next_id,
            name=name,
            product_type=product_type,
            dimensions=dimensions,
            price=price,
            full_path=full_path,
            thumb_path=thumb_path,
        )

        catalog.append(product)
        save_catalog_atomic(json_path, catalog)
    except Exception:
        full_path.unlink(missing_ok=True)
        thumb_path.unlink(missing_ok=True)
        raise

    print("\nProducto agregado correctamente.")
    print(f"ID:         {next_id}")
    print(f"Nombre:     {name}")
    print(f"Tipo:       {product_type}")
    print(f"Dimensiones:{' ' if dimensions else ''}{dimensions}")
    print(f"Precio:     {price}")
    print(f"Imagen:     {full_path.relative_to(ROOT).as_posix()}")
    print(f"Miniatura:  {thumb_path.relative_to(ROOT).as_posix()}")
    print(f"Catálogo:   {json_path.relative_to(ROOT).as_posix()}")

    if final_slug != base_slug:
        print(
            "Nota: ya existía una imagen con el mismo nombre; "
            f"se utilizó '{final_slug}.webp'."
        )


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, ValueError, OSError) as error:
        raise SystemExit(f"\nError: {error}") from error

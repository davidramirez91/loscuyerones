# LOS CUYERONES — sitio web estático

Sitio creado únicamente con **HTML, CSS y JavaScript**, listo para GitHub Pages.

## Estructura

```text
los-cuyerones/
├── index.html
├── templates/
│   ├── inicio.html
│   ├── ceramica.html
│   ├── amigurumi.html
│   └── contactos.html
├── static/
│   ├── css/styles.css
│   ├── js/config.js
│   ├── js/app.js
│   └── img/
│       ├── Logo_Cuyerones.png
│       ├── og-cover.jpg
│       ├── icons/
│       └── productos/
├── manifest.webmanifest
├── robots.txt
└── sitemap.xml
```

## Ver el proyecto localmente

No abras `index.html` con doble clic, porque los navegadores bloquean `fetch()` bajo `file://`.

En la carpeta del proyecto ejecuta uno de estos comandos:

```bash
python -m http.server 8000
```

Luego abre `http://localhost:8000`.

También puedes usar la extensión **Live Server** de Visual Studio Code.

## Publicar en GitHub Pages

1. Crea un repositorio, por ejemplo `los-cuyerones`.
2. Sube todo el contenido de esta carpeta a la rama `main`.
3. En GitHub ve a **Settings → Pages**.
4. En **Build and deployment**, selecciona **Deploy from a branch**, rama `main` y carpeta `/ (root)`.
5. Guarda y espera a que GitHub muestre la dirección pública.

## Configuración obligatoria después de publicar

Reemplaza `TU_USUARIO` por tu usuario real de GitHub en:

- `index.html`: `canonical`, `og:url`.
- `robots.txt`.
- `sitemap.xml`.

Para que la vista previa en WhatsApp, Facebook y Telegram sea totalmente fiable, cambia también `og:image` y `twitter:image` a la dirección **absoluta** de `static/img/og-cover.jpg`.

Ejemplo:

```html
<meta property="og:image" content="https://TU_USUARIO.github.io/los-cuyerones/static/img/og-cover.jpg">
```

## Actualizar contactos y redes

Edita solamente:

```text
static/js/config.js
```

Los enlaces de Facebook e Instagram quedaron dirigidos a las páginas generales porque no se proporcionaron los perfiles oficiales. Sustitúyelos allí.

Para Telegram es más fiable usar el nombre de usuario del negocio, por ejemplo:

```js
telegram: "https://t.me/USUARIO_DEL_NEGOCIO"
```

## Agregar productos al catálogo

Los catálogos se generan automáticamente a partir de estos archivos:

```text
static/img/productos/ceramica.json
static/img/productos/ceramica_planta.json
static/img/productos/barro.json
static/img/productos/amigurumis.json
```

Agrega la imagen dentro de `static/img/productos/` y añade un objeto al JSON correspondiente:

```json
{
  "id": 100,
  "nombre": "Nuevo producto",
  "tipo": "Mini maceta",
  "direccionOriginal": "static/img/productos/ceramica/nuevo-producto.png",
  "imagen": "static/img/productos/ceramica/nuevo-producto.png",
  "miniatura": "static/img/productos/ceramica/nuevo-producto.png",
  "dimensiones": "100x100x100mm",
  "precio": "usd 4.00"
}
```

`imagen` y `miniatura` pueden apuntar al mismo archivo. El catálogo seguirá funcionando. Para mayor velocidad, utiliza imágenes WebP optimizadas.

## Rendimiento

- Las imágenes actuales fueron convertidas a WebP.
- Cada producto tiene una miniatura liviana para el catálogo y una versión mayor para la vista completa.
- Se precargan el logo, las imágenes principales y los primeros productos; el resto usa carga diferida.
- No se usan librerías, fuentes ni iconos externos.

## SEO

El proyecto incluye metadatos, Open Graph, Twitter Card, datos estructurados Schema.org, `robots.txt`, `sitemap.xml` y contenido semántico. Esto crea una base técnica correcta, pero ningún sitio puede garantizar los primeros lugares de Google solo mediante programación. Después de publicar conviene registrar la URL en Google Search Console, completar los perfiles sociales y mantener descripciones originales para los nuevos productos.

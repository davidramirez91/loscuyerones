(() => {
  "use strict";

  const config = window.LOS_CUYERONES_CONFIG || {};
  const app = document.querySelector("#app");
  const modal = document.querySelector("#image-modal");
  const modalImage = modal.querySelector(".modal-image");
  const modalTitle = modal.querySelector("#modal-title");
  const modalDetails = modal.querySelector("#modal-details");
  const modalWhatsApp = modal.querySelector("#modal-whatsapp");
  const modalClose = modal.querySelector(".modal-close");
  const mobileMenu = document.querySelector("#mobile-menu");
  const mobileMenuButton = document.querySelector(".mobile-menu-button");

  const routes = {
    inicio: {
      file: "templates/inicio_2.html",
      title:
        "Los Cuyerones | Cerámica artesanal, barro y amigurumis en Riobamba",
      description:
        "Cerámica decorativa, mini macetas, piezas de arcilla y barro y amigurumis tejidos a mano en Riobamba.",
    },
    ceramica: {
      file: "templates/ceramica.html",
      title: "Catálogo de cerámica, arcilla y barro | Los Cuyerones",
      description:
        "Catálogo de cerámica artesanal, mini macetas, decorativos, alcancías, porta-inciensos y piezas de barro en Riobamba.",
    },
    amigurumis: {
      file: "templates/amigurumi.html",
      title: "Catálogo de amigurumis tejidos a crochet | Los Cuyerones",
      description:
        "Amigurumis tejidos a mano: animales y personajes en crochet, ideales para regalar y coleccionar.",
    },
    contactos: {
      file: "templates/contactos.html",
      title: "Contactos y ubicación | Los Cuyerones",
      description:
        "Contacta a Los Cuyerones por WhatsApp o Telegram. Estamos en la Av. Canónigo Ramos y Luis Moscoso, cerca de la ESPOCH.",
    },
  };

  const templateCache = new Map();
  let currentRoute = "inicio";
  let catalogProducts = [];
  let activeCategory = "todos";
  let lastFocusedElement = null;
  let modalStartY = 0;
  let modalCurrentY = 0;

  function getRouteFromHash() {
    const route = location.hash.replace(/^#\/?/, "").toLowerCase();
    return routes[route] ? route : "inicio";
  }

  function setMeta(route) {
    const data = routes[route];
    document.title = data.title;
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = data.description;
  }

  function updateActiveNav(route) {
    document.querySelectorAll("[data-route]").forEach((link) => {
      const isActive = link.dataset.route === route;
      if (isActive) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }

  async function fetchTemplate(path) {
    if (templateCache.has(path)) return templateCache.get(path);
    const response = await fetch(path, { cache: "force-cache" });
    if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
    const html = await response.text();
    templateCache.set(path, html);
    return html;
  }

  async function loadRoute(route, { focusMain = false } = {}) {
    currentRoute = routes[route] ? route : "inicio";
    app.setAttribute("aria-busy", "true");
    updateActiveNav(currentRoute);
    setMeta(currentRoute);
    closeMobileMenu();

    try {
      const html = await fetchTemplate(routes[currentRoute].file);
      app.innerHTML = html;
      app.setAttribute("aria-busy", "false");
      applyBusinessLinks(app);
      bindRouteLinks(app);
      bindPreviewButtons(app);
      initRevealAnimations();

      if (currentRoute === "inicio") await initFeaturedProducts();
      if (currentRoute === "ceramica" || currentRoute === "amigurumis") {
        await initCatalog(currentRoute);
      }

      if (focusMain)
        document.querySelector("#contenido")?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "auto" });
    } catch (error) {
      console.error(error);
      app.innerHTML = `
        <section class="route-error section-shell">
          <p class="eyebrow">Contenido no disponible</p>
          <h1>No pudimos cargar esta sección.</h1>
          <p>Abre el proyecto mediante un servidor local o publícalo en GitHub Pages. Los archivos cargados con <code>file://</code> bloquean las solicitudes internas del navegador.</p>
          <a class="button primary" href="#inicio" data-route="inicio">Volver al inicio</a>
        </section>`;
      app.setAttribute("aria-busy", "false");
      bindRouteLinks(app);
    }
  }

  function navigate(route) {
    const safeRoute = routes[route] ? route : "inicio";
    const nextHash = `#${safeRoute}`;
    if (location.hash === nextHash) loadRoute(safeRoute, { focusMain: true });
    else location.hash = safeRoute;
  }

  function bindRouteLinks(root = document) {
    root.querySelectorAll("[data-route]").forEach((link) => {
      if (link.dataset.routeBound) return;
      link.dataset.routeBound = "true";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        navigate(link.dataset.route);
      });
    });
  }

  function buildWhatsAppUrl(phone, message) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function applyBusinessLinks(root = document) {
    const generalMessage =
      config.whatsappMensaje || "Hola, quisiera información de sus productos.";
    root
      .querySelectorAll('[data-wa="1"]')
      .forEach(
        (a) => (a.href = buildWhatsAppUrl(config.telefono1, generalMessage)),
      );
    root
      .querySelectorAll('[data-wa="2"]')
      .forEach(
        (a) => (a.href = buildWhatsAppUrl(config.telefono2, generalMessage)),
      );
    root
      .querySelectorAll("[data-wa-general]")
      .forEach(
        (a) => (a.href = buildWhatsAppUrl(config.telefono2, generalMessage)),
      );
    root
      .querySelectorAll("[data-telegram]")
      .forEach((a) => (a.href = config.telegram));
    root
      .querySelectorAll("[data-map-link]")
      .forEach((a) => (a.href = config.mapa));
    root
      .querySelectorAll('[data-social="facebook"]')
      .forEach((a) => (a.href = config.facebook));
    root
      .querySelectorAll('[data-social="instagram"]')
      .forEach((a) => (a.href = config.instagram));
  }

  function initTheme() {
    const stored = localStorage.getItem("los-cuyerones-theme");
    const theme = stored === "light" ? "light" : "dark";
    setTheme(theme);
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        setTheme(
          document.documentElement.dataset.theme === "dark" ? "light" : "dark",
        );
      });
    });
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("los-cuyerones-theme", theme);
    const dark = theme === "dark";
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute(
        "aria-label",
        dark ? "Cambiar al tema claro" : "Cambiar al tema oscuro",
      );
    });
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#171311" : "#f5eee4");
  }

  function toggleMobileMenu() {
    const opening = mobileMenu.hidden;
    mobileMenu.hidden = !opening;
    mobileMenuButton.setAttribute("aria-expanded", String(opening));
    mobileMenuButton.setAttribute(
      "aria-label",
      opening ? "Cerrar menú" : "Abrir menú",
    );
    document.body.style.overflow = opening ? "hidden" : "";
  }

  function closeMobileMenu() {
    mobileMenu.hidden = true;
    mobileMenuButton.setAttribute("aria-expanded", "false");
    mobileMenuButton.setAttribute("aria-label", "Abrir menú");
    if (!modal.classList.contains("open")) document.body.style.overflow = "";
  }

  function formatPrice(value) {
    if (!value) return "Consultar";
    const numeric = Number(
      String(value)
        .replace(/[^0-9.,]/g, "")
        .replace(",", "."),
    );
    if (!Number.isFinite(numeric)) return value;
    return new Intl.NumberFormat("es-EC", {
      style: "currency",
      currency: "USD",
    }).format(numeric);
  }

  function normalizeText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  async function fetchJson(path) {
    const response = await fetch(path, { cache: "no-cache" });
    if (!response.ok) throw new Error(`No se pudo cargar ${path}`);
    return response.json();
  }

  function preloadImages(products, count = 8) {
    products.slice(0, count).forEach((product) => {
      const image = new Image();
      image.decoding = "async";
      image.src =
        product.miniatura || product.imagen || product.direccionOriginal;
    });
  }

  function createProductCard(product, index = 0) {
    const article = document.createElement("article");
    article.className = "product-card reveal";
    article.dataset.search = normalizeText(`${product.nombre} ${product.tipo}`);
    article.dataset.category = product._category || "todos";

    const imageButton = document.createElement("button");
    imageButton.type = "button";
    imageButton.className = "product-image-button";
    imageButton.setAttribute(
      "aria-label",
      `Ver ${product.nombre} en pantalla completa`,
    );

    const image = document.createElement("img");
    image.src =
      product.miniatura || product.imagen || product.direccionOriginal;
    image.alt = `${product.nombre}, ${product.tipo}`;
    image.loading = index < 6 ? "eager" : "lazy";
    image.fetchPriority = index < 3 ? "high" : "auto";
    image.decoding = "async";
    imageButton.appendChild(image);
    imageButton.addEventListener("click", () =>
      openProductModal(product, imageButton),
    );

    const body = document.createElement("div");
    body.className = "product-body";
    const type = document.createElement("span");
    type.className = "product-kicker";
    type.textContent = product.tipo || "Artesanía";
    const title = document.createElement("h3");
    title.className = "product-title";
    title.textContent = product.nombre || "Producto artesanal";
    const meta = document.createElement("div");
    meta.className = "product-meta";
    const dimensions = document.createElement("span");
    dimensions.textContent = product.dimensiones || "Medidas por consultar";
    const price = document.createElement("span");
    price.className = "product-price";
    price.textContent = formatPrice(product.precio);
    meta.append(dimensions, price);

    const consult = document.createElement("a");
    consult.className = "product-consult";
    consult.target = "_blank";
    consult.rel = "noopener";
    consult.textContent = "Consultar por WhatsApp";
    consult.href = productWhatsAppUrl(product);

    body.append(type, title, meta, consult);
    article.append(imageButton, body);
    return article;
  }

  function productWhatsAppUrl(product) {
    const message = `Hola, vi el producto “${product.nombre}” en el catálogo de Los Cuyerones. ¿Está disponible?`;
    return buildWhatsAppUrl(config.telefono2, message);
  }

  async function initCatalog(kind) {
    const container = document.querySelector(`[data-catalog="${kind}"]`);
    if (!container) return;

    try {
      const manifest = await fetchJson("static/img/productos/catalogos.json");
      const sections = manifest[kind] || [];
      const loaded = await Promise.all(
        sections.map(async (section, sectionIndex) => {
          const products = await fetchJson(section.archivo);
          return {
            ...section,
            key: `categoria-${sectionIndex}`,
            products: products.map((product) => ({
              ...product,
              _category: `categoria-${sectionIndex}`,
              _sectionTitle: section.titulo,
            })),
          };
        }),
      );

      catalogProducts = loaded.flatMap((section) => section.products);
      activeCategory = "todos";
      preloadImages(catalogProducts, 10);
      document.querySelector("[data-product-count]").textContent =
        catalogProducts.length;
      createFilterChips(loaded);
      renderCatalogSections(container, loaded);
      bindCatalogSearch(container, loaded);
      updateCatalogSchema(catalogProducts, kind);
      initRevealAnimations();
    } catch (error) {
      console.error(error);
      container.innerHTML = `<div class="catalog-empty"><strong>No pudimos cargar el catálogo.</strong><span>Comprueba que los archivos JSON y las imágenes estén en static/img/productos.</span></div>`;
    }
  }

  function createFilterChips(sections) {
    const chipContainer = document.querySelector("[data-filter-chips]");
    if (!chipContainer) return;
    chipContainer.replaceChildren();

    const entries = [
      { key: "todos", title: "Todos" },
      ...sections.map((section) => ({
        key: section.key,
        title: section.titulo,
      })),
    ];
    entries.forEach((entry) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `filter-chip${entry.key === "todos" ? " active" : ""}`;
      button.textContent = entry.title;
      button.dataset.filter = entry.key;
      button.addEventListener("click", () => {
        activeCategory = entry.key;
        chipContainer
          .querySelectorAll(".filter-chip")
          .forEach((chip) => chip.classList.toggle("active", chip === button));
        applyCatalogFilters();
      });
      chipContainer.appendChild(button);
    });
  }

  function renderCatalogSections(container, sections) {
    container.replaceChildren();
    sections.forEach((section) => {
      const wrapper = document.createElement("section");
      wrapper.className = "catalog-section";
      wrapper.dataset.sectionCategory = section.key;

      const header = document.createElement("div");
      header.className = "catalog-section-header";
      const copy = document.createElement("div");
      const title = document.createElement("h2");
      title.textContent = section.titulo;
      const description = document.createElement("p");
      description.textContent = section.descripcion;
      copy.append(title, description);
      const count = document.createElement("span");
      count.className = "catalog-section-count";
      count.textContent = `${section.products.length} productos`;
      header.append(copy, count);

      const grid = document.createElement("div");
      grid.className = "product-grid";
      section.products.forEach((product, index) =>
        grid.appendChild(createProductCard(product, index)),
      );
      wrapper.append(header, grid);
      container.appendChild(wrapper);
    });
  }

  function bindCatalogSearch() {
    const input = document.querySelector("[data-catalog-search]");
    if (!input) return;
    input.addEventListener("input", applyCatalogFilters);
  }

  function applyCatalogFilters() {
    const query = normalizeText(
      document.querySelector("[data-catalog-search]")?.value || "",
    );
    let visibleCount = 0;

    document.querySelectorAll(".product-card").forEach((card) => {
      const matchesSearch = !query || card.dataset.search.includes(query);
      const matchesCategory =
        activeCategory === "todos" || card.dataset.category === activeCategory;
      const visible = matchesSearch && matchesCategory;
      card.hidden = !visible;
      if (visible) visibleCount += 1;
    });

    document.querySelectorAll(".catalog-section").forEach((section) => {
      const hasVisible = [...section.querySelectorAll(".product-card")].some(
        (card) => !card.hidden,
      );
      section.hidden = !hasVisible;
    });

    let empty = document.querySelector(".catalog-empty.dynamic");
    if (visibleCount === 0) {
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "catalog-empty dynamic";
        empty.innerHTML =
          "<strong>No encontramos coincidencias.</strong><span>Prueba con otro nombre o selecciona otra categoría.</span>";
        document.querySelector(".catalog-content")?.appendChild(empty);
      }
      empty.hidden = false;
    } else if (empty) {
      empty.hidden = true;
    }
  }

  async function initFeaturedProducts() {
    const grid = document.querySelector("[data-featured-grid]");
    if (!grid) return;
    try {
      const [ceramica, plantas, amigurumis] = await Promise.all([
        fetchJson("static/img/productos/ceramica.json"),
        fetchJson("static/img/productos/ceramica_planta.json"),
        fetchJson("static/img/productos/amigurumis.json"),
      ]);
      const featured = [
        ceramica[3],
        plantas[2],
        amigurumis[1],
        ceramica[8],
      ].filter(Boolean);
      preloadImages(featured, featured.length);
      grid.replaceChildren(
        ...featured.map((product, index) => createProductCard(product, index)),
      );
      initRevealAnimations();
    } catch (error) {
      console.error(error);
      grid.innerHTML = "<p>No se pudo cargar la selección destacada.</p>";
    }
  }

  function bindPreviewButtons(root = document) {
    root.querySelectorAll("[data-preview-src]").forEach((button) => {
      button.addEventListener("click", () => {
        openProductModal(
          {
            nombre: button.dataset.previewName,
            tipo: button.dataset.previewDetails,
            imagen: button.dataset.previewSrc,
            precio: "",
            dimensiones: "",
          },
          button,
        );
      });
    });
  }

  function openProductModal(product, trigger) {
    lastFocusedElement = trigger || document.activeElement;
    modalImage.src =
      product.imagen || product.direccionOriginal || product.miniatura;
    modalImage.alt = product.nombre || "Producto Los Cuyerones";
    modalTitle.textContent = product.nombre || "Producto artesanal";
    const details = [
      product.tipo,
      product.dimensiones,
      product.precio ? formatPrice(product.precio) : "",
    ].filter(Boolean);
    modalDetails.textContent =
      details.join(" · ") || "Creación artesanal de Los Cuyerones.";
    modalWhatsApp.href = productWhatsAppUrl(product);
    modal.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => modal.classList.add("open"));
    modalClose.focus();
  }

  function closeProductModal() {
    if (modal.hidden) return;
    modal.classList.remove("open");
    document.body.classList.remove("modal-open");
    window.setTimeout(() => {
      modal.hidden = true;
      modalImage.src = "";
      lastFocusedElement?.focus?.();
    }, 180);
  }

  function initModal() {
    modalClose.addEventListener("click", closeProductModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeProductModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) closeProductModal();
      if (event.key === "Tab" && !modal.hidden) {
        const focusables = [...modal.querySelectorAll("button, a[href]")];
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    modal.addEventListener("pointerdown", (event) => {
      modalStartY = event.clientY;
      modalCurrentY = event.clientY;
    });
    modal.addEventListener("pointermove", (event) => {
      modalCurrentY = event.clientY;
    });
    modal.addEventListener("pointerup", () => {
      if (modalStartY - modalCurrentY > 80) closeProductModal();
      modalStartY = modalCurrentY = 0;
    });
  }

  function initRevealAnimations() {
    const elements = document.querySelectorAll(".reveal:not(.visible)");
    if (!elements.length) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      elements.forEach((element) => element.classList.add("visible"));
      return;
    }
    const observer = new IntersectionObserver(
      (entries, io) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -30px" },
    );
    elements.forEach((element, index) => {
      element.style.transitionDelay = `${Math.min(index % 5, 4) * 55}ms`;
      observer.observe(element);
    });
  }

  function updateCatalogSchema(products, kind) {
    document.querySelector("#catalog-schema")?.remove();
    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.id = "catalog-schema";
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name:
        kind === "ceramica"
          ? "Catálogo de cerámica Los Cuyerones"
          : "Catálogo de amigurumis Los Cuyerones",
      numberOfItems: products.length,
      itemListElement: products.map((product, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: product.nombre,
          category: product.tipo,
          image: product.imagen,
          description: `${product.tipo}. Dimensiones: ${product.dimensiones || "por consultar"}.`,
          offers: {
            "@type": "Offer",
            priceCurrency: "USD",
            price:
              String(product.precio || "").replace(/[^0-9.]/g, "") || undefined,
            availability: "https://schema.org/InStock",
          },
        },
      })),
    });
    document.head.appendChild(schema);
  }

  function init() {
    initTheme();
    initModal();
    applyBusinessLinks(document);
    bindRouteLinks(document);
    bindPreviewButtons(document);
    mobileMenuButton.addEventListener("click", toggleMobileMenu);
    mobileMenu.addEventListener("click", (event) => {
      if (event.target.matches("[data-route]")) closeMobileMenu();
    });
    window.addEventListener("hashchange", () =>
      loadRoute(getRouteFromHash(), { focusMain: true }),
    );
    window.addEventListener("resize", () => {
      if (window.innerWidth > 760) closeMobileMenu();
    });
    loadRoute(getRouteFromHash());
  }

  init();
})();

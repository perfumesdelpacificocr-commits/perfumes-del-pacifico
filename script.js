
/* PERFUMES DEL PACÍFICO
   Catálogo, galería de fotografías,
   filtros, ofertas, TOP 5 y carrito WhatsApp.
*/
(() => {
  "use strict";

  const WHATSAPP_NUMBER = "50661075656";

  const state = {
    client: null,
    products: [],
    categories: [],
    cart: [],
    search: "",
    category: "",
    gender: "",
    sort: "default",
    activeProduct: 0,
    activePhoto: 0,
    viewing: []
  };

  const $ = (s, root = document) => root.querySelector(s);

  const esc = value => String(value ?? "").replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[c]
  );

  const money = value =>
    `₡${Math.round(Number(value) || 0).toLocaleString("es-CR")}`;

  const byId = id =>
    state.products.find(p => String(p.id) === String(id));

  const effectivePrice = p =>
    p.is_offer &&
    Number(p.offer_price) > 0 &&
    Number(p.offer_price) < Number(p.price)
      ? Number(p.offer_price)
      : Number(p.price) || 0;

  const slug = s => String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  const categoryName = p =>
    p.categories?.name ||
    state.categories.find(
      c => String(c.id) === String(p.category_id)
    )?.name || "";

  const categorySlug = p =>
    p.categories?.slug ||
    state.categories.find(
      c => String(c.id) === String(p.category_id)
    )?.slug || "";

  function photosOf(product) {
    const photos = Array.isArray(product.images)
      ? product.images.filter(v => typeof v === "string" && v.trim())
      : [];

    const main = String(product.image_url || "").trim();

    if (main) {
      return [main, ...photos.filter(url => url !== main)]
        .filter((url, index, all) => all.indexOf(url) === index)
        .slice(0, 5);
    }

    return [...new Set(photos)].slice(0, 5);
  }

  const imageURL = p => photosOf(p)[0] || "";

  let toastTimer;

  function notify(message, cartAction = false) {
    const node = $("#toast-message");
    if (!node) return;

    clearTimeout(toastTimer);

    node.innerHTML = `
      <span>${esc(message)}</span>
      ${cartAction
        ? '<button type="button" data-action="open-cart">Ver carrito →</button>'
        : ""}
    `;

    node.hidden = false;
    node.classList.add("show");

    toastTimer = setTimeout(() => {
      node.classList.remove("show");
      node.hidden = true;
    }, 5200);
  }

  function imageHTML(product) {
    const url = imageURL(product);

    return url
      ? `<img
           src="${esc(url)}"
           alt="${esc(product.name)}"
           loading="lazy"
           onerror="this.hidden=true;this.nextElementSibling.hidden=false"
         >
         <span class="product-image-placeholder" hidden>
           Imagen no disponible
         </span>`
      : `<span class="product-image-placeholder">
           Imagen próximamente
         </span>`;
  }

  function card(product) {
    const id = esc(product.id);
    const sold = (Number(product.stock) || 0) <= 0;
    const base = Number(product.price) || 0;
    const price = effectivePrice(product);

    return `
      <article class="product-card" data-product-id="${id}">
        <button
          class="product-card-image"
          type="button"
          data-action="details"
          data-id="${id}"
          aria-label="Ver ${esc(product.name)}"
        >
          ${imageHTML(product)}
          ${price < base
            ? '<span class="product-badge">Oferta</span>'
            : ""}
          ${sold
            ? '<span class="product-badge sold-badge">Agotado</span>'
            : ""}
        </button>

        <div class="product-info">
          <p class="product-brand">${esc(product.brand || "")}</p>
          <h3>${esc(product.name)}</h3>
          <p class="product-category">${esc(categoryName(product))}</p>

          <p class="product-prices">
            ${price < base
              ? `<span class="product-old-price">${money(base)}</span>`
              : ""}
            <strong class="product-price">${money(price)}</strong>
          </p>

          <button
            type="button"
            class="product-buy-button"
            data-action="add"
            data-id="${id}"
            ${sold ? "disabled" : ""}
          >
            ${sold ? "Agotado" : "Agregar al carrito"}
          </button>
        </div>
      </article>
    `;
  }

  function renderItems(container, products, empty) {
    if (!container) return;

    container.innerHTML = products.length
      ? products.map(card).join("")
      : `<p class="empty-products">${esc(empty)}</p>`;
  }

  function renderTop() {
    const women = state.products
      .filter(p => Number(p.top_women_order) > 0)
      .sort((a, b) =>
        Number(a.top_women_order) - Number(b.top_women_order)
      )
      .slice(0, 5);

    const men = state.products
      .filter(p => Number(p.top_men_order) > 0)
      .sort((a, b) =>
        Number(a.top_men_order) - Number(b.top_men_order)
      )
      .slice(0, 5);

    renderItems(
      $("#top-women"),
      women,
      "Pronto tendremos nuestros favoritos para dama."
    );

    renderItems(
      $("#top-men"),
      men,
      "Pronto tendremos nuestros favoritos para caballero."
    );
  }

  function renderOffers() {
    renderItems(
      $("#offers-products"),
      state.products.filter(
        p => p.is_offer && effectivePrice(p) < Number(p.price)
      ),
      "Pronto tendremos nuevas ofertas."
    );
  }

  function filteredProducts() {
    let list = [...state.products];

    if (state.category) {
      list = list.filter(p =>
        slug(categorySlug(p)) === slug(state.category) ||
        slug(categoryName(p)) === slug(state.category)
      );
    }

    if (state.gender) {
      list = list.filter(p =>
        slug(p.gender) === slug(state.gender)
      );
    }

    if (state.search) {
      const term = slug(state.search);

      list = list.filter(p =>
        slug([
          p.name,
          p.brand,
          p.description,
          categoryName(p)
        ].join(" ")).includes(term)
      );
    }

    if (state.sort === "price-asc") {
      list.sort((a, b) =>
        effectivePrice(a) - effectivePrice(b)
      );
    }

    if (state.sort === "price-desc") {
      list.sort((a, b) =>
        effectivePrice(b) - effectivePrice(a)
      );
    }

    if (state.sort === "name") {
      list.sort((a, b) =>
        String(a.name).localeCompare(String(b.name), "es")
      );
    }

    return list;
  }

  function renderCatalog() {
    renderItems(
      $("#catalog-products"),
      filteredProducts(),
      "No encontramos perfumes con esos criterios."
    );
  }

  function openDetails(id) {
    const p = byId(id);
    const dlg = $("#product-dialog");
    const content = $("#product-dialog-content");

    if (!p || !dlg || !content) return;

    state.viewing = filteredProducts();

    if (!state.viewing.some(
      item => String(item.id) === String(id)
    )) {
      state.viewing = [...state.products];
    }

    state.activeProduct = Math.max(
      0,
      state.viewing.findIndex(
        item => String(item.id) === String(id)
      )
    );

    state.activePhoto = 0;

    renderDetails();

    if (!dlg.open) {
      if (typeof dlg.showModal === "function") {
        dlg.showModal();
      } else {
        dlg.setAttribute("open", "");
      }
    }
  }

  function renderDetails() {
    const content = $("#product-dialog-content");
    const p = state.viewing[state.activeProduct];

    if (!content || !p) return;

    const sold = (Number(p.stock) || 0) <= 0;
    const photos = photosOf(p);

    state.activePhoto = Math.min(
      state.activePhoto,
      Math.max(photos.length - 1, 0)
    );

    const currentPhoto = photos[state.activePhoto];

    const mainImage = currentPhoto
      ? `<img
           src="${esc(currentPhoto)}"
           alt="${esc(p.name)}"
           style="width:100%;height:100%;max-height:430px;object-fit:contain"
           onerror="this.hidden=true;this.nextElementSibling.hidden=false"
         >
         <span class="product-image-placeholder" hidden>
           Imagen no disponible
         </span>`
      : `<span class="product-image-placeholder">
           Imagen próximamente
         </span>`;

    const thumbnails = photos.length > 1
      ? `<div
           class="perfume-gallery-thumbnails"
           style="
             display:flex;
             justify-content:center;
             gap:9px;
             flex-wrap:wrap;
             padding:12px 4px;
           "
         >
           ${photos.map((url, index) => `
             <button
               type="button"
               data-action="select-photo"
               data-photo="${index}"
               aria-label="Ver fotografía ${index + 1}"
               aria-pressed="${index === state.activePhoto}"
               style="
                 width:65px;
                 height:65px;
                 padding:4px;
                 border-radius:9px;
                 cursor:pointer;
                 background:#fff;
                 border:${index === state.activePhoto
                   ? "2px solid #b89b59"
                   : "1px solid #ddd"};
               "
             >
               <img
                 src="${esc(url)}"
                 alt="Vista ${index + 1}"
                 loading="lazy"
                 style="width:100%;height:100%;object-fit:contain"
               >
             </button>
           `).join("")}
         </div>`
      : "";

    const photoControls = photos.length > 1
      ? `<div style="
           display:flex;
           align-items:center;
           justify-content:center;
           gap:16px;
           margin:5px 0 10px;
         ">
           <button
             type="button"
             data-action="prev-photo"
             aria-label="Fotografía anterior"
             style="cursor:pointer;padding:7px 13px"
           >‹</button>

           <span style="font-size:13px">
             Foto ${state.activePhoto + 1} de ${photos.length}
           </span>

           <button
             type="button"
             data-action="next-photo"
             aria-label="Fotografía siguiente"
             style="cursor:pointer;padding:7px 13px"
           >›</button>
         </div>`
      : "";

    content.innerHTML = `
      <div class="viewer-layout">

        <div>
          <div class="viewer-photo">
            ${mainImage}
          </div>

          ${photoControls}
          ${thumbnails}
        </div>

        <div class="viewer-info">
          <p class="viewer-brand">
            ${esc(p.brand || "PERFUMES DEL PACÍFICO")}
          </p>

          <h2>${esc(p.name)}</h2>

          <p class="viewer-category">
            ${esc(categoryName(p))}
          </p>

          <p class="viewer-description">
            ${esc(
              p.description ||
              "Descubrí esta fragancia y consultá su disponibilidad."
            )}
          </p>

          <p class="viewer-price">
            ${money(effectivePrice(p))}
          </p>

          <button
            class="viewer-buy"
            data-action="add"
            data-id="${esc(p.id)}"
            ${sold ? "disabled" : ""}
          >
            ${sold ? "Agotado" : "Agregar al carrito"}
          </button>
        </div>

      </div>

      <div class="viewer-navigation">
        <button
          type="button"
          data-action="prev-product"
          aria-label="Producto anterior"
        >‹ Anterior</button>

        <span>
          ${state.activeProduct + 1}
          de ${state.viewing.length}
        </span>

        <button
          type="button"
          data-action="next-product"
          aria-label="Producto siguiente"
        >Siguiente ›</button>
      </div>
    `;
  }

  function moveProduct(step) {
    if (!state.viewing.length) return;

    state.activeProduct = (
      state.activeProduct +
      step +
      state.viewing.length
    ) % state.viewing.length;

    state.activePhoto = 0;
    renderDetails();
  }

  function movePhoto(step) {
    const product = state.viewing[state.activeProduct];
    if (!product) return;

    const photos = photosOf(product);
    if (photos.length < 2) return;

    state.activePhoto = (
      state.activePhoto + step + photos.length
    ) % photos.length;

    renderDetails();
  }

  function selectPhoto(index) {
    const product = state.viewing[state.activeProduct];
    if (!product) return;

    const photos = photosOf(product);

    if (
      Number.isInteger(index) &&
      index >= 0 &&
      index < photos.length
    ) {
      state.activePhoto = index;
      renderDetails();
    }
  }

  function addToCart(id) {
    const p = byId(id);
    if (!p) return;

    const max = Number(p.stock) || 0;

    if (max < 1) {
      notify("Este perfume está agotado.");
      return;
    }

    let item = state.cart.find(
      i => String(i.id) === String(id)
    );

    if (item) {
      if (item.quantity >= max) {
        notify("No hay más unidades disponibles.");
        return;
      }
      item.quantity++;
    } else {
      item = {
        id: p.id,
        name: p.name,
        price: effectivePrice(p),
        stock: max,
        quantity: 1
      };
      state.cart.push(item);
    }

    renderCart();

    const count = state.cart.reduce(
      (n, i) => n + i.quantity,
      0
    );

    notify(
      `¡Agregaste ${count} ${count === 1
        ? "producto"
        : "productos"} al carrito! Ya podés verlo en nuestro carrito.`,
      true
    );
  }

  function changeQuantity(id, delta) {
    const item = state.cart.find(
      i => String(i.id) === String(id)
    );

    if (!item) return;

    const next = item.quantity + delta;

    if (next <= 0) {
      state.cart = state.cart.filter(
        i => String(i.id) !== String(id)
      );
    } else if (next > item.stock) {
      notify("No hay más unidades disponibles.");
      return;
    } else {
      item.quantity = next;
    }

    renderCart();
  }

  function orderText() {
    const total = state.cart.reduce(
      (sum, i) => sum + i.price * i.quantity,
      0
    );

    return [
      "Hola, buenas. 👋",
      "",
      "Me gustaría realizar un pedido de estos productos de Perfumes del Pacífico:",
      "",
      "🛍️ Mi pedido:",
      ...state.cart.map(i =>
        `• ${i.name} — ${i.quantity} ${i.quantity === 1
          ? "unidad"
          : "unidades"} × ${money(i.price)} = ${money(i.quantity * i.price)}`
      ),
      "",
      `💰 Total de productos: ${money(total)}`,
      "🚚 Deseo coordinar el envío de mi pedido.",
      "¿Podrían confirmarme la disponibilidad, el costo de envío y el tiempo estimado de entrega?",
      "",
      "¡Muchas gracias!"
    ].join("\n");
  }

  function checkout() {
    if (!state.cart.length) {
      notify("Primero agregá un perfume al carrito.");
      return;
    }

    window.location.href =
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderText())}`;
  }

  function renderCart() {
    const node = $("#cart-items");
    const count = $("#cart-count");
    const total = $("#cart-total");
    const checkoutLink = $("#checkout-whatsapp");

    const units = state.cart.reduce(
      (n, i) => n + i.quantity,
      0
    );

    const amount = state.cart.reduce(
      (n, i) => n + i.quantity * i.price,
      0
    );

    if (count) count.textContent = units;
    if (total) total.textContent = money(amount);

    if (checkoutLink) {
      checkoutLink.href = units
        ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(orderText())}`
        : "#";

      checkoutLink.setAttribute(
        "aria-disabled",
        String(!units)
      );
    }

    if (!node) return;

    node.innerHTML = units
      ? state.cart.map(i => `
          <div class="cart-item">
            <div class="cart-item-info">
              <strong>${esc(i.name)}</strong>
              <span>${money(i.price)} cada uno</span>
            </div>

            <div class="cart-item-controls">
              <button
                data-action="quantity"
                data-id="${esc(i.id)}"
                data-amount="-1"
                aria-label="Restar"
              >−</button>

              <span>${i.quantity}</span>

              <button
                data-action="quantity"
                data-id="${esc(i.id)}"
                data-amount="1"
                aria-label="Sumar"
              >+</button>
            </div>

            <strong>${money(i.price * i.quantity)}</strong>

            <button
              data-action="remove"
              data-id="${esc(i.id)}"
              aria-label="Eliminar"
            >×</button>
          </div>
        `).join("")
      : '<p class="cart-empty">Tu carrito está vacío.</p>';
  }

  function openCart() {
    const node = $("#cart-panel");

    if (node) {
      node.hidden = false;
      node.classList.add("is-open");
      node.setAttribute("aria-hidden", "false");
      $("#cart-close")?.focus();
    }
  }

  function closeCart() {
    const node = $("#cart-panel");

    if (node) {
      node.classList.remove("is-open");
      node.hidden = true;
      node.setAttribute("aria-hidden", "true");
      $("#cart-toggle")?.focus();
    }
  }

  function closeDetails() {
    const dlg = $("#product-dialog");

    if (dlg?.open) {
      typeof dlg.close === "function"
        ? dlg.close()
        : dlg.removeAttribute("open");
    }
  }

  function applyCategory(category = "", gender = "") {
    state.category = category;
    state.gender = gender;

    if ($("#category-filter")) {
      $("#category-filter").value = category;
    }

    if ($("#gender-filter")) {
      $("#gender-filter").value = gender;
    }

    renderCatalog();

    $("#catalogo")?.scrollIntoView({
      behavior: "smooth"
    });
  }

  function setupEvents() {
    document.addEventListener("click", e => {
      const target = e.target.closest("[data-action]");

      if (target) {
        const { action, id } = target.dataset;

        if (action === "details") {
          openDetails(id);
        } else if (action === "add") {
          addToCart(id);
        } else if (action === "quantity") {
          changeQuantity(
            id,
            Number(target.dataset.amount) || 0
          );
        } else if (action === "remove") {
          state.cart = state.cart.filter(
            i => String(i.id) !== String(id)
          );
          renderCart();
        } else if (action === "open-cart") {
          openCart();
        } else if (action === "prev-product") {
          moveProduct(-1);
        } else if (action === "next-product") {
          moveProduct(1);
        } else if (action === "prev-photo") {
          movePhoto(-1);
        } else if (action === "next-photo") {
          movePhoto(1);
        } else if (action === "select-photo") {
          selectPhoto(Number(target.dataset.photo));
        } else if (action === "category") {
          applyCategory(target.dataset.slug || "");
        }

        return;
      }

      const cat = e.target.closest("[data-category]");

      if (cat) {
        e.preventDefault();

        const v = cat.dataset.category;

        ["dama", "caballero", "unisex"].includes(v)
          ? applyCategory("", v)
          : applyCategory(v, "");

        return;
      }

      const gender = e.target.closest(
        "[data-filter-gender]"
      );

      if (gender) {
        e.preventDefault();
        applyCategory("", gender.dataset.filterGender);
        return;
      }

      if (e.target.closest("#cart-toggle")) {
        openCart();
      }

      if (e.target.closest("#cart-close")) {
        closeCart();
      }

      if (e.target.closest("#product-dialog-close")) {
        closeDetails();
      }

      if (e.target.closest("#search-toggle")) {
        const panel = $("#search-panel");

        if (panel) {
          panel.hidden = !panel.hidden;
          if (!panel.hidden) $("#search-input")?.focus();
        }
      }

      if (e.target.closest("#search-close")) {
        const panel = $("#search-panel");
        if (panel) panel.hidden = true;
      }

      if (e.target.closest("#mobile-menu-toggle")) {
        const nav = $(".main-nav");

        if (nav) {
          const expanded = nav.classList.toggle(
            "mobile-open"
          );

          $("#mobile-menu-toggle")?.setAttribute(
            "aria-expanded",
            String(expanded)
          );
        }
      }

      if (e.target.closest(".main-nav .nav-link")) {
        $(".main-nav")?.classList.remove("mobile-open");
      }
    });

    $("#checkout-whatsapp")?.addEventListener(
      "click",
      e => {
        e.preventDefault();
        checkout();
      }
    );

    $("#search-form")?.addEventListener(
      "submit",
      e => {
        e.preventDefault();

        $("#catalogo")?.scrollIntoView({
          behavior: "smooth"
        });
      }
    );

    $("#search-input")?.addEventListener(
      "input",
      e => {
        state.search = e.target.value.trim();
        renderCatalog();
      }
    );

    $("#category-filter")?.addEventListener(
      "change",
      e => {
        state.category = e.target.value;
        renderCatalog();
      }
    );

    $("#gender-filter")?.addEventListener(
      "change",
      e => {
        state.gender = e.target.value;
        renderCatalog();
      }
    );

    $("#sort-products")?.addEventListener(
      "change",
      e => {
        state.sort = e.target.value;
        renderCatalog();
      }
    );

    const dlg = $("#product-dialog");

    dlg?.addEventListener("click", e => {
      if (e.target === dlg) closeDetails();
    });

    document.addEventListener("keydown", e => {
      if (e.key === "Escape") {
        closeCart();
        closeDetails();
      }

      if (
        dlg?.open &&
        ["ArrowRight", "ArrowLeft"].includes(e.key)
      ) {
        e.preventDefault();

        if (e.target.closest?.(".perfume-gallery-thumbnails")) {
          movePhoto(e.key === "ArrowRight" ? 1 : -1);
        } else {
          moveProduct(e.key === "ArrowRight" ? 1 : -1);
        }
      }
    });

    let startX = null;

    dlg?.addEventListener(
      "touchstart",
      e => {
        startX = e.touches[0]?.clientX ?? null;
      },
      { passive: true }
    );

    dlg?.addEventListener(
      "touchend",
      e => {
        if (startX === null) return;

        const diff =
          (e.changedTouches[0]?.clientX ?? startX) -
          startX;

        if (Math.abs(diff) > 65) {
          const photoArea = e.target.closest?.(
            ".viewer-photo, .perfume-gallery-thumbnails"
          );

          if (photoArea) {
            movePhoto(diff < 0 ? 1 : -1);
          } else {
            moveProduct(diff < 0 ? 1 : -1);
          }
        }

        startX = null;
      },
      { passive: true }
    );
  }

  async function init() {
    const toast = $("#toast-message");
    const cartPanel = $("#cart-panel");

    if (toast) toast.hidden = true;
    if (cartPanel) cartPanel.hidden = true;

    setupEvents();
    renderCart();

    if ($("#current-year")) {
      $("#current-year").textContent =
        new Date().getFullYear();
    }

    const supabaseLib = window.supabase;

    if (
      !supabaseLib?.createClient ||
      !window.SUPABASE_URL ||
      !window.SUPABASE_ANON_KEY
    ) {
      const catalog = $("#catalog-products");

      if (catalog) {
        catalog.innerHTML = `
          <p class="empty-products">
            No se pudo conectar con Supabase.
            Revisá config.js.
          </p>
        `;
      }

      return;
    }

    try {
      state.client = supabaseLib.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
      );

      const cat = await state.client
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (cat.error) {
        console.warn("Categorías:", cat.error);
      } else {
        state.categories = cat.data || [];
      }

      const res = await state.client
        .from("products")
        .select(`
          id,
          name,
          brand,
          description,
          category_id,
          gender,
          price,
          offer_price,
          image_url,
          images,
          stock,
          is_active,
          is_offer,
          is_bestseller,
          top_women_order,
          top_men_order,
          categories(name,slug)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (res.error) throw res.error;

      state.products = res.data || [];

      renderTop();
      renderOffers();
      renderCatalog();

    } catch (error) {
      console.error(
        "Error cargando perfumes:",
        error
      );

      const catalog = $("#catalog-products");

      if (catalog) {
        catalog.innerHTML = `
          <p class="empty-products">
            No pudimos cargar los perfumes.
            Verificá la conexión y los permisos
            de Supabase.
          </p>
        `;
      }

      notify("No se pudieron cargar los perfumes.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();

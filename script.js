
/* ==========================================================
   PERFUMES DEL PACÍFICO
   Catálogo, categorías, ofertas, TOP 5 y carrito WhatsApp
   ========================================================== */

(() => {
  "use strict";

  const WHATSAPP_NUMBER = "50661075656";

  const state = {
    supabase: null,
    products: [],
    categories: [],
    cart: [],
    search: "",
    category: "",
    gender: "",
    sort: "featured",
    loading: false
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);

  const money = value =>
    new Intl.NumberFormat("es-CR", {
      style: "currency",
      currency: "CRC",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);

  function notify(message) {
    let notice = $("#store-notice");

    if (!notice) {
      notice = document.createElement("div");
      notice.id = "store-notice";
      notice.setAttribute("role", "status");
      notice.style.cssText = [
        "position:fixed",
        "bottom:24px",
        "left:50%",
        "transform:translateX(-50%)",
        "z-index:99999",
        "background:#123c3b",
        "color:white",
        "padding:13px 20px",
        "border-radius:10px",
        "box-shadow:0 5px 25px #0003",
        "max-width:90%",
        "text-align:center"
      ].join(";");
      document.body.appendChild(notice);
    }

    notice.textContent = message;
    notice.hidden = false;

    clearTimeout(notice._timer);
    notice._timer = setTimeout(() => {
      notice.hidden = true;
    }, 3000);
  }

  function getSupabaseClient() {
    if (!window.supabase || !window.supabase.createClient) {
      console.error("No se cargó la librería de Supabase.");
      return null;
    }

    const url = window.SUPABASE_URL;
    const key = window.SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.warn(
        "Falta configurar SUPABASE_URL y SUPABASE_ANON_KEY en config.js."
      );
      return null;
    }

    try {
      return window.supabase.createClient(url, key);
    } catch (error) {
      console.error("No se pudo conectar con Supabase:", error);
      return null;
    }
  }

  function getProductImage(product) {
    return product.image_url || "";
  }

  function imageHTML(product) {
    const image = getProductImage(product);
    const name = escapeHTML(product.name || "Perfume");

    if (!image) {
      return `
        <div class="product-image-placeholder"
             aria-label="Imagen no disponible">
          <span>PERFUMES DEL PACÍFICO</span>
        </div>`;
    }

    return `
      <img
        class="product-image"
        src="${escapeHTML(image)}"
        alt="${name}"
        loading="lazy"
        onerror="this.style.display='none';this.nextElementSibling.hidden=false"
      >
      <div class="product-image-placeholder" hidden>
        <span>Imagen no disponible</span>
      </div>`;
  }

  function getCategoryName(product) {
    if (product.categories && product.categories.name) {
      return product.categories.name;
    }

    const category = state.categories.find(
      item => item.id === product.category_id
    );

    return category ? category.name : "";
  }

  function productCard(product) {
    const id = escapeHTML(product.id);
    const name = escapeHTML(product.name);
    const brand = escapeHTML(product.brand || "");
    const category = escapeHTML(getCategoryName(product));
    const price = Number(product.price) || 0;
    const offerPrice = Number(product.offer_price) || 0;
    const hasOffer =
      Boolean(product.is_offer) &&
      offerPrice > 0 &&
      offerPrice < price;

    const finalPrice = hasOffer ? offerPrice : price;
    const stock = Number(product.stock) || 0;

    return `
      <article class="product-card" data-product-id="${id}">
        <button
          class="product-card-image"
          type="button"
          data-action="details"
          data-id="${id}"
          aria-label="Ver ${name}"
        >
          ${imageHTML(product)}
          ${hasOffer ? '<span class="product-badge">Oferta</span>' : ""}
          ${stock <= 0 ? '<span class="product-badge">Agotado</span>' : ""}
        </button>

        <div class="product-info">
          ${brand ? `<p class="product-brand">${brand}</p>` : ""}
          <h3 class="product-name">${name}</h3>
          ${category ? `<p class="product-category">${category}</p>` : ""}

          <div class="product-prices">
            ${
              hasOffer
                ? `<span class="product-old-price">${money(price)}</span>`
                : ""
            }
            <strong class="product-price">${money(finalPrice)}</strong>
          </div>

          <button
            class="product-buy-button"
            type="button"
            data-action="add"
            data-id="${id}"
            ${stock <= 0 ? "disabled" : ""}
          >
            ${stock <= 0 ? "Agotado" : "Agregar al carrito"}
          </button>
        </div>
      </article>`;
  }

  function renderProducts(container, products, emptyMessage) {
    if (!container) return;

    if (!products.length) {
      container.innerHTML = `
        <p class="empty-products">${escapeHTML(emptyMessage)}</p>`;
      return;
    }

    container.innerHTML = products.map(productCard).join("");
  }

  function renderCategories() {
    const container = $("#categories-grid") ||
      $("#categories-container") ||
      $(".categories-grid");

    if (!container) return;

    if (!state.categories.length) return;

    container.innerHTML = state.categories
      .filter(category => category.is_active !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(category => `
        <button
          class="category-card"
          type="button"
          data-action="category"
          data-slug="${escapeHTML(category.slug)}"
        >
          <span>${escapeHTML(category.name)}</span>
        </button>
      `).join("");
  }

  function renderTopFive() {
    const women = state.products
      .filter(product => Number(product.top_women_order) > 0)
      .sort((a, b) =>
        Number(a.top_women_order) - Number(b.top_women_order)
      )
      .slice(0, 5);

    const men = state.products
      .filter(product => Number(product.top_men_order) > 0)
      .sort((a, b) =>
        Number(a.top_men_order) - Number(b.top_men_order)
      )
      .slice(0, 5);

    renderProducts(
      $("#top-women"),
      women,
      "Pronto tendremos nuestros favoritos para dama."
    );

    renderProducts(
      $("#top-men"),
      men,
      "Pronto tendremos nuestros favoritos para caballero."
    );
  }

  function renderOffers() {
    const offers = state.products.filter(product => {
      const original = Number(product.price) || 0;
      const offer = Number(product.offer_price) || 0;

      return Boolean(product.is_offer) &&
        offer > 0 &&
        offer < original;
    });

    renderProducts(
      $("#offers-products"),
      offers,
      "Pronto tendremos nuevas ofertas."
    );
  }

  function filteredProducts() {
    let products = [...state.products];

    if (state.category) {
      products = products.filter(product => {
        const category = state.categories.find(
          item => item.id === product.category_id
        );

        return category && category.slug === state.category;
      });
    }

    if (state.gender) {
      products = products.filter(product =>
        String(product.gender || "").toLowerCase() ===
        state.gender.toLowerCase()
      );
    }

    if (state.search) {
      const term = state.search.toLowerCase();

      products = products.filter(product => {
        const text = [
          product.name,
          product.brand,
          product.description,
          getCategoryName(product)
        ].join(" ").toLowerCase();

        return text.includes(term);
      });
    }

    if (state.sort === "price-low") {
      products.sort((a, b) =>
        effectivePrice(a) - effectivePrice(b)
      );
    } else if (state.sort === "price-high") {
      products.sort((a, b) =>
        effectivePrice(b) - effectivePrice(a)
      );
    } else if (state.sort === "name") {
      products.sort((a, b) =>
        String(a.name).localeCompare(String(b.name), "es")
      );
    }

    return products;
  }

  function effectivePrice(product) {
    const offer = Number(product.offer_price) || 0;
    const price = Number(product.price) || 0;

    return product.is_offer && offer > 0 && offer < price
      ? offer
      : price;
  }

  function renderCatalog() {
    renderProducts(
      $("#catalog-products"),
      filteredProducts(),
      "No encontramos perfumes con esos criterios."
    );
  }

  async function loadCategories() {
    const { data, error } = await state.supabase
      .from("categories")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("Error cargando categorías:", error);
      return;
    }

    state.categories = data || [];
    renderCategories();
  }

  async function loadProducts() {
    if (state.loading) return;

    state.loading = true;

    const catalog = $("#catalog-products");
    if (catalog) {
      catalog.innerHTML = '<p class="loading-products">Cargando perfumes...</p>';
    }

    const { data, error } = await state.supabase
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
        stock,
        is_active,
        is_offer,
        is_bestseller,
        top_women_order,
        top_men_order,
        categories (
          name,
          slug
        )
      `)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    state.loading = false;

    if (error) {
      console.error("Error cargando productos:", error);

      if (catalog) {
        catalog.innerHTML =
          '<p class="empty-products">No pudimos cargar los productos. Intentá de nuevo más tarde.</p>';
      }

      notify("No se pudieron cargar los perfumes.");
      return;
    }

    state.products = data || [];

    renderTopFive();
    renderOffers();
    renderCatalog();
  }

  function openProductDetails(id) {
    const product = state.products.find(
      item => String(item.id) === String(id)
    );

    if (!product) return;

    const dialog = $("#product-dialog");

    if (!dialog) {
      addToCart(id);
      return;
    }

    const name = $("#dialog-product-name");
    const description = $("#dialog-product-description");
    const price = $("#dialog-product-price");
    const image = $("#dialog-product-image");
    const addButton = $("#dialog-add-to-cart");

    if (name) name.textContent = product.name || "";
    if (description) {
      description.textContent = product.description || "";
    }

    if (price) price.textContent = money(effectivePrice(product));

    if (image) {
      image.src = getProductImage(product);
      image.alt = product.name || "Perfume";
      image.hidden = !product.image_url;
    }

    if (addButton) {
      addButton.dataset.id = product.id;
      addButton.disabled = Number(product.stock) <= 0;
    }

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function addToCart(id) {
    const product = state.products.find(
      item => String(item.id) === String(id)
    );

    if (!product) return;

    if (Number(product.stock) <= 0) {
      notify("Este perfume está agotado.");
      return;
    }

    const existing = state.cart.find(
      item => String(item.id) === String(id)
    );

    if (existing) {
      if (existing.quantity >= Number(product.stock)) {
        notify("No hay más unidades disponibles.");
        return;
      }
      existing.quantity += 1;
    } else {
      state.cart.push({
        id: product.id,
        name: product.name,
        price: effectivePrice(product),
        quantity: 1,
        stock: Number(product.stock) || 0
      });
    }

    renderCart();
    notify("Perfume agregado al carrito.");
  }

  function changeCartQuantity(id, amount) {
    const item = state.cart.find(
      product => String(product.id) === String(id)
    );

    if (!item) return;

    item.quantity += amount;

    if (item.quantity <= 0) {
      state.cart = state.cart.filter(
        product => String(product.id) !== String(id)
      );
    } else if (item.quantity > item.stock) {
      item.quantity = item.stock;
      notify("No hay más unidades disponibles.");
    }

    renderCart();
  }

  function renderCart() {
    const container = $("#cart-items");
    const totalElement = $("#cart-total");
    const countElement = $("#cart-count");

    const count = state.cart.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const total = state.cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    if (countElement) countElement.textContent = count;
    if (totalElement) totalElement.textContent = money(total);

    if (container) {
      if (!state.cart.length) {
        container.innerHTML =
          '<p class="cart-empty">Tu carrito está vacío.</p>';
      } else {
        container.innerHTML = state.cart.map(item => `
          <div class="cart-item">
            <div class="cart-item-info">
              <strong>${escapeHTML(item.name)}</strong>
              <span>${money(item.price)} cada uno</span>
            </div>

            <div class="cart-item-controls">
              <button type="button"
                data-action="quantity"
                data-id="${escapeHTML(item.id)}"
                data-amount="-1"
                aria-label="Restar una unidad">−</button>

              <span>${item.quantity}</span>

              <button type="button"
                data-action="quantity"
                data-id="${escapeHTML(item.id)}"
                data-amount="1"
                aria-label="Agregar una unidad">+</button>
            </div>

            <strong>${money(item.price * item.quantity)}</strong>

            <button type="button"
              data-action="remove"
              data-id="${escapeHTML(item.id)}"
              aria-label="Eliminar producto">×</button>
          </div>
        `).join("");
      }
    }
  }

  function sendWhatsAppOrder() {
    if (!state.cart.length) {
      notify("Primero agregá algún perfume al carrito.");
      return;
    }

    const total = state.cart.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const lines = state.cart.map(item =>
      `• ${item.name} x${item.quantity} — ${money(item.price * item.quantity)}`
    );

    const message = [
      "¡Hola! Quiero realizar este pedido en Perfumes del Pacífico:",
      "",
      ...lines,
      "",
      `TOTAL: ${money(total)}`,
      "",
      "¿Me pueden ayudar con el pedido y la entrega?"
    ].join("\n");

    const url =
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openCart() {
    const cart = $("#cart-panel") ||
      $("#cart-sidebar") ||
      $("aside");

    if (!cart) {
      notify("El carrito no está disponible en esta sección.");
      return;
    }

    cart.classList.add("is-open");
    cart.setAttribute("aria-hidden", "false");
  }

  function closeCart() {
    const cart = $("#cart-panel") ||
      $("#cart-sidebar") ||
      $("aside");

    if (!cart) return;

    cart.classList.remove("is-open");
    cart.setAttribute("aria-hidden", "true");
  }

  function setupEvents() {
    document.addEventListener("click", event => {
      const button = event.target.closest("[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      const id = button.dataset.id;

      if (action === "add") {
        addToCart(id);
      }

      if (action === "details") {
        openProductDetails(id);
      }

      if (action === "category") {
        state.category = button.dataset.slug || "";
        renderCatalog();

        const catalog = $("#catalog-products");
        if (catalog) {
          catalog.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
        }
      }

      if (action === "quantity") {
        changeCartQuantity(id, Number(button.dataset.amount));
      }

      if (action === "remove") {
        state.cart = state.cart.filter(
          item => String(item.id) !== String(id)
        );
        renderCart();
      }

      if (action === "open-cart") {
        openCart();
      }

      if (action === "close-cart") {
        closeCart();
      }

      if (action === "checkout") {
        sendWhatsAppOrder();
      }

      if (action === "close-dialog") {
        const dialog = $("#product-dialog");
        if (dialog && typeof dialog.close === "function") {
          dialog.close();
        }
      }
    });

    const searchInput = $("#search-input") ||
      $('input[type="search"]');

    if (searchInput) {
      searchInput.addEventListener("input", event => {
        state.search = event.target.value.trim();
        renderCatalog();
      });
    }

    const categoryFilter = $("#category-filter");
    if (categoryFilter) {
      categoryFilter.addEventListener("change", event => {
        state.category = event.target.value;
        renderCatalog();
      });
    }

    const genderFilter = $("#gender-filter");
    if (genderFilter) {
      genderFilter.addEventListener("change", event => {
        state.gender = event.target.value;
        renderCatalog();
      });
    }

    const sortFilter = $("#sort-filter");
    if (sortFilter) {
      sortFilter.addEventListener("change", event => {
        state.sort = event.target.value;
        renderCatalog();
      });
    }

    const dialogAdd = $("#dialog-add-to-cart");
    if (dialogAdd) {
      dialogAdd.addEventListener("click", () => {
        addToCart(dialogAdd.dataset.id);

        const dialog = $("#product-dialog");
        if (dialog && typeof dialog.close === "function") {
          dialog.close();
        }
      });
    }

    const mobileMenu = $("#menu-toggle");
    const navigation = $("#main-navigation");

    if (mobileMenu && navigation) {
      mobileMenu.addEventListener("click", () => {
        const isOpen = navigation.classList.toggle("is-open");
        mobileMenu.setAttribute("aria-expanded", String(isOpen));
      });
    }
  }

  async function initializeStore() {
    setupEvents();
    renderCart();

    state.supabase = getSupabaseClient();

    if (!state.supabase) {
      const catalog = $("#catalog-products");

      if (catalog) {
        catalog.innerHTML =
          '<p class="empty-products">La tienda está pendiente de conectar con la base de datos.</p>';
      }

      return;
    }

    await loadCategories();
    await loadProducts();
  }

  document.addEventListener("DOMContentLoaded", initializeStore);

})();

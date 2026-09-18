const $ = id => document.getElementById(id);

let services = [];
let activeCategory = "All";
let activePlatform = "all";
let activeOrderCategory = "All";
let serviceSearchTimer = null;
let orderSearchTimer = null;
let servicesLoading = false;
let servicesTableLoaded = false;
let servicesTableLoading = false;

const serviceSelect = $("serviceSelect");
const quantityInput = $("quantityInput");
const linkInput = $("linkInput");
const chargeEl = $("charge");

function showToast(message, type = "") {
  const toast = $("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast show ${type}`;

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    toast.className = "toast";
  }, 3000);
}

function setMessage(id, message, type = "") {
  const el = $(id);
  if (!el) return;

  el.textContent = message;
  el.className = `form-message ${type}`;
}

function setServicesLoading(loading) {
  servicesLoading = loading;

  const serviceSearch = $("serviceSearch");
  const orderSearch = $("orderServiceSearch");
  const body = $("servicesBody");
  const select = $("serviceSelect");

  [serviceSearch, orderSearch].forEach(input => {
    if (input) input.disabled = loading;
  });

  if (loading) {
    if (body) {
      body.innerHTML = `
        <tr>
          <td colspan="9">
            <div class="services-loading">
              <span class="loading-spinner"></span>
              Loading live services...
            </div>
          </td>
        </tr>
      `;
    }

    if (select) {
      select.innerHTML =
        `<option value="">Loading services...</option>`;
    }
  }
}

function showServicesFilterLoading() {
  const body = $("servicesBody");
  if (!body || servicesLoading) return;

  body.innerHTML = `
    <tr>
      <td colspan="9">
        <div class="services-loading">
          <span class="loading-spinner"></span>
          Filtering services...
        </div>
      </td>
    </tr>
  `;
}

function showServicesTablePlaceholder() {
  const body = $("servicesBody");
  if (!body || servicesTableLoaded || servicesLoading) return;

  body.innerHTML = `
    <tr>
      <td colspan="9">
        <div class="services-loading services-table-placeholder">
          Open the Services tab to load the service catalog.
        </div>
      </td>
    </tr>
  `;
}

function loadServicesTable() {
  const body = $("servicesBody");
  if (!body || servicesTableLoaded || servicesTableLoading) return;

  if (!services.length) {
    return;
  }

  servicesTableLoading = true;
  body.innerHTML = `
    <tr>
      <td colspan="9">
        <div class="services-loading">
          <span class="loading-spinner"></span>
          Loading services table...
        </div>
      </td>
    </tr>
  `;

  window.setTimeout(() => {
    renderServices();
    servicesTableLoaded = true;
    servicesTableLoading = false;
  }, 80);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: "same-origin",
    headers: {
      ...(options.body ? {
        "Content-Type": "application/json"
      } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(text || `HTTP ${response.status}`);
  }

  if (response.status === 401) {
    logoutUI();
    throw new Error("Authorization required.");
  }

  if (!response.ok) {
    throw new Error(
      data.error ||
      data.message ||
      `HTTP ${response.status}`
    );
  }

  if (data && data.error) {
    throw new Error(data.error);
  }

  return data;
}

function logoutUI() {
  $("appContent").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");
}

async function checkAuth() {
  try {
    const data = await fetch("/api/auth", {
      credentials: "same-origin"
    }).then(response => response.json());

    if (data.authenticated) {
      $("loginScreen").classList.add("hidden");
      $("appContent").classList.remove("hidden");
      await startApp();
    } else {
      $("loginScreen").classList.remove("hidden");
      $("appContent").classList.add("hidden");
    }
  } catch {
    $("loginScreen").classList.remove("hidden");
    $("appContent").classList.add("hidden");
  }
}

async function login(event) {
  event.preventDefault();

  const username = $("loginUsername").value.trim();
  const password = $("loginPassword").value;

  setMessage("loginMessage", "Authorizing...");

  try {
    await api("/api/login", {
      method: "POST",
      body: JSON.stringify({
        username,
        password
      })
    });

    $("loginForm").reset();
    $("loginScreen").classList.add("hidden");
    $("appContent").classList.remove("hidden");

    setMessage("loginMessage", "");

    await startApp();

    showToast("Access granted", "good");
  } catch (error) {
    setMessage(
      "loginMessage",
      error.message || "Invalid credentials.",
      "bad"
    );
  }
}

async function logout() {
  try {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "same-origin"
    });
  } finally {
    logoutUI();
    showToast("Logged out");
  }
}

function detectServicePlatform(service) {
  const name = String(service?.name || "")
    .replace(/&amp;/gi, "&")
    .trim()
    .toLowerCase();

  if (/\binstagram\b/.test(name)) {
    return "instagram";
  }

  if (/\btiktok\b|\btik\s*tok\b/.test(name)) {
    return "tiktok";
  }

  if (/\bfacebook\b/.test(name)) {
    return "facebook";
  }

  if (/\byoutube\b/.test(name)) {
    return "youtube";
  }

  if (/\btelegram\b/.test(name)) {
    return "telegram";
  }

  if (
    /\btwitter\b/.test(name) ||
    /\bx\.com\b/.test(name) ||
    /\btweets?\b/.test(name)
  ) {
    return "twitter";
  }

  if (/\bspotify\b/.test(name)) {
    return "spotify";
  }

  if (/\bdiscord\b/.test(name)) {
    return "discord";
  }

  if (/\bthreads\b/.test(name)) {
    return "threads";
  }

  if (/\blinkedin\b/.test(name)) {
    return "linkedin";
  }

  if (/\bpinterest\b/.test(name)) {
    return "pinterest";
  }

  if (/\breddit\b/.test(name)) {
    return "reddit";
  }

  return "other";
}

function getPlatformName(platform) {
  const names = {
    all: "All",
    facebook: "Facebook",
    youtube: "YouTube",
    instagram: "Instagram",
    tiktok: "TikTok",
    telegram: "Telegram",
    twitter: "X / Twitter",
    spotify: "Spotify",
    discord: "Discord",
    threads: "Threads",
    linkedin: "LinkedIn",
    pinterest: "Pinterest",
    reddit: "Reddit",
    other: "Other"
  };

  return names[platform] || "Other";
}

function getServiceCategory(service) {
  const category = String(service?.category || "").trim();

  if (category) {
    return category;
  }

  return getPlatformName(
    detectServicePlatform(service)
  );
}

function isPlatformCategory(category) {
  const normalized = String(category || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

  return new Set([
    "all",
    "facebook",
    "youtube",
    "instagram",
    "tiktok",
    "telegram",
    "twitter",
    "x",
    "x / twitter",
    "spotify",
    "discord",
    "threads",
    "linkedin",
    "pinterest",
    "reddit",
    "other"
  ]).has(normalized);
}

function getSelectedService() {
  return services.find(
    service =>
      String(service.service) ===
      String(serviceSelect.value)
  );
}

function updateCharge() {
  const service = getSelectedService();
  const quantity = Number(quantityInput.value);

  if (
    !service ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    chargeEl.textContent = "0.00000 USD";
    return;
  }

  const rate = Number(
    String(service.rate ?? "")
      .replace(/,/g, "")
  );

  if (!Number.isFinite(rate)) {
    chargeEl.textContent = "0.00000 USD";
    return;
  }

  const charge = quantity * rate / 1000;

  chargeEl.textContent =
    `${charge.toFixed(5)} USD`;
}

function updateServicePreview() {
  const service = getSelectedService();

  const name = $("previewName");
  const category = $("previewCategory");
  const description = $("previewDescription");
  const descriptionCard = $("serviceDescriptionCard");
  const rate = $("previewRate");
  const min = $("previewMin");
  const max = $("previewMax");

  if (!service) {
    name.textContent = "Select a service";
    category.textContent =
      "Choose from the available services";
    description.textContent = "";
    descriptionCard.classList.add("hidden");
    rate.textContent = "—";
    min.textContent = "—";
    max.textContent = "—";

    quantityInput.removeAttribute("min");
    quantityInput.removeAttribute("max");

    updateCharge();
    return;
  }

  name.textContent =
    service.name || "Service";

  category.textContent =
    getServiceCategory(service);

  const serviceDescription =
    cleanServiceDescription(service.desc);

  description.textContent = serviceDescription;
  descriptionCard.classList.toggle(
    "hidden",
    !serviceDescription
  );

  const numericRate = Number(
    String(service.rate ?? "")
      .replace(/,/g, "")
  );

  rate.textContent =
    Number.isFinite(numericRate)
      ? `${numericRate.toFixed(5)} / 1K`
      : `${service.rate || "—"} / 1K`;

  min.textContent =
    service.min || "—";

  max.textContent =
    service.max || "—";

  quantityInput.min =
    service.min || 1;

  quantityInput.max =
    service.max || "";

  const currentQuantity =
    Number(quantityInput.value);

  const numericMin =
    Number(service.min);

  const numericMax =
    Number(service.max);

  if (
    currentQuantity &&
    (
      (
        Number.isFinite(numericMin) &&
        currentQuantity < numericMin
      ) ||
      (
        Number.isFinite(numericMax) &&
        currentQuantity > numericMax
      )
    )
  ) {
    quantityInput.value = "";
  }

  updateCharge();
}

function cleanServiceDescription(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
}

function serviceMatchesPlatform(service, platform) {
  if (!platform || platform === "all") {
    return true;
  }

  return detectServicePlatform(service) === platform;
}

function serviceMatchesCategory(service, category) {
  if (!category || category === "All") {
    return true;
  }

  return getServiceCategory(service) === category;
}

function filteredServices() {
  const search = $("serviceSearch");

  const query = search
    ? search.value.trim().toLowerCase()
    : "";

  return services.filter(service => {
    const categoryMatch =
      serviceMatchesCategory(
        service,
        activeCategory
      );

    const platformMatch =
      serviceMatchesPlatform(
        service,
        activePlatform
      );

    const text = [
      service.service,
      service.name,
      service.type,
      service.category,
      getServiceCategory(service),
      service.desc,
      service.rate,
      service.min,
      service.max
    ]
      .filter(value =>
        value !== null &&
        value !== undefined
      )
      .join(" ")
      .toLowerCase();

    return (
      categoryMatch &&
      platformMatch &&
      text.includes(query)
    );
  });
}

function filteredOrderServices() {
  const search = $("orderServiceSearch");
  const query = search ? search.value.trim().toLowerCase() : "";

  return services.filter(service => {
    const categoryMatch = serviceMatchesCategory(service, activeOrderCategory);
    const platformMatch = serviceMatchesPlatform(service, activePlatform);
    const text = [
      service.service,
      service.name,
      service.type,
      service.category,
      getServiceCategory(service),
      service.desc,
      service.rate
    ]
      .filter(value => value !== null && value !== undefined)
      .join(" ")
      .toLowerCase();

    return categoryMatch && platformMatch && text.includes(query);
  });
}

function renderServiceSelect() {
  if (!serviceSelect) return;

  const previous =
    serviceSelect.value;

  serviceSelect.innerHTML = "";

  const first =
    document.createElement("option");

  first.value = "";

  first.textContent =
    activePlatform === "all"
      ? "Select a service"
      : `Select ${getPlatformName(activePlatform)} service`;

  serviceSelect.appendChild(first);

  const list = filteredOrderServices();

  if (!list.length) {
    const empty =
      document.createElement("option");

    empty.value = "";
    empty.textContent =
      "No services available";

    serviceSelect.appendChild(empty);

    renderOrderServiceResults();
    updateServicePreview();
    return;
  }

  const groups = new Map();

  list.forEach(service => {
    const category =
      getServiceCategory(service);

    if (!groups.has(category)) {
      groups.set(category, []);
    }

    groups.get(category).push(service);
  });

  groups.forEach((groupServices, category) => {
    const group =
      document.createElement("optgroup");

    group.label = category;

    groupServices.forEach(service => {
      const option =
        document.createElement("option");

      option.value =
        service.service;

      const numericRate =
        Number(
          String(service.rate ?? "")
            .replace(/,/g, "")
        );

      const rateText =
        Number.isFinite(numericRate)
          ? numericRate.toFixed(5)
          : service.rate || "0";

      option.textContent =
        `${service.service} — ${service.name} • ${rateText}/1K`;

      option.dataset.service =
        service.service;

      option.dataset.platform =
        detectServicePlatform(service);

      option.dataset.category =
        category;

      group.appendChild(option);
    });

    serviceSelect.appendChild(group);
  });

  const exists = [...serviceSelect.options]
    .some(
      option =>
        String(option.value) ===
        String(previous)
    );

  if (exists) {
    serviceSelect.value = previous;
  }

  renderOrderServiceResults();
  updateServicePreview();
}

function renderOrderServiceResults() {
  const container = $("orderServiceResults");
  const search = $("orderServiceSearch");
  if (!container || !search) return;

  const query = search.value.trim();
  if (!query) {
    container.classList.add("hidden");
    container.innerHTML = "";
    return;
  }

  const list = filteredOrderServices();
  container.classList.remove("hidden");
  container.innerHTML = "";

  if (!list.length) {
    container.innerHTML =
      `<div class="service-search-empty">No matching services found.</div>`;
    return;
  }

  list.forEach(service => {
    const result = document.createElement("button");
    const description = cleanServiceDescription(service.desc)
      .replace(/\s+/g, " ")
      .slice(0, 180);
    const numericRate = Number(
      String(service.rate ?? "").replace(/,/g, "")
    );
    const rateText = Number.isFinite(numericRate)
      ? numericRate.toFixed(5)
      : service.rate || "0";

    result.type = "button";
    result.className = "order-service-result";
    result.innerHTML = `
      <span class="service-result-id">#${escapeHtml(service.service)}</span>
      <strong>${escapeHtml(service.name || "Service")}</strong>
      ${
        description
          ? `<span class="service-result-description">${escapeHtml(description)}</span>`
          : ""
      }
      <span class="service-result-meta">
        ${escapeHtml(rateText)} / 1K · Min ${escapeHtml(service.min ?? "—")} · Max ${escapeHtml(service.max ?? "—")}
      </span>
    `;

    result.addEventListener("click", () => {
      serviceSelect.value = String(service.service);
      updateServicePreview();
      updateCharge();
      serviceSelect.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    });

    container.appendChild(result);
  });
}

function renderOrderCategories() {
  const select = $("orderCategorySelect");
  if (!select) return;

  const categories = [
    "All",
    ...new Set(
      services
        .filter(service => serviceMatchesPlatform(service, activePlatform))
        .map(service => getServiceCategory(service))
        .filter(category => !isPlatformCategory(category))
    )
  ];

  if (!categories.includes(activeOrderCategory)) {
    activeOrderCategory = "All";
  }

  select.innerHTML = "";

  categories.forEach(category => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent =
      category === "All"
        ? "All categories"
        : category;
    select.appendChild(option);
  });

  select.value = activeOrderCategory;
}

function renderCategories() {
  const row = $("categoryRow");

  if (!row) return;

  const categories = [
    "All",
    ...new Set(
      services.map(service =>
        getServiceCategory(service)
      ).filter(category => !isPlatformCategory(category))
    )
  ];

  if (!categories.includes(activeCategory)) {
    activeCategory = "All";
  }

  row.innerHTML = "";

  categories.forEach(category => {
    const button =
      document.createElement("button");

    button.type = "button";

    button.className =
      `category-btn ${
        category === activeCategory
          ? "active"
          : ""
      }`;

    button.textContent = category;

    button.addEventListener("click", () => {
      activeCategory = category;

      renderCategories();
      renderServices();
      renderServiceSelect();
    });

    row.appendChild(button);
  });
}

function renderServices() {
  const body = $("servicesBody");

  if (!body) return;

  const filtered =
    filteredServices();

  body.innerHTML = "";

  if (!filtered.length) {
    const row =
      document.createElement("tr");

    row.innerHTML = `
      <td colspan="9" class="empty-services">
        No services found for this platform.
      </td>
    `;

    body.appendChild(row);
    return;
  }

  filtered.forEach(service => {
    const row =
      document.createElement("tr");

    const platform =
      detectServicePlatform(service);

    const category =
      getServiceCategory(service);

    const refill =
      service.refill === true ||
      String(service.refill).toLowerCase() === "true" ||
      String(service.refill).toLowerCase() === "yes";

    const cancel =
      service.cancel === true ||
      String(service.cancel).toLowerCase() === "true" ||
      String(service.cancel).toLowerCase() === "yes";

    row.innerHTML = `
      <td>${escapeHtml(service.service)}</td>
      <td class="service-name">${escapeHtml(service.name)}</td>
      <td>${escapeHtml(service.type)}</td>
      <td>${escapeHtml(category)}</td>
      <td>${escapeHtml(service.rate)}</td>
      <td>${escapeHtml(service.min)}</td>
      <td>${escapeHtml(service.max)}</td>
      <td>
        <span class="badge ${refill ? "" : "no"}">
          ${refill ? "YES" : "NO"}
        </span>
      </td>
      <td>
        <span class="badge ${cancel ? "" : "no"}">
          ${cancel ? "YES" : "NO"}
        </span>
      </td>
    `;

    row.dataset.platform = platform;

    body.appendChild(row);
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function loadServices() {
  servicesTableLoaded = false;
  servicesTableLoading = false;
  setServicesLoading(true);

  try {
    const data =
      await api("/api/services");

    services =
      Array.isArray(data)
        ? data
        : Array.isArray(data.services)
          ? data.services
          : [];

    services = services.filter(
      service =>
        service &&
        service.service !== undefined &&
        service.name
    );

    $("serviceCount").textContent =
      services.length;

    activeCategory = "All";
    activeOrderCategory = "All";

    renderCategories();
    renderOrderCategories();
    renderServiceSelect();
    showServicesTablePlaceholder();

  } catch (error) {
    console.error(error);

    const body = $("servicesBody");
    if (body) {
      body.innerHTML = `
        <tr>
          <td colspan="9">
            <div class="services-loading services-loading-error">
              Unable to load services. Please refresh and try again.
            </div>
          </td>
        </tr>
      `;
    }

    serviceSelect.innerHTML = `
      <option value="">
        Unable to load services
      </option>
    `;

    showToast(
      error.message ||
      "Failed to load services",
      "bad"
    );
  } finally {
    setServicesLoading(false);
  }
}

async function loadBalance() {
  try {
    const data =
      await api("/api/balance");

    const balance =
      Number(
        String(data.balance ?? "")
          .replace(/,/g, "")
      );

    $("topBalance").textContent =
      Number.isFinite(balance)
        ? `${balance.toFixed(5)} ${data.currency || "USD"}`
        : `${data.balance || "0.00000"} ${data.currency || "USD"}`;

  } catch (error) {
    console.error(error);

    $("topBalance").textContent =
      "Unavailable";
  }
}

async function refreshAll() {
  const button =
    $("refreshBtn");

  if (button) {
    button.disabled = true;
    button.classList.add("spinning");
  }

  try {
    await Promise.all([
      loadServices(),
      loadBalance()
    ]);

    showToast(
      "Data refreshed",
      "good"
    );

  } catch (error) {
    showToast(
      error.message ||
      "Refresh failed",
      "bad"
    );
  }

  setTimeout(() => {
    if (button) {
      button.disabled = false;
      button.classList.remove("spinning");
    }
  }, 450);
}

function setupTabs() {
  const tabs =
    document.querySelectorAll(".tab");

  const panels =
    document.querySelectorAll(".tab-panel");

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const target =
        tab.dataset.tab;

      tabs.forEach(item => {
        item.classList.toggle(
          "active",
          item === tab
        );
      });

      panels.forEach(panel => {
        panel.classList.toggle(
          "active",
          panel.id === `${target}Panel`
        );
      });

      if (target === "services") {
        loadServicesTable();
      }

      const tabsElement =
        document.querySelector(".tabs");

      window.scrollTo({
        top: tabsElement
          ? tabsElement.offsetTop - 90
          : 0,
        behavior: "smooth"
      });
    });
  });
}

function setPlatform(platform) {
  activePlatform =
    platform || "all";

  activeCategory = "All";
  activeOrderCategory = "All";

  document
    .querySelectorAll(".media-btn")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.platform ===
        activePlatform
      );
    });

  const label =
    $("selectedPlatformLabel");

  if (label) {
    label.textContent =
      getPlatformName(
        activePlatform
      ).toUpperCase();
  }

  renderCategories();
  renderOrderCategories();
  if (servicesTableLoaded) {
    renderServices();
  }
  renderServiceSelect();
}

function setupMediaButtons() {
  document
    .querySelectorAll(".media-btn")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          setPlatform(
            button.dataset.platform
          );
        }
      );
    });
}

function setupChargeEvents() {
  if (serviceSelect) {
    serviceSelect.addEventListener(
      "change",
      () => {
        updateServicePreview();
        updateCharge();
      }
    );
  }

  if (quantityInput) {
    quantityInput.addEventListener(
      "input",
      updateCharge
    );

    quantityInput.addEventListener(
      "change",
      updateCharge
    );
  }
}

function validateQuantity(service, quantity) {
  if (!service) {
    return "Please select a service.";
  }

  if (
    !Number.isInteger(quantity) ||
    quantity <= 0
  ) {
    return "Please enter a valid quantity.";
  }

  const min =
    Number(
      String(service.min ?? "")
        .replace(/,/g, "")
    );

  const max =
    Number(
      String(service.max ?? "")
        .replace(/,/g, "")
    );

  if (
    Number.isFinite(min) &&
    quantity < min
  ) {
    return `Minimum quantity is ${min}.`;
  }

  if (
    Number.isFinite(max) &&
    quantity > max
  ) {
    return `Maximum quantity is ${max}.`;
  }

  return null;
}

async function submitOrder(event) {
  event.preventDefault();

  const button =
    event.submitter;

  const service =
    getSelectedService();

  const link =
    linkInput.value.trim();

  const quantity =
    Number(quantityInput.value);

  const quantityError =
    validateQuantity(
      service,
      quantity
    );

  if (quantityError) {
    setMessage(
      "orderMessage",
      quantityError,
      "bad"
    );

    showToast(
      quantityError,
      "bad"
    );

    return;
  }

  if (!link) {
    setMessage(
      "orderMessage",
      "Please enter a link.",
      "bad"
    );

    return;
  }

  try {
    if (button) {
      button.disabled = true;
    }

    setMessage(
      "orderMessage",
      "Placing order..."
    );

    const data =
      await api("/api/order", {
        method: "POST",
        body: JSON.stringify({
          service: service.service,
          link,
          quantity
        })
      });

    const orderId =
      data.order ??
      data.order_id ??
      data.id;

    if (orderId !== undefined) {
      setMessage(
        "orderMessage",
        `Order #${orderId} created successfully.`,
        "good"
      );

      showToast(
        `Order #${orderId} created successfully`,
        "good"
      );
    } else {
      setMessage(
        "orderMessage",
        "Order created successfully.",
        "good"
      );

      showToast(
        "Order created successfully",
        "good"
      );
    }

    $("orderForm").reset();

    updateServicePreview();
    updateCharge();

    await loadBalance();

  } catch (error) {
    console.error(error);

    setMessage(
      "orderMessage",
      error.message ||
      "Failed to place order.",
      "bad"
    );

    showToast(
      error.message ||
      "Failed to place order",
      "bad"
    );

  } finally {
    if (button) {
      button.disabled = false;
    }
  }
}

function renderStatusCard(id, data) {
  const card =
    document.createElement("div");

  card.className =
    "result-card";

  const statusData =
    data && typeof data === "object"
      ? data
      : { status: data };

  if (statusData.error) {
    card.innerHTML = `
      <div class="result-id">
        ORDER #${escapeHtml(id)}
      </div>

      <div class="result-row">
        <span>Error</span>
        <b class="danger-text">
          ${escapeHtml(statusData.error)}
        </b>
      </div>
    `;

    return card;
  }

  card.innerHTML = `
    <div class="result-id">
      ORDER #${escapeHtml(id)}
    </div>

    <div class="result-row">
      <span>Status</span>
      <b>${escapeHtml(statusData.status || "—")}</b>
    </div>

    <div class="result-row">
      <span>Charge</span>
      <b>
        ${escapeHtml(statusData.charge || "—")}
        ${escapeHtml(statusData.currency || "")}
      </b>
    </div>

    <div class="result-row">
      <span>Start Count</span>
      <b>${escapeHtml(statusData.start_count ?? "—")}</b>
    </div>

    <div class="result-row">
      <span>Remains</span>
      <b>${escapeHtml(statusData.remains ?? "—")}</b>
    </div>
  `;

  return card;
}

async function submitStatus(event) {
  event.preventDefault();

  const input =
    $("ordersInput");

  const container =
    $("statusResults");

  const ids =
    input.value
      .split(",")
      .map(id => id.trim())
      .filter(Boolean);

  if (!ids.length) {
    showToast(
      "Enter at least one order ID",
      "bad"
    );

    return;
  }

  if (ids.length > 100) {
    showToast(
      "Maximum of 100 order IDs allowed",
      "bad"
    );

    return;
  }

  container.innerHTML =
    `<div class="checking">Checking...</div>`;

  try {
    const data =
      await api("/api/status", {
        method: "POST",
        body: JSON.stringify({
          orders: ids.join(",")
        })
      });

    container.innerHTML = "";

    if (
      data &&
      typeof data === "object"
    ) {
      Object.entries(data).forEach(
        ([id, status]) => {
          container.appendChild(
            renderStatusCard(
              id,
              status
            )
          );
        }
      );
    }

    if (!container.children.length) {
      container.innerHTML =
        `<div class="checking">No results.</div>`;
    }

  } catch (error) {
    console.error(error);

    container.innerHTML =
      `<div class="danger-text">${escapeHtml(error.message)}</div>`;

    showToast(
      error.message ||
      "Failed to check status",
      "bad"
    );
  }
}

async function submitRefill(event) {
  event.preventDefault();

  const order =
    $("refillOrder")
      .value
      .trim();

  if (!order) {
    setMessage(
      "refillMessage",
      "Enter an order ID.",
      "bad"
    );

    return;
  }

  try {
    setMessage(
      "refillMessage",
      "Creating refill..."
    );

    const data =
      await api("/api/refill", {
        method: "POST",
        body: JSON.stringify({
          order
        })
      });

    const refill =
      data.refill ??
      data.refill_id ??
      data.id;

    setMessage(
      "refillMessage",
      refill !== undefined
        ? `Refill #${refill} created.`
        : "Refill created successfully.",
      "good"
    );

    showToast(
      refill !== undefined
        ? `Refill #${refill} created`
        : "Refill created",
      "good"
    );

    $("refillOrder").value = "";

  } catch (error) {
    setMessage(
      "refillMessage",
      error.message ||
      "Failed to create refill.",
      "bad"
    );

    showToast(
      error.message ||
      "Failed to create refill",
      "bad"
    );
  }
}

async function submitMultipleRefill(event) {
  event.preventDefault();

  const orders =
    $("refillOrders")
      .value
      .split(",")
      .map(id => id.trim())
      .filter(Boolean);

  if (!orders.length) {
    setMessage(
      "refillMultiMessage",
      "Enter order IDs.",
      "bad"
    );

    return;
  }

  if (orders.length > 100) {
    setMessage(
      "refillMultiMessage",
      "Maximum of 100 order IDs.",
      "bad"
    );

    return;
  }

  try {
    setMessage(
      "refillMultiMessage",
      "Creating refills..."
    );

    const data =
      await api("/api/refill-multiple", {
        method: "POST",
        body: JSON.stringify({
          orders: orders.join(",")
        })
      });

    $("refillResult").textContent =
      JSON.stringify(
        data,
        null,
        2
      );

    setMessage(
      "refillMultiMessage",
      "Multiple refills created.",
      "good"
    );

    showToast(
      "Multiple refills created",
      "good"
    );

  } catch (error) {
    setMessage(
      "refillMultiMessage",
      error.message ||
      "Failed to create refills.",
      "bad"
    );

    showToast(
      error.message ||
      "Failed to create refills",
      "bad"
    );
  }
}

async function submitRefillStatus(event) {
  event.preventDefault();

  const refills =
    $("refillIds")
      .value
      .split(",")
      .map(id => id.trim())
      .filter(Boolean);

  if (!refills.length) {
    setMessage(
      "refillStatusMessage",
      "Enter refill IDs.",
      "bad"
    );

    return;
  }

  if (refills.length > 100) {
    setMessage(
      "refillStatusMessage",
      "Maximum of 100 refill IDs.",
      "bad"
    );

    return;
  }

  try {
    setMessage(
      "refillStatusMessage",
      "Checking refill status..."
    );

    const data =
      await api("/api/refill-status", {
        method: "POST",
        body: JSON.stringify({
          refills: refills.join(",")
        })
      });

    $("refillResult").textContent =
      JSON.stringify(
        data,
        null,
        2
      );

    setMessage(
      "refillStatusMessage",
      "Status loaded.",
      "good"
    );

  } catch (error) {
    setMessage(
      "refillStatusMessage",
      error.message ||
      "Failed to check refill status.",
      "bad"
    );

    showToast(
      error.message ||
      "Failed to check refill status",
      "bad"
    );
  }
}

function setupForms() {
  const orderForm =
    $("orderForm");

  const statusForm =
    $("statusForm");

  const refillForm =
    $("refillForm");

  const refillMultiForm =
    $("refillMultiForm");

  const refillStatusForm =
    $("refillStatusForm");

  if (orderForm) {
    orderForm.addEventListener(
      "submit",
      submitOrder
    );
  }

  if (statusForm) {
    statusForm.addEventListener(
      "submit",
      submitStatus
    );
  }

  if (refillForm) {
    refillForm.addEventListener(
      "submit",
      submitRefill
    );
  }

  if (refillMultiForm) {
    refillMultiForm.addEventListener(
      "submit",
      submitMultipleRefill
    );
  }

  if (refillStatusForm) {
    refillStatusForm.addEventListener(
      "submit",
      submitRefillStatus
    );
  }
}

function setupSearch() {
  const search =
    $("serviceSearch");

  if (!search) return;

  search.addEventListener("input", () => {
    clearTimeout(serviceSearchTimer);
    if (!servicesTableLoaded) return;

    showServicesFilterLoading();

    serviceSearchTimer = setTimeout(() => {
      renderServices();
    }, 160);
  });
}

function setupOrderSearch() {
  const search = $("orderServiceSearch");
  if (!search) return;

  search.addEventListener("input", () => {
    clearTimeout(orderSearchTimer);

    const container = $("orderServiceResults");
    if (container && search.value.trim()) {
      container.classList.remove("hidden");
      container.innerHTML = `
        <div class="service-search-empty">
          <span class="loading-spinner"></span>
          Searching services...
        </div>
      `;
    }

    orderSearchTimer = setTimeout(() => {
      renderServiceSelect();
    }, 160);
  });
}

function setupOrderCategory() {
  const select = $("orderCategorySelect");
  if (!select) return;

  select.addEventListener("change", () => {
    activeOrderCategory = select.value || "All";
    renderServiceSelect();
  });
}

function setupRefresh() {
  const button =
    $("refreshBtn");

  if (!button) return;

  button.addEventListener(
    "click",
    refreshAll
  );
}

function setupLogin() {
  const loginForm =
    $("loginForm");

  if (loginForm) {
    loginForm.addEventListener(
      "submit",
      login
    );
  }

  const toggle =
    $("togglePassword");

  if (toggle) {
    toggle.addEventListener(
      "click",
      () => {
        const input =
          $("loginPassword");

        input.type =
          input.type === "password"
            ? "text"
            : "password";
      }
    );
  }

  const logoutButton =
    $("logoutBtn");

  if (logoutButton) {
    logoutButton.addEventListener(
      "click",
      logout
    );
  }
}

async function startApp() {
  setupTabs();
  setupChargeEvents();
  setupForms();
  setupSearch();
  setupOrderSearch();
  setupOrderCategory();
  setupRefresh();
  setupMediaButtons();

  await Promise.all([
    loadServices(),
    loadBalance()
  ]);
}

document.addEventListener(
  "DOMContentLoaded",
  async () => {
    setupLogin();
    await checkAuth();
  }
);
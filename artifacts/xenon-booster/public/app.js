const state = { services: [], category: "All" };
const $ = (id) => document.getElementById(id);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[char]);
}

async function request(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({ error: "Invalid server response" }));
  if (!response.ok || data.error) {
    const error = new Error(data.error || "Request failed");
    error.data = data;
    throw error;
  }
  return data;
}

function showToast(message, bad = false) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.toggle("bad", bad);
  toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function setMessage(id, message, good = false) {
  const element = $(id);
  element.textContent = message;
  element.className = `form-message ${good ? "good" : "bad"}`;
}

async function loadBalance() {
  try {
    const data = await request("/booster-api/balance");
    $("topBalance").textContent = `${Number(data.balance || 0).toFixed(5)} ${data.currency || "USD"}`;
  } catch {
    $("topBalance").textContent = "Unavailable";
  }
}

async function loadServices() {
  $("serviceSelect").innerHTML = "<option value=''>Loading services...</option>";
  try {
    const data = await request("/booster-api/services");
    state.services = Array.isArray(data) ? data : [];
    $("serviceCount").textContent = state.services.length;
    renderSelect(); renderCategories(); renderServices();
  } catch (error) {
    $("serviceSelect").innerHTML = "<option value=''>Provider unavailable</option>";
    $("serviceCount").textContent = "—";
    showToast(error.message, true);
  }
}

function renderSelect() {
  const select = $("serviceSelect");
  const current = select.value;
  select.innerHTML = `<option value="">Select a service</option>${state.services.map((service) => `<option value="${escapeHtml(service.service)}">${escapeHtml(`${service.service} — ${service.name || "Service"} — ${service.category || "General"}`)}</option>`).join("")}`;
  if (state.services.some((service) => String(service.service) === current)) select.value = current;
  updatePreview();
}

function selectedService() {
  return state.services.find((service) => String(service.service) === String($("serviceSelect").value));
}

function updatePreview() {
  const service = selectedService();
  if (!service) {
    $("previewName").textContent = "Select a service"; $("previewCategory").textContent = "Choose from the available services";
    $("previewRate").textContent = "—"; $("previewMin").textContent = "—"; $("previewMax").textContent = "—"; $("charge").textContent = "0.00000 USD";
    $("quantityInput").removeAttribute("min"); $("quantityInput").removeAttribute("max"); return;
  }
  $("previewName").textContent = service.name || "Service";
  $("previewCategory").textContent = `${service.category || "Uncategorized"} • ${service.type || "Default"}`;
  $("previewRate").textContent = `${service.rate ?? "—"} USD`; $("previewMin").textContent = service.min ?? "—"; $("previewMax").textContent = service.max ?? "—";
  $("quantityInput").min = Number(service.min || 1); $("quantityInput").max = Number(service.max || 999999999);
  $("charge").textContent = `${((Number($("quantityInput").value || 0) * Number(service.rate || 0)) / 1000).toFixed(5)} USD`;
}

function renderCategories() {
  const categories = ["All", ...new Set(state.services.map((service) => service.category || "Uncategorized"))];
  $("categoryRow").innerHTML = categories.map((category) => `<button class="category-btn ${category === state.category ? "active" : ""}" data-category="${escapeHtml(category)}" type="button">${escapeHtml(category)}</button>`).join("");
  document.querySelectorAll(".category-btn").forEach((button) => button.addEventListener("click", () => { state.category = button.dataset.category; renderCategories(); renderServices(); }));
}

function renderServices() {
  const query = $("serviceSearch").value.toLowerCase().trim();
  const rows = state.services.filter((service) => {
    const categoryMatch = state.category === "All" || (service.category || "Uncategorized") === state.category;
    return categoryMatch && `${service.service} ${service.name} ${service.type} ${service.category}`.toLowerCase().includes(query);
  });
  $("servicesBody").innerHTML = rows.length ? rows.map((service) => `<tr><td>${escapeHtml(service.service)}</td><td class="service-name">${escapeHtml(service.name)}</td><td>${escapeHtml(service.type)}</td><td>${escapeHtml(service.category)}</td><td>${escapeHtml(service.rate)}</td><td>${escapeHtml(service.min)}</td><td>${escapeHtml(service.max)}</td><td><span class="badge ${service.refill ? "" : "no"}">${service.refill ? "YES" : "NO"}</span></td><td><span class="badge ${service.cancel ? "" : "no"}">${service.cancel ? "YES" : "NO"}</span></td></tr>`).join("") : "<tr><td colspan='9'>No services found.</td></tr>";
}

function switchTab(name) {
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
  document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
  $(`${name}Panel`).classList.add("active");
}

document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => switchTab(tab.dataset.tab)));
$("refreshBtn").addEventListener("click", async () => { $("refreshBtn").disabled = true; await Promise.all([loadBalance(), loadServices()]); $("refreshBtn").disabled = false; showToast("Panel data refreshed"); });
$("serviceSelect").addEventListener("change", updatePreview);
$("quantityInput").addEventListener("input", updatePreview);
$("serviceSearch").addEventListener("input", renderServices);

$("orderForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const service = selectedService(); const link = $("linkInput").value.trim(); const quantity = Number($("quantityInput").value);
  if (!service) return setMessage("orderMessage", "Please select a service.");
  if (!link) return setMessage("orderMessage", "Please enter a link.");
  if (!Number.isFinite(quantity) || quantity < Number(service.min) || quantity > Number(service.max)) return setMessage("orderMessage", `Quantity must be between ${service.min} and ${service.max}.`);
  const button = event.submitter; button.disabled = true; setMessage("orderMessage", "Submitting order...", true);
  try {
    const data = await request("/booster-api/order", { method: "POST", body: JSON.stringify({ service: service.service, link, quantity }) });
    setMessage("orderMessage", `Order #${data.order ?? "created"} created successfully.`, true); showToast(`Order #${data.order ?? "created"} created`);
    $("linkInput").value = ""; $("quantityInput").value = ""; updatePreview(); await loadBalance();
    if (data.order) { switchTab("orders"); $("ordersInput").value = data.order; await checkStatus(String(data.order)); }
  } catch (error) { setMessage("orderMessage", error.message); showToast(error.message, true); } finally { button.disabled = false; }
});

async function checkStatus(ids) {
  const list = ids.split(",").map((value) => value.trim()).filter(Boolean).slice(0, 100);
  if (!list.length) throw new Error("Enter at least one order ID.");
  const data = await request("/booster-api/status", { method: "POST", body: JSON.stringify({ orders: list.join(",") }) });
  renderStatuses(data); return data;
}

function renderStatuses(data) {
  const entries = Object.entries(data);
  $("statusResults").innerHTML = entries.map(([id, item]) => `<div class="result-card"><div class="result-id">ORDER #${escapeHtml(id)}</div><div class="result-row"><span>Status</span><b>${escapeHtml(item?.status ?? item?.error ?? "Received")}</b></div><div class="result-row"><span>Charge</span><b>${escapeHtml(item?.charge ?? "—")} ${escapeHtml(item?.currency ?? "")}</b></div><div class="result-row"><span>Start count</span><b>${escapeHtml(item?.start_count ?? "—")}</b></div><div class="result-row"><span>Remains</span><b>${escapeHtml(item?.remains ?? "—")}</b></div></div>`).join("");
}

$("statusForm").addEventListener("submit", async (event) => { event.preventDefault(); try { await checkStatus($("ordersInput").value); showToast("Order status updated"); } catch (error) { showToast(error.message, true); } });

async function submitRefill(formId, messageId, resultMessage, endpoint, payload) {
  const form = $(formId); const button = form.querySelector("button"); button.disabled = true; setMessage(messageId, "Working...", true);
  try { const data = await request(endpoint, { method: "POST", body: JSON.stringify(payload()) }); $("refillResult").textContent = JSON.stringify(data, null, 2); setMessage(messageId, resultMessage, true); showToast(resultMessage); }
  catch (error) { setMessage(messageId, error.message); showToast(error.message, true); } finally { button.disabled = false; }
}

$("refillForm").addEventListener("submit", (event) => { event.preventDefault(); submitRefill("refillForm", "refillMessage", "Refill created.", "/booster-api/refill", () => ({ order: $("refillOrder").value.trim() })); });
$("refillMultiForm").addEventListener("submit", (event) => { event.preventDefault(); submitRefill("refillMultiForm", "refillMultiMessage", "Multiple refills processed.", "/booster-api/refill-multiple", () => ({ orders: $("refillOrders").value.trim() })); });
$("refillStatusForm").addEventListener("submit", (event) => { event.preventDefault(); submitRefill("refillStatusForm", "refillStatusMessage", "Refill status updated.", "/booster-api/refill-status", () => ({ refills: $("refillIds").value.trim() })); });

loadBalance();
loadServices();
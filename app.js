/* =========================================================
   CREDITI IA PAINEL
   app.js
   ========================================================= */

const SUPABASE_URL = "https://vgdtywdpywezrwrlsawq.supabase.co";

/*
  IMPORTANTE:
  Mantenha aqui a MESMA chave pública/anônima do Supabase
  que já estava funcionando no seu app.js anterior.
*/
const SUPABASE_KEY = "COLE_AQUI_SUA_CHAVE_SUPABASE";

/* =========================================================
   ELEMENTOS
   ========================================================= */

const loginScreen = document.getElementById("loginScreen");
const appShell = document.getElementById("appShell");

const emailInput = document.getElementById("emailInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const loginError = document.getElementById("loginError");
const loginSuccess = document.getElementById("loginSuccess");

const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");

const dashboardView = document.getElementById("dashboardView");
const leadsView = document.getElementById("leadsView");
const pageTitle = document.getElementById("pageTitle");

const metricTotal = document.getElementById("metricTotal");
const metricToday = document.getElementById("metricToday");
const metricOpen = document.getElementById("metricOpen");
const metricForwarded = document.getElementById("metricForwarded");

const recentList = document.getElementById("recentList");
const productsRanking = document.getElementById("productsRanking");

const searchInput = document.getElementById("searchInput");
const productFilter = document.getElementById("productFilter");
const statusFilter = document.getElementById("statusFilter");

const leadsTableBody = document.getElementById("leadsTableBody");
const mobileLeadsList = document.getElementById("mobileLeadsList");
const emptyState = document.getElementById("emptyState");

const leadDialog = document.getElementById("leadDialog");
const closeDialog = document.getElementById("closeDialog");

const detailName = document.getElementById("detailName");
const detailOrigin = document.getElementById("detailOrigin");
const detailDate = document.getElementById("detailDate");

const editName = document.getElementById("editName");
const editPhone = document.getElementById("editPhone");
const editCity = document.getElementById("editCity");
const editProduct = document.getElementById("editProduct");
const editStatus = document.getElementById("editStatus");

const leadNotes = document.getElementById("leadNotes");
const dialogMessage = document.getElementById("dialogMessage");

const whatsappLink = document.getElementById("whatsappLink");
const saveNotesBtn = document.getElementById("saveNotesBtn");
const saveLeadBtn = document.getElementById("saveLeadBtn");
const deleteLeadBtn = document.getElementById("deleteLeadBtn");

/* =========================================================
   ESTADO
   ========================================================= */

let accessToken = localStorage.getItem("crediti_access_token") || "";
let refreshToken = localStorage.getItem("crediti_refresh_token") || "";

let leads = [];
let filteredLeads = [];
let currentLead = null;

/* =========================================================
   HELPERS
   ========================================================= */

function apiHeaders(auth = true) {
  const headers = {
    apikey: SUPABASE_KEY,
    "Content-Type": "application/json"
  };

  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return headers;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("pt-BR");
}

function formatPhone(value = "") {
  const digits = String(value).replace(/\D/g, "");

  let number = digits;

  if (number.startsWith("55") && number.length > 11) {
    number = number.slice(2);
  }

  if (number.length === 11) {
    return `(${number.slice(0, 2)}) ${number.slice(2, 7)}-${number.slice(7)}`;
  }

  if (number.length === 10) {
    return `(${number.slice(0, 2)}) ${number.slice(2, 6)}-${number.slice(6)}`;
  }

  return value || "-";
}

function whatsappNumber(value = "") {
  let digits = String(value).replace(/\D/g, "");

  if (!digits) return "";

  if (!digits.startsWith("55")) {
    digits = `55${digits}`;
  }

  return digits;
}

function statusLabel(status = "") {
  const labels = {
    novo: "Novo",
    dados_coletados: "Dados coletados",
    em_atendimento: "Em atendimento",
    encaminhado: "Encaminhado",
    documentacao: "Documentação",
    proposta_enviada: "Proposta enviada",
    aprovado: "Aprovado",
    nao_aprovado: "Não aprovado",
    finalizado: "Finalizado"
  };

  return labels[status] || status || "Em atendimento";
}

function getLeadName(lead) {
  return lead.nome || lead.name || lead.cliente || "Cliente";
}

function getLeadPhone(lead) {
  return lead.telefone || lead.phone || lead.whatsapp || "";
}

function getLeadCity(lead) {
  return lead.cidade || lead.city || "-";
}

function getLeadProduct(lead) {
  return lead.produto || lead.product || lead.interesse || "-";
}

function getLeadStatus(lead) {
  return lead.status || "em_atendimento";
}

function getLeadDate(lead) {
  return lead.created_at || lead.data || lead.createdAt || "";
}

function getLeadOrigin(lead) {
  return lead.origem || lead.origin || "Crediti IA";
}

function getLeadNotes(lead) {
  return lead.observacoes || lead.notes || "";
}

/* =========================================================
   AUTENTICAÇÃO
   ========================================================= */

async function login() {
  loginError.textContent = "";
  loginSuccess.textContent = "";

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    loginError.textContent = "Informe seu e-mail e sua senha.";
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "ENTRANDO...";

  try {
    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: apiHeaders(false),
        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.msg || "E-mail ou senha inválidos.");
    }

    accessToken = data.access_token;
    refreshToken = data.refresh_token;

    localStorage.setItem("crediti_access_token", accessToken);
    localStorage.setItem("crediti_refresh_token", refreshToken);

    showApp();

    await loadLeads();

  } catch (error) {
    loginError.textContent = error.message;
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "ENTRAR";
  }
}

async function forgotPassword() {
  loginError.textContent = "";
  loginSuccess.textContent = "";

  const email = emailInput.value.trim();

  if (!email) {
    loginError.textContent = "Digite seu e-mail primeiro.";
    return;
  }

  forgotPasswordBtn.disabled = true;

  try {
    const redirectTo =
      `${window.location.origin}${window.location.pathname}`;

    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
      {
        method: "POST",
        headers: apiHeaders(false),
        body: JSON.stringify({
          email
        })
      }
    );

    if (!response.ok) {
      throw new Error("Não foi possível enviar o e-mail agora.");
    }

    loginSuccess.textContent =
      "Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.";

  } catch (error) {
    loginError.textContent = error.message;
  } finally {
    forgotPasswordBtn.disabled = false;
  }
}

function logout() {
  accessToken = "";
  refreshToken = "";

  localStorage.removeItem("crediti_access_token");
  localStorage.removeItem("crediti_refresh_token");

  appShell.classList.add("hidden");
  loginScreen.classList.remove("hidden");

  passwordInput.value = "";
}

function showApp() {
  loginScreen.classList.add("hidden");
  appShell.classList.remove("hidden");
}

/* =========================================================
   CARREGAR LEADS
   ========================================================= */

async function loadLeads() {
  try {
    refreshBtn.disabled = true;
    refreshBtn.textContent = "Atualizando...";

    /*
      Mantém a tabela "leads".
      Se no seu Supabase ela tiver outro nome,
      use exatamente o nome que já estava no app.js anterior.
    */

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?select=*&order=created_at.desc`,
      {
        headers: apiHeaders()
      }
    );

    if (response.status === 401) {
      logout();
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        data.error ||
        "Não foi possível carregar os clientes."
      );
    }

    leads = Array.isArray(data) ? data : [];

    populateProductFilter();
    applyFilters();
    renderDashboard();

  } catch (error) {
    console.error(error);

    leadsTableBody.innerHTML = "";
    mobileLeadsList.innerHTML = "";

    emptyState.classList.remove("hidden");
    emptyState.textContent = "Não foi possível carregar os clientes.";

  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "Atualizar";
  }
}

/* =========================================================
   FILTROS
   ========================================================= */

function populateProductFilter() {
  const selected = productFilter.value;

  const products = [
    ...new Set(
      leads
        .map(getLeadProduct)
        .filter(product => product && product !== "-")
    )
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));

  productFilter.innerHTML =
    `<option value="">Todos os produtos</option>` +
    products
      .map(product => {
        return `<option value="${escapeHtml(product)}">${escapeHtml(product)}</option>`;
      })
      .join("");

  productFilter.value = selected;
}

function applyFilters() {
  const search = normalizeText(searchInput.value);
  const product = normalizeText(productFilter.value);
  const status = statusFilter.value;

  filteredLeads = leads.filter(lead => {
    const searchable = normalizeText(
      [
        getLeadName(lead),
        getLeadPhone(lead),
        getLeadCity(lead),
        getLeadProduct(lead)
      ].join(" ")
    );

    const matchesSearch =
      !search || searchable.includes(search);

    const matchesProduct =
      !product ||
      normalizeText(getLeadProduct(lead)) === product;

    const matchesStatus =
      !status ||
      getLeadStatus(lead) === status;

    return (
      matchesSearch &&
      matchesProduct &&
      matchesStatus
    );
  });

  renderLeads();
}

/* =========================================================
   DESKTOP + MOBILE
   ========================================================= */

function renderLeads() {
  renderDesktopTable();
  renderMobileCards();

  if (filteredLeads.length === 0) {
    emptyState.classList.remove("hidden");
  } else {
    emptyState.classList.add("hidden");
  }
}

function renderDesktopTable() {
  leadsTableBody.innerHTML = filteredLeads
    .map(lead => {
      const id = escapeHtml(lead.id);

      return `
        <tr>

          <td>
            <strong>
              ${escapeHtml(getLeadName(lead))}
            </strong>
          </td>

          <td>
            <a
              href="https://wa.me/${whatsappNumber(getLeadPhone(lead))}"
              target="_blank"
              rel="noopener noreferrer"
            >
              ${escapeHtml(formatPhone(getLeadPhone(lead)))}
            </a>
          </td>

          <td>
            ${escapeHtml(getLeadCity(lead))}
          </td>

          <td>
            ${escapeHtml(getLeadProduct(lead))}
          </td>

          <td>
            <span class="status-badge">
              ${escapeHtml(statusLabel(getLeadStatus(lead)))}
            </span>
          </td>

          <td>
            ${escapeHtml(formatDate(getLeadDate(lead)))}
          </td>

          <td>
            <button
              class="table-view-btn"
              type="button"
              data-lead-id="${id}"
            >
              Ver ficha
            </button>
          </td>

        </tr>
      `;
    })
    .join("");
}

function renderMobileCards() {
  mobileLeadsList.innerHTML = filteredLeads
    .map(lead => {
      const id = escapeHtml(lead.id);

      const name = escapeHtml(getLeadName(lead));
      const phone = escapeHtml(formatPhone(getLeadPhone(lead)));
      const city = escapeHtml(getLeadCity(lead));
      const product = escapeHtml(getLeadProduct(lead));
      const status = escapeHtml(statusLabel(getLeadStatus(lead)));
      const date = escapeHtml(formatDate(getLeadDate(lead)));

      return `
        <article class="mobile-lead-card">

          <div class="mobile-lead-top">

            <div class="mobile-lead-main">

              <span class="mobile-label">
                CLIENTE
              </span>

              <h3>
                ${name}
              </h3>

            </div>

            <span class="mobile-status">
              ${status}
            </span>

          </div>

          <div class="mobile-lead-info">

            <div class="mobile-info-item">

              <span>
                Telefone
              </span>

              <a
                href="https://wa.me/${whatsappNumber(getLeadPhone(lead))}"
                target="_blank"
                rel="noopener noreferrer"
              >
                ${phone}
              </a>

            </div>

            <div class="mobile-info-item">

              <span>
                Cidade
              </span>

              <strong>
                ${city}
              </strong>

            </div>

            <div class="mobile-info-item">

              <span>
                Produto
              </span>

              <strong>
                ${product}
              </strong>

            </div>

            <div class="mobile-info-item">

              <span>
                Data
              </span>

              <strong>
                ${date}
              </strong>

            </div>

          </div>

          <button
            class="mobile-view-btn"
            type="button"
            data-lead-id="${id}"
          >
            Ver ficha
          </button>

        </article>
      `;
    })
    .join("");
}

/* =========================================================
   DASHBOARD
   ========================================================= */

function renderDashboard() {
  metricTotal.textContent = leads.length;

  const today = new Date();

  const todayCount = leads.filter(lead => {
    const date = new Date(getLeadDate(lead));

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  }).length;

  metricToday.textContent = todayCount;

  metricOpen.textContent = leads.filter(
    lead => getLeadStatus(lead) === "em_atendimento"
  ).length;

  metricForwarded.textContent = leads.filter(
    lead => getLeadStatus(lead) === "encaminhado"
  ).length;

  renderRecentLeads();
  renderProductRanking();
}

function renderRecentLeads() {
  const recent = leads.slice(0, 6);

  if (!recent.length) {
    recentList.innerHTML =
      `<div class="empty">Nenhum lead recebido.</div>`;
    return;
  }

  recentList.innerHTML = recent
    .map(lead => {
      return `
        <button
          class="recent-item"
          type="button"
          data-lead-id="${escapeHtml(lead.id)}"
        >

          <div>
            <strong>
              ${escapeHtml(getLeadName(lead))}
            </strong>

            <span>
              ${escapeHtml(getLeadProduct(lead))}
            </span>
          </div>

          <small>
            ${escapeHtml(formatDate(getLeadDate(lead)))}
          </small>

        </button>
      `;
    })
    .join("");
}

function renderProductRanking() {
  const counts = {};

  leads.forEach(lead => {
    const product = getLeadProduct(lead);

    if (!product || product === "-") return;

    counts[product] = (counts[product] || 0) + 1;
  });

  const ranking = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  if (!ranking.length) {
    productsRanking.innerHTML =
      `<div class="empty">Nenhum produto registrado.</div>`;
    return;
  }

  productsRanking.innerHTML = ranking
    .map(([product, total]) => {
      return `
        <div class="ranking-item">

          <span>
            ${escapeHtml(product)}
          </span>

          <strong>
            ${total}
          </strong>

        </div>
      `;
    })
    .join("");
}

/* =========================================================
   FICHA
   ========================================================= */

function findLeadById(id) {
  return leads.find(
    lead => String(lead.id) === String(id)
  );
}

function openLead(id) {
  const lead = findLeadById(id);

  if (!lead) return;

  currentLead = lead;

  detailName.textContent = getLeadName(lead);

  editName.value = getLeadName(lead);
  editPhone.value = getLeadPhone(lead);
  editCity.value = getLeadCity(lead);
  editProduct.value = getLeadProduct(lead);
  editStatus.value = getLeadStatus(lead);

  detailOrigin.textContent = getLeadOrigin(lead);
  detailDate.textContent = formatDate(getLeadDate(lead));

  leadNotes.value = getLeadNotes(lead);

  const number = whatsappNumber(getLeadPhone(lead));

  if (number) {
    const message =
      `Olá, ${getLeadName(lead)}! Aqui é da Crediti. Recebemos seu atendimento sobre ${getLeadProduct(lead)}.`;

    whatsappLink.href =
      `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    whatsappLink.style.display = "";
  } else {
    whatsappLink.style.display = "none";
  }

  dialogMessage.textContent = "";

  if (typeof leadDialog.showModal === "function") {
    leadDialog.showModal();
  } else {
    leadDialog.setAttribute("open", "");
  }
}

function closeLeadDialog() {
  currentLead = null;

  if (typeof leadDialog.close === "function") {
    leadDialog.close();
  } else {
    leadDialog.removeAttribute("open");
  }
}

/* =========================================================
   ATUALIZAR LEAD
   ========================================================= */

async function updateLead(payload) {
  if (!currentLead) return false;

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(currentLead.id)}`,
    {
      method: "PATCH",
      headers: {
        ...apiHeaders(),
        Prefer: "return=representation"
      },
      body: JSON.stringify(payload)
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      data.error ||
      "Não foi possível salvar."
    );
  }

  if (Array.isArray(data) && data[0]) {
    currentLead = data[0];
  }

  return true;
}

async function saveLeadChanges() {
  if (!currentLead) return;

  saveLeadBtn.disabled = true;
  dialogMessage.textContent = "Salvando...";

  try {
    const payload = {
      nome: editName.value.trim(),
      telefone: editPhone.value.trim(),
      cidade: editCity.value.trim(),
      produto: editProduct.value.trim(),
      status: editStatus.value
    };

    await updateLead(payload);

    dialogMessage.textContent =
      "Alterações salvas com sucesso.";

    await loadLeads();

  } catch (error) {
    console.error(error);

    dialogMessage.textContent =
      error.message;

  } finally {
    saveLeadBtn.disabled = false;
  }
}

async function saveNotes() {
  if (!currentLead) return;

  saveNotesBtn.disabled = true;
  dialogMessage.textContent = "Salvando observação...";

  try {
    await updateLead({
      observacoes: leadNotes.value.trim()
    });

    dialogMessage.textContent =
      "Observação salva com sucesso.";

    await loadLeads();

  } catch (error) {
    console.error(error);

    dialogMessage.textContent =
      error.message;

  } finally {
    saveNotesBtn.disabled = false;
  }
}

/* =========================================================
   APAGAR LEAD
   ========================================================= */

async function deleteLead() {
  if (!currentLead) return;

  const confirmed = window.confirm(
    `Deseja realmente apagar o lead de ${getLeadName(currentLead)}?`
  );

  if (!confirmed) return;

  deleteLeadBtn.disabled = true;
  dialogMessage.textContent = "Apagando...";

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/leads?id=eq.${encodeURIComponent(currentLead.id)}`,
      {
        method: "DELETE",
        headers: apiHeaders()
      }
    );

    if (!response.ok) {
      const data = await response.json();

      throw new Error(
        data.message ||
        data.error ||
        "Não foi possível apagar o lead."
      );
    }

    closeLeadDialog();

    await loadLeads();

  } catch (error) {
    console.error(error);

    dialogMessage.textContent =
      error.message;

  } finally {
    deleteLeadBtn.disabled = false;
  }
}

/* =========================================================
   NAVEGAÇÃO
   ========================================================= */

function changeView(viewName) {
  document
    .querySelectorAll(".nav-item")
    .forEach(item => {
      item.classList.toggle(
        "active",
        item.dataset.view === viewName
      );
    });

  dashboardView.classList.remove("active");
  leadsView.classList.remove("active");

  if (viewName === "leads") {
    leadsView.classList.add("active");
    pageTitle.textContent = "Clientes / Leads";
  } else {
    dashboardView.classList.add("active");
    pageTitle.textContent = "Dashboard";
  }
}

/* =========================================================
   CLIQUES
   ========================================================= */

document.addEventListener("click", event => {
  const viewButton = event.target.closest("[data-lead-id]");

  if (viewButton) {
    const id = viewButton.dataset.leadId;

    if (id) {
      openLead(id);
    }
  }
});

document
  .querySelectorAll(".nav-item")
  .forEach(item => {
    item.addEventListener("click", () => {
      changeView(item.dataset.view);
    });
  });

loginBtn.addEventListener("click", login);

passwordInput.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    login();
  }
});

forgotPasswordBtn.addEventListener(
  "click",
  forgotPassword
);

logoutBtn.addEventListener(
  "click",
  logout
);

refreshBtn.addEventListener(
  "click",
  loadLeads
);

searchInput.addEventListener(
  "input",
  applyFilters
);

productFilter.addEventListener(
  "change",
  applyFilters
);

statusFilter.addEventListener(
  "change",
  applyFilters
);

closeDialog.addEventListener(
  "click",
  closeLeadDialog
);

saveLeadBtn.addEventListener(
  "click",
  saveLeadChanges
);

saveNotesBtn.addEventListener(
  "click",
  saveNotes
);

deleteLeadBtn.addEventListener(
  "click",
  deleteLead
);

leadDialog.addEventListener(
  "click",
  event => {
    if (event.target === leadDialog) {
      closeLeadDialog();
    }
  }
);

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

async function init() {
  if (accessToken) {
    showApp();
    await loadLeads();
  } else {
    loginScreen.classList.remove("hidden");
    appShell.classList.add("hidden");
  }
}

init();

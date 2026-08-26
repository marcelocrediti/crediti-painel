const SUPABASE_BASE =
  "https://vgdtywdpywezrwlrsawq.supabase.co";

const SUPABASE_REST =
  `${SUPABASE_BASE}/rest/v1`;

const SUPABASE_AUTH =
  `${SUPABASE_BASE}/auth/v1`;

const SUPABASE_KEY =
  "sb_publishable_dmoTPKmglghAohv0MrRA9A_2zlUYhER";

const COLLECTIONS_SUPABASE_BASE =
  "https://taxdccpyswsqtklibenp.supabase.co";

const COLLECTIONS_SUPABASE_REST =
  `${COLLECTIONS_SUPABASE_BASE}/rest/v1`;

const COLLECTIONS_SUPABASE_AUTH =
  `${COLLECTIONS_SUPABASE_BASE}/auth/v1`;

const COLLECTIONS_SUPABASE_KEY =
  "sb_publishable_wg_r1CZxd0vEG_yFsJ0fpA_4byqtC4f";

const PANEL_URL =
  "https://marcelocrediti.github.io/crediti-painel/";

let allLeads = [];
let filteredLeads = [];
let currentLeadId = null;

let allCollections = [];
let filteredCollections = [];
let currentCollectionId = null;

let collectionsAccessToken =
  sessionStorage.getItem(
    "crediti_collections_access_token"
  ) || "";

let accessToken =
  localStorage.getItem("crediti_access_token") || "";

let refreshToken =
  localStorage.getItem("crediti_refresh_token") || "";

let recoveryMode = false;

const $ = (id) =>
  document.getElementById(id);


/* =========================================================
   UTILIDADES
========================================================= */

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

function fmtDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("pt-BR");
}

function fmtCurrency(value) {
  const number = Number(value || 0);

  return number.toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  );
}

function parseCurrency(value = "") {
  const normalized = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const number = Number(normalized);

  return Number.isFinite(number)
    ? number
    : 0;
}

function fmtDateOnly(value) {
  if (!value) return "-";

  const parts = String(value)
    .slice(0, 10)
    .split("-");

  if (parts.length !== 3) return "-";

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function toLocalDateTimeInput(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(
    date.getTime() - offset * 60000
  );

  return local.toISOString().slice(0, 16);
}

function normalizeCollectionStatus(status) {
  const map = {
    pendente: "Pendente",
    enviada: "Enviada",
    visualizada: "Visualizada",
    negociando: "Negociando",
    paga: "Paga",
    suspensa: "Suspensa"
  };

  return map[status] || "Pendente";
}

function normalizeStatus(status) {
  const map = {
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

  return map[status] || status || "Em atendimento";
}

function getLeadName(lead) {
  return lead.nome || "Cliente";
}

function getLeadPhone(lead) {
  return lead.telefone || "";
}

function getLeadCity(lead) {
  return lead.cidade || "-";
}

function getLeadProduct(lead) {
  return lead.produto_interesse || "-";
}

function getLeadStatus(lead) {
  return lead.status || "em_atendimento";
}

function getLeadResponsible(lead) {
  if (
    !lead.responsavel ||
    !String(lead.responsavel).trim()
  ) {
    return "Não atribuído";
  }

  return String(lead.responsavel).trim();
}

function getLeadDate(lead) {
  return lead.created_at || "";
}

function getLeadOrigin(lead) {
  return lead.origem || "crediti_ia";
}

function getLeadNotes(lead) {
  return lead.observacao || "";
}

function formatPhone(value = "") {
  let digits =
    String(value).replace(/\D/g, "");

  if (
    digits.startsWith("55") &&
    digits.length > 11
  ) {
    digits = digits.slice(2);
  }

  if (digits.length === 11) {
    return (
      `(${digits.slice(0, 2)}) ` +
      `${digits.slice(2, 7)}-` +
      `${digits.slice(7)}`
    );
  }

  if (digits.length === 10) {
    return (
      `(${digits.slice(0, 2)}) ` +
      `${digits.slice(2, 6)}-` +
      `${digits.slice(6)}`
    );
  }

  return value || "-";
}

function whatsappNumber(value = "") {
  let digits =
    String(value).replace(/\D/g, "");

  if (!digits) return "";

  if (
    digits.startsWith("55") &&
    (
      digits.length === 12 ||
      digits.length === 13
    )
  ) {
    return digits;
  }

  if (
    digits.length === 10 ||
    digits.length === 11
  ) {
    return `55${digits}`;
  }

  return "";
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(
    navigator.userAgent
  );
}

function authHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${accessToken}`,
    ...extra
  };
}

function publicHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    ...extra
  };
}

function collectionAuthHeaders(extra = {}) {
  return {
    apikey: COLLECTIONS_SUPABASE_KEY,
    Authorization: `Bearer ${collectionsAccessToken}`,
    ...extra
  };
}

function collectionPublicHeaders(extra = {}) {
  return {
    apikey: COLLECTIONS_SUPABASE_KEY,
    ...extra
  };
}

function clearLoginMessages() {
  if ($("loginError")) {
    $("loginError").textContent = "";
  }

  if ($("loginSuccess")) {
    $("loginSuccess").textContent = "";
  }
}


/* =========================================================
   TELAS
========================================================= */

function showLogin() {
  $("loginScreen")
    .classList
    .remove("hidden");

  $("appShell")
    .classList
    .add("hidden");
}

function showApp() {
  $("loginScreen")
    .classList
    .add("hidden");

  $("appShell")
    .classList
    .remove("hidden");
}


/* =========================================================
   LOGIN
========================================================= */

async function login() {
  clearLoginMessages();

  const email =
    $("emailInput").value.trim();

  const password =
    $("passwordInput").value;

  if (!email) {
    $("loginError").textContent =
      "Digite seu e-mail.";
    return;
  }

  if (!password) {
    $("loginError").textContent =
      "Digite sua senha.";
    return;
  }

  $("loginBtn").disabled = true;
  $("loginBtn").textContent = "ENTRANDO...";

  try {

    const response =
      await fetch(
        `${SUPABASE_AUTH}/token?grant_type=password`,
        {
          method: "POST",

          headers:
            publicHeaders({
              "Content-Type":
                "application/json"
            }),

          body:
            JSON.stringify({
              email,
              password
            })
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.access_token
    ) {
      throw new Error(
        "E-mail ou senha incorretos."
      );
    }

    accessToken =
      data.access_token;

    refreshToken =
      data.refresh_token || "";

    localStorage.setItem(
      "crediti_access_token",
      accessToken
    );

    if (refreshToken) {
      localStorage.setItem(
        "crediti_refresh_token",
        refreshToken
      );
    }

    $("passwordInput").value = "";

    showApp();

    await loadPanelData();

  } catch (error) {
    console.error(error);

    $("loginError").textContent =
      error.message ||
      "Não foi possível entrar.";

  } finally {
    $("loginBtn").disabled = false;
    $("loginBtn").textContent = "ENTRAR";
  }
}


/* =========================================================
   RECUPERAÇÃO DE SENHA
========================================================= */

async function forgotPassword() {
  clearLoginMessages();

  const email =
    $("emailInput").value.trim();

  if (!email) {
    $("loginError").textContent =
      "Digite seu e-mail primeiro.";
    return;
  }

  $("forgotPasswordBtn").disabled = true;
  $("forgotPasswordBtn").textContent =
    "Enviando...";

  try {

    const recoveryUrl =
      `${SUPABASE_AUTH}/recover?redirect_to=${encodeURIComponent(
        PANEL_URL
      )}`;

    const response =
      await fetch(
        recoveryUrl,
        {
          method: "POST",

          headers:
            publicHeaders({
              "Content-Type":
                "application/json"
            }),

          body:
            JSON.stringify({
              email
            })
        }
      );

    if (!response.ok) {
      throw new Error(
        "Não foi possível enviar o e-mail agora."
      );
    }

    $("loginSuccess").textContent =
      "Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.";

  } catch (error) {
    console.error(error);

    $("loginError").textContent =
      error.message;

  } finally {
    $("forgotPasswordBtn").disabled = false;
    $("forgotPasswordBtn").textContent =
      "Esqueci minha senha";
  }
}

function checkRecoveryLink() {
  const hash =
    window.location.hash.replace(/^#/, "");

  if (!hash) {
    return false;
  }

  const params =
    new URLSearchParams(hash);

  const token =
    params.get("access_token");

  const newRefreshToken =
    params.get("refresh_token");

  const type =
    params.get("type");

  if (
    !token ||
    type !== "recovery"
  ) {
    return false;
  }

  recoveryMode = true;
  accessToken = token;
  refreshToken =
    newRefreshToken || "";

  prepareRecoveryScreen();

  return true;
}

function prepareRecoveryScreen() {
  showLogin();
  clearLoginMessages();

  const emailField =
    $("emailInput")
      .closest(".login-field");

  if (emailField) {
    emailField
      .classList
      .add("hidden");
  }

  $("forgotPasswordBtn")
    .classList
    .add("hidden");

  const title =
    document.querySelector(
      ".login-card h1"
    );

  if (title) {
    title.textContent =
      "Criar nova senha";
  }

  const subtitle =
    document.querySelector(
      ".login-subtitle"
    );

  if (subtitle) {
    subtitle.textContent =
      "Digite abaixo a nova senha que deseja usar no painel.";
  }

  const passwordField =
    $("passwordInput")
      .closest(".login-field");

  if (passwordField) {
    const label =
      passwordField
        .querySelector("span");

    if (label) {
      label.textContent =
        "Nova senha";
    }
  }

  $("passwordInput").value = "";

  $("passwordInput").placeholder =
    "Digite sua nova senha";

  $("passwordInput")
    .setAttribute(
      "autocomplete",
      "new-password"
    );

  $("loginBtn").textContent =
    "SALVAR NOVA SENHA";

  $("loginSuccess").textContent =
    "Link confirmado. Agora crie sua nova senha.";
}

async function updateRecoveredPassword() {
  clearLoginMessages();

  const password =
    $("passwordInput").value;

  if (
    !password ||
    password.length < 6
  ) {
    $("loginError").textContent =
      "A senha precisa ter pelo menos 6 caracteres.";
    return;
  }

  $("loginBtn").disabled = true;
  $("loginBtn").textContent =
    "Salvando...";

  try {

    const response =
      await fetch(
        `${SUPABASE_AUTH}/user`,
        {
          method: "PUT",

          headers:
            authHeaders({
              "Content-Type":
                "application/json"
            }),

          body:
            JSON.stringify({
              password
            })
        }
      );

    if (!response.ok) {
      throw new Error(
        "Não foi possível alterar sua senha."
      );
    }

    recoveryMode = false;
    accessToken = "";
    refreshToken = "";

    localStorage.removeItem(
      "crediti_access_token"
    );

    localStorage.removeItem(
      "crediti_refresh_token"
    );

    $("loginSuccess").textContent =
      "Senha alterada com sucesso.";

    window.history.replaceState(
      {},
      document.title,
      PANEL_URL
    );

    setTimeout(() => {
      window.location.href =
        PANEL_URL;
    }, 1500);

  } catch (error) {
    console.error(error);

    $("loginError").textContent =
      error.message;

  } finally {
    $("loginBtn").disabled = false;

    if (recoveryMode) {
      $("loginBtn").textContent =
        "SALVAR NOVA SENHA";
    }
  }
}


/* =========================================================
   LOGOUT
========================================================= */

function logout() {
  accessToken = "";
  refreshToken = "";

  localStorage.removeItem(
    "crediti_access_token"
  );

  localStorage.removeItem(
    "crediti_refresh_token"
  );

  allLeads = [];
  filteredLeads = [];
  currentLeadId = null;

  allCollections = [];
  filteredCollections = [];
  currentCollectionId = null;

  collectionsAccessToken = "";
  sessionStorage.removeItem(
    "crediti_collections_access_token"
  );

  window.location.href =
    PANEL_URL;
}


/* =========================================================
   CARREGAR LEADS
========================================================= */

async function loadLeads() {
  if (!accessToken) {
    showLogin();
    return;
  }

  try {

    $("refreshBtn").disabled = true;
    $("refreshBtn").textContent =
      "Atualizando...";

    const response =
      await fetch(
        `${SUPABASE_REST}/leads?select=*&order=created_at.desc`,
        {
          headers:
            authHeaders()
        }
      );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      logout();
      return;
    }

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        "Não foi possível carregar os clientes."
      );
    }

    allLeads =
      Array.isArray(data)
        ? data
        : [];

    populateProductFilter();
    applyFilters();
    renderDashboard();

  } catch (error) {
    console.error(error);

    $("emptyState")
      .classList
      .remove("hidden");

    $("emptyState").textContent =
      "Não foi possível carregar os clientes.";

  } finally {
    $("refreshBtn").disabled = false;
    $("refreshBtn").textContent =
      "Atualizar";
  }
}

async function loadPanelData() {
  const tasks = [loadLeads()];

  if (collectionsAccessToken) {
    tasks.push(loadCollections());
  }

  await Promise.all(tasks);
}


/* =========================================================
   FILTROS
========================================================= */

function populateProductFilter() {
  const current =
    $("productFilter").value;

  const products = [
    ...new Set(
      allLeads
        .map(getLeadProduct)
        .filter(
          (product) =>
            product &&
            product !== "-"
        )
    )
  ].sort(
    (a, b) =>
      a.localeCompare(
        b,
        "pt-BR"
      )
  );

  $("productFilter").innerHTML =
    '<option value="">Todos os produtos</option>' +
    products
      .map(
        (product) =>
          `<option value="${escapeHtml(product)}">${escapeHtml(product)}</option>`
      )
      .join("");

  $("productFilter").value =
    current;
}

function applyFilters() {
  const search =
    normalizeText(
      $("searchInput").value
    );

  const product =
    normalizeText(
      $("productFilter").value
    );

  const status =
    $("statusFilter").value;

  const responsible =
    $("responsibleFilter").value;

  filteredLeads =
    allLeads.filter(
      (lead) => {

        const text =
          normalizeText(
            [
              getLeadName(lead),
              getLeadPhone(lead),
              getLeadCity(lead),
              getLeadProduct(lead),
              getLeadResponsible(lead),
              getLeadNotes(lead)
            ].join(" ")
          );

        const matchesSearch =
          !search ||
          text.includes(search);

        const matchesProduct =
          !product ||
          normalizeText(
            getLeadProduct(lead)
          ) === product;

        const matchesStatus =
          !status ||
          getLeadStatus(lead) ===
            status;

        let matchesResponsible = true;

        if (responsible) {

          if (
            responsible ===
            "Não atribuído"
          ) {

            matchesResponsible =
              !lead.responsavel ||
              !String(
                lead.responsavel
              ).trim();

          } else {

            matchesResponsible =
              getLeadResponsible(
                lead
              ) === responsible;
          }
        }

        return (
          matchesSearch &&
          matchesProduct &&
          matchesStatus &&
          matchesResponsible
        );
      }
    );

  renderLeads();
}


/* =========================================================
   RENDER LEADS
========================================================= */

function renderLeads() {
  renderDesktopTable();
  renderMobileCards();

  $("emptyState")
    .classList
    .toggle(
      "hidden",
      filteredLeads.length > 0
    );
}


/* =========================================================
   TABELA DESKTOP
========================================================= */

function renderDesktopTable() {
  $("leadsTableBody").innerHTML =
    filteredLeads
      .map(
        (lead) => `
          <tr>

            <td>
              <strong>
                ${escapeHtml(
                  getLeadName(lead)
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                formatPhone(
                  getLeadPhone(lead)
                )
              )}
            </td>

            <td>
              ${escapeHtml(
                getLeadCity(lead)
              )}
            </td>

            <td>
              ${escapeHtml(
                getLeadProduct(lead)
              )}
            </td>

            <td>
              <strong>
                ${escapeHtml(
                  getLeadResponsible(lead)
                )}
              </strong>
            </td>

            <td>
              <span class="status-badge">
                ${escapeHtml(
                  normalizeStatus(
                    getLeadStatus(lead)
                  )
                )}
              </span>
            </td>

            <td>
              ${escapeHtml(
                fmtDate(
                  getLeadDate(lead)
                )
              )}
            </td>

            <td>

              <button
                class="table-view-btn"
                data-lead-id="${escapeHtml(
                  lead.id
                )}"
                type="button"
              >
                Ver ficha
              </button>

            </td>

          </tr>
        `
      )
      .join("");
}


/* =========================================================
   CARDS MOBILE
========================================================= */

function renderMobileCards() {
  $("mobileLeadsList").innerHTML =
    filteredLeads
      .map(
        (lead) => `
          <article class="mobile-lead-card">

            <div class="mobile-lead-top">

              <div class="mobile-lead-main">

                <span class="mobile-label">
                  CLIENTE
                </span>

                <h3>
                  ${escapeHtml(
                    getLeadName(lead)
                  )}
                </h3>

              </div>

              <span class="mobile-status">
                ${escapeHtml(
                  normalizeStatus(
                    getLeadStatus(lead)
                  )
                )}
              </span>

            </div>

            <div class="mobile-lead-info">

              <div class="mobile-info-item">
                <span>Telefone</span>

                <strong>
                  ${escapeHtml(
                    formatPhone(
                      getLeadPhone(lead)
                    )
                  )}
                </strong>
              </div>

              <div class="mobile-info-item">
                <span>Cidade</span>

                <strong>
                  ${escapeHtml(
                    getLeadCity(lead)
                  )}
                </strong>
              </div>

              <div class="mobile-info-item">
                <span>Produto</span>

                <strong>
                  ${escapeHtml(
                    getLeadProduct(lead)
                  )}
                </strong>
              </div>

              <div class="mobile-info-item">
                <span>Responsável</span>

                <strong>
                  ${escapeHtml(
                    getLeadResponsible(lead)
                  )}
                </strong>
              </div>

              <div class="mobile-info-item">
                <span>Data</span>

                <strong>
                  ${escapeHtml(
                    fmtDate(
                      getLeadDate(lead)
                    )
                  )}
                </strong>
              </div>

            </div>

            <button
              class="mobile-view-btn"
              type="button"
              data-lead-id="${escapeHtml(
                lead.id
              )}"
            >
              Ver ficha
            </button>

          </article>
        `
      )
      .join("");
}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {
  $("metricTotal").textContent =
    allLeads.length;

  const today =
    new Date();

  const todayCount =
    allLeads.filter(
      (lead) => {

        const date =
          new Date(
            getLeadDate(lead)
          );

        if (
          Number.isNaN(
            date.getTime()
          )
        ) {
          return false;
        }

        return (
          date.getDate() ===
            today.getDate() &&
          date.getMonth() ===
            today.getMonth() &&
          date.getFullYear() ===
            today.getFullYear()
        );
      }
    ).length;

  $("metricToday").textContent =
    todayCount;

  $("metricOpen").textContent =
    allLeads.filter(
      (lead) =>
        [
          "novo",
          "dados_coletados",
          "em_atendimento",
          "documentacao",
          "proposta_enviada"
        ].includes(
          getLeadStatus(lead)
        )
    ).length;

  $("metricForwarded").textContent =
    allLeads.filter(
      (lead) =>
        getLeadStatus(lead) ===
        "encaminhado"
    ).length;

  renderRecent();
  renderRanking();
}

function renderRecent() {
  const recent =
    allLeads.slice(0, 6);

  $("recentList").innerHTML =
    recent
      .map(
        (lead) => `
          <button
            class="recent-item"
            type="button"
            data-lead-id="${escapeHtml(
              lead.id
            )}"
          >

            <div>

              <strong>
                ${escapeHtml(
                  getLeadName(lead)
                )}
              </strong>

              <span>
                ${escapeHtml(
                  getLeadProduct(lead)
                )}
                ·
                ${escapeHtml(
                  getLeadResponsible(lead)
                )}
              </span>

            </div>

            <small>
              ${escapeHtml(
                fmtDate(
                  getLeadDate(lead)
                )
              )}
            </small>

          </button>
        `
      )
      .join("") ||
    '<div class="empty">Nenhum lead recebido.</div>';
}

function renderRanking() {
  const counts = {};

  allLeads.forEach(
    (lead) => {

      const product =
        getLeadProduct(lead);

      if (
        !product ||
        product === "-"
      ) {
        return;
      }

      counts[product] =
        (
          counts[product] ||
          0
        ) + 1;
    }
  );

  $("productsRanking").innerHTML =
    Object.entries(counts)
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
      .slice(0, 8)
      .map(
        ([product, total]) => `
          <div class="ranking-item">

            <span>
              ${escapeHtml(product)}
            </span>

            <strong>
              ${total}
            </strong>

          </div>
        `
      )
      .join("") ||
    '<div class="empty">Nenhum produto registrado.</div>';
}


/* =========================================================
   ABRIR FICHA
========================================================= */

function findLeadById(id) {
  return allLeads.find(
    (lead) =>
      String(lead.id) ===
      String(id)
  );
}

function openLead(id) {
  const lead =
    findLeadById(id);

  if (!lead) {
    return;
  }

  currentLeadId =
    lead.id;

  $("detailName").textContent =
    getLeadName(lead);

  $("editName").value =
    getLeadName(lead);

  $("editPhone").value =
    getLeadPhone(lead);

  $("editCity").value =
    getLeadCity(lead);

  $("editProduct").value =
    getLeadProduct(lead);

  $("editStatus").value =
    getLeadStatus(lead);

  $("editResponsible").value =
    lead.responsavel || "";

  $("detailOrigin").textContent =
    getLeadOrigin(lead);

  $("detailDate").textContent =
    fmtDate(
      getLeadDate(lead)
    );

  $("leadNotes").value =
    getLeadNotes(lead);

  configureWhatsApp(lead);

  $("dialogMessage").textContent =
    "";

  $("leadDialog")
    .showModal();
}


/* =========================================================
   WHATSAPP
========================================================= */

function configureWhatsApp(lead) {
  const phone =
    whatsappNumber(
      getLeadPhone(lead)
    );

  const button =
    $("whatsappLink");

  if (!phone) {
    button.href = "#";

    button.onclick =
      (event) => {
        event.preventDefault();

        alert(
          "Telefone inválido."
        );
      };

    return;
  }

  const message =
    `Olá, ${getLeadName(lead)}! Aqui é da Crediti. Recebemos seu atendimento sobre ${getLeadProduct(lead)}.`;

  button.href = "#";

  button.removeAttribute("target");

  button.onclick =
    (event) => {

      event.preventDefault();

      const encodedPhone =
        encodeURIComponent(phone);

      const encodedMessage =
        encodeURIComponent(message);

      if (isMobileDevice()) {

        const appUrl =
          `whatsapp://send?phone=${encodedPhone}&text=${encodedMessage}`;

        const fallbackUrl =
          `https://wa.me/${encodedPhone}?text=${encodedMessage}`;

        window.location.href =
          appUrl;

        setTimeout(() => {

          if (
            document.visibilityState ===
            "visible"
          ) {
            window.location.href =
              fallbackUrl;
          }

        }, 1200);

      } else {

        const webUrl =
          `https://web.whatsapp.com/send?phone=${encodedPhone}&text=${encodedMessage}`;

        window.open(
          webUrl,
          "_blank",
          "noopener,noreferrer"
        );
      }
    };
}


/* =========================================================
   ATUALIZAR LEAD
========================================================= */

async function updateLead(
  id,
  payload
) {
  const response =
    await fetch(
      `${SUPABASE_REST}/leads?id=eq.${encodeURIComponent(
        id
      )}`,
      {
        method: "PATCH",

        headers:
          authHeaders({
            "Content-Type":
              "application/json",

            Prefer:
              "return=representation"
          }),

        body:
          JSON.stringify(payload)
      }
    );

  const data =
    await response.json();

  if (!response.ok) {
    console.error(
      "Update:",
      data
    );

    throw new Error(
      "Não foi possível salvar."
    );
  }

  return data;
}

async function saveCurrentLead() {
  if (
    currentLeadId === null
  ) {
    return;
  }

  const nome =
    $("editName").value.trim();

  if (!nome) {
    alert(
      "O nome do cliente não pode ficar vazio."
    );
    return;
  }

  $("saveLeadBtn").disabled =
    true;

  $("saveLeadBtn").textContent =
    "Salvando...";

  try {

    await updateLead(
      currentLeadId,
      {
        nome,

        telefone:
          $("editPhone")
            .value
            .trim(),

        cidade:
          $("editCity")
            .value
            .trim(),

        produto_interesse:
          $("editProduct")
            .value
            .trim(),

        responsavel:
          $("editResponsible")
            .value,

        status:
          $("editStatus")
            .value,

        observacao:
          $("leadNotes")
            .value
            .trim()
      }
    );

    $("dialogMessage").textContent =
      "Alterações salvas com sucesso.";

    await loadLeads();

  } catch (error) {
    console.error(error);

    $("dialogMessage").textContent =
      error.message;

  } finally {
    $("saveLeadBtn").disabled =
      false;

    $("saveLeadBtn").textContent =
      "Salvar alterações";
  }
}


/* =========================================================
   OBSERVAÇÃO
========================================================= */

async function saveNotes() {
  if (
    currentLeadId === null
  ) {
    return;
  }

  $("saveNotesBtn").disabled =
    true;

  $("saveNotesBtn").textContent =
    "Salvando...";

  try {

    await updateLead(
      currentLeadId,
      {
        observacao:
          $("leadNotes")
            .value
            .trim()
      }
    );

    $("dialogMessage").textContent =
      "Observação salva.";

    await loadLeads();

  } catch (error) {
    console.error(error);

    $("dialogMessage").textContent =
      error.message;

  } finally {
    $("saveNotesBtn").disabled =
      false;

    $("saveNotesBtn").textContent =
      "Salvar observação";
  }
}


/* =========================================================
   APAGAR LEAD
========================================================= */

async function deleteCurrentLead() {
  const lead =
    findLeadById(
      currentLeadId
    );

  if (!lead) {
    return;
  }

  const confirmed =
    window.confirm(
      `Deseja realmente apagar o lead de ${getLeadName(lead)}?`
    );

  if (!confirmed) {
    return;
  }

  $("deleteLeadBtn").disabled =
    true;

  try {

    const response =
      await fetch(
        `${SUPABASE_REST}/leads?id=eq.${encodeURIComponent(
          currentLeadId
        )}`,
        {
          method: "DELETE",

          headers:
            authHeaders()
        }
      );

    if (!response.ok) {
      throw new Error(
        "Não foi possível apagar o lead."
      );
    }

    $("leadDialog").close();

    currentLeadId = null;

    await loadLeads();

  } catch (error) {
    console.error(error);

    alert(
      error.message
    );

  } finally {
    $("deleteLeadBtn").disabled =
      false;
  }
}


/* =========================================================
   COBRANÇAS
========================================================= */

function lockCollections() {
  collectionsAccessToken = "";

  sessionStorage.removeItem(
    "crediti_collections_access_token"
  );

  allCollections = [];
  filteredCollections = [];
  currentCollectionId = null;
}

function requestCollectionsAccess() {
  $("collectionLoginPassword").value = "";
  $("collectionLoginError").textContent = "";
  $("collectionLoginDialog").showModal();

  setTimeout(
    () => $("collectionLoginPassword").focus(),
    100
  );
}

async function loginCollections() {
  const email =
    $("collectionLoginEmail").value.trim();

  const password =
    $("collectionLoginPassword").value;

  $("collectionLoginError").textContent = "";

  if (!password) {
    $("collectionLoginError").textContent =
      "Digite a senha exclusiva.";
    return;
  }

  $("collectionLoginBtn").disabled = true;
  $("collectionLoginBtn").textContent = "ENTRANDO...";

  try {
    const response = await fetch(
      `${COLLECTIONS_SUPABASE_AUTH}/token?grant_type=password`,
      {
        method: "POST",
        headers: collectionPublicHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          email,
          password
        })
      }
    );

    const data = await response.json();

    if (!response.ok || !data.access_token) {
      throw new Error("Senha exclusiva incorreta.");
    }

    collectionsAccessToken = data.access_token;

    sessionStorage.setItem(
      "crediti_collections_access_token",
      collectionsAccessToken
    );

    $("collectionLoginPassword").value = "";
    $("collectionLoginDialog").close();

    showView("cobrancas");
    await loadCollections();

  } catch (error) {
    console.error(error);
    $("collectionLoginError").textContent = error.message;
  } finally {
    $("collectionLoginBtn").disabled = false;
    $("collectionLoginBtn").textContent =
      "ENTRAR EM COBRANÇAS";
  }
}

async function loadCollections() {
  if (!accessToken) {
    return;
  }

  try {
    const response = await fetch(
      `${COLLECTIONS_SUPABASE_REST}/cobrancas?select=*&order=created_at.desc`,
      {
        headers: collectionAuthHeaders()
      }
    );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      lockCollections();
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        "A área de cobranças ainda precisa ser ativada no Supabase."
      );
    }

    allCollections = Array.isArray(data)
      ? data
      : [];

    applyCollectionFilters();
    renderCollectionSummary();

  } catch (error) {
    console.error(error);

    allCollections = [];
    filteredCollections = [];
    renderCollections();

    $("collectionsEmptyState")
      .classList
      .remove("hidden");

    $("collectionsEmptyState").textContent =
      error.message;
  }
}

function applyCollectionFilters() {
  const search = normalizeText(
    $("collectionSearchInput").value
  );

  const status =
    $("collectionStatusFilter").value;

  filteredCollections = allCollections.filter(
    (collection) => {
      const text = normalizeText(
        [
          collection.nome,
          collection.telefone,
          collection.contrato,
          collection.produto,
          collection.observacao
        ].join(" ")
      );

      return (
        (!search || text.includes(search)) &&
        (!status || collection.status === status)
      );
    }
  );

  renderCollections();
}

function renderCollectionSummary() {
  const active = allCollections.filter(
    (collection) =>
      !["paga", "suspensa"].includes(
        collection.status
      )
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = active.filter(
    (collection) => {
      if (!collection.vencimento) {
        return false;
      }

      const dueDate = new Date(
        `${collection.vencimento}T00:00:00`
      );

      return dueDate < today;
    }
  );

  const openValue = active.reduce(
    (total, collection) =>
      total + Number(collection.valor || 0),
    0
  );

  $("collectionOpenValue").textContent =
    fmtCurrency(openValue);

  $("collectionActiveCount").textContent =
    active.length;

  $("collectionOverdueCount").textContent =
    overdue.length;

  $("collectionPaidCount").textContent =
    allCollections.filter(
      (collection) => collection.status === "paga"
    ).length;
}

function renderCollections() {
  $("collectionsTableBody").innerHTML =
    filteredCollections
      .map(
        (collection) => `
          <tr>
            <td><strong>${escapeHtml(collection.nome || "Cliente")}</strong></td>
            <td>${escapeHtml(formatPhone(collection.telefone || ""))}</td>
            <td>${escapeHtml(collection.contrato || "-")}</td>
            <td><strong>${escapeHtml(fmtCurrency(collection.valor))}</strong></td>
            <td>${escapeHtml(fmtDateOnly(collection.vencimento))}</td>
            <td>
              <span class="status-badge collection-status-${escapeHtml(collection.status || "pendente")}">
                ${escapeHtml(normalizeCollectionStatus(collection.status))}
              </span>
            </td>
            <td>
              <button
                class="table-view-btn"
                data-collection-id="${escapeHtml(collection.id)}"
                type="button"
              >
                Ver cobrança
              </button>
            </td>
          </tr>
        `
      )
      .join("");

  $("mobileCollectionsList").innerHTML =
    filteredCollections
      .map(
        (collection) => `
          <article class="mobile-lead-card">
            <div class="mobile-lead-top">
              <div class="mobile-lead-main">
                <span class="mobile-label">CLIENTE</span>
                <h3>${escapeHtml(collection.nome || "Cliente")}</h3>
              </div>
              <span class="mobile-status collection-status-${escapeHtml(collection.status || "pendente")}">
                ${escapeHtml(normalizeCollectionStatus(collection.status))}
              </span>
            </div>

            <div class="mobile-lead-info">
              <div class="mobile-info-item">
                <span>Valor</span>
                <strong>${escapeHtml(fmtCurrency(collection.valor))}</strong>
              </div>
              <div class="mobile-info-item">
                <span>Vencimento</span>
                <strong>${escapeHtml(fmtDateOnly(collection.vencimento))}</strong>
              </div>
              <div class="mobile-info-item">
                <span>WhatsApp</span>
                <strong>${escapeHtml(formatPhone(collection.telefone || ""))}</strong>
              </div>
              <div class="mobile-info-item">
                <span>Contrato</span>
                <strong>${escapeHtml(collection.contrato || "-")}</strong>
              </div>
            </div>

            <button
              class="mobile-view-btn"
              type="button"
              data-collection-id="${escapeHtml(collection.id)}"
            >
              Ver cobrança
            </button>
          </article>
        `
      )
      .join("");

  $("collectionsEmptyState")
    .classList
    .toggle(
      "hidden",
      filteredCollections.length > 0
    );

  if (!filteredCollections.length) {
    $("collectionsEmptyState").textContent =
      "Nenhuma cobrança encontrada.";
  }
}

function clearCollectionForm() {
  currentCollectionId = null;

  $("collectionName").value = "";
  $("collectionPhone").value = "";
  $("collectionContract").value = "";
  $("collectionProduct").value = "";
  $("collectionValue").value = "";
  $("collectionDueDate").value = "";
  $("collectionStatus").value = "pendente";
  $("collectionNextReminder").value = "";
  $("collectionNotes").value = "";
  $("collectionDialogMessage").textContent = "";
  $("collectionDialogTitle").textContent = "Nova cobrança";

  $("sendCollectionBtn").disabled = true;

  $("deleteCollectionBtn")
    .classList
    .add("hidden");

  $("collectionHistorySection")
    .classList
    .add("hidden");
}

function openNewCollection() {
  clearCollectionForm();
  $("collectionDialog").showModal();
}

function findCollectionById(id) {
  return allCollections.find(
    (collection) =>
      String(collection.id) === String(id)
  );
}

async function openCollection(id) {
  const collection = findCollectionById(id);

  if (!collection) return;

  currentCollectionId = collection.id;

  $("collectionDialogTitle").textContent =
    collection.nome || "Cobrança";

  $("collectionName").value = collection.nome || "";
  $("collectionPhone").value = collection.telefone || "";
  $("collectionContract").value = collection.contrato || "";
  $("collectionProduct").value = collection.produto || "";
  $("collectionValue").value = Number(collection.valor || 0)
    .toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  $("collectionDueDate").value = collection.vencimento || "";
  $("collectionStatus").value = collection.status || "pendente";
  $("collectionNextReminder").value =
    toLocalDateTimeInput(collection.proximo_lembrete);
  $("collectionNotes").value = collection.observacao || "";
  $("collectionDialogMessage").textContent = "";

  $("sendCollectionBtn").disabled = false;

  $("deleteCollectionBtn")
    .classList
    .remove("hidden");

  $("collectionHistorySection")
    .classList
    .remove("hidden");

  $("collectionDialog").showModal();

  await loadCollectionHistory(collection.id);
}

function getCollectionPayload() {
  const nome = $("collectionName").value.trim();
  const telefone = $("collectionPhone").value.trim();
  const valor = parseCurrency(
    $("collectionValue").value
  );

  if (!nome) {
    throw new Error("Digite o nome do cliente.");
  }

  if (!whatsappNumber(telefone)) {
    throw new Error("Digite um WhatsApp válido com DDD.");
  }

  if (valor <= 0) {
    throw new Error("Digite um valor maior que zero.");
  }

  if (!$("collectionDueDate").value) {
    throw new Error("Informe a data de vencimento.");
  }

  const nextReminder =
    $("collectionNextReminder").value;

  return {
    nome,
    telefone,
    contrato: $("collectionContract").value.trim(),
    produto: $("collectionProduct").value.trim(),
    valor,
    vencimento: $("collectionDueDate").value,
    status: $("collectionStatus").value,
    proximo_lembrete: nextReminder
      ? new Date(nextReminder).toISOString()
      : null,
    observacao: $("collectionNotes").value.trim(),
    updated_at: new Date().toISOString()
  };
}

async function saveCollection() {
  $("collectionDialogMessage").textContent = "";

  let payload;

  try {
    payload = getCollectionPayload();
  } catch (error) {
    $("collectionDialogMessage").textContent = error.message;
    return;
  }

  $("saveCollectionBtn").disabled = true;
  $("saveCollectionBtn").textContent = "Salvando...";

  try {
    const isEditing = currentCollectionId !== null;
    const url = isEditing
      ? `${COLLECTIONS_SUPABASE_REST}/cobrancas?id=eq.${encodeURIComponent(currentCollectionId)}`
      : `${COLLECTIONS_SUPABASE_REST}/cobrancas`;

    const response = await fetch(
      url,
      {
        method: isEditing ? "PATCH" : "POST",
        headers: collectionAuthHeaders({
          "Content-Type": "application/json",
          Prefer: "return=representation"
        }),
        body: JSON.stringify(payload)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Cobrança:", data);
      throw new Error("Não foi possível salvar a cobrança.");
    }

    if (!isEditing && data[0]) {
      currentCollectionId = data[0].id;
    }

    $("collectionDialogMessage").textContent =
      "Cobrança salva com sucesso.";

    await loadCollections();

    if (currentCollectionId) {
      $("sendCollectionBtn").disabled = false;

      $("deleteCollectionBtn")
        .classList
        .remove("hidden");

      $("collectionHistorySection")
        .classList
        .remove("hidden");

      await loadCollectionHistory(currentCollectionId);
    }

  } catch (error) {
    console.error(error);
    $("collectionDialogMessage").textContent = error.message;
  } finally {
    $("saveCollectionBtn").disabled = false;
    $("saveCollectionBtn").textContent = "Salvar cobrança";
  }
}

async function deleteCollection() {
  const collection = findCollectionById(currentCollectionId);

  if (!collection) return;

  const confirmed = window.confirm(
    `Deseja realmente apagar a cobrança de ${collection.nome}?`
  );

  if (!confirmed) return;

  $("deleteCollectionBtn").disabled = true;

  try {
    const response = await fetch(
      `${COLLECTIONS_SUPABASE_REST}/cobrancas?id=eq.${encodeURIComponent(currentCollectionId)}`,
      {
        method: "DELETE",
        headers: collectionAuthHeaders()
      }
    );

    if (!response.ok) {
      throw new Error("Não foi possível apagar a cobrança.");
    }

    $("collectionDialog").close();
    currentCollectionId = null;
    await loadCollections();

  } catch (error) {
    alert(error.message);
  } finally {
    $("deleteCollectionBtn").disabled = false;
  }
}

async function loadCollectionHistory(collectionId) {
  $("collectionHistoryList").innerHTML =
    '<div class="empty">Carregando histórico...</div>';

  try {
    const response = await fetch(
      `${COLLECTIONS_SUPABASE_REST}/cobranca_eventos?select=*&cobranca_id=eq.${encodeURIComponent(collectionId)}&order=created_at.desc`,
      {
        headers: collectionAuthHeaders()
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error("Não foi possível carregar o histórico.");
    }

    $("collectionHistoryList").innerHTML =
      data
        .map(
          (event) => `
            <article class="history-item">
              <div>
                <strong>${escapeHtml(event.descricao)}</strong>
                <span>${escapeHtml(event.tipo || "contato")}</span>
              </div>
              <small>${escapeHtml(fmtDate(event.created_at))}</small>
            </article>
          `
        )
        .join("") ||
      '<div class="empty">Nenhum contato registrado.</div>';

  } catch (error) {
    $("collectionHistoryList").innerHTML =
      `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
}

async function addCollectionHistory() {
  if (!currentCollectionId) return;

  const description = window.prompt(
    "O que aconteceu neste contato?"
  );

  if (!description || !description.trim()) return;

  try {
    const response = await fetch(
      `${COLLECTIONS_SUPABASE_REST}/cobranca_eventos`,
      {
        method: "POST",
        headers: collectionAuthHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          cobranca_id: currentCollectionId,
          tipo: "contato_manual",
          descricao: description.trim()
        })
      }
    );

    if (!response.ok) {
      throw new Error("Não foi possível registrar o contato.");
    }

    await loadCollectionHistory(currentCollectionId);

  } catch (error) {
    alert(error.message);
  }
}

async function registerPreparedMessage(collectionId) {
  try {
    await fetch(
      `${COLLECTIONS_SUPABASE_REST}/cobranca_eventos`,
      {
        method: "POST",
        headers: collectionAuthHeaders({
          "Content-Type": "application/json"
        }),
        body: JSON.stringify({
          cobranca_id: collectionId,
          tipo: "whatsapp_aberto",
          descricao:
            "Cobrança aberta no WhatsApp Business para envio manual."
        })
      }
    );
  } catch (error) {
    console.error(error);
  }
}

function sendCollectionWithWhatsApp() {
  const collection =
    findCollectionById(currentCollectionId);

  if (!collection) {
    alert("Salve a cobrança antes de enviar.");
    return;
  }

  const phone = whatsappNumber(collection.telefone);

  if (!phone) {
    alert("O WhatsApp do cliente é inválido.");
    return;
  }

  const message =
    `Olá, ${collection.nome}! Este é um lembrete da Crediti sobre o pagamento no valor de ${fmtCurrency(collection.valor)}, com vencimento em ${fmtDateOnly(collection.vencimento)}. Se você já realizou o pagamento, desconsidere esta mensagem. Para negociar ou tirar dúvidas, responda por aqui. Crediti, crédito com responsabilidade.`;

  const encodedPhone = encodeURIComponent(phone);
  const encodedMessage = encodeURIComponent(message);

  registerPreparedMessage(collection.id);

  if (isMobileDevice()) {
    const businessUrl =
      `whatsapp-business://send?phone=${encodedPhone}&text=${encodedMessage}`;

    const fallbackUrl =
      `https://wa.me/${encodedPhone}?text=${encodedMessage}`;

    window.location.href = businessUrl;

    setTimeout(() => {
      if (document.visibilityState === "visible") {
        window.location.href = fallbackUrl;
      }
    }, 1200);

  } else {
    const webUrl =
      `https://web.whatsapp.com/send?phone=${encodedPhone}&text=${encodedMessage}`;

    window.open(
      webUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }
}


/* =========================================================
   NAVEGAÇÃO
========================================================= */

function showView(view) {
  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach(
      (button) => {

        button.classList.toggle(
          "active",
          button.dataset.view === view
        );
      }
    );

  document
    .querySelectorAll(
      ".view"
    )
    .forEach(
      (item) =>
        item.classList.remove(
          "active"
        )
    );

  $(`${view}View`)
    .classList
    .add("active");

  const titles = {
    dashboard: "Dashboard",
    leads: "Clientes / Leads",
    cobrancas: "Cobranças"
  };

  $("pageTitle").textContent =
    titles[view] || "Painel";
}

function changeView(view) {
  if (
    view === "cobrancas" &&
    !collectionsAccessToken
  ) {
    requestCollectionsAccess();
    return;
  }

  showView(view);

  if (view === "cobrancas") {
    loadCollections();
  }
}


/* =========================================================
   EVENTOS
========================================================= */

document.addEventListener(
  "click",
  (event) => {

    const leadButton =
      event.target.closest(
        "[data-lead-id]"
      );

    if (
      leadButton &&
      leadButton.dataset.leadId
    ) {
      openLead(
        leadButton.dataset.leadId
      );
    }

    const collectionButton =
      event.target.closest(
        "[data-collection-id]"
      );

    if (
      collectionButton &&
      collectionButton.dataset.collectionId
    ) {
      openCollection(
        collectionButton.dataset.collectionId
      );
    }
  }
);

document
  .querySelectorAll(
    ".nav-item"
  )
  .forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          changeView(
            button.dataset.view
          );
        }
      );
    }
  );

$("loginBtn")
  .addEventListener(
    "click",
    () => {

      if (recoveryMode) {
        updateRecoveredPassword();
      } else {
        login();
      }
    }
  );

$("passwordInput")
  .addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Enter"
      ) {

        if (recoveryMode) {
          updateRecoveredPassword();
        } else {
          login();
        }
      }
    }
  );

$("forgotPasswordBtn")
  .addEventListener(
    "click",
    forgotPassword
  );

$("logoutBtn")
  .addEventListener(
    "click",
    logout
  );

$("refreshBtn")
  .addEventListener(
    "click",
    loadPanelData
  );

$("searchInput")
  .addEventListener(
    "input",
    applyFilters
  );

$("productFilter")
  .addEventListener(
    "change",
    applyFilters
  );

$("statusFilter")
  .addEventListener(
    "change",
    applyFilters
  );

$("responsibleFilter")
  .addEventListener(
    "change",
    applyFilters
  );

$("collectionSearchInput")
  .addEventListener(
    "input",
    applyCollectionFilters
  );

$("collectionStatusFilter")
  .addEventListener(
    "change",
    applyCollectionFilters
  );

$("newCollectionBtn")
  .addEventListener(
    "click",
    openNewCollection
  );

$("closeCollectionDialog")
  .addEventListener(
    "click",
    () => {
      $("collectionDialog").close();
    }
  );

$("saveCollectionBtn")
  .addEventListener(
    "click",
    saveCollection
  );

$("deleteCollectionBtn")
  .addEventListener(
    "click",
    deleteCollection
  );

$("addCollectionHistoryBtn")
  .addEventListener(
    "click",
    addCollectionHistory
  );

$("sendCollectionBtn")
  .addEventListener(
    "click",
    sendCollectionWithWhatsApp
  );

$("collectionLoginBtn")
  .addEventListener(
    "click",
    loginCollections
  );

$("collectionLoginPassword")
  .addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        loginCollections();
      }
    }
  );

$("closeCollectionLoginDialog")
  .addEventListener(
    "click",
    () => {
      $("collectionLoginDialog").close();
    }
  );

$("collectionLoginDialog")
  .addEventListener(
    "click",
    (event) => {
      if (
        event.target ===
        $("collectionLoginDialog")
      ) {
        $("collectionLoginDialog").close();
      }
    }
  );

$("collectionDialog")
  .addEventListener(
    "click",
    (event) => {
      if (event.target === $("collectionDialog")) {
        $("collectionDialog").close();
      }
    }
  );

$("closeDialog")
  .addEventListener(
    "click",
    () => {
      $("leadDialog").close();
    }
  );

$("saveLeadBtn")
  .addEventListener(
    "click",
    saveCurrentLead
  );

$("saveNotesBtn")
  .addEventListener(
    "click",
    saveNotes
  );

$("deleteLeadBtn")
  .addEventListener(
    "click",
    deleteCurrentLead
  );

$("leadDialog")
  .addEventListener(
    "click",
    (event) => {

      if (
        event.target ===
        $("leadDialog")
      ) {
        $("leadDialog").close();
      }
    }
  );


/* =========================================================
   INICIAR
========================================================= */

const openedFromRecovery =
  checkRecoveryLink();

if (openedFromRecovery) {

  showLogin();

} else if (accessToken) {

  showApp();
  loadPanelData();

} else {

  showLogin();
}

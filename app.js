const SUPABASE_BASE =
  "https://vgdtywdpywezrwlrsawq.supabase.co";

const SUPABASE_REST =
  `${SUPABASE_BASE}/rest/v1`;

const SUPABASE_AUTH =
  `${SUPABASE_BASE}/auth/v1`;

const SUPABASE_KEY =
  "sb_publishable_dmoTPKmglghAohv0MrRA9A_2zlUYhER";

const PANEL_URL =
  "https://marcelocrediti.github.io/crediti-painel/";

let allLeads = [];
let filteredLeads = [];
let currentLeadId = null;

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

function normalizeResponsible(value) {
  if (!value || !String(value).trim()) {
    return "Não atribuído";
  }

  return String(value).trim();
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
  return normalizeResponsible(
    lead.responsavel
  );
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
    String(value)
      .replace(/\D/g, "");

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
    String(value)
      .replace(/\D/g, "");

  if (!digits) {
    return "";
  }

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
    $("emailInput")
      .value
      .trim();

  const password =
    $("passwordInput")
      .value;

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

    await loadLeads();

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
   ESQUECI MINHA SENHA
========================================================= */

async function forgotPassword() {
  clearLoginMessages();

  const email =
    $("emailInput")
      .value
      .trim();

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

/* =========================================================
   RECUPERAÇÃO
========================================================= */

function checkRecoveryLink() {
  const hash =
    window.location.hash
      .replace(/^#/, "");

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

/* =========================================================
   FILTRO DE PRODUTOS
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

/* =========================================================
   FILTRAR LEADS
========================================================= */

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

        let matchesResponsible =
          true;

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
   RENDERIZAR LEADS
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
   DESKTOP
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
                  getLeadResponsible(
                    lead
                  )
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
   MOBILE
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

                <span>
                  Telefone
                </span>

                <strong>
                  ${escapeHtml(
                    formatPhone(
                      getLeadPhone(lead)
                    )
                  )}
                </strong>

              </div>

              <div class="mobile-info-item">

                <span>
                  Cidade
                </span>

                <strong>
                  ${escapeHtml(
                    getLeadCity(lead)
                  )}
                </strong>

              </div>

              <div class="mobile-info-item">

                <span>
                  Produto
                </span>

                <strong>
                  ${escapeHtml(
                    getLeadProduct(lead)
                  )}
                </strong>

              </div>

              <div class="mobile-info-item">

                <span>
                  Responsável
                </span>

                <strong>
                  ${escapeHtml(
                    getLeadResponsible(
                      lead
                    )
                  )}
                </strong>

              </div>

              <div class="mobile-info-item">

                <span>
                  Data
                </span>

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
                  getLeadResponsible(
                    lead
                  )
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
              ${escapeHtml(
                product
              )}
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

  configureWhatsApp(
    lead
  );

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

  button.href =
    `https://wa.me/${phone}?text=${encodeURIComponent(
      message
    )}`;

  button.target =
    "_blank";

  button.rel =
    "noopener noreferrer";

  button.onclick = null;
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
          JSON.stringify(
            payload
          )
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
    $("editName")
      .value
      .trim();

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

    await loadLeads();

    $("dialogMessage").textContent =
      "Alterações salvas com sucesso.";

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
   SALVAR OBSERVAÇÃO
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
   NAVEGAÇÃO
========================================================= */

function changeView(view) {
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

  $("pageTitle").textContent =
    view === "dashboard"
      ? "Dashboard"
      : "Clientes / Leads";
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
    loadLeads
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
  loadLeads();

} else {
  showLogin();
}

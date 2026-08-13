const SUPABASE_BASE = "https://vgdtywdpywezrwlrsawq.supabase.co";
const SUPABASE_URL = `${SUPABASE_BASE}/rest/v1`;
const SUPABASE_AUTH_URL = `${SUPABASE_BASE}/auth/v1`;

const SUPABASE_KEY =
  "sb_publishable_dmoTPKmglghAohv0MrRA9A_2zlUYhER";

const ADMIN_EMAIL =
  "info@creditisolucoes.com.br";

let allLeads = [];
let currentLeadId = null;
let accessToken =
  sessionStorage.getItem("crediti_access_token") || "";

const $ = (id) =>
  document.getElementById(id);

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

  return map[status] || status || "Novo";
}

function authHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${accessToken}`,
    ...extra
  };
}

/* =========================
   LOGIN
========================= */

function showLogin() {
  $("loginScreen").classList.remove("hidden");
  $("appShell").classList.add("hidden");

  setTimeout(() => {
    $("pinInput")?.focus();
  }, 50);
}

function showApp() {
  $("loginScreen").classList.add("hidden");
  $("appShell").classList.remove("hidden");
}

async function loginWithPin() {
  const pin =
    $("pinInput").value.trim();

  $("loginError").textContent = "";

  if (!/^\d{6,12}$/.test(pin)) {
    $("loginError").textContent =
      "Digite sua senha numérica.";
    return;
  }

  $("loginBtn").disabled = true;
  $("loginBtn").textContent =
    "Entrando...";

  try {
    const response = await fetch(
      `${SUPABASE_AUTH_URL}/token?grant_type=password`,
      {
        method: "POST",

        headers: {
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          email: ADMIN_EMAIL,
          password: pin
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
        "Senha incorreta."
      );
    }

    accessToken =
      data.access_token;

    sessionStorage.setItem(
      "crediti_access_token",
      accessToken
    );

    $("pinInput").value = "";

    showApp();

    await loadLeads();
  } catch (error) {
    console.error(error);

    $("loginError").textContent =
      "Senha incorreta.";
  } finally {
    $("loginBtn").disabled = false;
    $("loginBtn").textContent =
      "ENTRAR";
  }
}

function logout() {
  accessToken = "";

  sessionStorage.removeItem(
    "crediti_access_token"
  );

  allLeads = [];

  showLogin();
}

/* =========================
   CARREGAR LEADS
========================= */

async function loadLeads() {
  if (!accessToken) {
    showLogin();
    return;
  }

  const response = await fetch(
    `${SUPABASE_URL}/leads?select=*&order=created_at.desc`,
    {
      headers: authHeaders()
    }
  );

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    logout();
    throw new Error(
      "Sessão expirada."
    );
  }

  if (!response.ok) {
    throw new Error(
      await response.text()
    );
  }

  allLeads =
    await response.json();

  renderDashboard();
  fillProductFilter();
  renderLeads();
}

/* =========================
   DASHBOARD
========================= */

function renderDashboard() {
  $("metricTotal").textContent =
    allLeads.length;

  const today = new Date();

  const sameDay = (value) => {
    const date =
      new Date(value);

    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  $("metricToday").textContent =
    allLeads.filter(
      (lead) =>
        sameDay(lead.created_at)
    ).length;

  $("metricOpen").textContent =
    allLeads.filter((lead) =>
      [
        "novo",
        "dados_coletados",
        "em_atendimento",
        "documentacao",
        "proposta_enviada"
      ].includes(
        lead.status || "novo"
      )
    ).length;

  $("metricForwarded").textContent =
    allLeads.filter(
      (lead) =>
        lead.status ===
        "encaminhado"
    ).length;

  const recent =
    allLeads.slice(0, 6);

  $("recentList").innerHTML =
    recent
      .map(
        (lead) => `
          <div class="recent-item">
            <div>
              <strong>
                ${escapeHtml(
                  lead.nome ||
                    "Sem nome"
                )}
              </strong>

              <small>
                ${escapeHtml(
                  lead.cidade || "-"
                )}
                ·
                ${escapeHtml(
                  lead.produto_interesse ||
                    "Sem produto"
                )}
              </small>
            </div>

            <small>
              ${fmtDate(
                lead.created_at
              )}
            </small>
          </div>
        `
      )
      .join("") ||
    '<div class="empty">Nenhum lead ainda.</div>';

  const counts = {};

  allLeads.forEach((lead) => {
    const product =
      lead.produto_interesse ||
      "Não informado";

    counts[product] =
      (counts[product] || 0) +
      1;
  });

  $("productsRanking").innerHTML =
    Object.entries(counts)
      .sort(
        (a, b) =>
          b[1] - a[1]
      )
      .slice(0, 6)
      .map(
        ([product, count]) => `
          <div class="rank-item">
            <div>
              <strong>
                ${escapeHtml(
                  product
                )}
              </strong>

              <small>
                interesses registrados
              </small>
            </div>

            <strong>
              ${count}
            </strong>
          </div>
        `
      )
      .join("") ||
    '<div class="empty">Sem dados.</div>';
}

/* =========================
   FILTROS
========================= */

function fillProductFilter() {
  const current =
    $("productFilter").value;

  const products = [
    ...new Set(
      allLeads
        .map(
          (lead) =>
            lead.produto_interesse
        )
        .filter(Boolean)
    )
  ].sort();

  $("productFilter").innerHTML =
    '<option value="">Todos os produtos</option>' +
    products
      .map(
        (product) => `
          <option
            value="${escapeAttr(
              product
            )}"
          >
            ${escapeHtml(
              product
            )}
          </option>
        `
      )
      .join("");

  $("productFilter").value =
    current;
}

/* =========================
   LISTA DE LEADS
========================= */

function renderLeads() {
  const search =
    $("searchInput")
      .value
      .trim()
      .toLowerCase();

  const product =
    $("productFilter").value;

  const status =
    $("statusFilter").value;

  const filtered =
    allLeads.filter(
      (lead) => {
        const haystack =
          `
            ${lead.nome || ""}
            ${lead.telefone || ""}
            ${lead.cidade || ""}
            ${lead.produto_interesse || ""}
            ${lead.observacao || ""}
          `.toLowerCase();

        return (
          (
            !search ||
            haystack.includes(
              search
            )
          ) &&
          (
            !product ||
            lead.produto_interesse ===
              product
          ) &&
          (
            !status ||
            lead.status ===
              status
          )
        );
      }
    );

  $("leadsTableBody").innerHTML =
    filtered
      .map(
        (lead) => `
          <tr>
            <td>
              <strong>
                ${escapeHtml(
                  lead.nome ||
                    "Sem nome"
                )}
              </strong>
            </td>

            <td>
              ${escapeHtml(
                lead.telefone || "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                lead.cidade || "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                lead.produto_interesse ||
                  "-"
              )}
            </td>

            <td>
              <span
                class="status-pill"
              >
                ${escapeHtml(
                  normalizeStatus(
                    lead.status
                  )
                )}
              </span>
            </td>

            <td>
              ${fmtDate(
                lead.created_at
              )}
            </td>

            <td>
              <button
                class="view-btn"
                data-id="${lead.id}"
              >
                Ver ficha
              </button>
            </td>
          </tr>
        `
      )
      .join("");

  $("emptyState")
    .classList
    .toggle(
      "hidden",
      filtered.length > 0
    );

  document
    .querySelectorAll(
      ".view-btn"
    )
    .forEach(
      (button) => {
        button.addEventListener(
          "click",
          () => {
            openLead(
              button.dataset.id
            );
          }
        );
      }
    );
}

function findLeadById(id) {
  return allLeads.find(
    (lead) =>
      String(lead.id) ===
      String(id)
  );
}

/* =========================
   FICHA
========================= */

function openLead(id) {
  const lead =
    findLeadById(id);

  if (!lead) return;

  currentLeadId =
    lead.id;

  $("detailName").textContent =
    lead.nome || "Cliente";

  $("editName").value =
    lead.nome || "";

  $("editPhone").value =
    lead.telefone || "";

  $("editCity").value =
    lead.cidade || "";

  $("editProduct").value =
    lead.produto_interesse ||
    "";

  $("editStatus").value =
    lead.status || "novo";

  $("detailOrigin").textContent =
    lead.origem || "crediti_ia";

  $("detailDate").textContent =
    fmtDate(lead.created_at);

  $("leadNotes").value =
    lead.observacao || "";

  configureWhatsApp(
    lead.telefone
  );

  $("leadDialog").showModal();
}

/* =========================
   WHATSAPP
========================= */

function normalizeBrazilPhone(
  phone
) {
  let digits =
    String(phone || "")
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

function configureWhatsApp(
  phone
) {
  const button =
    $("whatsappLink");

  const number =
    normalizeBrazilPhone(
      phone
    );

  if (!number) {
    button.href = "#";

    button.onclick = (
      event
    ) => {
      event.preventDefault();

      alert(
        "Telefone inválido."
      );
    };

    return;
  }

  const message =
    "Olá! Aqui é da Crediti. Estou entrando em contato sobre seu atendimento.";

  button.href =
    `https://api.whatsapp.com/send?phone=${number}&text=${encodeURIComponent(
      message
    )}`;

  button.target =
    "_blank";

  button.rel =
    "noopener noreferrer";

  button.onclick = null;
}

/* =========================
   ATUALIZAR LEAD
========================= */

async function updateLead(
  id,
  data
) {
  const response = await fetch(
    `${SUPABASE_URL}/leads?id=eq.${encodeURIComponent(
      id
    )}`,
    {
      method: "PATCH",

      headers: authHeaders({
        "Content-Type":
          "application/json",

        Prefer:
          "return=representation"
      }),

      body:
        JSON.stringify(data)
    }
  );

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    logout();
    throw new Error(
      "Sessão expirada."
    );
  }

  if (!response.ok) {
    throw new Error(
      await response.text()
    );
  }

  return await response.json();
}

async function saveCurrentLead() {
  if (
    currentLeadId === null
  ) {
    return;
  }

  const data = {
    nome:
      $("editName")
        .value
        .trim(),

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

    status:
      $("editStatus").value,

    observacao:
      $("leadNotes")
        .value
        .trim()
  };

  if (!data.nome) {
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
      data
    );

    await loadLeads();

    openLead(
      currentLeadId
    );

    showDialogMessage(
      "Alterações salvas."
    );
  } catch (error) {
    console.error(error);

    showDialogMessage(
      "Não foi possível salvar."
    );
  } finally {
    $("saveLeadBtn").disabled =
      false;

    $("saveLeadBtn").textContent =
      "Salvar alterações";
  }
}

/* =========================
   OBSERVAÇÃO
========================= */

async function saveNotesOnly() {
  if (
    currentLeadId === null
  ) {
    return;
  }

  const observation =
    $("leadNotes")
      .value
      .trim();

  $("saveNotesBtn").disabled =
    true;

  $("saveNotesBtn").textContent =
    "Salvando...";

  try {
    await updateLead(
      currentLeadId,
      {
        observacao:
          observation
      }
    );

    const lead =
      findLeadById(
        currentLeadId
      );

    if (lead) {
      lead.observacao =
        observation;
    }

    showDialogMessage(
      "Observação salva."
    );
  } catch (error) {
    console.error(error);

    showDialogMessage(
      "Não foi possível salvar a observação."
    );
  } finally {
    $("saveNotesBtn").disabled =
      false;

    $("saveNotesBtn").textContent =
      "Salvar observação";
  }
}

/* =========================
   APAGAR
========================= */

async function deleteLead(id) {
  const response = await fetch(
    `${SUPABASE_URL}/leads?id=eq.${encodeURIComponent(
      id
    )}`,
    {
      method: "DELETE",

      headers: authHeaders()
    }
  );

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    logout();

    throw new Error(
      "Sessão expirada."
    );
  }

  if (!response.ok) {
    throw new Error(
      await response.text()
    );
  }
}

async function removeCurrentLead() {
  const lead =
    findLeadById(
      currentLeadId
    );

  if (!lead) return;

  const confirmed =
    window.confirm(
      `Apagar definitivamente o lead de ${lead.nome || "este cliente"}?`
    );

  if (!confirmed) return;

  try {
    await deleteLead(
      currentLeadId
    );

    $("leadDialog").close();

    currentLeadId = null;

    await loadLeads();
  } catch (error) {
    console.error(error);

    alert(
      "Não foi possível apagar o lead."
    );
  }
}

/* =========================
   MENSAGEM DA FICHA
========================= */

function showDialogMessage(
  message
) {
  $("dialogMessage").textContent =
    message;

  clearTimeout(
    showDialogMessage.timer
  );

  showDialogMessage.timer =
    setTimeout(() => {
      $("dialogMessage").textContent =
        "";
    }, 3000);
}

/* =========================
   SEGURANÇA HTML
========================= */

function escapeHtml(value) {
  return String(value)
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );
}

function escapeAttr(value) {
  return escapeHtml(value);
}

/* =========================
   NAVEGAÇÃO
========================= */

document
  .querySelectorAll(
    ".nav-item"
  )
  .forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          document
            .querySelectorAll(
              ".nav-item"
            )
            .forEach(
              (item) =>
                item.classList.remove(
                  "active"
                )
            );

          button.classList.add(
            "active"
          );

          const view =
            button.dataset.view;

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

          $("pageTitle")
            .textContent =
              view ===
              "dashboard"
                ? "Dashboard"
                : "Clientes / Leads";
        }
      );
    }
  );

/* =========================
   EVENTOS
========================= */

[
  "searchInput",
  "productFilter",
  "statusFilter"
].forEach((id) => {
  $(id).addEventListener(
    id === "searchInput"
      ? "input"
      : "change",

    renderLeads
  );
});

$("refreshBtn")
  .addEventListener(
    "click",
    () => {
      loadLeads()
        .catch(showError);
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
    saveNotesOnly
  );

$("deleteLeadBtn")
  .addEventListener(
    "click",
    removeCurrentLead
  );

$("loginBtn")
  .addEventListener(
    "click",
    loginWithPin
  );

$("pinInput")
  .addEventListener(
    "keydown",
    (event) => {
      if (
        event.key ===
        "Enter"
      ) {
        loginWithPin();
      }
    }
  );

$("logoutBtn")
  .addEventListener(
    "click",
    logout
  );

function showError(error) {
  console.error(error);

  if (accessToken) {
    $("recentList").innerHTML =
      '<div class="empty">Não foi possível carregar os leads.</div>';
  }
}

/* =========================
   INÍCIO
========================= */

if (accessToken) {
  showApp();

  loadLeads()
    .catch(showError);
} else {
  showLogin();
}

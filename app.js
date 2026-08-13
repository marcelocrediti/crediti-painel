const SUPABASE_BASE = "https://vgdtywdpywezrwlrsawq.supabase.co";
const SUPABASE_URL = `${SUPABASE_BASE}/rest/v1`;
const SUPABASE_AUTH_URL = `${SUPABASE_BASE}/auth/v1`;

const SUPABASE_KEY =
  "sb_publishable_dmoTPKmglghAohv0MrRA9A_2zlUYhER";

let allLeads = [];
let currentLeadId = null;

let accessToken =
  sessionStorage.getItem("crediti_access_token") || "";

let refreshToken =
  sessionStorage.getItem("crediti_refresh_token") || "";

let recoveryMode = false;

const $ = (id) => document.getElementById(id);

/* =========================
   UTILIDADES
========================= */

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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function authHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${accessToken}`,
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

/* =========================
   TELAS
========================= */

function showLogin() {
  $("loginScreen").classList.remove("hidden");
  $("appShell").classList.add("hidden");
}

function showApp() {
  $("loginScreen").classList.add("hidden");
  $("appShell").classList.remove("hidden");
}

/* =========================
   LOGIN NORMAL
========================= */

async function login() {
  clearLoginMessages();

  const email = $("emailInput").value.trim();
  const password = $("passwordInput").value;

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
          email,
          password
        })
      }
    );

    const data = await response.json();

    if (
      !response.ok ||
      !data.access_token
    ) {
      console.error(data);

      throw new Error(
        data.error_description ||
        data.msg ||
        "Login inválido"
      );
    }

    accessToken = data.access_token;
    refreshToken = data.refresh_token || "";

    sessionStorage.setItem(
      "crediti_access_token",
      accessToken
    );

    if (refreshToken) {
      sessionStorage.setItem(
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
      "E-mail ou senha incorretos.";
  } finally {
    $("loginBtn").disabled = false;
    $("loginBtn").textContent =
      "ENTRAR";
  }
}

/* =========================
   ESQUECI MINHA SENHA
========================= */

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
    const redirectTo =
      `${window.location.origin}${window.location.pathname}`;

    const response = await fetch(
      `${SUPABASE_AUTH_URL}/recover`,
      {
        method: "POST",

        headers: {
          apikey: SUPABASE_KEY,
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          email,
          redirect_to: redirectTo
        })
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(errorText);

      throw new Error(errorText);
    }

    $("loginSuccess").textContent =
      "Se este e-mail estiver cadastrado, enviaremos um link para redefinir sua senha.";

  } catch (error) {
    console.error(error);

    $("loginError").textContent =
      "Não foi possível enviar o e-mail agora.";
  } finally {
    $("forgotPasswordBtn").disabled = false;
    $("forgotPasswordBtn").textContent =
      "Esqueci minha senha";
  }
}

/* =========================
   DETECTAR LINK DE RECUPERAÇÃO
========================= */

function checkRecoveryLink() {
  const hashText =
    window.location.hash
      .replace(/^#/, "");

  if (!hashText) {
    return false;
  }

  const params =
    new URLSearchParams(hashText);

  const hashAccessToken =
    params.get("access_token");

  const hashRefreshToken =
    params.get("refresh_token");

  const type =
    params.get("type");

  /*
    O link do Supabase normalmente vem como:
    #access_token=...
    &refresh_token=...
    &type=recovery

    Mas também aceitamos o link quando há
    access_token + refresh_token, para evitar
    perder o modo de recuperação.
  */

  const isRecovery =
    Boolean(hashAccessToken) &&
    (
      type === "recovery" ||
      Boolean(hashRefreshToken)
    );

  if (!isRecovery) {
    return false;
  }

  recoveryMode = true;

  accessToken =
    hashAccessToken;

  refreshToken =
    hashRefreshToken || "";

  /*
    Não salvamos essa sessão como login normal.
    Ela será usada somente para alterar a senha.
  */

  prepareRecoveryScreen();

  return true;
}

/* =========================
   TELA DE NOVA SENHA
========================= */

function prepareRecoveryScreen() {
  showLogin();

  clearLoginMessages();

  const emailField =
    $("emailInput")
      .closest(".login-field");

  if (emailField) {
    emailField.classList.add("hidden");
  }

  $("forgotPasswordBtn")
    .classList.add("hidden");

  document.querySelector(
    ".login-card h1"
  ).textContent =
    "Criar nova senha";

  document.querySelector(
    ".login-subtitle"
  ).textContent =
    "Digite abaixo a nova senha que deseja usar no painel.";

  const passwordLabel =
    $("passwordInput")
      .closest(".login-field")
      .querySelector("span");

  if (passwordLabel) {
    passwordLabel.textContent =
      "Nova senha";
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
    "Link de recuperação confirmado.";

  setTimeout(() => {
    $("passwordInput").focus();
  }, 100);
}

/* =========================
   SALVAR NOVA SENHA
========================= */

async function updateRecoveredPassword() {
  clearLoginMessages();

  const password =
    $("passwordInput").value;

  if (!password) {
    $("loginError").textContent =
      "Digite sua nova senha.";
    return;
  }

  if (password.length < 6) {
    $("loginError").textContent =
      "A senha precisa ter pelo menos 6 caracteres.";
    return;
  }

  $("loginBtn").disabled = true;
  $("loginBtn").textContent =
    "Salvando...";

  try {
    const response = await fetch(
      `${SUPABASE_AUTH_URL}/user`,
      {
        method: "PUT",

        headers: {
          apikey: SUPABASE_KEY,
          Authorization:
            `Bearer ${accessToken}`,
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          password
        })
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      console.error(data);

      throw new Error(
        data.msg ||
        data.error_description ||
        "Erro ao alterar senha"
      );
    }

    recoveryMode = false;

    accessToken = "";
    refreshToken = "";

    sessionStorage.removeItem(
      "crediti_access_token"
    );

    sessionStorage.removeItem(
      "crediti_refresh_token"
    );

    /*
      Remove o token da barra de endereço
      somente depois de concluir a alteração.
    */

    window.history.replaceState(
      {},
      document.title,
      window.location.pathname
    );

    $("loginError").textContent = "";

    $("loginSuccess").textContent =
      "Senha alterada com sucesso. Aguarde...";

    setTimeout(() => {
      window.location.reload();
    }, 1800);

  } catch (error) {
    console.error(error);

    $("loginError").textContent =
      "Não foi possível alterar a senha. Solicite um novo link.";
  } finally {
    $("loginBtn").disabled = false;

    if (recoveryMode) {
      $("loginBtn").textContent =
        "SALVAR NOVA SENHA";
    }
  }
}

/* =========================
   SAIR
========================= */

function logout() {
  accessToken = "";
  refreshToken = "";

  sessionStorage.removeItem(
    "crediti_access_token"
  );

  sessionStorage.removeItem(
    "crediti_refresh_token"
  );

  allLeads = [];
  currentLeadId = null;

  window.location.reload();
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
    if (!value) return false;

    const date =
      new Date(value);

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
  };

  $("metricToday").textContent =
    allLeads.filter(
      (lead) =>
        sameDay(lead.created_at)
    ).length;

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

  allLeads.forEach(
    (lead) => {
      const product =
        lead.produto_interesse ||
        "Não informado";

      counts[product] =
        (counts[product] || 0) +
        1;
    }
  );

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
   FILTRO DE PRODUTOS
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
              <span class="status-pill">
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
   ABRIR FICHA
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
    lead.origem ||
    "crediti_ia";

  $("detailDate").textContent =
    fmtDate(
      lead.created_at
    );

  $("leadNotes").value =
    lead.observacao || "";

  configureWhatsApp(
    lead.telefone
  );

  $("leadDialog")
    .showModal();
}

/* =========================
   WHATSAPP
========================= */

function normalizeBrazilPhone(phone) {
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

function configureWhatsApp(phone) {
  const button =
    $("whatsappLink");

  const number =
    normalizeBrazilPhone(
      phone
    );

  if (!number) {
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
    "Olá! Aqui é da Crediti. Estou entrando em contato sobre seu atendimento.";

  button.href =
    `https://wa.me/${number}?text=${encodeURIComponent(
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
   APAGAR LEAD
========================= */

async function deleteLead(id) {
  const response = await fetch(
    `${SUPABASE_URL}/leads?id=eq.${encodeURIComponent(
      id
    )}`,
    {
      method: "DELETE",

      headers:
        authHeaders()
    }
  );

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

  if (!confirmed) {
    return;
  }

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

function showDialogMessage(message) {
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

          $("pageTitle").textContent =
            view === "dashboard"
              ? "Dashboard"
              : "Clientes / Leads";
        }
      );
    }
  );

/* =========================
   FILTROS
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

/* =========================
   EVENTOS
========================= */

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

$("forgotPasswordBtn")
  .addEventListener(
    "click",
    forgotPassword
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
        event.key ===
        "Enter"
      ) {
        if (recoveryMode) {
          updateRecoveredPassword();
        } else {
          login();
        }
      }
    }
  );

$("emailInput")
  .addEventListener(
    "keydown",
    (event) => {
      if (
        event.key ===
        "Enter"
      ) {
        $("passwordInput")
          .focus();
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

  if (
    accessToken &&
    $("recentList")
  ) {
    $("recentList").innerHTML =
      '<div class="empty">Não foi possível carregar os leads.</div>';
  }
}

/* =========================
   INICIALIZAÇÃO
========================= */

const openedFromRecovery =
  checkRecoveryLink();

if (openedFromRecovery) {

  showLogin();

} else if (accessToken) {

  showApp();

  loadLeads()
    .catch(showError);

} else {

  showLogin();

}

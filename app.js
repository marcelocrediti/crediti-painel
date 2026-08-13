const SUPABASE_URL = "https://vgdtywdpywezrwlrsawq.supabase.co/rest/v1";
const SUPABASE_KEY = "sb_publishable_dmoTPKmglghAohv0MrRA9A_2zlUYhER";

let allLeads = [];

const $ = (id) => document.getElementById(id);

function fmtDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("pt-BR");
}

function normalizeStatus(status) {
  const map = {
    novo: "Novo",
    dados_coletados: "Dados coletados",
    em_atendimento: "Em atendimento",
    encaminhado: "Encaminhado"
  };

  return map[status] || status || "Novo";
}

async function loadLeads() {
  const res = await fetch(
    `${SUPABASE_URL}/leads?select=*&order=created_at.desc`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  allLeads = await res.json();

  renderDashboard();
  fillProductFilter();
  renderLeads();
}

function renderDashboard() {
  $("metricTotal").textContent = allLeads.length;

  const today = new Date();

  const sameDay = (date) => {
    const x = new Date(date);

    return (
      x.getDate() === today.getDate() &&
      x.getMonth() === today.getMonth() &&
      x.getFullYear() === today.getFullYear()
    );
  };

  $("metricToday").textContent =
    allLeads.filter((lead) => sameDay(lead.created_at)).length;

  $("metricOpen").textContent =
    allLeads.filter(
      (lead) =>
        lead.status === "em_atendimento" ||
        lead.status === "dados_coletados" ||
        !lead.status
    ).length;

  $("metricForwarded").textContent =
    allLeads.filter((lead) => lead.status === "encaminhado").length;

  const recent = allLeads.slice(0, 6);

  $("recentList").innerHTML =
    recent
      .map(
        (lead) => `
        <div class="recent-item">
          <div>
            <strong>${escapeHtml(lead.nome || "Sem nome")}</strong>
            <small>
              ${escapeHtml(lead.cidade || "-")} ·
              ${escapeHtml(lead.produto_interesse || "Sem produto")}
            </small>
          </div>

          <small>${fmtDate(lead.created_at)}</small>
        </div>
      `
      )
      .join("") || '<div class="empty">Nenhum lead ainda.</div>';

  const counts = {};

  allLeads.forEach((lead) => {
    const key = lead.produto_interesse || "Não informado";
    counts[key] = (counts[key] || 0) + 1;
  });

  $("productsRanking").innerHTML =
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(
        ([name, count]) => `
        <div class="rank-item">
          <div>
            <strong>${escapeHtml(name)}</strong>
            <small>interesses registrados</small>
          </div>

          <strong>${count}</strong>
        </div>
      `
      )
      .join("") || '<div class="empty">Sem dados.</div>';
}

function fillProductFilter() {
  const current = $("productFilter").value;

  const products = [
    ...new Set(
      allLeads
        .map((lead) => lead.produto_interesse)
        .filter(Boolean)
    )
  ].sort();

  $("productFilter").innerHTML =
    '<option value="">Todos os produtos</option>' +
    products
      .map(
        (product) =>
          `<option value="${escapeAttr(product)}">${escapeHtml(product)}</option>`
      )
      .join("");

  $("productFilter").value = current;
}

function renderLeads() {
  const search = $("searchInput").value.trim().toLowerCase();
  const product = $("productFilter").value;
  const status = $("statusFilter").value;

  const filtered = allLeads.filter((lead) => {
    const haystack =
      `${lead.nome || ""} ${lead.telefone || ""} ${lead.cidade || ""}`
        .toLowerCase();

    return (
      (!search || haystack.includes(search)) &&
      (!product || lead.produto_interesse === product) &&
      (!status || lead.status === status)
    );
  });

  $("leadsTableBody").innerHTML = filtered
    .map(
      (lead) => `
      <tr>
        <td>
          <strong>${escapeHtml(lead.nome || "Sem nome")}</strong>
        </td>

        <td>${escapeHtml(lead.telefone || "-")}</td>

        <td>${escapeHtml(lead.cidade || "-")}</td>

        <td>${escapeHtml(lead.produto_interesse || "-")}</td>

        <td>
          <span class="status-pill">
            ${escapeHtml(normalizeStatus(lead.status))}
          </span>
        </td>

        <td>${fmtDate(lead.created_at)}</td>

        <td>
          <button class="view-btn" data-id="${lead.id}">
            Ver ficha
          </button>
        </td>
      </tr>
    `
    )
    .join("");

  $("emptyState").classList.toggle(
    "hidden",
    filtered.length > 0
  );

  document.querySelectorAll(".view-btn").forEach((button) => {
    button.addEventListener("click", () => {
      openLead(Number(button.dataset.id));
    });
  });
}

function openLead(id) {
  const lead = allLeads.find((item) => item.id === id);

  if (!lead) return;

  $("detailName").textContent =
    lead.nome || "Cliente";

  $("detailPhone").textContent =
    lead.telefone || "-";

  $("detailCity").textContent =
    lead.cidade || "-";

  $("detailProduct").textContent =
    lead.produto_interesse || "-";

  $("detailStatus").textContent =
    normalizeStatus(lead.status);

  $("detailOrigin").textContent =
    lead.origem || "crediti_ia";

  $("detailDate").textContent =
    fmtDate(lead.created_at);

  const digits = String(lead.telefone || "")
    .replace(/\D/g, "");

  $("whatsappLink").href = digits
    ? `https://wa.me/55${digits.replace(/^55/, "")}`
    : "#";

  $("leadDialog").showModal();
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

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    document
      .querySelectorAll(".nav-item")
      .forEach((item) => item.classList.remove("active"));

    button.classList.add("active");

    const view = button.dataset.view;

    document
      .querySelectorAll(".view")
      .forEach((item) => item.classList.remove("active"));

    $(`${view}View`).classList.add("active");

    $("pageTitle").textContent =
      view === "dashboard"
        ? "Dashboard"
        : "Clientes / Leads";
  });
});

[
  "searchInput",
  "productFilter",
  "statusFilter"
].forEach((id) => {
  $(id).addEventListener(
    id === "searchInput" ? "input" : "change",
    renderLeads
  );
});

$("refreshBtn").addEventListener("click", () => {
  loadLeads().catch(showError);
});

$("closeDialog").addEventListener("click", () => {
  $("leadDialog").close();
});

function showError(error) {
  console.error(error);

  $("recentList").innerHTML =
    '<div class="empty">Não foi possível carregar os leads.</div>';
}

loadLeads().catch(showError);

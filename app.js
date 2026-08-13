const SUPABASE_URL = "https://vgdtywdpywezrwlrsawq.supabase.co/rest/v1";
const SUPABASE_KEY = "sb_publishable_dmoTPKmglghAohv0MrRA9A_2zlUYhER";

let allLeads = [];
let currentLeadId = null;

const $ = (id) => document.getElementById(id);

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
    encaminhado: "Encaminhado"
  };

  return map[status] || status || "Novo";
}

function getSupabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra
  };
}

async function loadLeads() {
  const res = await fetch(
    `${SUPABASE_URL}/leads?select=*&order=created_at.desc`,
    {
      headers: getSupabaseHeaders()
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
  if ($("metricTotal")) {
    $("metricTotal").textContent = allLeads.length;
  }

  const today = new Date();

  const sameDay = (date) => {
    if (!date) return false;

    const x = new Date(date);

    if (Number.isNaN(x.getTime())) {
      return false;
    }

    return (
      x.getDate() === today.getDate() &&
      x.getMonth() === today.getMonth() &&
      x.getFullYear() === today.getFullYear()
    );
  };

  if ($("metricToday")) {
    $("metricToday").textContent =
      allLeads.filter((lead) => sameDay(lead.created_at)).length;
  }

  if ($("metricOpen")) {
    $("metricOpen").textContent =
      allLeads.filter(
        (lead) =>
          lead.status === "em_atendimento" ||
          lead.status === "dados_coletados" ||
          lead.status === "novo" ||
          !lead.status
      ).length;
  }

  if ($("metricForwarded")) {
    $("metricForwarded").textContent =
      allLeads.filter(
        (lead) => lead.status === "encaminhado"
      ).length;
  }

  const recent = allLeads.slice(0, 6);

  if ($("recentList")) {
    $("recentList").innerHTML =
      recent
        .map(
          (lead) => `
            <div class="recent-item">
              <div>
                <strong>${escapeHtml(lead.nome || "Sem nome")}</strong>

                <small>
                  ${escapeHtml(lead.cidade || "-")} ·
                  ${escapeHtml(
                    lead.produto_interesse || "Sem produto"
                  )}
                </small>
              </div>

              <small>${fmtDate(lead.created_at)}</small>
            </div>
          `
        )
        .join("") ||
      '<div class="empty">Nenhum lead ainda.</div>';
  }

  const counts = {};

  allLeads.forEach((lead) => {
    const key =
      lead.produto_interesse || "Não informado";

    counts[key] = (counts[key] || 0) + 1;
  });

  if ($("productsRanking")) {
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
        .join("") ||
      '<div class="empty">Sem dados.</div>';
  }
}

function fillProductFilter() {
  if (!$("productFilter")) return;

  const current = $("productFilter").value;

  const products = [
    ...new Set(
      allLeads
        .map((lead) => lead.produto_interesse)
        .filter(Boolean)
    )
  ].sort((a, b) =>
    String(a).localeCompare(String(b), "pt-BR")
  );

  $("productFilter").innerHTML =
    '<option value="">Todos os produtos</option>' +
    products
      .map(
        (product) =>
          `<option value="${escapeAttr(product)}">
            ${escapeHtml(product)}
          </option>`
      )
      .join("");

  $("productFilter").value = current;
}

function renderLeads() {
  if (!$("leadsTableBody")) return;

  const search = $("searchInput")
    ? $("searchInput").value.trim().toLowerCase()
    : "";

  const product = $("productFilter")
    ? $("productFilter").value
    : "";

  const status = $("statusFilter")
    ? $("statusFilter").value
    : "";

  const filtered = allLeads.filter((lead) => {
    const haystack = `
      ${lead.nome || ""}
      ${lead.telefone || ""}
      ${lead.cidade || ""}
      ${lead.produto_interesse || ""}
      ${lead.observacoes || ""}
    `.toLowerCase();

    return (
      (!search || haystack.includes(search)) &&
      (!product ||
        lead.produto_interesse === product) &&
      (!status || lead.status === status)
    );
  });

  $("leadsTableBody").innerHTML = filtered
    .map(
      (lead) => `
        <tr>
          <td>
            <strong>
              ${escapeHtml(lead.nome || "Sem nome")}
            </strong>
          </td>

          <td>
            ${escapeHtml(lead.telefone || "-")}
          </td>

          <td>
            ${escapeHtml(lead.cidade || "-")}
          </td>

          <td>
            ${escapeHtml(
              lead.produto_interesse || "-"
            )}
          </td>

          <td>
            <span class="status-pill">
              ${escapeHtml(
                normalizeStatus(lead.status)
              )}
            </span>
          </td>

          <td>
            ${fmtDate(lead.created_at)}
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

  if ($("emptyState")) {
    $("emptyState").classList.toggle(
      "hidden",
      filtered.length > 0
    );
  }

  document
    .querySelectorAll(".view-btn")
    .forEach((button) => {
      button.addEventListener("click", () => {
        openLead(button.dataset.id);
      });
    });
}

function findLeadById(id) {
  return allLeads.find(
    (item) => String(item.id) === String(id)
  );
}

function openLead(id) {
  const lead = findLeadById(id);

  if (!lead) return;

  currentLeadId = lead.id;

  if ($("detailName")) {
    $("detailName").textContent =
      lead.nome || "Cliente";
  }

  if ($("detailPhone")) {
    $("detailPhone").textContent =
      lead.telefone || "-";
  }

  if ($("detailCity")) {
    $("detailCity").textContent =
      lead.cidade || "-";
  }

  if ($("detailProduct")) {
    $("detailProduct").textContent =
      lead.produto_interesse || "-";
  }

  if ($("detailStatus")) {
    $("detailStatus").textContent =
      normalizeStatus(lead.status);
  }

  if ($("detailOrigin")) {
    $("detailOrigin").textContent =
      lead.origem || "crediti_ia";
  }

  if ($("detailDate")) {
    $("detailDate").textContent =
      fmtDate(lead.created_at);
  }

  if ($("editName")) {
    $("editName").value =
      lead.nome || "";
  }

  if ($("editPhone")) {
    $("editPhone").value =
      lead.telefone || "";
  }

  if ($("editCity")) {
    $("editCity").value =
      lead.cidade || "";
  }

  if ($("editProduct")) {
    $("editProduct").value =
      lead.produto_interesse || "";
  }

  if ($("editStatus")) {
    $("editStatus").value =
      lead.status || "novo";
  }

  if ($("leadNotes")) {
    $("leadNotes").value =
      lead.observacoes || "";
  }

  configureWhatsApp(lead.telefone);

  if ($("leadDialog")) {
    $("leadDialog").showModal();
  }
}

function normalizeBrazilPhone(phone) {
  let digits = String(phone || "")
    .replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  /*
    Se já estiver com 55:
    5585999999999
  */
  if (digits.startsWith("55")) {
    return digits;
  }

  /*
    Número brasileiro com DDD:
    85999999999
  */
  if (
    digits.length === 10 ||
    digits.length === 11
  ) {
    return `55${digits}`;
  }

  /*
    Se vier algum formato inesperado,
    não acrescentamos números aleatórios.
  */
  return digits;
}

function configureWhatsApp(phone) {
  const link = $("whatsappLink");

  if (!link) return;

  const digits = normalizeBrazilPhone(phone);

  if (!digits) {
    link.href = "#";
    link.onclick = (event) => {
      event.preventDefault();

      alert(
        "Este cliente não possui telefone cadastrado."
      );
    };

    return;
  }

  const message =
    "Olá! Aqui é da Crediti. Estou entrando em contato sobre seu atendimento.";

  link.href =
    `https://wa.me/${digits}` +
    `?text=${encodeURIComponent(message)}`;

  link.target = "_blank";
  link.rel = "noopener noreferrer";

  link.onclick = null;
}

async function updateLead(id, data) {
  const res = await fetch(
    `${SUPABASE_URL}/leads?id=eq.${encodeURIComponent(id)}`,
    {
      method: "PATCH",

      headers: getSupabaseHeaders({
        Prefer: "return=representation"
      }),

      body: JSON.stringify(data)
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return await res.json();
}

async function deleteLead(id) {
  const res = await fetch(
    `${SUPABASE_URL}/leads?id=eq.${encodeURIComponent(id)}`,
    {
      method: "DELETE",

      headers: getSupabaseHeaders({
        Prefer: "return=representation"
      })
    }
  );

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return await res.json();
}

async function saveCurrentLead() {
  if (currentLeadId === null) return;

  const lead = findLeadById(currentLeadId);

  if (!lead) {
    alert("Lead não encontrado.");
    return;
  }

  const data = {};

  if ($("editName")) {
    data.nome =
      $("editName").value.trim();
  }

  if ($("editPhone")) {
    data.telefone =
      $("editPhone").value.trim();
  }

  if ($("editCity")) {
    data.cidade =
      $("editCity").value.trim();
  }

  if ($("editProduct")) {
    data.produto_interesse =
      $("editProduct").value.trim();
  }

  if ($("editStatus")) {
    data.status =
      $("editStatus").value;
  }

  if ($("leadNotes")) {
    data.observacoes =
      $("leadNotes").value.trim();
  }

  if (
    Object.prototype.hasOwnProperty.call(
      data,
      "nome"
    ) &&
    !data.nome
  ) {
    alert("O nome do cliente não pode ficar vazio.");
    return;
  }

  const button = $("saveLeadBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Salvando...";
  }

  try {
    await updateLead(currentLeadId, data);

    await loadLeads();

    const updatedLead =
      findLeadById(currentLeadId);

    if (updatedLead) {
      openLead(updatedLead.id);
    }

    alert("Ficha atualizada com sucesso.");
  } catch (error) {
    console.error(error);

    alert(
      "Não foi possível salvar as alterações."
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Salvar alterações";
    }
  }
}

async function saveNotesOnly() {
  if (currentLeadId === null) return;

  if (!$("leadNotes")) return;

  const notes =
    $("leadNotes").value.trim();

  const button = $("saveNotesBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Salvando...";
  }

  try {
    await updateLead(currentLeadId, {
      observacoes: notes
    });

    const lead =
      findLeadById(currentLeadId);

    if (lead) {
      lead.observacoes = notes;
    }

    alert("Observação salva.");
  } catch (error) {
    console.error(error);

    alert(
      "Não foi possível salvar a observação."
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Salvar observação";
    }
  }
}

async function changeCurrentStatus() {
  if (currentLeadId === null) return;

  if (!$("editStatus")) return;

  const status =
    $("editStatus").value;

  try {
    await updateLead(currentLeadId, {
      status
    });

    await loadLeads();

    const lead =
      findLeadById(currentLeadId);

    if (lead) {
      openLead(lead.id);
    }
  } catch (error) {
    console.error(error);

    alert(
      "Não foi possível alterar o status."
    );
  }
}

async function removeCurrentLead() {
  if (currentLeadId === null) return;

  const lead =
    findLeadById(currentLeadId);

  if (!lead) return;

  const name =
    lead.nome || "este cliente";

  const confirmed = window.confirm(
    `Tem certeza que deseja apagar o lead de ${name}?\n\nEssa ação não poderá ser desfeita.`
  );

  if (!confirmed) return;

  const secondConfirmation =
    window.confirm(
      `Confirme novamente: apagar definitivamente ${name}?`
    );

  if (!secondConfirmation) return;

  const button = $("deleteLeadBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Apagando...";
  }

  try {
    await deleteLead(currentLeadId);

    currentLeadId = null;

    if ($("leadDialog")) {
      $("leadDialog").close();
    }

    await loadLeads();

    alert("Lead apagado.");
  } catch (error) {
    console.error(error);

    alert(
      "Não foi possível apagar o lead."
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Apagar lead";
    }
  }
}

function closeLeadDialog() {
  currentLeadId = null;

  if ($("leadDialog")) {
    $("leadDialog").close();
  }
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

/*
  NAVEGAÇÃO
*/

document
  .querySelectorAll(".nav-item")
  .forEach((button) => {
    button.addEventListener("click", () => {
      document
        .querySelectorAll(".nav-item")
        .forEach((item) =>
          item.classList.remove("active")
        );

      button.classList.add("active");

      const view =
        button.dataset.view;

      document
        .querySelectorAll(".view")
        .forEach((item) =>
          item.classList.remove("active")
        );

      const selectedView =
        $(`${view}View`);

      if (selectedView) {
        selectedView.classList.add("active");
      }

      if ($("pageTitle")) {
        $("pageTitle").textContent =
          view === "dashboard"
            ? "Dashboard"
            : "Clientes / Leads";
      }
    });
  });

/*
  FILTROS
*/

[
  "searchInput",
  "productFilter",
  "statusFilter"
].forEach((id) => {
  const element = $(id);

  if (!element) return;

  element.addEventListener(
    id === "searchInput"
      ? "input"
      : "change",
    renderLeads
  );
});

/*
  BOTÃO ATUALIZAR
*/

if ($("refreshBtn")) {
  $("refreshBtn").addEventListener(
    "click",
    () => {
      loadLeads().catch(showError);
    }
  );
}

/*
  FECHAR FICHA
*/

if ($("closeDialog")) {
  $("closeDialog").addEventListener(
    "click",
    closeLeadDialog
  );
}

/*
  SALVAR FICHA
*/

if ($("saveLeadBtn")) {
  $("saveLeadBtn").addEventListener(
    "click",
    saveCurrentLead
  );
}

/*
  SALVAR SOMENTE OBSERVAÇÃO
*/

if ($("saveNotesBtn")) {
  $("saveNotesBtn").addEventListener(
    "click",
    saveNotesOnly
  );
}

/*
  ALTERAR STATUS
*/

if ($("editStatus")) {
  $("editStatus").addEventListener(
    "change",
    changeCurrentStatus
  );
}

/*
  APAGAR LEAD
*/

if ($("deleteLeadBtn")) {
  $("deleteLeadBtn").addEventListener(
    "click",
    removeCurrentLead
  );
}

/*
  FECHAR DIALOG CLICANDO FORA
*/

if ($("leadDialog")) {
  $("leadDialog").addEventListener(
    "click",
    (event) => {
      if (
        event.target === $("leadDialog")
      ) {
        closeLeadDialog();
      }
    }
  );
}

function showError(error) {
  console.error(error);

  if ($("recentList")) {
    $("recentList").innerHTML =
      '<div class="empty">Não foi possível carregar os leads.</div>';
  }
}

/*
  INICIALIZAÇÃO
*/

loadLeads().catch(showError);

<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="theme-color" content="#ffd400" />
  <title>Crediti IA Painel</title>
  <link rel="stylesheet" href="styles.css" />
</head>

<body>

  <section id="loginScreen" class="login-screen">
    <div class="login-card">

      <div class="login-brand">
        CREDITI IA
      </div>

      <p class="eyebrow">
        PAINEL INTERNO
      </p>

      <h1>
        Acesso ao painel
      </h1>

      <p class="login-subtitle">
        Entre com seu e-mail e sua senha.
      </p>

      <label class="login-field">
        <span>E-mail</span>

        <input
          id="emailInput"
          type="email"
          autocomplete="email"
          placeholder="seuemail@exemplo.com"
        />
      </label>

      <label class="login-field">
        <span>Senha</span>

        <input
          id="passwordInput"
          type="password"
          autocomplete="current-password"
          placeholder="Digite sua senha"
        />
      </label>

      <button
        id="loginBtn"
        class="primary-btn login-btn"
      >
        ENTRAR
      </button>

      <button
        id="forgotPasswordBtn"
        class="forgot-btn"
        type="button"
      >
        Esqueci minha senha
      </button>

      <div
        id="loginError"
        class="login-error"
      ></div>

      <div
        id="loginSuccess"
        class="login-success"
      ></div>

    </div>
  </section>

  <div
    id="appShell"
    class="app-shell hidden"
  >

    <aside class="sidebar">

      <div class="brand">
        CREDITI IA
      </div>

      <nav>

        <button
          class="nav-item active"
          data-view="dashboard"
        >
          Dashboard
        </button>

        <button
          class="nav-item"
          data-view="leads"
        >
          Clientes / Leads
        </button>

      </nav>

      <div class="sidebar-foot">

        <span>
          Painel interno
        </span>

        <button
          id="logoutBtn"
          class="logout-btn"
        >
          Sair
        </button>

      </div>

    </aside>

    <main class="content">

      <header class="topbar">

        <div>

          <p class="eyebrow">
            CREDITI IA
          </p>

          <h1 id="pageTitle">
            Dashboard
          </h1>

        </div>

        <button
          id="refreshBtn"
          class="secondary-btn"
        >
          Atualizar
        </button>

      </header>

      <section
        id="dashboardView"
        class="view active"
      >

        <div class="cards">

          <article class="metric-card">

            <span>
              Total de leads
            </span>

            <strong id="metricTotal">
              0
            </strong>

          </article>

          <article class="metric-card">

            <span>
              Hoje
            </span>

            <strong id="metricToday">
              0
            </strong>

          </article>

          <article class="metric-card">

            <span>
              Em atendimento
            </span>

            <strong id="metricOpen">
              0
            </strong>

          </article>

          <article class="metric-card">

            <span>
              Encaminhados
            </span>

            <strong id="metricForwarded">
              0
            </strong>

          </article>

        </div>

        <div class="panel-grid">

          <section class="panel">

            <div class="panel-head">

              <div>

                <h2>
                  Leads recentes
                </h2>

                <p>
                  Últimos atendimentos recebidos pela Crediti IA.
                </p>

              </div>

            </div>

            <div
              id="recentList"
              class="recent-list"
            ></div>

          </section>

          <section class="panel">

            <div class="panel-head">

              <div>

                <h2>
                  Produtos mais procurados
                </h2>

                <p>
                  Visão rápida por interesse.
                </p>

              </div>

            </div>

            <div
              id="productsRanking"
              class="ranking"
            ></div>

          </section>

        </div>

      </section>

      <section
        id="leadsView"
        class="view"
      >

        <section class="panel">

          <div class="filters">

            <input
              id="searchInput"
              type="search"
              placeholder="Buscar por nome, telefone ou cidade"
            />

            <select id="productFilter">

              <option value="">
                Todos os produtos
              </option>

            </select>

            <select id="statusFilter">

              <option value="">
                Todos os status
              </option>

              <option value="novo">
                Novo
              </option>

              <option value="dados_coletados">
                Dados coletados
              </option>

              <option value="em_atendimento">
                Em atendimento
              </option>

              <option value="encaminhado">
                Encaminhado
              </option>

              <option value="documentacao">
                Documentação
              </option>

              <option value="proposta_enviada">
                Proposta enviada
              </option>

              <option value="aprovado">
                Aprovado
              </option>

              <option value="nao_aprovado">
                Não aprovado
              </option>

              <option value="finalizado">
                Finalizado
              </option>

            </select>

          </div>

          <div class="table-wrap">

            <table>

              <thead>

                <tr>
                  <th>Cliente</th>
                  <th>Telefone</th>
                  <th>Cidade</th>
                  <th>Produto</th>
                  <th>Status</th>
                  <th>Data</th>
                  <th></th>
                </tr>

              </thead>

              <tbody id="leadsTableBody"></tbody>

            </table>

          </div>

          <div
            id="emptyState"
            class="empty hidden"
          >
            Nenhum lead encontrado.
          </div>

        </section>

      </section>

    </main>

  </div>

  <dialog id="leadDialog">

    <button
      id="closeDialog"
      class="dialog-close"
    >
      ×
    </button>

    <div class="dialog-content">

      <p class="eyebrow">
        FICHA DO CLIENTE
      </p>

      <h2 id="detailName">
        Cliente
      </h2>

      <div class="edit-grid">

        <label>

          <span>
            Nome
          </span>

          <input
            id="editName"
            type="text"
          />

        </label>

        <label>

          <span>
            Telefone
          </span>

          <input
            id="editPhone"
            type="text"
          />

        </label>

        <label>

          <span>
            Cidade
          </span>

          <input
            id="editCity"
            type="text"
          />

        </label>

        <label>

          <span>
            Produto
          </span>

          <input
            id="editProduct"
            type="text"
          />

        </label>

        <label>

          <span>
            Status
          </span>

          <select id="editStatus">

            <option value="novo">
              Novo
            </option>

            <option value="dados_coletados">
              Dados coletados
            </option>

            <option value="em_atendimento">
              Em atendimento
            </option>

            <option value="encaminhado">
              Encaminhado
            </option>

            <option value="documentacao">
              Documentação
            </option>

            <option value="proposta_enviada">
              Proposta enviada
            </option>

            <option value="aprovado">
              Aprovado
            </option>

            <option value="nao_aprovado">
              Não aprovado
            </option>

            <option value="finalizado">
              Finalizado
            </option>

          </select>

        </label>

        <div class="read-only-field">

          <span>
            Origem
          </span>

          <strong id="detailOrigin">
            -
          </strong>

        </div>

        <div class="read-only-field full">

          <span>
            Data
          </span>

          <strong id="detailDate">
            -
          </strong>

        </div>

      </div>

      <label class="observation-box">

        <span>
          Observações
        </span>

        <textarea
          id="leadNotes"
          rows="5"
          placeholder="Digite aqui suas observações sobre o atendimento..."
        ></textarea>

      </label>

      <div
        id="dialogMessage"
        class="dialog-message"
      ></div>

      <div class="dialog-actions">

        <a
          id="whatsappLink"
          class="primary-btn"
          target="_blank"
          rel="noopener noreferrer"
        >
          Abrir WhatsApp
        </a>

        <button
          id="saveNotesBtn"
          class="notes-btn"
        >
          Salvar observação
        </button>

        <button
          id="saveLeadBtn"
          class="secondary-action-btn"
        >
          Salvar alterações
        </button>

        <button
          id="deleteLeadBtn"
          class="danger-btn"
        >
          Apagar lead
        </button>

      </div>

    </div>

  </dialog>

  <script src="app.js"></script>

</body>
</html>

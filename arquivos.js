const SUPABASE_BASE = "https://vgdtywdpywezrwlrsawq.supabase.co";
const SUPABASE_REST = `${SUPABASE_BASE}/rest/v1`;
const SUPABASE_AUTH = `${SUPABASE_BASE}/auth/v1`;
const SUPABASE_KEY = "sb_publishable_dmoTPKmglghAohv0MrRA9A_2zlUYhER";
const FILE_API = "https://crediti-arquivos-api.marcelinoteixeira-santos.workers.dev";
const TOKEN = localStorage.getItem("crediti_access_token") || "";
const $ = id => document.getElementById(id);

let clients = [], currentClient = null, contracts = [], documents = [], currentContract = null;

function headers(extra={}){return{apikey:SUPABASE_KEY,Authorization:`Bearer ${TOKEN}`,...extra}}
function escapeHtml(v=""){return String(v).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;")}
function digits(v=""){return String(v).replace(/\D/g,"")}
function cpfView(v=""){const n=digits(v);return n.length===11?`${n.slice(0,3)}.${n.slice(3,6)}.${n.slice(6,9)}-${n.slice(9)}`:v}
function sizeView(n=0){if(n<1024)return`${n} B`;if(n<1048576)return`${(n/1024).toFixed(1)} KB`;return`${(n/1048576).toFixed(1)} MB`}
function dateView(v){return v?new Date(v).toLocaleString("pt-BR"):"-"}
function showMessage(text){$("message").textContent=text;$("message").classList.add("show");setTimeout(()=>$("message").classList.remove("show"),4000)}

async function rest(path, options={}){
  const response=await fetch(`${SUPABASE_REST}/${path}`,{...options,headers:headers({"Content-Type":"application/json",Prefer:"return=representation",...(options.headers||{})})});
  if(response.status===401){localStorage.removeItem("crediti_access_token");location.href="index.html";throw new Error("Sessão encerrada")}
  const text=await response.text();const data=text?JSON.parse(text):null;
  if(!response.ok)throw new Error(data?.message||data?.error||"Não foi possível concluir");return data;
}

async function verify(){if(!TOKEN){location.href="index.html";return false}const r=await fetch(`${SUPABASE_AUTH}/user`,{headers:headers()});if(!r.ok){location.href="index.html";return false}return true}

async function loadClients(){clients=await rest("arquivo_clientes?select=*&order=nome.asc");renderClients()}
function renderClients(){const term=digits($("searchInput").value)||$("searchInput").value.toLowerCase().trim();const list=clients.filter(c=>c.nome.toLowerCase().includes(term)||c.cpf.includes(term));$("clientList").innerHTML=list.length?list.map(c=>`<article class="client-card" data-id="${c.id}"><h3>${escapeHtml(c.nome)}</h3><p>CPF: ${cpfView(c.cpf)}</p><p>${escapeHtml(c.cidade||"Cidade não informada")}</p><span class="badge">Abrir pasta</span></article>`).join(""):`<div class="empty">Nenhum cliente encontrado.</div>`}

async function loadUsage(){try{const r=await fetch(`${FILE_API}/usage`,{headers:{Authorization:`Bearer ${TOKEN}`}});const u=await r.json();if(!r.ok)throw new Error(u.error);const gb=u.totalBytes/1073741824;$("usageText").textContent=`${gb.toFixed(2)} GB de 10 GB usados`;$("usageBar").style.width=`${Math.min(100,u.percentUsed)}%`;const box=document.querySelector(".usage-info");box.className="usage-info";if(gb>=9.5){box.classList.add("danger");$("usageAlert").textContent="ALERTA VERMELHO: próximo do limite e sujeito a cobrança"}else if(gb>=8){box.classList.add("warning");$("usageAlert").textContent="ALERTA AMARELO: armazenamento acima de 8 GB"}else $("usageAlert").textContent=`${u.totalFiles} arquivos armazenados com segurança`}catch(e){$("usageText").textContent="Uso indisponível"}}

function openNewClient(){currentClient=null;$("clientDialogTitle").textContent="Novo cliente";$("clientForm").reset();$("clientCpf").disabled=false;$("clientDialog").showModal()}
function editClient(){if(!currentClient)return;$("clientDialogTitle").textContent="Editar cliente";$("clientName").value=currentClient.nome;$("clientCpf").value=cpfView(currentClient.cpf);$("clientCpf").disabled=true;$("clientPhone").value=currentClient.telefone||"";$("clientCity").value=currentClient.cidade||"";$("clientNotes").value=currentClient.observacoes||"";$("clientDialog").showModal()}

async function saveClient(e){e.preventDefault();const body={nome:$("clientName").value.trim(),telefone:$("clientPhone").value.trim(),cidade:$("clientCity").value.trim(),observacoes:$("clientNotes").value.trim()};try{if(currentClient){const [saved]=await rest(`arquivo_clientes?id=eq.${currentClient.id}`,{method:"PATCH",body:JSON.stringify(body)});currentClient=saved}else{body.cpf=digits($("clientCpf").value);if(body.cpf.length!==11)throw new Error("Digite um CPF com 11 números");[currentClient]=await rest("arquivo_clientes",{method:"POST",body:JSON.stringify(body)})}$("clientDialog").close();await loadClients();await openFolder(currentClient.id);showMessage("Cliente salvo com sucesso") }catch(err){alert(err.message)} }

async function openFolder(id){currentClient=clients.find(c=>c.id===id)||currentClient;if(!currentClient)return;$("folderName").textContent=currentClient.nome;$("folderCpf").textContent=`CPF: ${cpfView(currentClient.cpf)}`;await Promise.all([loadContracts(),loadDocuments(),loadHistory()]);renderFolder();$("folderDialog").showModal()}
async function loadContracts(){contracts=await rest(`arquivo_contratos?cliente_id=eq.${currentClient.id}&select=*&order=created_at.desc`)}
async function loadDocuments(){documents=await rest(`arquivo_documentos?cliente_id=eq.${currentClient.id}&select=*&order=created_at.desc`);renderVideos()}
function renderVideos(){const videos=documents.filter(d=>!d.deleted_at&&(d.mime_type||"").startsWith("video/"));if($("videoList"))renderFileList($("videoList"),videos)}
async function loadHistory(){const rows=await rest(`arquivo_historico?cliente_id=eq.${currentClient.id}&select=*&order=created_at.desc&limit=100`);$("historyList").innerHTML=rows.length?rows.map(h=>`<div class="history-row"><strong>${escapeHtml(h.acao)}</strong><span>${escapeHtml(h.responsavel)} • ${dateView(h.created_at)}</span><small>${escapeHtml(h.detalhes||"")}</small></div>`).join(""):`<div class="empty">Nenhuma movimentação registrada.</div>`}

function renderFolder(){renderFileList($("personalFileList"),documents.filter(d=>!d.contrato_id&&!d.deleted_at&&!(d.mime_type||"").startsWith("video/")));$("contractList").innerHTML=contracts.length?contracts.map(c=>`<article class="contract-card"><div><h3>${escapeHtml(c.tipo)} ${c.subtipo?`• ${escapeHtml(c.subtipo)}`:""}</h3><p>${escapeHtml(c.numero_contrato_ade||"Sem contrato/ADE")} • ${escapeHtml(c.banco_financeira||"Banco não informado")}</p><small>Digitação: ${escapeHtml(c.responsavel_digitacao)} • ${dateView(c.created_at)}</small></div><button class="primary open-contract" data-id="${c.id}">Abrir arquivos</button></article>`).join(""):`<div class="empty">Nenhum contrato cadastrado.</div>`;updateTrash()}

function renderFileList(target,list){target.innerHTML=list.length?list.map(d=>`<article class="file-row"><div><strong>${escapeHtml(d.nome_original)}</strong><br><small>${escapeHtml(d.categoria)} • ${sizeView(d.tamanho_bytes)} • ${escapeHtml(d.responsavel)}</small></div><div class="file-actions"><button data-action="view" data-id="${d.id}">Visualizar</button><button data-action="download" data-id="${d.id}">Baixar</button><button data-action="share" data-id="${d.id}">Compartilhar</button><button class="delete" data-action="trash" data-id="${d.id}">Apagar</button></div></article>`).join(""):`<div class="empty">Nenhum arquivo nesta área.</div>`}

function newContract(){currentContract=null;$("contractForm").reset();$("contractDate").value=new Date().toISOString().slice(0,10);$("subtypeLabel").classList.add("hidden");$("contractDialog").showModal()}
async function saveContract(e){e.preventDefault();const type=$("contractType").value;const vehicle=["Financiamento de veículo","Refinanciamento de veículo"].includes(type);const body={cliente_id:currentClient.id,tipo:type,subtipo:vehicle?$("contractSubtype").value:null,numero_contrato_ade:$("contractNumber").value.trim(),banco_financeira:$("contractBank").value.trim(),data_contrato:$("contractDate").value,valor:Number(String($("contractValue").value).replace(/\./g,"").replace(",","."))||null,responsavel_digitacao:$("contractResponsible").value,observacoes:$("contractNotes").value.trim()};try{[currentContract]=await rest("arquivo_contratos",{method:"POST",body:JSON.stringify(body)});await log("Contrato criado",body.responsavel_digitacao,`${type}${body.subtipo?` - ${body.subtipo}`:""}`,currentContract.id);$("contractDialog").close();await loadContracts();renderFolder();openContractFiles(currentContract.id)}catch(err){alert(err.message)}}

function openContractFiles(id){currentContract=contracts.find(c=>c.id===id)||currentContract;if(!currentContract)return;$("contractFilesTitle").textContent=`${currentContract.tipo}${currentContract.subtipo?` • ${currentContract.subtipo}`:""}`;renderFileList($("contractFileList"),documents.filter(d=>d.contrato_id===id&&!d.deleted_at));$("contractFilesDialog").showModal()}

async function videoDuration(file){if(!file.type.startsWith("video/"))return 0;return new Promise((resolve,reject)=>{const v=document.createElement("video");v.preload="metadata";v.onloadedmetadata=()=>{URL.revokeObjectURL(v.src);resolve(v.duration)};v.onerror=()=>reject(new Error("Não foi possível verificar o vídeo"));v.src=URL.createObjectURL(file)})}
async function uploadFiles(input,category,responsible,contractId=null){
  const files=[...input.files];
  if(!files.length)return alert("Escolha pelo menos um arquivo");
  input.disabled=true;
  try{
    for(const file of files){
      if(file.size>30*1048576){alert(`${file.name} ultrapassa 30 MB`);continue}
      let duration=0;
      try{duration=await videoDuration(file)}catch(error){alert(`${file.name}: ${error.message}`);continue}
      if(duration>120){alert(`${file.name} ultrapassa 2 minutos`);continue}
      const safe=file.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9._-]/g,"_");
      const key=`clientes/${currentClient.id}/${contractId?`contratos/${contractId}`:"documentos"}/${crypto.randomUUID()}-${safe}`;
      showMessage(`Enviando ${file.name}...`);
      const response=await fetch(`${FILE_API}/upload?key=${encodeURIComponent(key)}`,{method:"POST",headers:{Authorization:`Bearer ${TOKEN}`,"Content-Type":file.type||"application/octet-stream","X-File-Name":encodeURIComponent(file.name)},body:file});
      const uploaded=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(uploaded.error||`Falha no envio de ${file.name}`);
      const [doc]=await rest("arquivo_documentos",{method:"POST",body:JSON.stringify({cliente_id:currentClient.id,contrato_id:contractId,categoria:category,nome_original:file.name,storage_key:key,mime_type:file.type||"application/octet-stream",tamanho_bytes:uploaded.size||file.size,responsavel:responsible})});
      documents.unshift(doc);
      renderFolder();
      renderVideos();
      if(contractId)renderFileList($("contractFileList"),documents.filter(d=>d.contrato_id===contractId&&!d.deleted_at));
      await log("Arquivo enviado",responsible,file.name,contractId,doc.id);
    }
    input.value="";
    await loadHistory();
    loadUsage();
    showMessage("Arquivo enviado. Você já pode escolher o próximo documento.");
  }catch(error){
    alert(`Não foi possível enviar: ${error.message}`);
    showMessage(`Erro no envio: ${error.message}`);
  }finally{
    input.disabled=false;
    input.focus();
  }
}

async function log(acao,responsavel,detalhes,contrato_id=null,documento_id=null){await rest("arquivo_historico",{method:"POST",body:JSON.stringify({cliente_id:currentClient.id,contrato_id,documento_id,acao,responsavel,detalhes})})}
async function fileAction(action,id){const doc=documents.find(d=>d.id===id);if(!doc)return;if(action==="trash"){const who=prompt("Quem está apagando? Digite Marcelino ou Samila:",doc.responsavel)||"";if(!["Marcelino","Samila"].includes(who))return alert("Informe Marcelino ou Samila");await rest(`arquivo_documentos?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({deleted_at:new Date().toISOString(),deleted_by:who})});await log("Arquivo movido para a lixeira",who,doc.nome_original,doc.contrato_id,doc.id);await loadDocuments();renderFolder();return}const r=await fetch(`${FILE_API}/file?key=${encodeURIComponent(doc.storage_key)}${action==="download"?"&download=1":""}`,{headers:{Authorization:`Bearer ${TOKEN}`}});if(!r.ok){const e=await r.json();return alert(e.error)}const blob=await r.blob();const url=URL.createObjectURL(blob);if(action==="view")window.open(url,"_blank");else if(action==="download"){const a=document.createElement("a");a.href=url;a.download=doc.nome_original;a.click()}else if(action==="share"){const file=new File([blob],doc.nome_original,{type:doc.mime_type||blob.type});if(navigator.canShare?.({files:[file]}))await navigator.share({title:`Documento de ${currentClient.nome}`,files:[file]});else{const a=document.createElement("a");a.href=url;a.download=doc.nome_original;a.click();alert("O arquivo foi baixado. Agora anexe no WhatsApp ou e-mail.")}}setTimeout(()=>URL.revokeObjectURL(url),60000)}

function updateTrash(){const list=documents.filter(d=>d.deleted_at);$("trashCount").textContent=list.length;$("trashList").innerHTML=list.length?list.map(d=>`<article class="file-row"><div><strong>${escapeHtml(d.nome_original)}</strong><br><small>Apagado por ${escapeHtml(d.deleted_by||"-")} em ${dateView(d.deleted_at)}</small></div><div class="file-actions"><button data-action="restore" data-id="${d.id}">Restaurar</button><button class="delete" data-action="permanent" data-id="${d.id}">Excluir definitivamente</button></div></article>`).join(""):`<div class="empty">A lixeira está vazia.</div>`}
async function trashAction(action,id){const doc=documents.find(d=>d.id===id);if(!doc)return;if(action==="restore"){await rest(`arquivo_documentos?id=eq.${id}`,{method:"PATCH",body:JSON.stringify({deleted_at:null,deleted_by:null})});await log("Arquivo restaurado","Marcelino ou Samila",doc.nome_original,doc.contrato_id,doc.id)}else{if(!confirm("Excluir definitivamente? Esta ação não poderá ser desfeita."))return;const r=await fetch(`${FILE_API}/file?key=${encodeURIComponent(doc.storage_key)}`,{method:"DELETE",headers:{Authorization:`Bearer ${TOKEN}`}});if(!r.ok)return alert("Não foi possível excluir do armazenamento");await rest(`arquivo_documentos?id=eq.${id}`,{method:"DELETE"});await log("Arquivo excluído definitivamente","Marcelino",doc.nome_original,doc.contrato_id,null)}await loadDocuments();renderFolder();updateTrash()}

document.addEventListener("click",async e=>{const client=e.target.closest(".client-card");if(client)return openFolder(client.dataset.id);if(e.target.matches("[data-close]"))return $(e.target.dataset.close).close();if(e.target.matches(".open-contract"))return openContractFiles(e.target.dataset.id);const file=e.target.closest("[data-action]");if(file){if(["restore","permanent"].includes(file.dataset.action))return trashAction(file.dataset.action,file.dataset.id);return fileAction(file.dataset.action,file.dataset.id)}if(e.target.matches(".tabs button")){document.querySelectorAll(".tabs button").forEach(b=>b.classList.remove("active"));document.querySelectorAll(".tab").forEach(t=>t.classList.remove("active"));e.target.classList.add("active");$(`${e.target.dataset.tab}Tab`).classList.add("active")}});

$("newClientBtn").onclick=openNewClient;$("editClientBtn").onclick=editClient;$("clientForm").onsubmit=saveClient;$("newContractBtn").onclick=newContract;$("contractForm").onsubmit=saveContract;$("searchInput").oninput=renderClients;$("contractType").onchange=()=>$("subtypeLabel").classList.toggle("hidden",!["Financiamento de veículo","Refinanciamento de veículo"].includes($("contractType").value));$("uploadPersonalBtn").onclick=()=>uploadFiles($("personalFiles"),$("personalCategory").value,$("personalResponsible").value);$("uploadContractBtn").onclick=()=>uploadFiles($("contractFiles"),$("contractFileCategory").value,$("contractFileResponsible").value,currentContract.id);$("trashBtn").onclick=()=>$("trashDialog").showModal();

$("personalGallery").onchange=()=>uploadFiles($("personalGallery"),$("personalCategory").value,$("personalResponsible").value);
$("personalCamera").onchange=()=>uploadFiles($("personalCamera"),$("personalCategory").value,$("personalResponsible").value);
$("contractGallery").onchange=()=>uploadFiles($("contractGallery"),$("contractFileCategory").value,$("contractFileResponsible").value,currentContract.id);
$("contractCamera").onchange=()=>uploadFiles($("contractCamera"),$("contractFileCategory").value,$("contractFileResponsible").value,currentContract.id);
$("uploadVideoBtn").onclick=()=>uploadFiles($("videoFiles"),"Vídeo",$("videoResponsible").value);

(async()=>{if(!await verify())return;try{await Promise.all([loadClients(),loadUsage()])}catch(e){showMessage(`Antes de usar, crie as tabelas no Supabase: ${e.message}`)}})();

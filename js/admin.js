// FAES - Painel do administrador: aprovar ou recusar eventos

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Mesmo e-mail definido nas regras do Firestore (isAdmin)
const EMAIL_ADMIN = "wander.paula.britto@gmail.com";

const NOMES_MODALIDADE = {
  milsim: "MilSim",
  speedsoft: "Speedsoft",
  cqb: "CQB",
  "4fun": "4Fun"
};

const $ = id => document.getElementById(id);
let filtroAtual = "pendente";

function mostrarMensagem(texto, tipo) {
  const caixa = $("mensagem");
  caixa.textContent = texto;
  caixa.className = "mensagem " + tipo;
}

function limparMensagem() {
  const caixa = $("mensagem");
  caixa.textContent = "";
  caixa.className = "mensagem oculto";
}

function formatarData(iso) {
  if (!iso) return "Data a definir";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Aceita modalidades como lista ou como texto separado por vírgula
function modalidadesTexto(valor) {
  const lista = Array.isArray(valor)
    ? valor
    : (typeof valor === "string" ? valor.split(",") : []);
  return lista
    .map(m => String(m).trim().toLowerCase())
    .filter(Boolean)
    .map(m => NOMES_MODALIDADE[m] || m)
    .join(", ") || "Nenhuma";
}

function criarLinha(rotulo, valor) {
  const linha = document.createElement("p");
  const negrito = document.createElement("strong");
  negrito.textContent = rotulo + ": ";
  linha.appendChild(negrito);
  linha.appendChild(document.createTextNode(valor || "—"));
  return linha;
}

function criarBotao(texto, classe, aoClicar) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = classe;
  botao.textContent = texto;
  botao.addEventListener("click", aoClicar);
  return botao;
}

function criarCardEvento(evento) {
  const card = document.createElement("article");
  card.className = "card mensagem-item";

  if (evento.foto) {
    const foto = document.createElement("img");
    foto.src = evento.foto;
    foto.alt = "Foto do evento " + (evento.nome || "");
    foto.className = "evento-foto";
    foto.loading = "lazy";
    card.appendChild(foto);
  }

  const titulo = document.createElement("h3");
  titulo.textContent = evento.nome || "Evento sem nome";
  card.appendChild(titulo);

  card.appendChild(criarLinha("Data", `${formatarData(evento.data)} às ${evento.horario || "—"}`));
  card.appendChild(criarLinha("Local", `${evento.local || "—"} · ${evento.cidade || "—"}`));
  card.appendChild(criarLinha("Modalidades", modalidadesTexto(evento.modalidades)));
  card.appendChild(criarLinha("Contato", evento.contato));
  card.appendChild(criarLinha("Autor (UID)", evento.criadoPor));

  const descricao = document.createElement("p");
  descricao.className = "texto-quebra";
  descricao.textContent = evento.descricao || "";
  card.appendChild(descricao);

  const acoes = document.createElement("div");
  acoes.className = "acoes-mensagem";

  if (evento.status !== "aprovado") {
    acoes.appendChild(criarBotao("Aprovar", "botao botao-principal", () => mudarStatus(evento.id, "aprovado")));
  }
  if (evento.status !== "recusado") {
    acoes.appendChild(criarBotao("Recusar", "botao botao-secundario", () => mudarStatus(evento.id, "recusado")));
  }
  if (evento.status !== "pendente") {
    acoes.appendChild(criarBotao("Voltar a pendente", "botao botao-secundario", () => mudarStatus(evento.id, "pendente")));
  }

  card.appendChild(acoes);
  return card;
}

async function carregarEventos() {
  const lista = $("lista-admin");
  lista.innerHTML = "";

  try {
    const consulta = query(collection(db, "eventos"), where("status", "==", filtroAtual));
    const resultado = await getDocs(consulta);

    const eventos = resultado.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.data || "9999").localeCompare(b.data || "9999"));

    $("subtitulo-admin").textContent = eventos.length === 0
      ? "Nenhum evento nesta lista."
      : `${eventos.length} evento(s) nesta lista.`;

    if (eventos.length === 0) {
      const aviso = document.createElement("p");
      aviso.className = "aviso-lista";
      aviso.textContent = "Nada por aqui no momento.";
      lista.appendChild(aviso);
      return;
    }

    eventos.forEach(evento => lista.appendChild(criarCardEvento(evento)));
  } catch (erro) {
    console.error(erro);
    mostrarMensagem("Não foi possível carregar os eventos. Tente novamente.", "erro");
  }
}

async function mudarStatus(id, novoStatus) {
  limparMensagem();
  try {
    await updateDoc(doc(db, "eventos", id), {
      status: novoStatus,
      revisadoEm: serverTimestamp()
    });
    mostrarMensagem(
      novoStatus === "aprovado"
        ? "Evento aprovado. Ele já aparece na agenda pública."
        : `Evento movido para "${novoStatus}".`,
      "sucesso"
    );
    await carregarEventos();
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(
      erro.code === "permission-denied"
        ? "Sem permissão para alterar este evento. Confira se você entrou com a conta de administrador."
        : "Não foi possível atualizar o evento. Tente novamente.",
      "erro"
    );
  }
}

// Abas de filtro
document.querySelectorAll(".aba").forEach(botao => {
  botao.addEventListener("click", async () => {
    filtroAtual = botao.dataset.filtro;
    document.querySelectorAll(".aba").forEach(b => {
      const ativa = b === botao;
      b.classList.toggle("ativa", ativa);
      b.setAttribute("aria-selected", ativa ? "true" : "false");
    });
    limparMensagem();
    await carregarEventos();
  });
});

// Só o administrador vê a página
onAuthStateChanged(auth, async usuario => {
  const ehAdmin = !!usuario && usuario.email === EMAIL_ADMIN;

  $("aviso-acesso").classList.toggle("oculto", ehAdmin);
  $("area-admin").classList.toggle("oculto", !ehAdmin);

  if (!usuario) {
    $("subtitulo-admin").textContent = "Entre com a conta de administrador.";
    return;
  }

  if (!ehAdmin) {
    $("subtitulo-admin").textContent = "Acesso restrito.";
    return;
  }

  await carregarEventos();
});
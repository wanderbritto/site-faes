// FAES - Caixa de mensagens entre operadores

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const $ = id => document.getElementById(id);

let usuarioAtual = null;
let recebidas = [];
let enviadas = [];
let abaAtiva = "recebidas";

// ---------- Mensagens e seções ----------
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

function mostrarArea(logado) {
  $("area-login").classList.toggle("oculto", logado);
  $("area-caixa").classList.toggle("oculto", !logado);
}

function formatarData(timestamp) {
  if (!timestamp || typeof timestamp.toDate !== "function") return "";
  return timestamp.toDate().toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

// Mais recentes primeiro
function porDataDesc(a, b) {
  const ta = a.criadaEm && a.criadaEm.toMillis ? a.criadaEm.toMillis() : 0;
  const tb = b.criadaEm && b.criadaEm.toMillis ? b.criadaEm.toMillis() : 0;
  return tb - ta;
}

// ---------- Carregamento ----------
async function carregarCaixa() {
  const uid = usuarioAtual.uid;

  const [snapRecebidas, snapEnviadas] = await Promise.all([
    getDocs(query(collection(db, "mensagens"), where("para", "==", uid))),
    getDocs(query(collection(db, "mensagens"), where("de", "==", uid)))
  ]);

  recebidas = snapRecebidas.docs.map(d => ({ id: d.id, ...d.data() })).sort(porDataDesc);
  enviadas = snapEnviadas.docs.map(d => ({ id: d.id, ...d.data() })).sort(porDataDesc);

  const naoLidas = recebidas.filter(m => !m.lida).length;
  $("subtitulo-mensagens").textContent = naoLidas > 0
    ? `Você tem ${naoLidas} mensagem(ns) não lida(s).`
    : "Converse com outros operadores da FAES.";

  await renderizarAba();
}

async function carregarBloqueados() {
  const snap = await getDocs(collection(db, "perfis", usuarioAtual.uid, "bloqueados"));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ---------- Criação dos elementos ----------
function criarBotao(texto, classe, aoClicar) {
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = classe;
  botao.textContent = texto;
  botao.addEventListener("click", aoClicar);
  return botao;
}

function criarLinkPerfil(uid, texto) {
  const link = document.createElement("a");
  link.className = "botao botao-secundario";
  link.href = `perfil.html?id=${encodeURIComponent(uid)}`;
  link.textContent = texto;
  return link;
}

function criarCardMensagem(mensagem, tipo) {
  const card = document.createElement("article");
  card.className = "card mensagem-item";

  const cabecalho = document.createElement("p");
  cabecalho.className = "card-data";
  const nome = tipo === "recebida" ? mensagem.nomeDe : mensagem.nomePara;
  const rotulo = tipo === "recebida" ? "De" : "Para";
  cabecalho.textContent = `${rotulo}: ${nome || "Operador"} · ${formatarData(mensagem.criadaEm)}`;
  card.appendChild(cabecalho);

  if (tipo === "recebida" && !mensagem.lida) {
    const selo = document.createElement("span");
    selo.className = "selo";
    selo.textContent = "NOVA";
    card.appendChild(selo);
  }

  const texto = document.createElement("p");
  texto.className = "texto-quebra";
  texto.textContent = mensagem.texto;
  card.appendChild(texto);

  const acoes = document.createElement("div");
  acoes.className = "acoes-mensagem";

  if (tipo === "recebida") {
    acoes.appendChild(criarLinkPerfil(mensagem.de, "Responder"));

    if (!mensagem.lida) {
      acoes.appendChild(criarBotao("Marcar como lida", "botao botao-secundario", () => marcarLida(mensagem.id)));
    }

    acoes.appendChild(criarBotao("Bloquear remetente", "botao botao-secundario", () => bloquear(mensagem.de, mensagem.nomeDe)));
  } else {
    acoes.appendChild(criarLinkPerfil(mensagem.para, "Ver perfil"));
  }

  acoes.appendChild(criarBotao("Apagar", "botao botao-secundario", () => apagar(mensagem.id)));

  card.appendChild(acoes);
  return card;
}

function criarCardBloqueado(bloqueado) {
  const card = document.createElement("article");
  card.className = "card mensagem-item";

  const nome = document.createElement("h3");
  nome.textContent = bloqueado.nome || "Operador";
  card.appendChild(nome);

  const acoes = document.createElement("div");
  acoes.className = "acoes-mensagem";
  acoes.appendChild(criarBotao("Desbloquear", "botao botao-secundario", () => desbloquear(bloqueado.id)));
  card.appendChild(acoes);

  return card;
}

// ---------- Renderização das abas ----------
async function renderizarAba() {
  const lista = $("lista-mensagens");
  lista.innerHTML = "";

  let itens = [];
  let elementos = [];

  if (abaAtiva === "bloqueados") {
    itens = await carregarBloqueados();
    elementos = itens.map(b => criarCardBloqueado(b));
    if (itens.length === 0) {
      elementos = [criarAviso("Você não bloqueou nenhum operador.")];
    }
  } else {
    itens = abaAtiva === "recebidas" ? recebidas : enviadas;
    const tipo = abaAtiva === "recebidas" ? "recebida" : "enviada";
    elementos = itens.map(m => criarCardMensagem(m, tipo));
    if (itens.length === 0) {
      elementos = [criarAviso(
        abaAtiva === "recebidas" ? "Nenhuma mensagem recebida ainda." : "Você ainda não enviou mensagens."
      )];
    }
  }

  elementos.forEach(el => lista.appendChild(el));
}

function criarAviso(texto) {
  const aviso = document.createElement("p");
  aviso.className = "aviso-lista";
  aviso.textContent = texto;
  return aviso;
}

// ---------- Ações ----------
async function recarregar() {
  await carregarCaixa();
}

async function marcarLida(id) {
  limparMensagem();
  try {
    await updateDoc(doc(db, "mensagens", id), { lida: true });
    await recarregar();
  } catch (erro) {
    console.error(erro);
    mostrarMensagem("Não foi possível marcar a mensagem como lida.", "erro");
  }
}

async function apagar(id) {
  limparMensagem();
  if (!confirm("Apagar esta mensagem? Ela sai da caixa das duas pessoas.")) return;
  try {
    await deleteDoc(doc(db, "mensagens", id));
    await recarregar();
    mostrarMensagem("Mensagem apagada.", "sucesso");
  } catch (erro) {
    console.error(erro);
    mostrarMensagem("Não foi possível apagar a mensagem.", "erro");
  }
}

async function bloquear(uidRemetente, nome) {
  limparMensagem();
  if (!confirm(`Bloquear ${nome || "este operador"}? Ele não poderá mais enviar mensagens para você.`)) return;
  try {
    await setDoc(doc(db, "perfis", usuarioAtual.uid, "bloqueados", uidRemetente), {
      nome: nome || "Operador",
      bloqueadoEm: serverTimestamp()
    });
    mostrarMensagem("Operador bloqueado.", "sucesso");
  } catch (erro) {
    console.error(erro);
    mostrarMensagem("Não foi possível bloquear o operador.", "erro");
  }
}

async function desbloquear(uidBloqueado) {
  limparMensagem();
  try {
    await deleteDoc(doc(db, "perfis", usuarioAtual.uid, "bloqueados", uidBloqueado));
    mostrarMensagem("Operador desbloqueado.", "sucesso");
    await renderizarAba();
  } catch (erro) {
    console.error(erro);
    mostrarMensagem("Não foi possível desbloquear o operador.", "erro");
  }
}

// ---------- Abas ----------
document.querySelectorAll(".aba").forEach(botao => {
  botao.addEventListener("click", async () => {
    abaAtiva = botao.dataset.aba;
    document.querySelectorAll(".aba").forEach(b => {
      const ativa = b === botao;
      b.classList.toggle("ativa", ativa);
      b.setAttribute("aria-selected", ativa ? "true" : "false");
    });
    limparMensagem();
    await renderizarAba();
  });
});

// ---------- Controle de login ----------
onAuthStateChanged(auth, async usuario => {
  if (!usuario) {
    usuarioAtual = null;
    mostrarArea(false);
    $("subtitulo-mensagens").textContent = "Entre na sua conta para ver suas mensagens.";
    return;
  }

  usuarioAtual = usuario;
  mostrarArea(true);

  try {
    await carregarCaixa();
  } catch (erro) {
    console.error(erro);
    mostrarMensagem("Não foi possível carregar as mensagens. Tente novamente.", "erro");
  }
});
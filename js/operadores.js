// FAES - Lista de operadores com envio de mensagem (somente usuários logados)

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const TEXTO_MAXIMO = 1000;
const $ = id => document.getElementById(id);

let usuarioAtual = null;
let meuNome = "Operador";
let operadores = [];

// Remove acentos e maiúsculas para a busca
function normalizar(texto) {
  return (texto || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

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
  $("area-lista").classList.toggle("oculto", !logado);
}

function criarLinha(rotulo, valor) {
  const linha = document.createElement("p");
  const negrito = document.createElement("strong");
  negrito.textContent = rotulo + ": ";
  linha.appendChild(negrito);
  linha.appendChild(document.createTextNode(valor || "—"));
  return linha;
}

function criarFormularioEnvio(operador, statusEl) {
  const form = document.createElement("form");
  form.className = "formulario-envio oculto";
  form.noValidate = true;

  const idTexto = "texto-" + operador.uid;

  const rotulo = document.createElement("label");
  rotulo.htmlFor = idTexto;
  rotulo.textContent = "Mensagem";

  const textarea = document.createElement("textarea");
  textarea.id = idTexto;
  textarea.rows = 3;
  textarea.maxLength = TEXTO_MAXIMO;
  textarea.placeholder = `Escreva para ${operador.nome || "este operador"}`;

  const botao = document.createElement("button");
  botao.type = "submit";
  botao.className = "botao botao-principal";
  botao.textContent = "Enviar";

  form.append(rotulo, textarea, botao);

  form.addEventListener("submit", async evento => {
    evento.preventDefault();

    const texto = textarea.value.trim();
    if (!texto) {
      statusEl.textContent = "Digite a mensagem antes de enviar.";
      statusEl.className = "mensagem-card erro";
      return;
    }
    if (texto.length > TEXTO_MAXIMO) {
      statusEl.textContent = `A mensagem pode ter no máximo ${TEXTO_MAXIMO} caracteres.`;
      statusEl.className = "mensagem-card erro";
      return;
    }

    botao.disabled = true;
    statusEl.className = "mensagem-card oculto";

    try {
      await addDoc(collection(db, "mensagens"), {
        de: usuarioAtual.uid,
        para: operador.uid,
        nomeDe: meuNome,
        nomePara: operador.nome || "Operador",
        texto,
        lida: false,
        criadaEm: serverTimestamp()
      });

      textarea.value = "";
      form.classList.add("oculto");
      statusEl.textContent = "Mensagem enviada!";
      statusEl.className = "mensagem-card sucesso";
    } catch (erro) {
      console.error(erro);
      statusEl.textContent = erro.code === "permission-denied"
        ? "Não foi possível enviar. Este operador pode ter bloqueado você."
        : "Não foi possível enviar a mensagem. Tente novamente.";
      statusEl.className = "mensagem-card erro";
    } finally {
      botao.disabled = false;
    }
  });

  return form;
}

function criarCard(operador) {
  const card = document.createElement("article");
  card.className = "card operador-card";

  const nome = document.createElement("h3");
  nome.textContent = operador.nome || "Operador";
  card.appendChild(nome);

  card.appendChild(criarLinha("Equipe", operador.equipe));
  card.appendChild(criarLinha("Cidade", operador.cidade));
  card.appendChild(criarLinha("Idade", operador.idade ? String(operador.idade) : ""));

  const status = document.createElement("p");
  status.className = "mensagem-card oculto";

  const form = criarFormularioEnvio(operador, status);

  const acoes = document.createElement("div");
  acoes.className = "acoes-operador";

  const ver = document.createElement("a");
  ver.className = "botao botao-secundario";
  ver.href = `perfil.html?id=${encodeURIComponent(operador.uid)}`;
  ver.textContent = "Ver perfil";

  const enviar = document.createElement("button");
  enviar.type = "button";
  enviar.className = "botao botao-principal";
  enviar.textContent = "Enviar mensagem";
  enviar.addEventListener("click", () => {
    form.classList.toggle("oculto");
    if (!form.classList.contains("oculto")) {
      form.querySelector("textarea").focus();
    }
  });

  acoes.append(ver, enviar);
  card.append(acoes, form, status);
  return card;
}

function renderizar() {
  const lista = $("lista-operadores");
  lista.innerHTML = "";

  const busca = normalizar($("busca").value);
  const visiveis = operadores.filter(op => {
    if (!busca) return true;
    return [op.nome, op.equipe, op.cidade].some(valor => normalizar(valor).includes(busca));
  });

  $("contador").textContent = visiveis.length === 1
    ? "1 operador encontrado"
    : `${visiveis.length} operadores encontrados`;

  if (visiveis.length === 0) {
    const aviso = document.createElement("p");
    aviso.className = "aviso-lista";
    aviso.textContent = operadores.length === 0
      ? "Ainda não há outros operadores cadastrados."
      : "Nenhum operador encontrado para esta busca.";
    lista.appendChild(aviso);
    return;
  }

  visiveis.forEach(op => lista.appendChild(criarCard(op)));
}

async function carregarOperadores() {
  const snapshot = await getDocs(collection(db, "perfis"));

  operadores = snapshot.docs
    .map(d => ({ ...d.data(), uid: d.id }))
    .filter(op => op.uid !== usuarioAtual.uid)
    .sort((a, b) => normalizar(a.nome).localeCompare(normalizar(b.nome)));

  $("subtitulo").textContent = "Veja quem faz parte da FAES e envie uma mensagem.";
  renderizar();
}

$("busca").addEventListener("input", renderizar);

onAuthStateChanged(auth, async usuario => {
  limparMensagem();

  if (!usuario) {
    usuarioAtual = null;
    mostrarArea(false);
    $("subtitulo").textContent = "Entre na sua conta para ver os operadores.";
    return;
  }

  usuarioAtual = usuario;
  mostrarArea(true);

  try {
    const meuPerfil = await getDoc(doc(db, "perfis", usuario.uid));
    meuNome = (meuPerfil.exists() && meuPerfil.data().nome) || usuario.displayName || "Operador";
    await carregarOperadores();
  } catch (erro) {
    console.error(erro);
    $("subtitulo").textContent = "";
    mostrarMensagem("Não foi possível carregar os operadores. Tente novamente.", "erro");
  }
});
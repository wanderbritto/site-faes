// FAES - Envio de mensagem pelo perfil público de outro operador

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const TEXTO_MAXIMO = 1000;
const destinoId = new URLSearchParams(window.location.search).get("id");

const $ = id => document.getElementById(id);

function mostrarMensagem(texto, tipo) {
  const caixa = $("mensagem-envio");
  caixa.textContent = texto;
  caixa.className = "mensagem " + tipo;
}

function limparMensagem() {
  const caixa = $("mensagem-envio");
  caixa.textContent = "";
  caixa.className = "mensagem oculto";
}

// Mostra o formulário só para usuário logado vendo o perfil de outra pessoa
onAuthStateChanged(auth, usuario => {
  const bloco = $("bloco-enviar");
  if (!bloco) return;

  const podeEnviar = usuario && destinoId && destinoId !== usuario.uid;
  bloco.classList.toggle("oculto", !podeEnviar);
});

$("form-mensagem").addEventListener("submit", async evento => {
  evento.preventDefault();
  limparMensagem();

  const usuario = auth.currentUser;
  if (!usuario || !destinoId) {
    mostrarMensagem("Entre na sua conta para enviar mensagens.", "erro");
    return;
  }

  const texto = $("texto-mensagem").value.trim();
  if (!texto) {
    mostrarMensagem("Digite a mensagem antes de enviar.", "erro");
    return;
  }
  if (texto.length > TEXTO_MAXIMO) {
    mostrarMensagem(`A mensagem pode ter no máximo ${TEXTO_MAXIMO} caracteres.`, "erro");
    return;
  }

  try {
    // Nome do remetente (perfil próprio) e do destinatário
    const meuPerfil = await getDoc(doc(db, "perfis", usuario.uid));
    const perfilDestino = await getDoc(doc(db, "perfis", destinoId));

    if (!perfilDestino.exists()) {
      mostrarMensagem("Este operador ainda não preencheu o perfil.", "erro");
      return;
    }

    const nomeDe = (meuPerfil.exists() && meuPerfil.data().nome) || usuario.displayName || "Operador";
    const nomePara = perfilDestino.data().nome || "Operador";

    await addDoc(collection(db, "mensagens"), {
      de: usuario.uid,
      para: destinoId,
      nomeDe,
      nomePara,
      texto,
      lida: false,
      criadaEm: serverTimestamp()
    });

    $("texto-mensagem").value = "";
    mostrarMensagem("Mensagem enviada!", "sucesso");
  } catch (erro) {
    console.error(erro);
    if (erro.code === "permission-denied") {
      mostrarMensagem("Não foi possível enviar esta mensagem. Você pode ter sido bloqueado por este operador.", "erro");
    } else {
      mostrarMensagem("Não foi possível enviar a mensagem. Tente novamente.", "erro");
    }
  }
});
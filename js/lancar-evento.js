// FAES - Lançamento de evento pelo organizador (fica pendente até aprovação)

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const LIMITE_DESCRICAO = 1000;

const $ = id => document.getElementById(id);

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

// Data de hoje no formato AAAA-MM-DD, no horário local
function dataDeHoje() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

// Aceita só links https
function fotoValida(url) {
  if (!url) return true;
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

function modalidadesSelecionadas() {
  return [...document.querySelectorAll('input[name="modalidades"]:checked')]
    .map(caixa => caixa.value);
}

// Mostra o formulário só para usuário logado
onAuthStateChanged(auth, usuario => {
  $("aviso-login").classList.toggle("oculto", !!usuario);
  $("form-evento").classList.toggle("oculto", !usuario);
});

$("form-evento").addEventListener("submit", async evento => {
  evento.preventDefault();
  limparMensagem();

  const usuario = auth.currentUser;
  if (!usuario) {
    mostrarMensagem("Entre na sua conta para lançar um evento.", "erro");
    return;
  }

  const dados = {
    nome: $("evento-nome").value.trim(),
    data: $("evento-data").value,
    horario: $("evento-horario").value,
    cidade: $("evento-cidade").value.trim(),
    local: $("evento-local").value.trim(),
    modalidades: modalidadesSelecionadas(),
    descricao: $("evento-descricao").value.trim(),
    contato: $("evento-contato").value.trim(),
    foto: $("evento-foto").value.trim()
  };

  if (!dados.nome || !dados.data || !dados.horario || !dados.cidade || !dados.local || !dados.descricao || !dados.contato) {
    mostrarMensagem("Preencha todos os campos obrigatórios.", "erro");
    return;
  }

  if (dados.data < dataDeHoje()) {
    mostrarMensagem("A data do evento não pode ser anterior a hoje.", "erro");
    return;
  }

  if (dados.modalidades.length === 0) {
    mostrarMensagem("Marque pelo menos uma modalidade.", "erro");
    return;
  }

  if (dados.descricao.length > LIMITE_DESCRICAO) {
    mostrarMensagem(`A descrição pode ter no máximo ${LIMITE_DESCRICAO} caracteres.`, "erro");
    return;
  }

  if (!fotoValida(dados.foto)) {
    mostrarMensagem("O link da foto precisa começar com https://", "erro");
    return;
  }

  try {
    await addDoc(collection(db, "eventos"), {
      ...dados,
      status: "pendente",
      criadoPor: usuario.uid,
      criadoEm: serverTimestamp()
    });

    $("form-evento").reset();
    mostrarMensagem(
      "Evento enviado! Ele será analisado pela FAES e aparecerá na agenda depois da aprovação.",
      "sucesso"
    );
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(
      erro.code === "permission-denied"
        ? "Não foi possível enviar o evento. Confira se você está logado e tente novamente."
        : "Não foi possível enviar o evento. Tente novamente.",
      "erro"
    );
  }
});
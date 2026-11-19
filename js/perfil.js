// FAES - Perfil do usuário (visão pública e edição própria)

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const IDADE_MINIMA = 10;
const IDADE_MAXIMA = 99;
const LIMITE_EQUIPAMENTOS = 1000;

const ROTULOS_TIPO = {
  "operador": "Operador de equipe",
  "dono-campo": "Dono de campo",
  "organizador": "Organizador de eventos"
};

const $ = id => document.getElementById(id);

const idNaUrl = new URLSearchParams(window.location.search).get("id");

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

// Mostra apenas uma seção: "login", "publica" ou "edicao"
function mostrarSecao(secao) {
  $("aviso-login").classList.toggle("oculto", secao !== "login");
  $("visao-publica").classList.toggle("oculto", secao !== "publica");
  $("form-perfil").classList.toggle("oculto", secao !== "edicao");
}

function definirTitulo(titulo, subtitulo) {
  $("titulo-perfil").textContent = titulo;
  $("subtitulo-perfil").textContent = subtitulo;
}

// ---------- Lista de equipes (sugestão no campo) ----------
async function carregarEquipes() {
  try {
    const resposta = await fetch("dados/equipes.json");
    if (!resposta.ok) return;
    const equipes = await resposta.json();
    const nomes = [...new Set(equipes.map(e => e.nome))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    const lista = $("lista-equipes");
    nomes.forEach(nome => {
      const opcao = document.createElement("option");
      opcao.value = nome;
      lista.appendChild(opcao);
    });
  } catch (erro) {
    console.error(erro);
  }
}

// ---------- Edição do próprio perfil ----------
async function carregarEdicao(usuario) {
  const perfilSnap = await getDoc(doc(db, "perfis", usuario.uid));
  let dados = perfilSnap.exists() ? perfilSnap.data() : null;

  // Primeira vez: aproveita o que foi informado no cadastro
  if (!dados) {
    const contaSnap = await getDoc(doc(db, "usuarios", usuario.uid));
    const conta = contaSnap.exists() ? contaSnap.data() : {};
    dados = {
      nome: conta.nome || usuario.displayName || "",
      equipe: conta.equipe || "",
      cidade: "",
      idade: null,
      equipamentos: "",
      tipo: conta.tipo || ""
    };
  }

  $("campo-nome").value = dados.nome || "";
  $("campo-equipe").value = dados.equipe || "";
  $("campo-cidade").value = dados.cidade || "";
  $("campo-idade").value = dados.idade || "";
  $("campo-equipamentos").value = dados.equipamentos || "";
  $("form-perfil").dataset.tipo = dados.tipo || "";

  mostrarSecao("edicao");
}

$("form-perfil").addEventListener("submit", async evento => {
  evento.preventDefault();
  limparMensagem();

  const usuario = auth.currentUser;
  if (!usuario) {
    mostrarMensagem("Entre na sua conta para salvar o perfil.", "erro");
    return;
  }

  const nome = $("campo-nome").value.trim();
  const equipe = $("campo-equipe").value.trim();
  const cidade = $("campo-cidade").value.trim();
  const idadeTexto = $("campo-idade").value.trim();
  const equipamentos = $("campo-equipamentos").value.trim();

  if (!nome) {
    mostrarMensagem("Digite seu nome.", "erro");
    return;
  }

  let idade = null;
  if (idadeTexto) {
    idade = Number(idadeTexto);
    if (!Number.isInteger(idade) || idade < IDADE_MINIMA || idade > IDADE_MAXIMA) {
      mostrarMensagem(`A idade precisa estar entre ${IDADE_MINIMA} e ${IDADE_MAXIMA} anos.`, "erro");
      return;
    }
  }

  if (equipamentos.length > LIMITE_EQUIPAMENTOS) {
    mostrarMensagem(`A descrição de equipamentos pode ter no máximo ${LIMITE_EQUIPAMENTOS} caracteres.`, "erro");
    return;
  }

  try {
    // Só campos públicos. E-mail e telefone ficam em "usuarios" e não são gravados aqui.
    await setDoc(doc(db, "perfis", usuario.uid), {
      uid: usuario.uid,
      nome,
      equipe,
      cidade,
      idade,
      equipamentos,
      tipo: $("form-perfil").dataset.tipo || "",
      atualizadoEm: serverTimestamp()
    }, { merge: true });

    mostrarMensagem("Perfil salvo com sucesso!", "sucesso");
  } catch (erro) {
    console.error(erro);
    mostrarMensagem(
      erro.code === "permission-denied"
        ? "Não foi possível salvar. Verifique se você está logado."
        : "Não foi possível salvar o perfil. Tente novamente.",
      "erro"
    );
  }
});

// ---------- Perfil público de outro usuário ----------
async function carregarPublico(uid) {
  try {
    const snapshot = await getDoc(doc(db, "perfis", uid));

    if (!snapshot.exists()) {
      definirTitulo("Perfil não encontrado", "Este operador ainda não preencheu o perfil.");
      mostrarSecao("vazia");
      return;
    }

    const dados = snapshot.data();
    definirTitulo(
      dados.nome || "Operador",
      dados.tipo && ROTULOS_TIPO[dados.tipo] ? ROTULOS_TIPO[dados.tipo] : "Perfil de operador"
    );

    $("publico-nome").textContent = dados.nome || "Operador";
    $("publico-equipe").textContent = dados.equipe || "Não informada";
    $("publico-cidade").textContent = dados.cidade || "Não informada";
    $("publico-idade").textContent = dados.idade ? `${dados.idade} anos` : "Não informada";
    $("publico-equipamentos").textContent = dados.equipamentos || "Nenhum equipamento informado.";

    mostrarSecao("publica");
  } catch (erro) {
    console.error(erro);
    const semPermissao = erro.code === "permission-denied";
    definirTitulo(
      "Perfil indisponível",
      semPermissao
        ? "Você não tem permissão para ver este perfil."
        : "Não foi possível carregar o perfil. Tente novamente."
    );
    mostrarSecao("vazia");
  }
}

// ---------- Controle geral ----------
onAuthStateChanged(auth, async usuario => {
  if (!usuario) {
    definirTitulo("Perfil", "Entre na sua conta para ver os perfis da FAES.");
    mostrarSecao("login");
    return;
  }

  const uidAlvo = idNaUrl || usuario.uid;

  if (uidAlvo === usuario.uid) {
    definirTitulo("Perfil", "Seus dados de operador na FAES.");
    try {
      await carregarEdicao(usuario);
    } catch (erro) {
      console.error(erro);
      mostrarMensagem("Não foi possível carregar o seu perfil. Tente novamente.", "erro");
    }
  } else {
    await carregarPublico(uidAlvo);
  }
});

document.addEventListener("DOMContentLoaded", carregarEquipes);
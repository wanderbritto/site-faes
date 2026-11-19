// FAES - Login, cadastro e painel da conta

import { auth, db } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Só para exibir o selo de administrador. A permissão real está nas regras do Firestore.
const EMAIL_ADMIN = "wander.paula.britto@gmail.com";
const EQUIPE_OUTRA = "__outra__";

const ROTULOS_TIPO = {
  "operador": "Operador de equipe",
  "dono-campo": "Dono de campo",
  "organizador": "Organizador de eventos"
};

const $ = id => document.getElementById(id);

// ---------- Mensagens ----------
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

// Traduz os erros do Firebase para português
function traduzirErro(erro) {
  const codigo = (erro && erro.code) || "";
  const mensagens = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/invalid-email": "O e-mail informado não é válido.",
    "auth/email-already-in-use": "Este e-mail já está cadastrado. Use a aba Entrar.",
    "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    "auth/network-request-failed": "Sem conexão com a internet. Tente novamente."
  };
  return mensagens[codigo] || "Não foi possível concluir. Tente novamente.";
}

// ---------- Abas ----------
function mostrarAba(aba) {
  const entrar = aba === "entrar";
  $("form-entrar").classList.toggle("oculto", !entrar);
  $("form-cadastrar").classList.toggle("oculto", entrar);

  document.querySelectorAll(".aba").forEach(botao => {
    const ativa = botao.dataset.aba === aba;
    botao.classList.toggle("ativa", ativa);
    botao.setAttribute("aria-selected", ativa ? "true" : "false");
  });
  limparMensagem();
}

document.querySelectorAll(".aba").forEach(botao => {
  botao.addEventListener("click", () => mostrarAba(botao.dataset.aba));
});

// ---------- Campos conforme o tipo de conta ----------
function atualizarCamposTipo() {
  const tipo = $("cadastro-tipo").value;
  const ehOperador = tipo === "operador";

  $("grupo-operador").classList.toggle("oculto", !ehOperador);
  $("grupo-organizacao").classList.toggle("oculto", ehOperador);

  $("rotulo-organizacao").textContent =
    tipo === "dono-campo" ? "Nome do campo" : "Nome da organização";
}

function atualizarCampoEquipeNova() {
  const ehOutra = $("cadastro-equipe").value === EQUIPE_OUTRA;
  $("grupo-equipe-nova").classList.toggle("oculto", !ehOutra);
}

$("cadastro-tipo").addEventListener("change", atualizarCamposTipo);
$("cadastro-equipe").addEventListener("change", atualizarCampoEquipeNova);

// Preenche a lista de equipes com os nomes de dados/equipes.json
async function carregarEquipes() {
  const select = $("cadastro-equipe");
  try {
    const resposta = await fetch("dados/equipes.json");
    if (!resposta.ok) throw new Error("Lista de equipes indisponível.");
    const equipes = await resposta.json();
    const nomes = [...new Set(equipes.map(e => e.nome))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    nomes.forEach(nome => {
      const opcao = document.createElement("option");
      opcao.value = nome;
      opcao.textContent = nome;
      select.appendChild(opcao);
    });
  } catch (erro) {
    console.error(erro);
  }

  const outra = document.createElement("option");
  outra.value = EQUIPE_OUTRA;
  outra.textContent = "Minha equipe não está na lista (digitar)";
  select.appendChild(outra);
}

// ---------- Entrar ----------
$("form-entrar").addEventListener("submit", async evento => {
  evento.preventDefault();
  limparMensagem();

  const email = $("entrar-email").value.trim();
  const senha = $("entrar-senha").value;

  if (!email || !senha) {
    mostrarMensagem("Preencha e-mail e senha.", "erro");
    return;
  }

  try {
    await signInWithEmailAndPassword(auth, email, senha);
    // O painel é atualizado pelo onAuthStateChanged
  } catch (erro) {
    mostrarMensagem(traduzirErro(erro), "erro");
  }
});

// ---------- Esqueci minha senha ----------
$("botao-esqueci").addEventListener("click", async () => {
  limparMensagem();
  const email = $("entrar-email").value.trim();

  if (!email) {
    mostrarMensagem("Digite seu e-mail no campo acima e clique de novo.", "erro");
    return;
  }

  try {
    await sendPasswordResetEmail(auth, email);
    mostrarMensagem("Enviamos um link para redefinir a senha. Verifique sua caixa de entrada.", "sucesso");
  } catch (erro) {
    mostrarMensagem(traduzirErro(erro), "erro");
  }
});

// ---------- Cadastrar ----------
$("form-cadastrar").addEventListener("submit", async evento => {
  evento.preventDefault();
  limparMensagem();

  const tipo = $("cadastro-tipo").value;
  const nome = $("cadastro-nome").value.trim();
  const telefone = $("cadastro-telefone").value.trim();
  const email = $("cadastro-email").value.trim();
  const senha = $("cadastro-senha").value;
  const senha2 = $("cadastro-senha2").value;

  if (!nome || !email || !senha) {
    mostrarMensagem("Preencha nome, e-mail e senha.", "erro");
    return;
  }
  if (senha.length < 6) {
    mostrarMensagem("A senha precisa ter pelo menos 6 caracteres.", "erro");
    return;
  }
  if (senha !== senha2) {
    mostrarMensagem("As senhas não coincidem.", "erro");
    return;
  }

  // Dados específicos de cada tipo de conta
  const dadosTipo = {};

  if (tipo === "operador") {
    const escolhida = $("cadastro-equipe").value;
    if (!escolhida) {
      mostrarMensagem("Selecione a sua equipe.", "erro");
      return;
    }
    if (escolhida === EQUIPE_OUTRA) {
      const nomeNova = $("cadastro-equipe-nova").value.trim();
      if (!nomeNova) {
        mostrarMensagem("Digite o nome da sua equipe.", "erro");
        return;
      }
      dadosTipo.equipe = nomeNova;
      dadosTipo.equipeNova = true;   // a equipe ainda não está na lista oficial
    } else {
      dadosTipo.equipe = escolhida;
      dadosTipo.equipeNova = false;
    }
  } else {
    const organizacao = $("cadastro-organizacao").value.trim();
    if (!organizacao) {
      mostrarMensagem(
        tipo === "dono-campo" ? "Digite o nome do campo." : "Digite o nome da organização.",
        "erro"
      );
      return;
    }
    dadosTipo.organizacao = organizacao;
  }

  try {
    const credencial = await createUserWithEmailAndPassword(auth, email, senha);
    await updateProfile(credencial.user, { displayName: nome });

    await setDoc(doc(db, "usuarios", credencial.user.uid), {
      nome,
      email,
      telefone,
      tipo,
      ...dadosTipo,
      criadoEm: serverTimestamp()
    });

    mostrarMensagem("Conta criada com sucesso!", "sucesso");
  } catch (erro) {
    console.error(erro);
    if (erro.code === "permission-denied") {
      mostrarMensagem("A conta foi criada, mas o perfil não pôde ser salvo. Entre com seu e-mail e fale com a FAES.", "erro");
    } else {
      mostrarMensagem(traduzirErro(erro), "erro");
    }
  }
});

// ---------- Painel da conta ----------
$("botao-sair").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async usuario => {
  const painel = $("painel-usuario");
  const formularios = $("area-formularios");
  const titulo = $("titulo-login");

  if (!usuario) {
    painel.classList.add("oculto");
    formularios.classList.remove("oculto");
    titulo.classList.remove("oculto");
    return;
  }

  // Logado: esconde o título e os formulários, mostra só o painel
  formularios.classList.add("oculto");
  titulo.classList.add("oculto");
  painel.classList.remove("oculto");

  try {
    const snapshot = await getDoc(doc(db, "usuarios", usuario.uid));
    const dados = snapshot.exists() ? snapshot.data() : null;

    $("painel-nome").textContent = (dados && dados.nome) || usuario.displayName || "—";
    $("painel-email").textContent = usuario.email || "—";
    $("painel-tipo").textContent = dados ? (ROTULOS_TIPO[dados.tipo] || dados.tipo) : "Perfil não encontrado";

    let extra = "";
    if (dados && dados.tipo === "operador" && dados.equipe) {
      extra = "Equipe: " + dados.equipe + (dados.equipeNova ? " (aguardando confirmação da FAES)" : "");
    } else if (dados && dados.organizacao) {
      extra = (dados.tipo === "dono-campo" ? "Campo: " : "Organização: ") + dados.organizacao;
    }
    $("painel-extra").textContent = extra;

    $("painel-admin").classList.toggle("oculto", usuario.email !== EMAIL_ADMIN);
  } catch (erro) {
    console.error(erro);
    $("painel-extra").textContent = "Não foi possível carregar os dados da conta.";
  }
});

// ---------- Início ----------
document.addEventListener("DOMContentLoaded", () => {
  atualizarCamposTipo();
  carregarEquipes();
});
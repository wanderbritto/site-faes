// FAES - Área do usuário no cabeçalho (login compartilhado em todas as páginas)

import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ID_AREA = "area-usuario";
const EMAIL_ADMIN = "wander.paula.britto@gmail.com";

function obterArea() {
  let area = document.getElementById(ID_AREA);
  if (area) return area;

  area = document.createElement("div");
  area.id = ID_AREA;
  area.className = "area-usuario";

  const cabecalhoInterno = document.querySelector(".cabecalho-interno");
  if (cabecalhoInterno) cabecalhoInterno.appendChild(area);
  return area;
}

function criarLink(texto, href, classe = "") {
  const link = document.createElement("a");
  link.textContent = texto;
  link.href = href;
  if (classe) link.className = classe;
  return link;
}

function primeiroNome(nome) {
  return (nome || "Minha conta").trim().split(/\s+/)[0];
}

async function montarLogado(area, usuario) {
  let nome = usuario.displayName || "";
  try {
    const perfil = await getDoc(doc(db, "perfis", usuario.uid));
    if (perfil.exists() && perfil.data().nome) nome = perfil.data().nome;
  } catch (erro) {
    console.error(erro);
  }

  area.innerHTML = "";

  const gatilho = document.createElement("button");
  gatilho.type = "button";
  gatilho.className = "botao botao-secundario area-usuario-gatilho";
  gatilho.setAttribute("aria-expanded", "false");
  gatilho.textContent = primeiroNome(nome) + " ▾";

  const lista = document.createElement("div");
  lista.className = "area-usuario-lista oculto";
  lista.appendChild(criarLink("Mensagens", "mensagens.html"));
  lista.appendChild(criarLink("Minha conta", "perfil.html"));

  // Só a conta administradora vê o painel
  if (usuario.email === EMAIL_ADMIN) {
    lista.appendChild(criarLink("Painel admin", "admin.html"));
  }

  const sair = document.createElement("button");
  sair.type = "button";
  sair.className = "area-usuario-sair";
  sair.textContent = "Sair";
  sair.addEventListener("click", () => signOut(auth));
  lista.appendChild(sair);

  gatilho.addEventListener("click", evento => {
    evento.stopPropagation();
    const aberto = lista.classList.toggle("oculto") === false;
    gatilho.setAttribute("aria-expanded", aberto ? "true" : "false");
  });

  document.addEventListener("click", () => {
    lista.classList.add("oculto");
    gatilho.setAttribute("aria-expanded", "false");
  });

  area.appendChild(gatilho);
  area.appendChild(lista);
}

function montarDeslogado(area) {
  area.innerHTML = "";
  area.appendChild(criarLink("Entrar / Cadastrar", "login.html", "botao botao-principal area-usuario-entrar"));
}

onAuthStateChanged(auth, usuario => {
  const area = obterArea();
  if (usuario) {
    montarLogado(area, usuario);
  } else {
    montarDeslogado(area);
  }
});
// FAES - App mobile: próximos eventos e conta do usuário

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const NOMES_MODALIDADE = {
  milsim: "MilSim",
  speedsoft: "Speedsoft",
  cqb: "CQB",
  "4fun": "4Fun"
};

const lista = document.getElementById("lista-eventos");

// "2026-12-05" vira "05/12"
function formatarData(iso) {
  if (!iso) return "Data a definir";
  const [, mes, dia] = iso.split("-");
  return `${dia}/${mes}`;
}

function normalizarModalidades(valor) {
  if (Array.isArray(valor)) return valor.map(m => String(m).trim().toLowerCase());
  if (typeof valor === "string") return valor.split(",").map(m => m.trim().toLowerCase());
  return [];
}

function criarCard(evento) {
  const card = document.createElement("a");
  card.className = "evento";
  card.href = "eventos.html";

  const data = document.createElement("span");
  data.className = "evento-data";
  data.textContent = formatarData(evento.data) + (evento.horario ? " · " + evento.horario : "");
  card.appendChild(data);

  const nome = document.createElement("h3");
  nome.className = "evento-nome";
  nome.textContent = evento.nome || "Evento sem nome";
  card.appendChild(nome);

  const local = document.createElement("p");
  local.className = "evento-local";
  local.textContent = [evento.cidade, evento.local].filter(Boolean).join(" · ") || "Local a definir";
  card.appendChild(local);

  const tags = document.createElement("div");
  tags.className = "evento-tags";
  normalizarModalidades(evento.modalidades).forEach(m => {
    if (!m) return;
    const tag = document.createElement("span");
    tag.textContent = NOMES_MODALIDADE[m] || m;
    tags.appendChild(tag);
  });
  card.appendChild(tags);

  return card;
}

async function carregarEventos() {
  try {
    const consulta = query(collection(db, "eventos"), where("status", "==", "aprovado"));
    const resultado = await getDocs(consulta);

    const eventos = resultado.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.data || "9999").localeCompare(b.data || "9999"))
      .slice(0, 6);

    lista.innerHTML = "";

    if (eventos.length === 0) {
      lista.innerHTML = '<p class="vazio">Nenhum evento aprovado no momento.</p>';
      return;
    }

    eventos.forEach(evento => lista.appendChild(criarCard(evento)));
  } catch (erro) {
    console.error(erro);
    lista.innerHTML = '<p class="vazio">Não foi possível carregar os eventos.</p>';
  }
}

// Avatar e abas de conta: se logado, leva ao perfil; senão, ao login
onAuthStateChanged(auth, usuario => {
  const avatar = document.getElementById("topo-usuario");
  const abaPerfil = document.getElementById("tab-perfil");
  const abaMensagens = document.getElementById("tab-mensagens");

  if (usuario) {
    const inicial = (usuario.displayName || usuario.email || "?").trim().charAt(0).toUpperCase();
    avatar.textContent = inicial;
    avatar.href = "perfil.html";
    abaPerfil.href = "perfil.html";
    abaMensagens.href = "mensagens.html";
  } else {
    avatar.textContent = "?";
    avatar.href = "login.html";
    abaPerfil.href = "login.html";
    abaMensagens.href = "login.html";
  }
});

carregarEventos();
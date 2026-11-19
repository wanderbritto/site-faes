// FAES - Lista pública de eventos aprovados

import { db } from "./firebase.js";
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const NOMES_MODALIDADE = {
  "milsim": "MilSim",
  "speedsoft": "Speedsoft",
  "cqb": "CQB",
  "4fun": "4Fun"
};

const FOTO_PADRAO = "imagens/logo-faes.png";

let todosEventos = [];

// Aceita modalidades como lista (["milsim", "speedsoft"]) ou como texto ("milsim, speedsoft")
function normalizarModalidades(valor) {
  if (Array.isArray(valor)) {
    return valor.map(m => String(m).trim().toLowerCase()).filter(Boolean);
  }
  if (typeof valor === "string") {
    return valor.split(",").map(m => m.trim().toLowerCase()).filter(Boolean);
  }
  return [];
}

// Converte "2026-12-05" em "05/12/2026"
function formatarData(iso) {
  if (!iso) return "Data a definir";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Cria o card resumido de um evento (clicável)
function criarCard(evento) {
  const card = document.createElement("a");
  card.className = "card evento-card";
  card.href = `evento.html?id=${encodeURIComponent(evento.id)}`;

  const foto = document.createElement("img");
  foto.className = "evento-foto";
  foto.src = evento.foto || FOTO_PADRAO;
  foto.alt = "Foto do evento " + (evento.nome || "");
  foto.loading = "lazy";
  card.appendChild(foto);

  const corpo = document.createElement("div");
  corpo.className = "evento-corpo";

  const data = document.createElement("p");
  data.className = "card-data";
  data.textContent = formatarData(evento.data) + (evento.horario ? " · " + evento.horario : "");
  corpo.appendChild(data);

  const titulo = document.createElement("h3");
  titulo.textContent = evento.nome || "Evento sem nome";
  corpo.appendChild(titulo);

  const local = document.createElement("p");
  local.textContent = (evento.cidade || "") + (evento.local ? " · " + evento.local : "");
  corpo.appendChild(local);

  const tags = document.createElement("div");
  tags.className = "tags";
  evento.modalidadesLista.forEach(m => {
    const tag = document.createElement("span");
    tag.className = "tag-modalidade";
    tag.textContent = NOMES_MODALIDADE[m] || m;
    tags.appendChild(tag);
  });
  corpo.appendChild(tags);

  card.appendChild(corpo);
  return card;
}

// Mostra os eventos, aplicando o filtro de modalidade
function mostrarEventos(modalidade) {
  const grade = document.getElementById("lista-eventos");
  grade.innerHTML = "";

  const lista = modalidade
    ? todosEventos.filter(e => e.modalidadesLista.includes(modalidade))
    : todosEventos;

  if (lista.length === 0) {
    const aviso = document.createElement("p");
    aviso.className = "aviso-lista";
    aviso.textContent = todosEventos.length === 0
      ? "Nenhum evento aprovado no momento."
      : "Nenhum evento encontrado nesta modalidade.";
    grade.appendChild(aviso);
    return;
  }

  lista.forEach(evento => grade.appendChild(criarCard(evento)));
}

// Busca só os eventos aprovados e liga o filtro
async function iniciarEventos() {
  const grade = document.getElementById("lista-eventos");
  const filtro = document.getElementById("filtro-modalidade");

  try {
    const consulta = query(collection(db, "eventos"), where("status", "==", "aprovado"));
    const resultado = await getDocs(consulta);

    todosEventos = resultado.docs.map(doc => {
      const dados = doc.data();
      return {
        id: doc.id,
        ...dados,
        modalidadesLista: normalizarModalidades(dados.modalidades)
      };
    });

    // Ordena por data (mais próximos primeiro); eventos sem data vão para o fim
    todosEventos.sort((a, b) => (a.data || "9999").localeCompare(b.data || "9999"));

    mostrarEventos("");
  } catch (erro) {
    grade.innerHTML = "";
    const aviso = document.createElement("p");
    aviso.className = "aviso-lista";
    aviso.textContent = "Não foi possível carregar os eventos. Verifique a conexão e tente novamente.";
    grade.appendChild(aviso);
    console.error(erro);
  }

  filtro.addEventListener("change", () => mostrarEventos(filtro.value));
}

iniciarEventos();
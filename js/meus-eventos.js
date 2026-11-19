// FAES - Meus eventos na página Minha conta (somente eventos do próprio usuário)

import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const bloco = document.getElementById("bloco-meus-eventos");
const lista = document.getElementById("lista-meus-eventos");
const idNaUrl = new URLSearchParams(window.location.search).get("id");

const NOMES_MODALIDADE = {
  milsim: "MilSim",
  speedsoft: "Speedsoft",
  cqb: "CQB",
  "4fun": "4Fun"
};

const STATUS = {
  pendente: { texto: "Aguardando análise", classe: "status-pendente" },
  aprovado: { texto: "Aprovado · visível na agenda", classe: "status-aprovado" },
  recusado: { texto: "Recusado pela FAES", classe: "status-recusado" }
};

function formatarData(iso) {
  if (!iso) return "Data a definir";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function modalidadesTexto(valor) {
  const lista = Array.isArray(valor) ? valor : [];
  return lista
    .map(m => NOMES_MODALIDADE[String(m).toLowerCase()] || m)
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

function criarItem(evento) {
  const card = document.createElement("article");
  card.className = "meu-evento";

  const info = STATUS[evento.status] || { texto: evento.status || "Sem status", classe: "" };
  const selo = document.createElement("span");
  selo.className = "selo-status " + info.classe;
  selo.textContent = info.texto;
  card.appendChild(selo);

  const titulo = document.createElement("h3");
  titulo.textContent = evento.nome || "Evento sem nome";
  card.appendChild(titulo);

  card.appendChild(criarLinha("Data", `${formatarData(evento.data)} às ${evento.horario || "—"}`));
  card.appendChild(criarLinha("Local", `${evento.local || "—"} · ${evento.cidade || "—"}`));
  card.appendChild(criarLinha("Modalidades", modalidadesTexto(evento.modalidades)));

  if (evento.status === "aprovado") {
    const link = document.createElement("a");
    link.href = "eventos.html";
    link.className = "botao botao-secundario";
    link.textContent = "Ver na agenda";
    card.appendChild(link);
  }

  return card;
}

async function carregarMeusEventos(uid) {
  lista.innerHTML = "";

  const consulta = query(collection(db, "eventos"), where("criadoPor", "==", uid));
  const resultado = await getDocs(consulta);

  const eventos = resultado.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.data || "").localeCompare(a.data || ""));

  if (eventos.length === 0) {
    const aviso = document.createElement("p");
    aviso.className = "aviso-lista";
    aviso.textContent = "Você ainda não enviou nenhum evento. Use “Lançar evento” no menu de eventos.";
    lista.appendChild(aviso);
    return;
  }

  eventos.forEach(evento => lista.appendChild(criarItem(evento)));
}

onAuthStateChanged(auth, async usuario => {
  const ehPropio = !!usuario && (!idNaUrl || idNaUrl === usuario.uid);
  bloco.classList.toggle("oculto", !ehPropio);

  if (!ehPropio) return;

  try {
    await carregarMeusEventos(usuario.uid);
  } catch (erro) {
    console.error(erro);
    const aviso = document.createElement("p");
    aviso.className = "aviso-lista";
    aviso.textContent = "Não foi possível carregar seus eventos. Tente novamente.";
    lista.appendChild(aviso);
  }
});
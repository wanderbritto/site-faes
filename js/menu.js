// FAES - Menu principal com destaque da página e da seção atual

const ITENS_MENU = [
  { texto: "Início", href: "index.html", pagina: "index.html", secao: null },
  { texto: "Sobre", href: "sobre.html", pagina: "sobre.html", secao: null },
  { texto: "Equipes", href: "equipes.html", pagina: "equipes.html", secao: null },
  { texto: "Eventos", href: "eventos.html", pagina: "eventos.html", secao: null },
  { texto: "Operadores", href: "operadores.html", pagina: "operadores.html", secao: null },
  { texto: "Filiação", href: "filiacao.html", pagina: "filiacao.html", secao: null },
  { texto: "Notícias", href: "noticias.html", pagina: "noticias.html", secao: null },
  { texto: "Contato", href: "index.html#contato", pagina: "index.html", secao: "contato" }
];

const menu = document.getElementById("menu-principal");
const paginaAtual = window.location.pathname.split("/").pop() || "index.html";
const links = [];

if (menu) {
  menu.innerHTML = "";

  ITENS_MENU.forEach(item => {
    const link = document.createElement("a");
    link.href = item.href;
    link.textContent = item.texto;
    menu.appendChild(link);
    links.push({ link, item });
  });
}

// Marca o item da página atual (itens sem seção)
function marcarPaginaAtual() {
  links.forEach(({ link, item }) => {
    link.removeAttribute("aria-current");
    if (item.pagina === paginaAtual && !item.secao) {
      link.setAttribute("aria-current", "page");
    }
  });
}

// Na página inicial, marca "Contato" quando a seção de contato está visível
function marcarSecaoVisivel() {
  if (paginaAtual !== "index.html") return;

  const contato = document.getElementById("contato");
  if (!contato) return;

  const estaVisivel = contato.getBoundingClientRect().top <= 140;

  links.forEach(({ link, item }) => {
    if (item.secao !== "contato") return;
    if (estaVisivel) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  });

  const inicio = links.find(({ item }) => item.texto === "Início");
  if (inicio) {
    if (estaVisivel) {
      inicio.link.removeAttribute("aria-current");
    } else {
      inicio.link.setAttribute("aria-current", "page");
    }
  }
}

marcarPaginaAtual();
marcarSecaoVisivel();

if (paginaAtual === "index.html") {
  window.addEventListener("scroll", marcarSecaoVisivel, { passive: true });
}
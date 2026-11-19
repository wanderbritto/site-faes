// FAES - Lista de equipes (filtro por cidade e cards a partir de dados/equipes.json)

// Os 78 municípios do Espírito Santo
const CIDADES_ES = [
  "Afonso Cláudio", "Água Doce do Norte", "Águia Branca", "Alegre", "Alfredo Chaves",
  "Alto Rio Novo", "Anchieta", "Apiacá", "Aracruz", "Atilio Vivacqua",
  "Baixo Guandu", "Barra de São Francisco", "Boa Esperança", "Bom Jesus do Norte", "Brejetuba",
  "Cachoeiro de Itapemirim", "Cariacica", "Castelo", "Colatina", "Conceição da Barra",
  "Conceição do Castelo", "Divino de São Lourenço", "Domingos Martins", "Dores do Rio Preto", "Ecoporanga",
  "Fundão", "Governador Lindenberg", "Guaçuí", "Guarapari", "Ibatiba",
  "Ibiraçu", "Ibitirama", "Iconha", "Irupi", "Itaguaçu",
  "Itapemirim", "Itarana", "Iúna", "Jaguaré", "Jerônimo Monteiro",
  "João Neiva", "Laranja da Terra", "Linhares", "Mantenópolis", "Marataízes",
  "Marechal Floriano", "Marilândia", "Mimoso do Sul", "Montanha", "Mucurici",
  "Muniz Freire", "Muqui", "Nova Venécia", "Pancas", "Pedro Canário",
  "Pinheiros", "Piúma", "Ponto Belo", "Presidente Kennedy", "Rio Bananal",
  "Rio Novo do Sul", "Santa Leopoldina", "Santa Maria de Jetibá", "Santa Teresa", "São Domingos do Norte",
  "São Gabriel da Palha", "São José do Calçado", "São Mateus", "São Roque do Canaã", "Serra",
  "Sooretama", "Vargem Alta", "Venda Nova do Imigrante", "Viana", "Vila Pavão",
  "Vila Valério", "Vila Velha", "Vitória"
];

let todasEquipes = [];

// Primeira letra sem acento, para agrupar no filtro (ex.: "Iúna" vai para "I")
function letraDe(texto) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").charAt(0).toUpperCase();
}

// Preenche o filtro com as cidades, em ordem alfabética e agrupadas por letra
function preencherFiltro() {
  const select = document.getElementById("filtro-cidade");
  const cidades = [...CIDADES_ES].sort((a, b) => a.localeCompare(b, "pt-BR"));

  let letraAtual = "";
  let grupo = null;

  cidades.forEach(cidade => {
    const letra = letraDe(cidade);
    if (letra !== letraAtual) {
      letraAtual = letra;
      grupo = document.createElement("optgroup");
      grupo.label = letra;
      select.appendChild(grupo);
    }
    const opcao = document.createElement("option");
    opcao.value = cidade;
    opcao.textContent = cidade;
    grupo.appendChild(opcao);
  });
}

// Cria o card de uma equipe usando createElement (evita problemas com textos especiais)
function criarCard(equipe) {
  const card = document.createElement("article");
  card.className = "card card-clube";

  if (equipe.exemplo) {
    const selo = document.createElement("span");
    selo.className = "selo";
    selo.textContent = "EXEMPLO";
    card.appendChild(selo);
  }

  const titulo = document.createElement("h3");
  titulo.textContent = equipe.nome;
  card.appendChild(titulo);

  const cidade = document.createElement("p");
  cidade.textContent = equipe.cidade + " – ES";
  card.appendChild(cidade);

  const contato = document.createElement("p");
  contato.textContent = "Contato: " + (equipe.contato || "PREENCHER");
  card.appendChild(contato);

  return card;
}

// Mostra as equipes na grade, aplicando o filtro de cidade
function mostrarEquipes(cidadeEscolhida) {
  const grade = document.getElementById("lista-equipes");
  grade.innerHTML = "";

  const lista = cidadeEscolhida
    ? todasEquipes.filter(e => e.cidade === cidadeEscolhida)
    : todasEquipes;

  if (lista.length === 0) {
    const aviso = document.createElement("p");
    aviso.className = "aviso-lista";
    aviso.textContent = "Nenhuma equipe encontrada nesta cidade.";
    grade.appendChild(aviso);
    return;
  }

  lista.forEach(equipe => grade.appendChild(criarCard(equipe)));
}

// Monta o filtro, carrega o JSON e liga o filtro
async function iniciarEquipes() {
  const grade = document.getElementById("lista-equipes");
  const filtro = document.getElementById("filtro-cidade");

  preencherFiltro();

  try {
    const resposta = await fetch("dados/equipes.json");
    if (!resposta.ok) {
      throw new Error("Não foi possível carregar a lista.");
    }
    todasEquipes = await resposta.json();
    mostrarEquipes("");
  } catch (erro) {
    grade.innerHTML = "";
    const aviso = document.createElement("p");
    aviso.className = "aviso-lista";
    aviso.textContent = "Não foi possível carregar as equipes. Abra o site por um servidor local (Live Server).";
    grade.appendChild(aviso);
    console.error(erro);
  }

  filtro.addEventListener("change", () => mostrarEquipes(filtro.value));
}

document.addEventListener("DOMContentLoaded", iniciarEquipes);
function normText(s) {
  if (!s) return "";
  return s.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ").trim();
}

function matchTermo(text, termo) {
  var t = normText(termo);
  return text.indexOf(t) !== -1;
}

function isFederal(orgao) {
  if (!orgao) return false;
  var o = orgao.toUpperCase();
  var termos = ["MINISTERIO","MINISTÉRIO","SECRETARIA DE ESTADO","UNIVERSIDADE FEDERAL","INSTITUTO FEDERAL","TRIBUNAL","SENADO","CÂMARA DOS DEPUTADOS","CAMARA DOS DEPUTADOS","ADVOCACIA GERAL","ADVOCACIA-GERAL","PRESIDÊNCIA","PRESIDENCIA","CONTROLADORIA","BANCO CENTRAL","IBAMA","INSS","INMETRO","INCRA","DNIT","ANATEL","ANVISA","ANEEL","ANP","ANAC","ANTAQ","ANA","CAPES","CNPQ","FINEP","FIOCRUZ","EMBRAPA","EBSERH","UFMG","UFGO","UFG","UFRJ","USP","UNICAMP","UNB","UFBA","UFPR","UFSC","UFRGS","UFPE","UFCE","UFC","UFES","UFMS","UFMT","UFPA","UFAM","UFSM","UFLA","UFJF","UFOP","UFU","UFSCAR","UNIFESP","UFRRJ","UFF","UFAL","UFRN","UFPB","UFPI","UFMA","UFRR","UFAC","UFAP","UFT","UNIR","UNIFAP","UFGD","UFERSA","UNIVASF","FEDERAL","COMANDO","EXÉRCITO","EXERCITO","MARINHA","AERONÁUTICA","AERONAUTICA","FORÇA AÉREA","FORCA AEREA","POLICIA FEDERAL","POLÍCIA FEDERAL","RECEITA FEDERAL","CORREIOS","PETROBRAS","ELETROBRAS","CAIXA ECONOMICA","CEF ","SERPRO","DATAPREV"];
  for (var i = 0; i < termos.length; i++) {
    if (o.indexOf(termos[i]) !== -1) return true;
  }
  return false;
}

export function scoreLead(perfil, oportunidade) {
  var motivos = [];
  var objeto = normText(oportunidade.objeto || "");

  // HARD FILTER: somente federal
  if (perfil.somente_federal && !isFederal(oportunidade.orgao)) {
    motivos.push({ tipo: "NAO_FEDERAL", orgao: oportunidade.orgao });
    return { score: 0, classificacao: "DESCARTADA", motivos: motivos };
  }

  // HARD FILTER: negativas fortes
  var negativas = perfil.negativas || [];
  for (var i = 0; i < negativas.length; i++) {
    var neg = negativas[i];
    if (neg.tipo === "forte" && matchTermo(objeto, neg.termo)) {
      motivos.push({ tipo: "NEGATIVA_FORTE", termo: neg.termo, peso: neg.peso });
      return { score: 0, classificacao: "DESCARTADA", motivos: motivos };
    }
  }

  // HARD FILTER: ticket mínimo
  var ticketMin = perfil.ticket_minimo || 0;
  if (ticketMin > 0 && oportunidade.valor_estimado && oportunidade.valor_estimado < ticketMin) {
    motivos.push({ tipo: "TICKET_MINIMO", minimo: ticketMin, valor: oportunidade.valor_estimado });
    return { score: 0, classificacao: "DESCARTADA", motivos: motivos };
  }

  // HARD FILTER: valor máximo
  var valorMax = perfil.valor_maximo || 0;
  if (valorMax > 0 && oportunidade.valor_estimado && oportunidade.valor_estimado > valorMax) {
    motivos.push({ tipo: "VALOR_MAXIMO", maximo: valorMax, valor: oportunidade.valor_estimado });
    return { score: 0, classificacao: "DESCARTADA", motivos: motivos };
  }

  // BONUS: órgão federal
  var fedBonus = 0;
  if (isFederal(oportunidade.orgao)) {
    fedBonus = 5;
    motivos.push({ tipo: "ORGAO_FEDERAL", pontos: 5 });
  }

  // KEYWORDS POSITIVAS (0-35)
  var posScore = 0;
  var positivas = perfil.positivas || [];
  for (var j = 0; j < positivas.length; j++) {
    var pos = positivas[j];
    if (matchTermo(objeto, pos.termo)) {
      posScore += pos.peso;
      motivos.push({ tipo: "POSITIVA", termo: pos.termo, peso: pos.peso });
    }
  }
  posScore = Math.min(35, posScore);

  // PENALIDADE NEGATIVAS FRACAS (0-15)
  var negPen = 0;
  for (var k = 0; k < negativas.length; k++) {
    var nf = negativas[k];
    if (nf.tipo === "fraca" && matchTermo(objeto, nf.termo)) {
      negPen += nf.peso;
      motivos.push({ tipo: "NEGATIVA_FRACA", termo: nf.termo, peso: nf.peso });
    }
  }
  negPen = Math.min(15, negPen);

  // TICKET SCORE (0-20)
  var ticketScore = 0;
  if (oportunidade.valor_estimado && oportunidade.valor_estimado > 0) {
    ticketScore = Math.min(20, Math.round(3.5 * Math.log10(oportunidade.valor_estimado)));
    motivos.push({ tipo: "TICKET", valor: oportunidade.valor_estimado, pontos: ticketScore });
  }

  // GEOGRAFIA (0-8)
  var geoScore = 0;
  var ufsInteresse = perfil.ufs_interesse || [];
  if (ufsInteresse.length > 0 && oportunidade.uf) {
    var ufUpper = oportunidade.uf.toUpperCase();
    var found = false;
    for (var g = 0; g < ufsInteresse.length; g++) {
      if (ufsInteresse[g].toUpperCase() === ufUpper) { found = true; break; }
    }
    if (found) { geoScore = 8; motivos.push({ tipo: "UF_INTERESSE", uf: oportunidade.uf, pontos: 8 }); }
    else { motivos.push({ tipo: "UF_FORA", uf: oportunidade.uf }); }
  } else { geoScore = 4; }

  var raw = posScore + ticketScore + geoScore + fedBonus - negPen;
  var score = Math.max(0, Math.min(100, raw));

  var classificacao;
  if (score >= 70) classificacao = "ALTA";
  else if (score >= 50) classificacao = "MEDIA";
  else if (score >= 30) classificacao = "BAIXA";
  else classificacao = "DESCARTADA";

  return { score: score, classificacao: classificacao, motivos: motivos };
}

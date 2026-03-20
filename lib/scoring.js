function normText(s) {
  if (!s) return "";
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function matchTermo(text, termo) {
  return text.indexOf(normText(termo)) !== -1;
}

function isFederal(orgao, esfera) {
  if (esfera === "F") return true;
  if (!orgao) return false;
  var o = orgao.toUpperCase();
  var t = ["MINISTERIO","MINISTÉRIO","UNIVERSIDADE FEDERAL","INSTITUTO FEDERAL","TRIBUNAL","SENADO","CÂMARA DOS DEPUTADOS","ADVOCACIA GERAL","ADVOCACIA-GERAL","PRESIDÊNCIA","CONTROLADORIA","BANCO CENTRAL","IBAMA","INSS","DNIT","ANATEL","ANVISA","ANEEL","ANAC","CAPES","CNPQ","FIOCRUZ","EMBRAPA","EBSERH","FEDERAL","COMANDO","EXÉRCITO","EXERCITO","MARINHA","AERONÁUTICA","AERONAUTICA","FORÇA AÉREA","POLICIA FEDERAL","POLÍCIA FEDERAL","RECEITA FEDERAL","CORREIOS","PETROBRAS","ELETROBRAS","SERPRO","DATAPREV"];
  for (var i = 0; i < t.length; i++) { if (o.indexOf(t[i]) !== -1) return true; }
  return false;
}

export function scoreLead(perfil, oportunidade) {
  var motivos = [];
  var objeto = normText(oportunidade.objeto || "");
  var complemento = normText(oportunidade.complemento || "");
  var textoCompleto = objeto + " " + complemento;

  // HARD: somente federal
  if (perfil.somente_federal && !isFederal(oportunidade.orgao, oportunidade.esfera)) {
    motivos.push({ tipo: "NAO_FEDERAL", orgao: oportunidade.orgao });
    return { score: 0, classificacao: "DESCARTADA", motivos: motivos };
  }

  // HARD: negativas fortes
  var negativas = perfil.negativas || [];
  for (var i = 0; i < negativas.length; i++) {
    var neg = negativas[i];
    if (neg.tipo === "forte" && matchTermo(textoCompleto, neg.termo)) {
      motivos.push({ tipo: "NEGATIVA_FORTE", termo: neg.termo });
      return { score: 0, classificacao: "DESCARTADA", motivos: motivos };
    }
  }

  // HARD: ticket mínimo
  var ticketMin = perfil.ticket_minimo || 0;
  if (ticketMin > 0 && oportunidade.valor_estimado && oportunidade.valor_estimado < ticketMin) {
    motivos.push({ tipo: "TICKET_MINIMO", minimo: ticketMin, valor: oportunidade.valor_estimado });
    return { score: 0, classificacao: "DESCARTADA", motivos: motivos };
  }

  // HARD: valor máximo
  var valorMax = perfil.valor_maximo || 0;
  if (valorMax > 0 && oportunidade.valor_estimado && oportunidade.valor_estimado > valorMax) {
    motivos.push({ tipo: "VALOR_MAXIMO", maximo: valorMax, valor: oportunidade.valor_estimado });
    return { score: 0, classificacao: "DESCARTADA", motivos: motivos };
  }

  // KEYWORDS em objeto (0-40)
  var posObj = 0;
  var positivas = perfil.positivas || [];
  for (var j = 0; j < positivas.length; j++) {
    if (matchTermo(objeto, positivas[j].termo)) {
      posObj += positivas[j].peso;
      motivos.push({ tipo: "POSITIVA_OBJ", termo: positivas[j].termo, peso: positivas[j].peso });
    }
  }
  posObj = Math.min(40, posObj);

  // KEYWORDS em complemento (0-15)
  var posComp = 0;
  for (var k = 0; k < positivas.length; k++) {
    if (complemento && matchTermo(complemento, positivas[k].termo)) {
      var jaContou = motivos.some(function(m) { return m.termo === positivas[k].termo; });
      if (!jaContou) {
        posComp += positivas[k].peso;
        motivos.push({ tipo: "POSITIVA_COMP", termo: positivas[k].termo, peso: positivas[k].peso });
      }
    }
  }

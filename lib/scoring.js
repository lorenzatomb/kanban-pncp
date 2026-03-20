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

  if (perfil.somente_federal && !isFederal(oportunidade.orgao, oportunidade.esfera)) {
    motivos.push({ tipo: "NAO_FEDERAL", orgao: oportunidade.orgao });
    return { score: 0, classificacao: "DESCARTADA", motivos: motivos };
  }

  var negativas = perfil.negativas || [];
  for (var i = 0; i < negativas.length; i++) {
    var neg = negativas[i];
    if (neg.tipo === "forte" && matchTermo(textoCompleto, neg.termo)) {
      motivos.push({ tipo: "NEGATIVA_FORTE", termo: neg.termo });
      return { score: 0, classificacao: "DESCARTADA", motivos: motivos };
    }
  }

  var ticketMin = perfil.ticket_minimo || 0;
  if (ticketMin > 0 && oportunidade.valor_estimado && oportunidade.valor_estimado < ticketMin) {
    motivos.push({ tipo: "TICKET_MINIMO", minimo: ticketMin, valor: oportunidade.valor_estimado });
    return { score: 0, classificacao: "DESCARTADA", motivos: motivos };
  }

  var valorMax = perfil.valor_maximo || 0;
  if (valorMax > 0 && oportunidade.valor_estimado && oportunidade.valor_estimado > valorMax) {
    motivos.push({ tipo: "VALOR_MAXIMO", maximo: valorMax, valor: oportunidade.valor_estimado });
    return { score: 0, classificacao: "DESCARTADA", motivos: motivos };
  }

  var posObj = 0;
  var positivas = perfil.positivas || [];
  for (var j = 0; j < positivas.length; j++) {
    if (matchTermo(objeto, positivas[j].termo)) {
      posObj += positivas[j].peso;
      motivos.push({ tipo: "POSITIVA_OBJ", termo: positivas[j].termo, peso: positivas[j].peso });
    }
  }
  posObj = Math.min(40, posObj);

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
  posComp = Math.min(15, posComp);

  var negPen = 0;
  for (var n = 0; n < negativas.length; n++) {
    if (negativas[n].tipo === "fraca" && matchTermo(textoCompleto, negativas[n].termo)) {
      negPen += negativas[n].peso;
      motivos.push({ tipo: "NEGATIVA_FRACA", termo: negativas[n].termo, peso: negativas[n].peso });
    }
  }
  negPen = Math.min(15, negPen);

  var propostaScore = 0;
  if (oportunidade.data_encerramento) {
    var deadline = new Date(oportunidade.data_encerramento);
    if (deadline > new Date()) {
      propostaScore = 10;
      motivos.push({ tipo: "PROPOSTA_ABERTA", pontos: 10 });
    }
  }

  var prazoScore = 0;
  if (oportunidade.data_encerramento) {
    var dl = new Date(oportunidade.data_encerramento);
    var dias = Math.ceil((dl - new Date()) / 86400000);
    if (dias > 7) {
      prazoScore = 5;
      motivos.push({ tipo: "PRAZO_BOM", dias: dias, pontos: 5 });
    }
  }

  var fedBonus = 0;
  if (isFederal(oportunidade.orgao, oportunidade.esfera)) {
    fedBonus = 5;
    motivos.push({ tipo: "ORGAO_FEDERAL", pontos: 5 });
  }

  var ticketScore = 0;
  if (oportunidade.valor_estimado && oportunidade.valor_estimado > 0) {
    ticketScore = Math.min(15, Math.round(2.8 * Math.log10(oportunidade.valor_estimado)));
    motivos.push({ tipo: "TICKET", valor: oportunidade.valor_estimado, pontos: ticketScore });
  }

  var geoScore = 0;
  var ufs = perfil.ufs_interesse || [];
  if (ufs.length > 0 && oportunidade.uf) {
    var ufUp = oportunidade.uf.toUpperCase();
    for (var g = 0; g < ufs.length; g++) {
      if (ufs[g].toUpperCase() === ufUp) { geoScore = 5; motivos.push({ tipo: "UF_INTERESSE", uf: oportunidade.uf, pontos: 5 }); break; }
    }
  }

  var raw = posObj + posComp + ticketScore + geoScore + fedBonus + propostaScore + prazoScore - negPen;
  var score = Math.max(0, Math.min(100, raw));

  var temKeyword = motivos.some(function(m) { return m.tipo === "POSITIVA_OBJ" || m.tipo === "POSITIVA_COMP"; });
  if (!temKeyword) {
    return { score: 0, classificacao: "DESCARTADA", motivos: [{ tipo: "SEM_KEYWORD" }] };
  }

  var classificacao;
  if (score >= 70) classificacao = "ALTA";
  else if (score >= 50) classificacao = "MEDIA";
  else if (score >= 30) classificacao = "BAIXA";
  else classificacao = "DESCARTADA";

  return { score: score, classificacao: classificacao, motivos: motivos };
}

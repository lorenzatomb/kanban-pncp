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

export function scoreLead(perfil, oportunidade) {
  var motivos = [];
  var objeto = normText(oportunidade.objeto || "");

  var negativas = perfil.negativas || [];
  for (var i = 0; i < negativas.length; i++) {
    var neg = negativas[i];
    if (neg.tipo === "forte" && matchTermo(objeto, neg.termo)) {
      motivos.push({ tipo: "NEGATIVA_FORTE", termo: neg.termo, peso: neg.peso });
      return { score: 0, classificacao: "DESCARTADA", motivos: motivos };
    }
  }

  var ticketMin = perfil.ticket_minimo || 0;
  if (ticketMin > 0 && oportunidade.valor_estimado && oportunidade.valor_estimado < ticketMin) {
    motivos.push({ tipo: "TICKET_MINIMO", minimo: ticketMin, valor: oportunidade.valor_estimado });
    return { score: 0, classificacao: "DESCARTADA", motivos: motivos };
  }

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

  var negPen = 0;
  for (var k = 0; k < negativas.length; k++) {
    var nf = negativas[k];
    if (nf.tipo === "fraca" && matchTermo(objeto, nf.termo)) {
      negPen += nf.peso;
      motivos.push({ tipo: "NEGATIVA_FRACA", termo: nf.termo, peso: nf.peso });
    }
  }
  negPen = Math.min(15, negPen);

  var ticketScore = 0;
  if (oportunidade.valor_estimado && oportunidade.valor_estimado > 0) {
    ticketScore = Math.min(20, Math.round(3.5 * Math.log10(oportunidade.valor_estimado)));
    motivos.push({ tipo: "TICKET", valor: oportunidade.valor_estimado, pontos: ticketScore });
  }

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

  var raw = posScore + ticketScore + geoScore - negPen;
  var score = Math.max(0, Math.min(100, raw));

  var classificacao;
  if (score >= 70) classificacao = "ALTA";
  else if (score >= 50) classificacao = "MEDIA";
  else if (score >= 30) classificacao = "BAIXA";
  else classificacao = "DESCARTADA";

  return { score: score, classificacao: classificacao, motivos: motivos };
}

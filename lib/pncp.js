// =============================================
// Motor de busca PNCP — roda no servidor
// Sem problemas de CORS
// =============================================

var ALL_UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

function formatDate(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var dd = String(d.getDate()).padStart(2, "0");
  return y + m + dd;
}

function matchesKeywords(text, keywords) {
  if (!text) return { match: false, keyword: null };
  var lower = text.toLowerCase();
  for (var i = 0; i < keywords.length; i++) {
    if (lower.indexOf(keywords[i].toLowerCase()) !== -1) {
      return { match: true, keyword: keywords[i] };
    }
  }
  return { match: false, keyword: null };
}

async function buscarPNCP(options) {
  var dias = (options && options.dias) || 15;
  var keywords = (options && options.keywords) || [];
  var modalidade = (options && options.modalidade) || 6; // 6 = pregão eletrônico
  var onProgress = (options && options.onProgress) || function() {};

  var now = new Date();
  var start = new Date();
  start.setDate(now.getDate() - dias);
  var dataInicial = formatDate(start);
  var dataFinal = formatDate(now);

  var resultados = [];
  var totalAnalisados = 0;
  var erros = [];

  for (var u = 0; u < ALL_UFS.length; u++) {
    var uf = ALL_UFS[u];
    onProgress({ uf: uf, index: u + 1, total: ALL_UFS.length, encontrados: resultados.length });

    try {
      var url = "https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao" +
        "?dataInicial=" + dataInicial +
        "&dataFinal=" + dataFinal +
        "&codigoModalidadeContratacao=" + modalidade +
        "&uf=" + uf +
        "&tamanhoPagina=50" +
        "&pagina=1";

      var response = await fetch(url, {
        headers: { "Accept": "application/json" },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        if (response.status !== 404) {
          erros.push({ uf: uf, status: response.status });
        }
        continue;
      }

      var data = await response.json();
      var items = data.data || data || [];

      if (Array.isArray(items)) {
        totalAnalisados += items.length;

        items.forEach(function(item) {
          var result = matchesKeywords(item.objetoCompra, keywords);
          if (result.match) {
            resultados.push({
              pncp_id: item.numeroControlePNCP || "",
              objeto: item.objetoCompra || "",
              orgao: (item.orgaoEntidade || {}).razaoSocial || "",
              uf: (item.unidadeOrgao || {}).ufSigla || uf,
              valor_estimado: item.valorTotalEstimado || null,
              modalidade: item.modalidadeNome || "Pregão Eletrônico",
              link_edital: item.linkSistemaOrigem || null,
              data_publicacao: item.dataPublicacaoPncp || null,
              data_encerramento: item.dataEncerramentoProposta || null,
              keyword_match: result.keyword,
              prioridade: item.valorTotalEstimado > 500000 ? "alta" : item.valorTotalEstimado > 100000 ? "média" : "baixa",
            });
          }
        });
      }

      // Pausa de 200ms entre estados para não sobrecarregar a API
      await new Promise(function(r) { setTimeout(r, 200); });

    } catch (err) {
      erros.push({ uf: uf, erro: err.message });
      continue;
    }
  }

  return {
    resultados: resultados,
    totalAnalisados: totalAnalisados,
    totalEncontrados: resultados.length,
    erros: erros,
    dataInicial: dataInicial,
    dataFinal: dataFinal,
  };
}

module.exports = { buscarPNCP: buscarPNCP, ALL_UFS: ALL_UFS };

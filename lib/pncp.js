var PRIORITY_UFS = ["DF","SP","RJ","MG","PR","SC","RS","BA","CE","PE","GO","ES"];

function formatDate(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var dd = String(d.getDate()).padStart(2, "0");
  return y + m + dd;
}

export async function buscarPNCP(options) {
  var dias = (options && options.dias) || 15;
  var modalidade = (options && options.modalidade) || 6;
  var now = new Date();
  var start = new Date();
  start.setDate(now.getDate() - dias);
  var dataInicial = formatDate(start);
  var dataFinal = formatDate(now);
  var resultados = [];
  var totalAnalisados = 0;
  var erros = [];

  for (var u = 0; u < PRIORITY_UFS.length; u++) {
    var uf = PRIORITY_UFS[u];
    try {
      var url = "https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao" +
        "?dataInicial=" + dataInicial + "&dataFinal=" + dataFinal +
        "&codigoModalidadeContratacao=" + modalidade +
        "&uf=" + uf + "&tamanhoPagina=50&pagina=1";
      var controller = new AbortController();
      var timeout = setTimeout(function() { controller.abort(); }, 8000);
      var response = await fetch(url, { headers: { "Accept": "application/json" }, signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) continue;
      var data = await response.json();
      var items = data.data || data || [];
      if (Array.isArray(items)) {
        totalAnalisados += items.length;
        items.forEach(function(item) {
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
          });
        });
      }
      await new Promise(function(r) { setTimeout(r, 100); });
    } catch (err) {
      erros.push({ uf: uf, erro: err.message });
    }
  }
  return { resultados: resultados, totalAnalisados: totalAnalisados, totalEncontrados: resultados.length, erros: erros };
}

var PRIORITY_UFS = ["DF","SP","RJ","MG","PR","SC","RS","BA","CE","PE","GO","ES"];

function formatDate(d) {
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, "0");
  var dd = String(d.getDate()).padStart(2, "0");
  return y + m + dd;
}

async function fetchUF(uf, dataInicial, dataFinal, modalidade) {
  try {
    var url = "https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao" +
      "?dataInicial=" + dataInicial + "&dataFinal=" + dataFinal +
      "&codigoModalidadeContratacao=" + modalidade +
      "&uf=" + uf + "&tamanhoPagina=50&pagina=1";
    var controller = new AbortController();
    var timeout = setTimeout(function() { controller.abort(); }, 6000);
    var response = await fetch(url, { headers: { "Accept": "application/json" }, signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return { items: [], uf: uf };
    var data = await response.json();
    var items = data.data || data || [];
    return { items: Array.isArray(items) ? items : [], uf: uf };
  } catch (err) {
    return { items: [], uf: uf, erro: err.message };
  }
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

  // Busca 4 estados em paralelo
  for (var i = 0; i < PRIORITY_UFS.length; i += 4) {
    var batch = PRIORITY_UFS.slice(i, i + 4);
    var promises = batch.map(function(uf) { return fetchUF(uf, dataInicial, dataFinal, modalidade); });
    var results = await Promise.all(promises);

    results.forEach(function(res) {
      if (res.erro) erros.push({ uf: res.uf, erro: res.erro });
      totalAnalisados += res.items.length;
      res.items.forEach(function(item) {
        resultados.push({
          pncp_id: item.numeroControlePNCP || "",
          objeto: item.objetoCompra || "",
          orgao: (item.orgaoEntidade || {}).razaoSocial || "",
          uf: (item.unidadeOrgao || {}).ufSigla || res.uf,
          valor_estimado: item.valorTotalEstimado || null,
          modalidade: item.modalidadeNome || "Pregão Eletrônico",
          link_edital: item.linkSistemaOrigem || null,
          data_publicacao: item.dataPublicacaoPncp || null,
          data_encerramento: item.dataEncerramentoProposta || null,
        });
      });
    });
  }

  return { resultados: resultados, totalAnalisados: totalAnalisados, totalEncontrados: resultados.length, erros: erros };
}

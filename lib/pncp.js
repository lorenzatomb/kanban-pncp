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
    var timeout = setTimeout(function() { controller.abort(); }, 5000);
    var response = await fetch(url, { headers: { "Accept": "application/json" }, signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return [];
    var data = await response.json();
    var items = data.data || data || [];
    if (!Array.isArray(items)) return [];
    return items.map(function(item) {
      return {
        pncp_id: item.numeroControlePNCP || "",
        objeto: item.objetoCompra || "",
        complemento: item.informacaoComplementar || "",
        orgao: (item.orgaoEntidade || {}).razaoSocial || "",
        orgao_cnpj: (item.orgaoEntidade || {}).cnpj || "",
        esfera: (item.orgaoEntidade || {}).esferaId || "",
        uf: (item.unidadeOrgao || {}).ufSigla || uf,
        municipio: (item.unidadeOrgao || {}).municipioNome || "",
        valor_estimado: item.valorTotalEstimado || null,
        modalidade: item.modalidadeNome || "Pregão Eletrônico",
        link_edital: item.linkSistemaOrigem || null,
        data_publicacao: item.dataPublicacaoPncp || null,
        data_encerramento: item.dataEncerramentoProposta || null,
      };
    });
  } catch (err) { return []; }
}

export async function buscarPNCP(options) {
  var dias = (options && options.dias) || 15;
  var modalidade = (options && options.modalidade) || 6;
  var now = new Date();
  var start = new Date();
  start.setDate(now.getDate() - dias);
  var di = formatDate(start);
  var df = formatDate(now);
  var all = await Promise.all(PRIORITY_UFS.map(function(uf) { return fetchUF(uf, di, df, modalidade); }));
  var resultados = [];
  var totalAnalisados = 0;
  all.forEach(function(items) { totalAnalisados += items.length; resultados = resultados.concat(items); });
  return { resultados: resultados, totalAnalisados: totalAnalisados, totalEncontrados: resultados.length };
}

export function parsePncpId(pncpId) {
  var match = pncpId.match(/^(\d+)-\d+-0*(\d+)\/(\d+)$/);
  if (!match) return null;
  return { cnpj: match[1], sequencial: Number(match[2]), ano: Number(match[3]) };
}

export async function fetchBidDocuments(cnpj, ano, sequencial) {
  try {
    var url = "https://pncp.gov.br/pncp-api/v1/orgaos/" + cnpj + "/compras/" + ano + "/" + sequencial + "/arquivos";
    var response = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!response.ok) return [];
    var data = await response.json();
    return (data || []).filter(function(d) { return d.statusAtivo; });
  } catch (err) { return []; }
}

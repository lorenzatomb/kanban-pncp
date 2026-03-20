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
      return { score: 0, classificacao: "DESCARTADA", motivos:

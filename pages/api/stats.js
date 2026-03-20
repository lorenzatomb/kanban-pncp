import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ erro: "Use GET" });
  try {
    var opp = await supabase.from("oportunidades").select("coluna, valor_estimado, score, classificacao, uf").eq("ativo", true);
    var logs = await supabase.from("buscas_log").select("*").order("data_busca", { ascending: false }).limit(5);
    var data = opp.data || [];
    var totalValor = data.reduce(function(s, c) { return s + (c.valor_estimado || 0); }, 0);
    var ganho = data.filter(function(c) { return c.coluna === "ganho"; }).reduce(function(s, c) { return s + (c.valor_estimado || 0); }, 0);
    var porClassificacao = {};
    var porUf = {};
    var porColuna = {};
    data.forEach(function(c) {
      porClassificacao[c.classificacao] = (porClassificacao[c.classificacao] || 0) + 1;
      if (c.uf) porUf[c.uf] = (porUf[c.uf] || 0) + 1;
      porColuna[c.coluna] = (porColuna[c.coluna] || 0) + 1;
    });
    return res.status(200).json({
      total: data.length, valor_pipeline: totalValor, valor_ganho: ganho,
      por_classificacao: porClassificacao, por_uf: porUf, por_coluna: porColuna,
      ultimas_buscas: logs.data || [],
    });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

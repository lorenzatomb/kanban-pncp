import { supabase } from "../../lib/supabase";
import { buscarPNCP } from "../../lib/pncp";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });

  try {
    var configRes = await supabase.from("configuracoes").select("*").eq("id", 1).single();
    var config = configRes.data || {};
    var keywords = (config.keywords || "").split(",").map(function(k) { return k.trim(); }).filter(function(k) { return k; });

    var resultado = await buscarPNCP({ dias: config.dias_busca || 15, keywords: keywords, modalidade: config.modalidade || 6 });

    var novos = 0;
    for (var i = 0; i < resultado.resultados.length; i++) {
      var r = resultado.resultados[i];
      var existe = await supabase.from("oportunidades").select("id").eq("pncp_id", r.pncp_id).single();
      if (!existe.data) {
        await supabase.from("oportunidades").insert({
          pncp_id: r.pncp_id, objeto: r.objeto, orgao: r.orgao, uf: r.uf,
          valor_estimado: r.valor_estimado, modalidade: r.modalidade,
          link_edital: r.link_edital, data_publicacao: r.data_publicacao,
          data_encerramento: r.data_encerramento, keyword_match: r.keyword_match,
          prioridade: r.prioridade, coluna: "oportunidades-online", ai_modelo: "claude",
        });
        novos++;
      }
    }

    await supabase.from("buscas_log").insert({ total_analisados: resultado.totalAnalisados, total_encontrados: resultado.totalEncontrados, total_novos: novos, keywords_usadas: keywords.join(", "), status: "sucesso" });

    return res.status(200).json({ sucesso: true, analisados: resultado.totalAnalisados, encontrados: resultado.totalEncontrados, novos: novos });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

import { supabase } from "../../lib/supabase";
import { buscarPNCP } from "../../lib/pncp";
import { scoreLead } from "../../lib/scoring";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });

  try {
    var perfilRes = await supabase.from("perfil_empresa").select("*").eq("id", 1).single();
    var perfil = perfilRes.data || {};
    var configRes = await supabase.from("configuracoes").select("*").eq("id", 1).single();
    var config = configRes.data || {};

    var resultado = await buscarPNCP({ dias: config.dias_busca || 15, modalidade: config.modalidade || 6 });

    var novos = 0;
    var qualificados = 0;

    for (var i = 0; i < resultado.resultados.length; i++) {
      var r = resultado.resultados[i];
      var existe = await supabase.from("oportunidades").select("id").eq("pncp_id", r.pncp_id).single();
      if (existe.data) continue;

      var lead = scoreLead(perfil, r);
      if (lead.classificacao === "DESCARTADA") continue;

      await supabase.from("oportunidades").insert({
        pncp_id: r.pncp_id, objeto: r.objeto, orgao: r.orgao, uf: r.uf,
        valor_estimado: r.valor_estimado, modalidade: r.modalidade,
        link_edital: r.link_edital, data_publicacao: r.data_publicacao,
        data_encerramento: r.data_encerramento,
        keyword_match: lead.motivos.filter(function(m) { return m.tipo === "POSITIVA"; }).map(function(m) { return m.termo; }).join(", "),
        prioridade: lead.classificacao === "ALTA" ? "alta" : lead.classificacao === "MEDIA" ? "média" : "baixa",
        coluna: "oportunidades-online", ai_modelo: "claude",
        score: lead.score, classificacao: lead.classificacao, motivos: lead.motivos,
        fonte: "PNCP", source_id: r.pncp_id,
      });
      novos++;
      qualificados++;
    }

    await supabase.from("buscas_log").insert({ total_analisados: resultado.totalAnalisados, total_encontrados: qualificados, total_novos: novos, keywords_usadas: "scoring v2", status: "sucesso" });

    return res.status(200).json({ sucesso: true, analisados: resultado.totalAnalisados, qualificados: qualificados, novos: novos });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

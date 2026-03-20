import { supabase } from "../../lib/supabase";
import { buscarPNCP } from "../../lib/pncp";
import { scoreLead } from "../../lib/scoring";

export default async function handler(req, res) {
  var authHeader = req.headers["authorization"];
  var cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== "Bearer " + cronSecret) {
    return res.status(401).json({ erro: "Não autorizado" });
  }
  try {
    var perfilRes = await supabase.from("perfil_empresa").select("*").eq("id", 1).single();
    var perfil = perfilRes.data || {};
    var configRes = await supabase.from("configuracoes").select("*").eq("id", 1).single();
    var config = configRes.data || {};
    var resultado = await buscarPNCP({ dias: config.dias_busca || 15, modalidade: config.modalidade || 6 });
    var novos = 0;
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
    }
    await supabase.from("buscas_log").insert({ total_analisados: resultado.totalAnalisados, total_encontrados: novos, total_novos: novos, keywords_usadas: "cron scoring v2", status: "sucesso" });
    return res.status(200).json({ sucesso: true, analisados: resultado.totalAnalisados, novos: novos, horario: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

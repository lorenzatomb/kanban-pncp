// =============================================
// API: /api/cron — Busca agendada (6h e 15h)
// Chamado automaticamente pelo Vercel Cron
// =============================================

var { supabase } = require("../../lib/supabase");
var { buscarPNCP } = require("../../lib/pncp");

module.exports = async function handler(req, res) {
  // Verifica token de segurança (evita que qualquer pessoa dispare a busca)
  var authHeader = req.headers["authorization"];
  var cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== "Bearer " + cronSecret) {
    return res.status(401).json({ erro: "Não autorizado" });
  }

  try {
    // Busca configurações
    var configRes = await supabase.from("configuracoes").select("*").eq("id", 1).single();
    var config = configRes.data || {};
    var keywords = (config.keywords || "").split(",").map(function(k) { return k.trim(); }).filter(function(k) { return k; });

    console.log("[CRON] Iniciando busca PNCP — " + new Date().toISOString());
    console.log("[CRON] Keywords: " + keywords.length + " | Dias: " + (config.dias_busca || 15));

    // Busca no PNCP
    var resultado = await buscarPNCP({
      dias: config.dias_busca || 15,
      keywords: keywords,
      modalidade: config.modalidade || 6,
      onProgress: function(p) {
        console.log("[CRON] " + p.uf + " (" + p.index + "/" + p.total + ") — " + p.encontrados + " encontrados");
      },
    });

    // Salva novos no banco
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

    // Log
    await supabase.from("buscas_log").insert({
      total_analisados: resultado.totalAnalisados,
      total_encontrados: resultado.totalEncontrados,
      total_novos: novos,
      keywords_usadas: keywords.join(", "),
      status: "sucesso",
    });

    console.log("[CRON] Concluído — " + resultado.totalEncontrados + " encontrados, " + novos + " novos");

    return res.status(200).json({
      sucesso: true,
      analisados: resultado.totalAnalisados,
      encontrados: resultado.totalEncontrados,
      novos: novos,
      horario: new Date().toISOString(),
    });

  } catch (err) {
    console.error("[CRON] Erro:", err.message);
    await supabase.from("buscas_log").insert({ status: "erro", erro: err.message }).catch(function() {});
    return res.status(500).json({ erro: err.message });
  }
};

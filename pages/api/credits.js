import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ erro: "Use GET" });
  try {
    var opp = await supabase.from("oportunidades").select("id", { count: "exact", head: true });
    var msg = await supabase.from("mensagens").select("id", { count: "exact", head: true });
    var logs = await supabase.from("buscas_log").select("id", { count: "exact", head: true });
    var buscasHoje = await supabase.from("buscas_log").select("total_analisados").gte("data_busca", new Date().toISOString().split("T")[0]);
    var apiCallsHoje = (buscasHoje.data || []).reduce(function(s, b) { return s + (b.total_analisados || 0); }, 0);

    return res.status(200).json({
      supabase: {
        rows_usadas: (opp.count || 0) + (msg.count || 0) + (logs.count || 0),
        rows_limite: 50000,
        oportunidades: opp.count || 0,
        mensagens: msg.count || 0,
        buscas_log: logs.count || 0,
      },
      vercel: {
        invocacoes_estimadas: (logs.count || 0) * 15,
        invocacoes_limite: 100000,
      },
      pncp: {
        chamadas_hoje: buscasHoje.data ? buscasHoje.data.length : 0,
        editais_analisados_hoje: apiCallsHoje,
        limite_recomendado_dia: 5000,
      },
      plano: "Free",
    });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

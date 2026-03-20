import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ erro: "Use GET" });

  try {
    var perfilRes = await supabase.from("perfil_empresa").select("claude_creditos_limite, claude_api_key").eq("id", 1).single();
    var perfil = perfilRes.data || {};
    var limite = perfil.claude_creditos_limite || 5;
    var temKey = !!(perfil.claude_api_key && perfil.claude_api_key.length > 5);

    var mesAtual = new Date().toISOString().substring(0, 7);
    var hoje = new Date().toISOString().substring(0, 10);

    var mesRes = await supabase.from("claude_uso").select("*").gte("data", mesAtual + "-01T00:00:00Z").order("data", { ascending: false });
    var registros = mesRes.data || [];

    var gastoMes = 0;
    var tokensMesInput = 0;
    var tokensMesOutput = 0;
    var chamdasMes = registros.length;
    var gastoHoje = 0;
    var chamadasHoje = 0;

    registros.forEach(function(r) {
      gastoMes += r.custo_usd || 0;
      tokensMesInput += r.input_tokens || 0;
      tokensMesOutput += r.output_tokens || 0;
      if (r.data && r.data.substring(0, 10) === hoje) {
        gastoHoje += r.custo_usd || 0;
        chamadasHoje++;
      }
    });

    var porDia = {};
    registros.forEach(function(r) {
      var dia = r.data ? r.data.substring(0, 10) : "?";
      if (!porDia[dia]) porDia[dia] = { chamadas: 0, custo: 0, tokens: 0 };
      porDia[dia].chamadas++;
      porDia[dia].custo += r.custo_usd || 0;
      porDia[dia].tokens += (r.input_tokens || 0) + (r.output_tokens || 0);
    });

    return res.status(200).json({
      tem_key: temKey,
      limite_mes_usd: limite,
      gasto_mes_usd: gastoMes,
      gasto_hoje_usd: gastoHoje,
      chamadas_mes: chamdasMes,
      chamadas_hoje: chamadasHoje,
      tokens_mes_input: tokensMesInput,
      tokens_mes_output: tokensMesOutput,
      pct_usado: limite > 0 ? Math.round(gastoMes / limite * 100) : 0,
      por_dia: porDia,
      ultimos: registros.slice(0, 10),
    });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

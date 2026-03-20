import { supabase } from "../../lib/supabase";

var PRECO_INPUT = 3.0 / 1000000;
var PRECO_OUTPUT = 15.0 / 1000000;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ erro: "Use POST" });

  try {
    var body = req.body;
    var prompt = body.prompt || "";
    var oportunidade_id = body.oportunidade_id || null;

    var perfilRes = await supabase.from("perfil_empresa").select("claude_api_key, claude_creditos_limite").eq("id", 1).single();
    var perfil = perfilRes.data || {};

    if (!perfil.claude_api_key) {
      return res.status(400).json({ erro: "Configure sua API Key do Claude nas Configurações" });
    }

    var mesAtual = new Date().toISOString().substring(0, 7);
    var gastoRes = await supabase.from("claude_uso").select("custo_usd").gte("data", mesAtual + "-01T00:00:00Z");
    var gastoMes = (gastoRes.data || []).reduce(function(s, r) { return s + (r.custo_usd || 0); }, 0);
    var limite = perfil.claude_creditos_limite || 5;

    if (gastoMes >= limite) {
      return res.status(429).json({ erro: "Limite mensal de USD " + limite + " atingido. Gasto: USD " + gastoMes.toFixed(4) });
    }

    var response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": perfil.claude_api_key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    var data = await response.json();

    if (data.error) {
      return res.status(400).json({ erro: data.error.message || "Erro na API Claude" });
    }

    var inputTokens = (data.usage && data.usage.input_tokens) || 0;
    var outputTokens = (data.usage && data.usage.output_tokens) || 0;
    var custo = (inputTokens * PRECO_INPUT) + (outputTokens * PRECO_OUTPUT);
    var texto = (data.content && data.content[0] && data.content[0].text) || "";

    await supabase.from("claude_uso").insert({
      endpoint: "analise",
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      custo_usd: custo,
      oportunidade_id: oportunidade_id,
      modelo: "claude-sonnet-4-20250514",
    });

    return res.status(200).json({
      texto: texto,
      tokens: { input: inputTokens, output: outputTokens },
      custo_usd: custo,
      gasto_mes: gastoMes + custo,
      limite_mes: limite,
    });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

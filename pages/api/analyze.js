import { supabase } from "../../lib/supabase";

var PRECO_INPUT = 3.0 / 1000000;
var PRECO_OUTPUT = 15.0 / 1000000;

export default async function handler(req, res) {
  // GET — carrega análise existente
  if (req.method === "GET") {
    var id = req.query.id;
    if (!id) return res.status(400).json({ erro: "id obrigatório" });
    var existing = await supabase.from("bid_analyses").select("*").eq("oportunidade_id", id).order("criado_em", { ascending: false }).limit(1).single();
    if (!existing.data) return res.status(200).json({});
    return res.status(200).json({ analise: { resumo_executivo: existing.data.resumo_executivo, itens: existing.data.itens, requisitos: existing.data.requisitos, red_flags: existing.data.red_flags, is_match: existing.data.confirmado_match, confianca: existing.data.confianca, raciocinio: existing.data.raciocinio }, tokens: { input: existing.data.input_tokens, output: existing.data.output_tokens }, custo_usd: existing.data.custo_usd });
  }

  if (req.method !== "POST") return res.status(405).json({ erro: "Use GET ou POST" });

  try {
    var body = req.body;
    var oportunidade_id = body.oportunidade_id;
    if (!oportunidade_id) return res.status(400).json({ erro: "oportunidade_id obrigatório" });

    var perfilRes = await supabase.from("perfil_empresa").select("claude_api_key, claude_creditos_limite").eq("id", 1).single();
    var perfil = perfilRes.data || {};
    if (!perfil.claude_api_key) return res.status(400).json({ erro: "Configure a API Key do Claude nas Configurações" });

    var mesAtual = new Date().toISOString().substring(0, 7);
    var gastoRes = await supabase.from("claude_uso").select("custo_usd").gte("data", mesAtual + "-01T00:00:00Z");
    var gastoMes = (gastoRes.data || []).reduce(function(s, r) { return s + (r.custo_usd || 0); }, 0);
    if (gastoMes >= (perfil.claude_creditos_limite || 5)) {
      return res.status(429).json({ erro: "Limite mensal atingido: $" + gastoMes.toFixed(4) });
    }

    var oppRes = await supabase.from("oportunidades").select("*").eq("id", oportunidade_id).single();
    if (!oppRes.data) return res.status(404).json({ erro: "Oportunidade não encontrada" });
    var opp = oppRes.data;

    var docsRes = await supabase.from("bid_documents").select("titulo, tipo").eq("oportunidade_id", oportunidade_id);
    var docsList = (docsRes.data || []).map(function(d) { return d.titulo + " (" + d.tipo + ")"; }).join(", ");

    var prompt = "Você é um analista de licitações especializado em audiovisual, videowall, painéis LED, salas de controle, videoconferência e CFTV.\n\nAnalise esta licitação e responda OBRIGATORIAMENTE em JSON válido (sem markdown, sem ```), com esta estrutura:\n{\"resumo_executivo\":\"string 2-3 parágrafos\",\"is_match\":true/false,\"confianca\":0-100,\"raciocinio\":\"string explicando por que é ou não relevante\",\"itens\":[{\"nome\":\"string\",\"qtd\":number,\"specs\":\"string\",\"preco_est\":number}],\"requisitos\":{\"certificacoes\":[\"string\"],\"prazos\":{\"entrega\":\"string\"},\"qualificacoes\":[\"string\"],\"garantias\":[\"string\"]},\"red_flags\":[\"string\"]}\n\nLICITAÇÃO:\nObjeto: " + opp.objeto + "\n" + (opp.complemento ? "Complemento: " + opp.complemento + "\n" : "") + "Órgão: " + opp.orgao + "\nUF: " + (opp.uf || "N/I") + " | Município: " + (opp.municipio || "N/I") + "\nValor estimado: " + (opp.valor_estimado ? "R$ " + Number(opp.valor_estimado).toLocaleString("pt-BR") : "Não informado") + "\nModalidade: " + (opp.modalidade || "Pregão Eletrônico") + "\nEncerramento: " + (opp.data_encerramento || "N/I") + "\n" + (docsList ? "Documentos disponíveis: " + docsList + "\n" : "") + "\nResponda APENAS o JSON, nada mais.";

    var response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": perfil.claude_api_key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
    });

    var data = await response.json();
    if (data.error) return res.status(400).json({ erro: data.error.message });

    var inputTokens = (data.usage && data.usage.input_tokens) || 0;
    var outputTokens = (data.usage && data.usage.output_tokens) || 0;
    var custo = (inputTokens * PRECO_INPUT) + (outputTokens * PRECO_OUTPUT);
    var texto = (data.content && data.content[0] && data.content[0].text) || "";

    var analise = {};
    try { analise = JSON.parse(texto.replace(/```json/g, "").replace(/```/g, "").trim()); } catch (e) { analise = { resumo_executivo: texto, is_match: null, confianca: null, itens: [], requisitos: {}, red_flags: [] }; }

    await supabase.from("bid_analyses").insert({ oportunidade_id: oportunidade_id, status: "completed", resumo_executivo: analise.resumo_executivo || texto, itens: analise.itens || [], requisitos: analise.requisitos || {}, red_flags: analise.red_flags || [], confirmado_match: analise.is_match, confianca: analise.confianca, raciocinio: analise.raciocinio || "", input_tokens: inputTokens, output_tokens: outputTokens, custo_usd: custo });
    await supabase.from("claude_uso").insert({ endpoint: "analyze", input_tokens: inputTokens, output_tokens: outputTokens, custo_usd: custo, oportunidade_id: oportunidade_id });

    return res.status(200).json({ analise: analise, tokens: { input: inputTokens, output: outputTokens }, custo_usd: custo, gasto_mes: gastoMes + custo });
  } catch (err) {
    return res.status(500).json({ erro: err.message });
  }
}

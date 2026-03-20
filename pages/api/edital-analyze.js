import { supabase } from "../../lib/supabase";

var PRECO_INPUT = 3.0 / 1000000;
var PRECO_OUTPUT = 15.0 / 1000000;

export default async function handler(req, res) {
  if (req.method === "GET") {
    var id = req.query.id;
    if (id) {
      var single = await supabase.from("edital_analises").select("*").eq("oportunidade_id", id).order("criado_em", { ascending: false }).limit(1).single();
      return res.status(200).json(single.data || null);
    }
    var all = await supabase.from("edital_analises").select("*, oportunidades(id, objeto, orgao, uf, valor_estimado, score, classificacao, pncp_id)").order("criado_em", { ascending: false });
    return res.status(200).json(all.data || []);
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

    var prompt = 'Você é um engenheiro de pré-vendas especializado em soluções audiovisuais (videowall, painéis LED, salas de controle, videoconferência, CFTV, sonorização, automação).\n\nAnalise esta licitação e responda OBRIGATORIAMENTE em JSON válido (sem markdown, sem ```), com esta estrutura exata:\n{\n  "objeto_resumo": "string com 2-3 frases resumindo o objeto da licitação",\n  "itens": [\n    {\n      "numero": 1,\n      "descricao": "string com nome do item",\n      "quantidade": number,\n      "unidade": "string (un, m, m², etc)",\n      "specs": "string com especificações técnicas detalhadas extraídas do objeto",\n      "valor_unitario_est": number ou null,\n      "valor_total_est": number ou null,\n      "categoria": "string (audiovisual|videowall|led|conferencia|cftv|sonorizacao|automacao|infraestrutura|servico|outro)"\n    }\n  ],\n  "specs_tecnicas": [\n    {\n      "item_ref": 1,\n      "especificacao": "string detalhada com specs técnicas",\n      "marca_referencia": "string ou null",\n      "normas": "string com normas técnicas mencionadas ou null"\n    }\n  ],\n  "produtos_sugeridos": [\n    {\n      "item_ref": 1,\n      "produto": "string com nome do produto comercial sugerido",\n      "fabricante": "string",\n      "modelo": "string",\n      "justificativa": "string explicando por que esse produto atende às specs",\n      "preco_referencia_usd": number ou null,\n      "alternativas": ["string com produto alternativo 1", "string com alternativo 2"]\n    }\n  ]\n}\n\nIMPORTANTE:\n- Extraia TODOS os itens que conseguir identificar no objeto/complemento\n- Para cada item, sugira produtos reais de mercado (Samsung, LG, Barco, Christie, Crestron, Extron, Shure, Sennheiser, Poly, Logitech, Epson, NEC, etc)\n- Se não conseguir identificar itens específicos, infira a partir do contexto\n- Inclua alternativas de diferentes faixas de preço quando possível\n\nLICITAÇÃO:\nObjeto: ' + opp.objeto + '\n' + (opp.complemento ? 'Complemento: ' + opp.complemento + '\n' : '') + 'Órgão: ' + opp.orgao + '\nUF: ' + (opp.uf || 'N/I') + '\nValor estimado: ' + (opp.valor_estimado ? 'R$ ' + Number(opp.valor_estimado).toLocaleString('pt-BR') : 'Não informado') + '\nModalidade: ' + (opp.modalidade || 'Pregão Eletrônico') + '\n' + (docsList ? 'Documentos: ' + docsList + '\n' : '') + '\nResponda APENAS o JSON.';

    var response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": perfil.claude_api_key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
    });

    var data = await response.json();
    if (data.error) return res.status(400).json({ erro: data.error.message });

    var inputTokens = (data.usage && data.usage.input_tokens) || 0;
    var outputTokens = (data.usage && data.usage.output_tokens) || 0;
    var custo = (inputTokens * PRECO_INPUT) + (outputTokens * PRECO_OUTPUT);
    var texto = (data.content && data.content[0] && data.content[0].text) || "";

    var analise = {};
    try { analise = JSON.parse(texto.replace(/```json/g, "").replace(/```/g, "").trim()); } catch (e) { analise = { objeto_resumo: texto, itens: [], specs_tecnicas: [], produtos_sugeridos: [] }; }

    var existing = await supabase.from("edital_analises").select("id").eq("oportunidade_id", oportunidade_id).single();
    if (existing.data) {
      await supabase.from("edital_analises").update({
        status: "concluido", objeto_resumo: analise.objeto_resumo || texto,
        itens: analise.itens || [], specs_tecnicas: analise.specs_tecnicas || [],
        produtos_sugeridos: analise.produtos_sugeridos || [],
        input_tokens: inputTokens, output_tokens: outputTokens, custo_usd: custo,
        atualizado_em: new Date().toISOString(),
      }).eq("id", existing.data.id);
    } else {
      await supabase.from("edital_analises").insert({
        oportunidade_id: oportunidade_id, status: "concluido",
        objeto_resumo: analise.objeto_resumo || texto,
        itens: analise.itens || [], specs_tecnicas: analise.specs_tecnicas || [],
        produtos_sugeridos: analise.produtos_sugeridos || [],
        input_tokens: inputTokens, output_tokens: outputTokens, custo_usd: custo,
      });
    }

    await supabase.from("claude_uso").insert({ endpoint: "edital-analyze", input_tokens: inputTokens, output_tokens: outputTokens, custo_usd: custo, oportunidade_id: oportunidade_id });

    return res.status(200).json({ analise: analise, tokens: { input: inputTokens, output: outputTokens }, custo_usd: custo });
  } catch (err) {
    return res.status(

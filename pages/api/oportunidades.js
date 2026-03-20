import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method === "GET") {
    var result = await supabase.from("oportunidades").select("*").eq("ativo", true).order("score", { ascending: false }).order("data_encontrada", { ascending: false });
    if (result.error) return res.status(500).json({ erro: result.error.message });
    return res.status(200).json(result.data);
  }
  if (req.method === "PUT") {
    var body = req.body;
    if (!body.id) return res.status(400).json({ erro: "ID obrigatório" });
    var update = {};
    if (body.coluna) update.coluna = body.coluna;
    if (body.prioridade) update.prioridade = body.prioridade;
    if (body.ai_modelo) update.ai_modelo = body.ai_modelo;
    if (body.ativo !== undefined) update.ativo = body.ativo;
    var result = await supabase.from("oportunidades").update(update).eq("id", body.id);
    if (result.error) return res.status(500).json({ erro: result.error.message });
    return res.status(200).json({ sucesso: true });
  }
  if (req.method === "POST") {
    var body = req.body;
    if (!body.objeto) return res.status(400).json({ erro: "Objeto obrigatório" });
    var result = await supabase.from("oportunidades").insert({
      pncp_id: "manual-" + Date.now(), objeto: body.objeto, orgao: body.orgao || "", uf: body.uf || "",
      valor_estimado: body.valor || null, coluna: body.coluna || "oportunidades-offline",
      prioridade: body.prioridade || "média", ai_modelo: body.ai_modelo || "claude",
      score: 50, classificacao: "MEDIA", motivos: [], fonte: "MANUAL",
    }).select().single();
    if (result.error) return res.status(500).json({ erro: result.error.message });
    return res.status(201).json(result.data);
  }
  return res.status(405).json({ erro: "Método não suportado" });
}

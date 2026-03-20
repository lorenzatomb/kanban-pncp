import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
  if (req.method === "GET") {
    var result = await supabase.from("perfil_empresa").select("*").eq("id", 1).single();
    if (result.error) return res.status(500).json({ erro: result.error.message });
    return res.status(200).json(result.data);
  }
  if (req.method === "PUT") {
    var body = req.body;
    var update = {};
    if (body.ticket_minimo !== undefined) update.ticket_minimo = body.ticket_minimo;
    if (body.ufs_interesse) update.ufs_interesse = body.ufs_interesse;
    if (body.positivas) update.positivas = body.positivas;
    if (body.negativas) update.negativas = body.negativas;
    update.atualizado_em = new Date().toISOString();
    var result = await supabase.from("perfil_empresa").update(update).eq("id", 1);
    if (result.error) return res.status(500).json({ erro: result.error.message });
    return res.status(200).json({ sucesso: true });
  }
  return res.status(405).json({ erro: "Método não suportado" });
}

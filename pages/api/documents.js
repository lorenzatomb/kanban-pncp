import { supabase } from "../../lib/supabase";
import { parsePncpId, fetchBidDocuments } from "../../lib/pncp";

export default async function handler(req, res) {
  if (req.method === "GET") {
    var id = req.query.id;
    if (!id) return res.status(400).json({ erro: "id obrigatório" });

    var cached = await supabase.from("bid_documents").select("*").eq("oportunidade_id", id);
    if (cached.data && cached.data.length > 0) {
      return res.status(200).json(cached.data);
    }

    var oppRes = await supabase.from("oportunidades").select("pncp_id").eq("id", id).single();
    if (!oppRes.data) return res.status(404).json({ erro: "Oportunidade não encontrada" });

    var parsed = parsePncpId(oppRes.data.pncp_id);
    if (!parsed) return res.status(200).json([]);

    var docs = await fetchBidDocuments(parsed.cnpj, parsed.ano, parsed.sequencial);

    if (docs.length === 0) {
      return res.status(200).json([]);
    }

    var batch = docs.map(function(d) {
      return {
        oportunidade_id: Number(id),
        pncp_id: oppRes.data.pncp_id,
        titulo: d.titulo || d.tipoDocumentoDescricao || "Documento",
        tipo: d.tipoDocumentoNome || "",
        download_url: "https://pncp.gov.br/pncp-api/v1/orgaos/" + parsed.cnpj + "/compras/" + parsed.ano + "/" + parsed.sequencial + "/arquivos/" + d.sequencialDocumento,
        sequencial: d.sequencialDocumento,
      };
    });

    await supabase.from("bid_documents").insert(batch);

    return res.status(200).json(batch);
  }

  return res.status(405).json({ erro: "Use GET" });
}

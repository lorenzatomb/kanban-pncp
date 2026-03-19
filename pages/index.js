export default function Home() {
  return (
    <div style={{fontFamily:"system-ui",padding:40,maxWidth:600,margin:"0 auto"}}>
      <h1 style={{fontSize:24,marginBottom:16}}>Kanban PNCP</h1>
      <p style={{color:"#666",lineHeight:1.6,marginBottom:24}}>
        Backend de busca automática de licitações no PNCP.
        As buscas rodam automaticamente às 6:00 e 15:00 (Brasília).
      </p>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        <a href="/api/oportunidades" style={{color:"#6366f1"}}>GET /api/oportunidades — Ver oportunidades</a>
        <span style={{color:"#999"}}>POST /api/search — Disparar busca manual</span>
        <span style={{color:"#999"}}>GET /api/cron — Endpoint do cron job</span>
      </div>
    </div>
  );
}

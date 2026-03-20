import { useState, useEffect, useCallback } from "react";
var API = "https://kanban-pncp.vercel.app";
var COLS = [{id:"oportunidades-online",t:"Oport. Online",c:"#6366f1"},{id:"oportunidades-offline",t:"Oport. Offline",c:"#a855f7"},{id:"propostas-fazer",t:"Propostas a fazer",c:"#f59e0b"},{id:"propostas-cadastradas",t:"Propostas cadastr.",c:"#8b5cf6"},{id:"data-certame",t:"Data certame",c:"#3b82f6"},{id:"ganho",t:"Ganho",c:"#10b981"},{id:"perdido",t:"Perdido",c:"#ef4444"}];
var ALL_UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
var PRI = {alta:"#ef4444","média":"#f59e0b",baixa:"#6b7280"};
var CLS_C = {ALTA:"#10b981",MEDIA:"#f59e0b",BAIXA:"#6b7280",DESCARTADA:"#ef4444"};
function fc(v){if(!v&&v!==0)return"—";return"R$ "+Number(v).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0});}
function fd(s){if(!s)return"—";try{return new Date(s).toLocaleDateString("pt-BR");}catch(e){return"—";}}
function fdt(s){if(!s)return"";try{return new Date(s).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});}catch(e){return"";}}
function dL(s){if(!s)return null;return Math.ceil((new Date(s)-new Date())/86400000);}

export default function App(){
  var [cards,sc]=useState([]);var [load,sl]=useState(true);var [drag,sd]=useState(null);var [over,so]=useState(null);var [sel,ss]=useState(null);
  var [searching,sSr]=useState(false);var [sRes,sSRes]=useState(null);var [view,sV]=useState("board");
  var [showAdd,sA]=useState(null);var [aT,sAT]=useState("");var [aO,sAO]=useState("");var [aU,sAU]=useState("DF");var [aVal,sAV]=useState("");
  var [stats,sSt]=useState(null);var [credits,sCr]=useState(null);var [perfil,sPf]=useState(null);
  var [pfLoading,sPfL]=useState(false);var [pfSaved,sPfS]=useState(false);
  var [newPos,sNP]=useState({termo:"",peso:3});var [newNeg,sNN]=useState({termo:"",peso:8,tipo:"forte"});

  var loadAll=useCallback(async function(){
    try{var r=await fetch(API+"/api/oportunidades");var d=await r.json();if(Array.isArray(d))sc(d);}catch(e){}
    try{var r2=await fetch(API+"/api/stats");var d2=await r2.json();if(d2&&d2.total!==undefined)sSt(d2);}catch(e){}
    try{var r3=await fetch(API+"/api/credits");var d3=await r3.json();if(d3&&d3.plano)sCr(d3);}catch(e){}
    try{var r4=await fetch(API+"/api/perfil");var d4=await r4.json();if(d4&&d4.nome)sPf(d4);}catch(e){}
    sl(false);
  },[]);
  useEffect(function(){loadAll();},[loadAll]);

  async function move(id,col){sc(function(p){return p.map(function(c){return c.id===id?Object.assign({},c,{coluna:col}):c;});});fetch(API+"/api/oportunidades",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:id,coluna:col})});}
  async function setPri(id,pri){sc(function(p){return p.map(function(c){return c.id===id?Object.assign({},c,{prioridade:pri}):c;});});fetch(API+"/api/oportunidades",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:id,prioridade:pri})});}
  async function archive(id){sc(function(p){return p.filter(function(c){return c.id!==id;});});ss(null);fetch(API+"/api/oportunidades",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:id,ativo:false})});}
  async function search(){sSr(true);sSRes(null);try{var r=await fetch(API+"/api/search",{method:"POST"});var d=await r.json();sSRes(d);loadAll();}catch(e){sSRes({erro:e.message});}sSr(false);}
  async function addCard(col){if(!aT.trim())return;try{await fetch(API+"/api/oportunidades",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({objeto:aT,orgao:aO,uf:aU,valor:aVal?Number(aVal):null,coluna:col})});loadAll();}catch(e){}sAT("");sAO("");sAU("DF");sAV("");sA(null);}
  async function savePerfil(){sPfL(true);sPfS(false);try{await fetch(API+"/api/perfil",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({ticket_minimo:perfil.ticket_minimo,valor_maximo:perfil.valor_maximo,somente_federal:perfil.somente_federal,ufs_interesse:perfil.ufs_interesse,positivas:perfil.positivas,negativas:perfil.negativas,claude_api_key:perfil.claude_api_key,claude_creditos_limite:perfil.claude_creditos_limite})});sPfS(true);setTimeout(function(){sPfS(false);},3000);}catch(e){}sPfL(false);}
  function toggleUf(uf){sPf(function(p){var ufs=p.ufs_interesse||[];var idx=ufs.indexOf(uf);if(idx>=0){var n=ufs.slice();n.splice(idx,1);return Object.assign({},p,{ufs_interesse:n});}return Object.assign({},p,{ufs_interesse:ufs.concat(uf)});});}
  function removePos(i){sPf(function(p){var n=(p.positivas||[]).slice();n.splice(i,1);return Object.assign({},p,{positivas:n});});}
  function removeNeg(i){sPf(function(p){var n=(p.negativas||[]).slice();n.splice(i,1);return Object.assign({},p,{negativas:n});});}
  function addPos(){if(!newPos.termo.trim())return;sPf(function(p){return Object.assign({},p,{positivas:(p.positivas||[]).concat({termo:newPos.termo.trim(),peso:Number(newPos.peso)||3})});});sNP({termo:"",peso:3});}
  function addNeg(){if(!newNeg.termo.trim())return;sPf(function(p){return Object.assign({},p,{negativas:(p.negativas||[]).concat({termo:newNeg.termo.trim(),peso:Number(newNeg.peso)||8,tipo:newNeg.tipo})});});sNN({termo:"",peso:8,tipo:"forte"});}
  function drop(col){if(drag)move(drag,col);sd(null);so(null);}
  var selCard=sel?cards.find(function(c){return c.id===sel;}):null;

  return(
    <div style={{display:"flex",height:"100vh",fontFamily:"'DM Sans',system-ui,sans-serif",background:"#0c0c10",color:"#e4e4e7",overflow:"hidden"}}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}@keyframes slideIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}*::-webkit-scrollbar{width:4px}*::-webkit-scrollbar-track{background:transparent}*::-webkit-scrollbar-thumb{background:#27272a;border-radius:4px}.hov:hover{background:#1f1f26!important;border-color:#2a2a36!important}"}</style>

      {/* SIDEBAR */}
      <div style={{width:60,background:"#14141a",borderRight:"1px solid #1e1e26",display:"flex",flexDirection:"column",alignItems:"center",padding:"16px 0",gap:6,flexShrink:0}}>
        <div style={{width:36,height:36,borderRadius:10,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:700,color:"#fff",marginBottom:20}}>N</div>
        <SB a={view==="board"} o={function(){sV("board");}}><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/></SB>
        <SB a={view==="list"} o={function(){sV("list");}}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></SB>
        <SB a={view==="stats"} o={function(){sV("stats");}}><path d="M18 20V10M12 20V4M6 20v-6"/></SB>
        <SB a={view==="config"} o={function(){sV("config");}}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></SB>
        <div style={{flex:1}}/>
        <SB o={search}>{searching?<circle cx="12" cy="12" r="8" strokeDasharray="16" style={{animation:"spin .8s linear infinite"}}/>:<><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></>}</SB>
      </div>

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0}}>
        {/* TOP */}
        <div style={{borderBottom:"1px solid #1e1e26",flexShrink:0}}>
          <div style={{height:56,display:"flex",alignItems:"center",padding:"0 24px",gap:16}}>
            <span style={{fontSize:16,fontWeight:700,color:"#fafafa"}}>Pipeline Licitações</span>
            <div style={{flex:1}}/>
            <button onClick={search} disabled={searching} style={{padding:"7px 18px",borderRadius:8,border:"1px solid "+(searching?"#1e1e26":"#6366f1"),background:searching?"transparent":"#6366f115",color:searching?"#52525b":"#818cf8",fontSize:12,fontWeight:600,cursor:searching?"default":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6}}>
              {searching&&<div style={{width:12,height:12,border:"2px solid #27272a",borderTop:"2px solid #6366f1",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>}
              {searching?"Buscando...":"Buscar PNCP"}
            </button>
          </div>
          {view!=="config"&&<div style={{display:"flex",alignItems:"center",gap:10,padding:"0 24px 14px",overflowX:"auto"}}>
            {stats&&<><Pill label="Total" value={stats.total}/><Pill label="Pipeline" value={fc(stats.valor_pipeline)} c="#818cf8"/><Pill label="Ganho" value={fc(stats.valor_ganho)} c="#34d399"/>
            {stats.por_classificacao&&Object.keys(stats.por_classificacao).map(function(k){return <Pill key={k} label={k} value={stats.por_classificacao[k]} c={CLS_C[k]||"#71717a"}/>;})}</>}
            {credits&&<><div style={{width:1,height:24,background:"#1e1e26",flexShrink:0,margin:"0 4px"}}/>
            <MiniGauge label="Banco" pct={credits.supabase.rows_limite>0?Math.round(credits.supabase.rows_usadas/credits.supabase.rows_limite*100):0} detail={credits.supabase.rows_usadas+" / "+credits.supabase.rows_limite.toLocaleString("pt-BR")}/>
            <MiniGauge label="Vercel" pct={credits.vercel.invocacoes_limite>0?Math.round(credits.vercel.invocacoes_estimadas/credits.vercel.invocacoes_limite*100):0} detail={credits.vercel.invocacoes_estimadas+" / "+credits.vercel.invocacoes_limite.toLocaleString("pt-BR")}/>
            <MiniGauge label="PNCP" pct={credits.pncp.limite_recomendado_dia>0?Math.round(credits.pncp.editais_analisados_hoje/credits.pncp.limite_recomendado_dia*100):0} detail={credits.pncp.editais_analisados_hoje+" / "+credits.pncp.limite_recomendado_dia.toLocaleString("pt-BR")}/></>}
          </div>}
        </div>

        {sRes&&<div style={{padding:"10px 24px",background:sRes.erro?"#ef444412":"#10b98112",borderBottom:"1px solid "+(sRes.erro?"#ef444430":"#10b98130"),display:"flex",alignItems:"center",gap:8,animation:"fadeIn .3s"}}>
          <div style={{width:7,height:7,borderRadius:"50%",background:sRes.erro?"#ef4444":"#10b981"}}/>
          <span style={{fontSize:12,color:sRes.erro?"#fca5a5":"#6ee7b7"}}>{sRes.erro?"Erro: "+sRes.erro:sRes.analisados+" editais · "+sRes.qualificados+" qualificados · "+sRes.novos+" novos"}</span>
          <div style={{flex:1}}/><button onClick={function(){sSRes(null);}} style={{background:"none",border:"none",color:"#52525b",cursor:"pointer",fontSize:16}}>✕</button>
        </div>}

        {load&&<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{width:28,height:28,border:"3px solid #1e1e26",borderTop:"3px solid #6366f1",borderRadius:"50%",animation:"spin .8s linear infinite"}}/></div>}

        {/* BOARD */}
        {!load&&view==="board"&&<div style={{flex:1,display:"flex",gap:10,padding:"14px 12px",overflowX:"auto",overflowY:"hidden"}}>
          {COLS.map(function(col){
            var cc=cards.filter(function(c){return c.coluna===col.id;});
            var tot=cc.reduce(function(s,c){return s+(c.valor_estimado||0);},0);
            return <div key={col.id} onDragOver={function(e){e.preventDefault();so(col.id);}} onDrop={function(){drop(col.id);}} onDragLeave={function(){so(null);}} style={{flex:1,minWidth:155,background:over===col.id?"#161620":"#111116",borderRadius:12,border:"1px solid "+(over===col.id?"#2a2a36":"#1a1a22"),display:"flex",flexDirection:"column",transition:"all .15s"}}>
              <div style={{padding:"12px 12px 6px",display:"flex",alignItems:"center",gap:5}}>
                <div style={{width:7,height:7,borderRadius:"50%",background:col.c,flexShrink:0}}/>
                <span style={{fontSize:9,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em",color:"#8a8a9a",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{col.t}</span>
                <span style={{fontSize:9,color:"#4a4a56",fontWeight:600,background:"#1a1a22",padding:"2px 6px",borderRadius:5,flexShrink:0}}>{cc.length}</span>
                <div style={{flex:1}}/>
                <button onClick={function(){sA(showAdd===col.id?null:col.id);}} style={{width:20,height:20,borderRadius:5,border:"1px solid #1e1e26",background:"transparent",color:"#5a5a66",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>+</button>
              </div>
              {tot>0&&<div style={{padding:"0 12px 6px",fontSize:9,color:"#3a3a44",fontFamily:"'JetBrains Mono',monospace"}}>{fc(tot)}</div>}
              {showAdd===col.id&&<div style={{margin:"0 8px 6px",padding:10,background:"#161620",borderRadius:8,border:"1px solid #2a2a36",display:"flex",flexDirection:"column",gap:5,animation:"fadeIn .2s"}}>
                <input value={aT} onChange={function(e){sAT(e.target.value);}} placeholder="Objeto..." style={inp()}/>
                <input value={aO} onChange={function(e){sAO(e.target.value);}} placeholder="Órgão" style={inp()}/>
                <div style={{display:"flex",gap:4}}><input value={aU} onChange={function(e){sAU(e.target.value);}} placeholder="UF" style={Object.assign({},inp(),{width:44})} maxLength={2}/><input value={aVal} onChange={function(e){sAV(e.target.value);}} placeholder="Valor" type="number" style={Object.assign({},inp(),{flex:1})}/></div>
                <button onClick={function(){addCard(col.id);}} style={{padding:"6px",borderRadius:6,border:"none",background:"#6366f1",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Adicionar</button>
              </div>}
              <div style={{flex:1,padding:"0 8px 8px",overflowY:"auto",display:"flex",flexDirection:"column",gap:5}}>
                {cc.map(function(card){var d=dL(card.data_encerramento);var urg=d!==null&&d>=0&&d<=3;var exp=d!==null&&d<0;
                  return <div key={card.id} className="hov" draggable onDragStart={function(){sd(card.id);}} onClick={function(){ss(sel===card.id?null:card.id);}} style={{background:sel===card.id?"#1a1a28":"#14141a",border:"1px solid "+(sel===card.id?"#6366f1":urg?"#ef444450":"#1e1e26"),borderRadius:10,padding:"10px 11px",cursor:"grab",transition:"all .12s",opacity:drag===card.id?0.35:exp?0.45:1}}>
                    {card.score>0&&<div style={{display:"flex",alignItems:"center",gap:6,marginBottom:7}}><div style={{flex:1,height:3,background:"#1e1e26",borderRadius:3,overflow:"hidden"}}><div style={{width:Math.min(100,card.score)+"%",height:"100%",background:card.score>=70?"#10b981":card.score>=50?"#f59e0b":"#6b7280",borderRadius:3}}/></div><span style={{fontSize:9,fontWeight:700,color:card.score>=70?"#10b981":card.score>=50?"#f59e0b":"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>{card.score}</span></div>}
                    <div style={{fontSize:11,fontWeight:600,color:"#eaeaef",lineHeight:1.4,marginBottom:5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{card.objeto||"Sem título"}</div>
                    {card.orgao&&<div style={{fontSize:9,color:"#4a4a56",marginBottom:5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{card.orgao}</div>}
                    <div style={{display:"flex",flexWrap:"wrap",gap:3,alignItems:"center"}}>
                      {card.uf&&<Tag t={card.uf} bg="#3b82f618" c="#60a5fa"/>}
                      {card.classificacao&&<Tag t={card.classificacao} bg={(CLS_C[card.classificacao]||"#6b7280")+"18"} c={CLS_C[card.classificacao]||"#6b7280"}/>}
                      {card.keyword_match&&<Tag t={card.keyword_match.split(",")[0]} bg="#6366f118" c="#818cf8"/>}
                      {d!==null&&d>=0&&<Tag t={d===0?"Hoje!":d+"d"} bg={urg?"#ef444418":"#f59e0b18"} c={urg?"#ef4444":"#fbbf24"}/>}
                      {exp&&<Tag t="Enc." bg="#ef444418" c="#ef4444"/>}
                      {card.valor_estimado?<span style={{fontSize:8,color:"#3a3a44",marginLeft:"auto",fontFamily:"'JetBrains Mono',monospace"}}>{fc(card.valor_estimado)}</span>:null}
                    </div>
                  </div>;})}
              </div>
            </div>;})}
        </div>}

        {/* LIST */}
        {!load&&view==="list"&&<div style={{flex:1,overflowY:"auto",padding:"16px 24px"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{borderBottom:"1px solid #1e1e26"}}>{["Score","Objeto","Órgão","UF","Valor","Coluna","Class.","Prazo"].map(function(h){return <th key={h} style={{padding:"10px 12px",textAlign:"left",fontSize:10,fontWeight:600,color:"#5a5a66",textTransform:"uppercase"}}>{h}</th>;})}</tr></thead>
            <tbody>{cards.map(function(c){var col=COLS.find(function(cl){return cl.id===c.coluna;});
              return <tr key={c.id} className="hov" onClick={function(){ss(sel===c.id?null:c.id);}} style={{borderBottom:"1px solid #1a1a22",cursor:"pointer",background:sel===c.id?"#1a1a28":"transparent"}}>
                <td style={{padding:"12px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:32,height:4,background:"#1e1e26",borderRadius:3,overflow:"hidden"}}><div style={{width:Math.min(100,c.score||0)+"%",height:"100%",background:(c.score||0)>=70?"#10b981":(c.score||0)>=50?"#f59e0b":"#6b7280",borderRadius:3}}/></div><span style={{fontSize:11,fontWeight:700,color:(c.score||0)>=70?"#10b981":(c.score||0)>=50?"#f59e0b":"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>{c.score||0}</span></div></td>
                <td style={{padding:"12px",maxWidth:260,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:"#eaeaef",fontWeight:500}}>{(c.objeto||"").substring(0,70)}</td>
                <td style={{padding:"12px",color:"#5a5a66",maxWidth:140,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{(c.orgao||"").substring(0,35)}</td>
                <td style={{padding:"12px"}}><Tag t={c.uf||"—"} bg="#3b82f618" c="#60a5fa"/></td>
                <td style={{padding:"12px",fontFamily:"'JetBrains Mono',monospace",fontSize:11,color:"#8a8a9a"}}>{fc(c.valor_estimado)}</td>
                <td style={{padding:"12px"}}>{col&&<Tag t={col.t} bg={col.c+"18"} c={col.c}/>}</td>
                <td style={{padding:"12px"}}>{c.classificacao&&<Tag t={c.classificacao} bg={(CLS_C[c.classificacao]||"#6b7280")+"18"} c={CLS_C[c.classificacao]||"#6b7280"}/>}</td>
                <td style={{padding:"12px",fontSize:11,color:"#5a5a66",fontFamily:"'JetBrains Mono',monospace"}}>{fd(c.data_encerramento)}</td>
              </tr>;})}</tbody>
          </table>
        </div>}

        {/* STATS */}
        {!load&&view==="stats"&&<div style={{flex:1,overflowY:"auto",padding:"24px"}}>{stats?<div style={{display:"flex",flexDirection:"column",gap:20}}>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
            <BigN label="Total" value={stats.total} c="#818cf8"/><BigN label="Pipeline" value={fc(stats.valor_pipeline)} c="#818cf8"/><BigN label="Ganho" value={fc(stats.valor_ganho)} c="#34d399"/><BigN label="Última busca" value={stats.ultimas_buscas&&stats.ultimas_buscas[0]?fdt(stats.ultimas_buscas[0].data_busca):"—"} c="#8a8a9a"/>
          </div>
          {credits&&<div style={{background:"#14141a",borderRadius:12,border:"1px solid #1e1e26",padding:20}}>
            <div style={{fontSize:11,fontWeight:600,color:"#5a5a66",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:18}}>Consumo de recursos · Plano <span style={{color:"#818cf8"}}>{credits.plano}</span></div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
              <BigGauge label="Banco (Supabase)" used={credits.supabase.rows_usadas} total={credits.supabase.rows_limite} unit="rows"/>
              <BigGauge label="Servidor (Vercel)" used={credits.vercel.invocacoes_estimadas} total={credits.vercel.invocacoes_limite} unit="invocações"/>
              <BigGauge label="API PNCP (hoje)" used={credits.pncp.editais_analisados_hoje} total={credits.pncp.limite_recomendado_dia} unit="editais"/>
            </div>
          </div>}
          <div style={{background:"#14141a",borderRadius:12,border:"1px solid #1e1e26",padding:20}}>
            <div style={{fontSize:11,fontWeight:600,color:"#5a5a66",textTransform:"uppercase",marginBottom:14}}>Por classificação</div>
            <div style={{display:"flex",gap:12}}>{["ALTA","MEDIA","BAIXA"].map(function(k){var v=(stats.por_classificacao||{})[k]||0;var t=stats.total||1;return <div key={k} style={{flex:1,background:"#111116",borderRadius:10,padding:16,border:"1px solid #1e1e26"}}><div style={{fontSize:24,fontWeight:700,color:CLS_C[k],fontFamily:"'JetBrains Mono',monospace"}}>{v}</div><div style={{fontSize:10,color:"#5a5a66",marginTop:4,textTransform:"uppercase"}}>{k}</div><div style={{marginTop:8,height:4,background:"#1e1e26",borderRadius:3,overflow:"hidden"}}><div style={{width:Math.round(v/t*100)+"%",height:"100%",background:CLS_C[k],borderRadius:3}}/></div></div>;})}</div>
          </div>
          {stats.por_uf&&<div style={{background:"#14141a",borderRadius:12,border:"1px solid #1e1e26",padding:20}}>
            <div style={{fontSize:11,fontWeight:600,color:"#5a5a66",textTransform:"uppercase",marginBottom:14}}>Por estado</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{Object.keys(stats.por_uf).sort(function(a,b){return stats.por_uf[b]-stats.por_uf[a];}).map(function(uf){return <div key={uf} style={{padding:"6px 12px",background:"#111116",borderRadius:8,border:"1px solid #1e1e26",display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:11,fontWeight:600,color:"#60a5fa"}}>{uf}</span><span style={{fontSize:11,color:"#5a5a66",fontFamily:"'JetBrains Mono',monospace"}}>{stats.por_uf[uf]}</span></div>;})}</div>
          </div>}
        </div>:<div style={{color:"#5a5a66"}}>Carregando...</div>}</div>}

        {/* CONFIG */}
        {!load&&view==="config"&&<div style={{flex:1,overflowY:"auto",padding:"24px"}}>{perfil?<div style={{maxWidth:800,display:"flex",flexDirection:"column",gap:20}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <div><div style={{fontSize:18,fontWeight:700,color:"#fafafa"}}>Configurações</div><div style={{fontSize:12,color:"#5a5a66",marginTop:2}}>Filtros e parâmetros do scoring</div></div>
            <div style={{flex:1}}/>
            <button onClick={savePerfil} disabled={pfLoading} style={{padding:"9px 24px",borderRadius:8,border:"none",background:pfSaved?"#10b981":"#6366f1",color:"#fff",fontSize:12,fontWeight:600,cursor:pfLoading?"default":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,transition:"background .3s"}}>
              {pfLoading&&<div style={{width:12,height:12,border:"2px solid rgba(255,255,255,.3)",borderTop:"2px solid #fff",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>}
              {pfSaved?"Salvo!":pfLoading?"Salvando...":"Salvar alterações"}
            </button>
          </div>

          {/* FILTROS GERAIS */}
          <Crd title="Filtros gerais" desc="Definem quais oportunidades entram ou são descartadas antes do scoring">
            {/* Somente Federal */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16,padding:"12px 16px",background:"#111116",borderRadius:10,border:"1px solid #1e1e26"}}>
              <div onClick={function(){sPf(Object.assign({},perfil,{somente_federal:!perfil.somente_federal}));}} style={{width:40,height:22,borderRadius:11,background:perfil.somente_federal?"#6366f1":"#2a2a36",cursor:"pointer",position:"relative",transition:"background .2s",flexShrink:0}}>
                <div style={{width:18,height:18,borderRadius:9,background:"#fff",position:"absolute",top:2,left:perfil.somente_federal?20:2,transition:"left .2s",boxShadow:"0 1px 3px rgba(0,0,0,.3)"}}/>
              </div>
              <div><div style={{fontSize:12,fontWeight:600,color:"#eaeaef"}}>Somente órgãos federais</div><div style={{fontSize:10,color:"#4a4a56",marginTop:2}}>Descarta automaticamente licitações de órgãos estaduais e municipais</div></div>
            </div>
            {/* Valor mínimo e máximo */}
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10,fontWeight:600,color:"#5a5a66",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Valor mínimo</div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:12,color:"#5a5a66"}}>R$</span>
                  <input value={perfil.ticket_minimo||""} onChange={function(e){sPf(Object.assign({},perfil,{ticket_minimo:Number(e.target.value)||0}));}} type="number" style={Object.assign({},inp(),{fontSize:13,fontWeight:600})}/>
                </div>
                <div style={{display:"flex",gap:4,marginTop:6}}>
                  {[50000,100000,200000,500000].map(function(v){return <button key={v} onClick={function(){sPf(Object.assign({},perfil,{ticket_minimo:v}));}} style={{padding:"4px 8px",borderRadius:5,fontSize:9,fontWeight:600,border:"1px solid "+(perfil.ticket_minimo===v?"#6366f1":"#1e1e26"),background:perfil.ticket_minimo===v?"#6366f118":"transparent",color:perfil.ticket_minimo===v?"#818cf8":"#4a4a56",cursor:"pointer",fontFamily:"inherit"}}>{fc(v)}</button>;})}
                </div>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:10,fontWeight:600,color:"#5a5a66",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Valor máximo <span style={{color:"#3a3a44",fontWeight:400}}>(0 = sem limite)</span></div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontSize:12,color:"#5a5a66"}}>R$</span>
                  <input value={perfil.valor_maximo||""} onChange={function(e){sPf(Object.assign({},perfil,{valor_maximo:Number(e.target.value)||0}));}} type="number" style={Object.assign({},inp(),{fontSize:13,fontWeight:600})}/>
                </div>
                <div style={{display:"flex",gap:4,marginTop:6}}>
                  {[1000000,5000000,10000000,0].map(function(v){return <button key={v} onClick={function(){sPf(Object.assign({},perfil,{valor_maximo:v}));}} style={{padding:"4px 8px",borderRadius:5,fontSize:9,fontWeight:600,border:"1px solid "+(perfil.valor_maximo===v?"#6366f1":"#1e1e26"),background:perfil.valor_maximo===v?"#6366f118":"transparent",color:perfil.valor_maximo===v?"#818cf8":"#4a4a56",cursor:"pointer",fontFamily:"inherit"}}>{v===0?"Sem limite":fc(v)}</button>;})}
                </div>
              </div>
            </div>
          </Crd>

          {/* UFs */}
          <Crd title="Estados de interesse" desc="UFs ativas ganham +8 pts no score. Clique para ativar/desativar.">
            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
              {ALL_UFS.map(function(uf){var a=(perfil.ufs_interesse||[]).indexOf(uf)>=0;return <button key={uf} onClick={function(){toggleUf(uf);}} style={{width:40,height:32,borderRadius:6,fontSize:11,fontWeight:600,border:"1px solid "+(a?"#3b82f6":"#1e1e26"),background:a?"#3b82f618":"#111116",color:a?"#60a5fa":"#3a3a44",cursor:"pointer",fontFamily:"inherit",transition:"all .15s"}}>{uf}</button>;})}
            </div>
            <div style={{marginTop:8,fontSize:10,color:"#3a3a44"}}>{(perfil.ufs_interesse||[]).length} selecionados</div>
          </Crd>

          {/* POSITIVAS */}
          <Crd title="Keywords positivas" desc="Termos que aumentam o score (peso 1-5)">
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:12}}>
              {(perfil.positivas||[]).map(function(p,i){return <div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",background:"#10b98112",borderRadius:6,border:"1px solid #10b98125"}}><span style={{fontSize:11,color:"#34d399",fontWeight:500}}>{p.termo}</span><span style={{fontSize:9,color:"#065f46",fontWeight:700,background:"#10b98125",padding:"1px 5px",borderRadius:3}}>+{p.peso}</span><button onClick={function(){removePos(i);}} style={{background:"none",border:"none",color:"#5a5a66",cursor:"pointer",fontSize:12,padding:0,marginLeft:2}}>✕</button></div>;})}
            </div>
            <div style={{display:"flex",gap:6}}>
              <input value={newPos.termo} onChange={function(e){sNP(Object.assign({},newPos,{termo:e.target.value}));}} onKeyDown={function(e){if(e.key==="Enter")addPos();}} placeholder="Nova keyword..." style={Object.assign({},inp(),{flex:1})}/>
              <select value={newPos.peso} onChange={function(e){sNP(Object.assign({},newPos,{peso:Number(e.target.value)}));}} style={Object.assign({},inp(),{width:55,cursor:"pointer"})}><option value={1}>+1</option><option value={2}>+2</option><option value={3}>+3</option><option value={4}>+4</option><option value={5}>+5</option></select>
              <button onClick={addPos} style={{padding:"7px 14px",borderRadius:7,border:"none",background:"#10b981",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+</button>
            </div>
          </Crd>

          {/* NEGATIVAS */}
          <Crd title="Keywords negativas" desc="Forte = descarte imediato. Fraca = reduz score.">
            <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:12}}>
              {(perfil.negativas||[]).map(function(n,i){var f=n.tipo==="forte";return <div key={i} style={{display:"flex",alignItems:"center",gap:4,padding:"5px 10px",background:f?"#ef444412":"#f59e0b12",borderRadius:6,border:"1px solid "+(f?"#ef444425":"#f59e0b25")}}><span style={{fontSize:11,color:f?"#f87171":"#fbbf24",fontWeight:500}}>{n.termo}</span><span style={{fontSize:8,fontWeight:700,background:f?"#ef444425":"#f59e0b25",color:f?"#991b1b":"#92400e",padding:"1px 5px",borderRadius:3}}>{f?"FORTE":"FRACA"}</span><button onClick={function(){removeNeg(i);}} style={{background:"none",border:"none",color:"#5a5a66",cursor:"pointer",fontSize:12,padding:0,marginLeft:2}}>✕</button></div>;})}
            </div>
            <div style={{display:"flex",gap:6}}>
              <input value={newNeg.termo} onChange={function(e){sNN(Object.assign({},newNeg,{termo:e.target.value}));}} onKeyDown={function(e){if(e.key==="Enter")addNeg();}} placeholder="Termo negativo..." style={Object.assign({},inp(),{flex:1})}/>
              <select value={newNeg.tipo} onChange={function(e){sNN(Object.assign({},newNeg,{tipo:e.target.value}));}} style={Object.assign({},inp(),{width:75,cursor:"pointer"})}><option value="forte">Forte</option><option value="fraca">Fraca</option></select>
              <button onClick={addNeg} style={{padding:"7px 14px",borderRadius:7,border:"none",background:"#ef4444",color:"#fff",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>+</button>
            </div>
          </Crd>

          {/* CLAUDE */}
          <Crd title="Claude API" desc="Configure sua chave da API Anthropic para análises avançadas de editais">
            <div style={{display:"flex",gap:12}}>
              <div style={{flex:1}}>
                <div style={{fontSize:10,fontWeight:600,color:"#5a5a66",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>API Key</div>
                <input value={perfil.claude_api_key||""} onChange={function(e){sPf(Object.assign({},perfil,{claude_api_key:e.target.value}));}} placeholder="sk-ant-..." type="password" style={Object.assign({},inp(),{fontFamily:"'JetBrains Mono',monospace"})}/>
              </div>
              <div style={{width:120}}>
                <div style={{fontSize:10,fontWeight:600,color:"#5a5a66",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:6}}>Limite USD/mês</div>
                <input value={perfil.claude_creditos_limite||""} onChange={function(e){sPf(Object.assign({},perfil,{claude_creditos_limite:Number(e.target.value)||0}));}} type="number" style={Object.assign({},inp(),{fontFamily:"'JetBrains Mono',monospace"})}/>
              </div>
            </div>
            <div style={{marginTop:12,padding:"12px 16px",background:"#111116",borderRadius:8,border:"1px solid #1e1e26"}}>
              <div style={{fontSize:10,color:"#4a4a56",lineHeight:1.6}}>
                A chave é usada para: análise semântica de editais, geração de resumos e sugestões de proposta. Obtenha em <span style={{color:"#818cf8"}}>console.anthropic.com</span>
              </div>
            </div>
          </Crd>

          {/* COMO FUNCIONA */}
          <Crd title="Como o scoring funciona" desc="">
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <ScR label="Keywords positivas" range="0–35 pts" desc="Soma dos pesos dos termos encontrados" c="#10b981"/>
              <ScR label="Ticket (valor)" range="0–20 pts" desc="Escala logarítmica" c="#fbbf24"/>
              <ScR label="Geografia (UF)" range="0–8 pts" desc="UF do interesse = +8 pts" c="#60a5fa"/>
              <ScR label="Órgão federal" range="+5 pts" desc="Bônus para órgãos federais" c="#818cf8"/>
              <ScR label="Negativas fracas" range="0 a -15 pts" desc="Reduz sem descartar" c="#f59e0b"/>
              <ScR label="Negativas fortes" range="Descarte" desc="Eliminação imediata" c="#ef4444"/>
              <ScR label="Valor mín/máx" range="Descarte" desc="Fora da faixa = eliminada" c="#ef4444"/>
              <ScR label="Não federal" range="Descarte" desc="Quando filtro federal ativo" c="#ef4444"/>
              <div style={{marginTop:8,padding:12,background:"#111116",borderRadius:8,border:"1px solid #1e1e26"}}>
                <div style={{fontSize:10,color:"#5a5a66"}}><span style={{color:"#10b981",fontWeight:600}}>ALTA (70+)</span> · <span style={{color:"#f59e0b",fontWeight:600}}>MEDIA (50-69)</span> · <span style={{color:"#6b7280",fontWeight:600}}>BAIXA (30-49)</span> · <span style={{color:"#ef4444",fontWeight:600}}>DESCARTADA (&lt;30)</span></div>
              </div>
            </div>
          </Crd>
        </div>:<div style={{color:"#5a5a66",padding:40}}>Carregando...</div>}</div>}
      </div>

      {/* DETAIL */}
      {selCard&&view!=="config"&&<div style={{width:380,background:"#14141a",borderLeft:"1px solid #1e1e26",display:"flex",flexDirection:"column",flexShrink:0,animation:"slideIn .25s"}}>
        <div style={{padding:"16px 18px",borderBottom:"1px solid #1e1e26",display:"flex",gap:10}}>
          <div style={{flex:1}}>
            {selCard.score>0&&<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}><div style={{width:42,height:42,borderRadius:10,background:(selCard.score>=70?"#10b981":selCard.score>=50?"#f59e0b":"#6b7280")+"18",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:16,fontWeight:700,color:selCard.score>=70?"#10b981":selCard.score>=50?"#f59e0b":"#6b7280",fontFamily:"'JetBrains Mono',monospace"}}>{selCard.score}</span></div><div><div style={{fontSize:10,fontWeight:600,color:CLS_C[selCard.classificacao]||"#6b7280",textTransform:"uppercase"}}>{selCard.classificacao}</div><div style={{fontSize:10,color:"#4a4a56"}}>Score</div></div></div>}
            <div style={{fontSize:13,fontWeight:600,color:"#eaeaef",lineHeight:1.4}}>{selCard.objeto||"Sem título"}</div>
            <div style={{fontSize:11,color:"#5a5a66",marginTop:3}}>{selCard.orgao}</div>
          </div>
          <button onClick={function(){ss(null);}} style={{width:26,height:26,borderRadius:7,border:"1px solid #1e1e26",background:"transparent",color:"#5a5a66",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,alignSelf:"flex-start"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:"16px 18px"}}>
          <Sec t="Mover para"><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{COLS.map(function(col){var a=selCard.coluna===col.id;return <button key={col.id} onClick={function(){if(!a)move(selCard.id,col.id);}} style={{padding:"4px 9px",borderRadius:5,fontSize:9,fontWeight:600,border:"1px solid "+(a?col.c:"#1e1e26"),background:a?col.c+"18":"transparent",color:a?col.c:"#5a5a66",cursor:a?"default":"pointer",fontFamily:"inherit"}}>{col.t}</button>;})}</div></Sec>
          <Sec t="Prioridade"><div style={{display:"flex",gap:6}}>{["alta","média","baixa"].map(function(p){var a=selCard.prioridade===p;return <button key={p} onClick={function(){setPri(selCard.id,p);}} style={{padding:"5px 14px",borderRadius:6,fontSize:11,fontWeight:600,border:"1px solid "+(a?PRI[p]:"#1e1e26"),background:a?PRI[p]+"18":"transparent",color:a?PRI[p]:"#5a5a66",cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{p}</button>;})}</div></Sec>
          <Sec t="Informações"><div style={{display:"flex",flexDirection:"column",gap:9}}>
            <IR l="UF" v={selCard.uf||"—"}/><IR l="Valor" v={fc(selCard.valor_estimado)} m/><IR l="Modalidade" v={selCard.modalidade||"—"}/><IR l="Keywords" v={selCard.keyword_match||"—"}/><IR l="Fonte" v={selCard.fonte||"PNCP"}/><IR l="PNCP ID" v={selCard.pncp_id||"—"} m/><IR l="Publicação" v={fd(selCard.data_publicacao)}/><IR l="Encerramento" v={fd(selCard.data_encerramento)} h={dL(selCard.data_encerramento)!==null&&dL(selCard.data_encerramento)<=3&&dL(selCard.data_encerramento)>=0}/><IR l="Encontrada" v={fdt(selCard.data_encontrada)}/>
          </div></Sec>
          {selCard.motivos&&selCard.motivos.length>0&&<Sec t="Motivos do score"><div style={{display:"flex",flexDirection:"column",gap:4}}>{selCard.motivos.map(function(m,i){var icon=m.tipo==="POSITIVA"?"+":m.tipo==="UF_INTERESSE"?"•":m.tipo==="TICKET"?"$":m.tipo==="ORGAO_FEDERAL"?"★":"·";var color=m.tipo==="POSITIVA"?"#34d399":m.tipo==="UF_INTERESSE"?"#60a5fa":m.tipo==="TICKET"?"#fbbf24":m.tipo==="ORGAO_FEDERAL"?"#818cf8":"#8a8a9a";return <div key={i} style={{fontSize:11,color:color,padding:"4px 8px",background:"#111116",borderRadius:6}}><span style={{marginRight:6}}>{icon}</span>{m.termo?m.termo+" (+"+m.peso+")":m.tipo+(m.pontos?" (+"+m.pontos+")":"")}</div>;})}</div></Sec>}
          {selCard.link_edital&&<Sec t="Edital"><a href={selCard.link_edital} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:7,border:"1px solid #1e1e26",color:"#818cf8",fontSize:11,fontWeight:600,textDecoration:"none"}}>Abrir no sistema de origem ↗</a></Sec>}
          <Sec t="Objeto completo"><div style={{fontSize:12,color:"#8a8a9a",lineHeight:1.7,background:"#111116",padding:12,borderRadius:8,border:"1px solid #1e1e26"}}>{selCard.objeto}</div></Sec>
          <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid #1e1e26"}}><button onClick={function(){archive(selCard.id);}} style={{padding:"8px 16px",borderRadius:7,border:"1px solid #ef444430",background:"#ef444410",color:"#f87171",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Arquivar</button></div>
        </div>
      </div>}
    </div>
  );
}

function Crd(p){return <div style={{background:"#14141a",borderRadius:12,border:"1px solid #1e1e26",padding:20}}><div style={{fontSize:13,fontWeight:600,color:"#eaeaef",marginBottom:2}}>{p.title}</div>{p.desc&&<div style={{fontSize:11,color:"#4a4a56",marginBottom:14,lineHeight:1.5}}>{p.desc}</div>}{p.children}</div>;}
function ScR(p){return <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:"#111116",borderRadius:8,border:"1px solid #1e1e26"}}><div style={{width:4,height:24,borderRadius:2,background:p.c,flexShrink:0}}/><div style={{flex:1}}><div style={{fontSize:11,fontWeight:600,color:"#eaeaef"}}>{p.label}</div><div style={{fontSize:10,color:"#4a4a56"}}>{p.desc}</div></div><span style={{fontSize:11,fontWeight:700,color:p.c,fontFamily:"'JetBrains Mono',monospace",flexShrink:0}}>{p.range}</span></div>;}
function MiniGauge(p){var color=p.pct>=90?"#ef4444":p.pct>=70?"#f59e0b":"#10b981";return <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:8,background:"#14141a",border:"1px solid #1e1e26",minWidth:120}} title={p.detail}><span style={{fontSize:9,color:"#5a5a66",whiteSpace:"nowrap"}}>{p.label}</span><div style={{flex:1,height:4,background:"#1e1e26",borderRadius:3,overflow:"hidden",minWidth:24}}><div style={{width:Math.min(100,p.pct)+"%",height:"100%",background:color,borderRadius:3,transition:"width .5s"}}/></div><span style={{fontSize:9,fontWeight:700,color:color,fontFamily:"'JetBrains Mono',monospace"}}>{p.pct}%</span></div>;}
function BigGauge(p){var pct=p.total>0?Math.min(100,Math.round(p.used/p.total*100)):0;var color=pct>=90?"#ef4444":pct>=70?"#f59e0b":"#10b981";var r=40;var circ=2*Math.PI*r;var arc=circ*0.75;var offset=arc-(arc*pct/100);return <div style={{background:"#111116",borderRadius:12,border:"1px solid #1e1e26",padding:"20px 16px",display:"flex",flexDirection:"column",alignItems:"center"}}><svg width="100" height="80" viewBox="0 0 100 80"><circle cx="50" cy="50" r={r} fill="none" stroke="#1e1e26" strokeWidth="6" strokeDasharray={arc+" "+circ} strokeDashoffset="0" strokeLinecap="round" transform="rotate(135 50 50)"/><circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="6" strokeDasharray={arc+" "+circ} strokeDashoffset={offset} strokeLinecap="round" transform="rotate(135 50 50)" style={{transition:"stroke-dashoffset .8s ease"}}/><text x="50" y="46" textAnchor="middle" fill={color} fontSize="18" fontWeight="700" fontFamily="'JetBrains Mono',monospace">{pct}%</text><text x="50" y="62" textAnchor="middle" fill="#5a5a66" fontSize="8">{p.used.toLocaleString("pt-BR")} / {p.total.toLocaleString("pt-BR")}</text></svg><div style={{fontSize:11,fontWeight:600,color:"#8a8a9a",marginTop:4,textAlign:"center"}}>{p.label}</div><div style={{fontSize:9,color:"#3a3a44",marginTop:2,textAlign:"center"}}>{p.unit}</div></div>;}
function Tag(p){return <span style={{fontSize:9,fontWeight:600,padding:"2px 7px",borderRadius:4,background:p.bg,color:p.c,whiteSpace:"nowrap"}}>{p.t}</span>;}
function Pill(p){return <div style={{display:"flex",alignItems:"center",gap:6,padding:"4px 12px",borderRadius:8,background:"#14141a",border:"1px solid #1e1e26"}}><span style={{fontSize:10,color:"#5a5a66"}}>{p.label}</span><span style={{fontSize:12,fontWeight:600,color:p.c||"#8a8a9a",fontFamily:"'JetBrains Mono',monospace"}}>{p.value}</span></div>;}
function BigN(p){return <div style={{background:"#111116",borderRadius:12,border:"1px solid #1e1e26",padding:"18px 20px"}}><div style={{fontSize:22,fontWeight:700,color:p.c||"#eaeaef",fontFamily:"'JetBrains Mono',monospace",lineHeight:1}}>{p.value}</div><div style={{fontSize:10,color:"#5a5a66",marginTop:6,textTransform:"uppercase"}}>{p.label}</div></div>;}
function Sec(p){return <div style={{marginBottom:18}}><div style={{fontSize:10,fontWeight:600,color:"#5a5a66",textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>{p.t}</div>{p.children}</div>;}
function IR(p){return <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:"#4a4a56"}}>{p.l}</span><span style={{fontSize:11,color:p.h?"#ef4444":"#8a8a9a",fontWeight:p.h?600:400,fontFamily:p.m?"'JetBrains Mono',monospace":"inherit"}}>{p.v}</span></div>;}
function SB(p){return <div onClick={p.o} style={{width:38,height:38,borderRadius:10,background:p.a?"#1e1e26":"transparent",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",transition:"background .15s"}}><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={p.a?"#eaeaef":"#5a5a66"} strokeWidth="1.5">{p.children}</svg></div>;}
function inp(){return{width:"100%",background:"#1a1a22",border:"1px solid #2a2a36",borderRadius:7,padding:"7px 10px",color:"#eaeaef",fontSize:11,outline:"none",fontFamily:"inherit"};}

// Álbum de eventos: carrega de event_albums (Supabase) ou do data.json (fallback).
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const safe=v=>{const s=String(v||"");if(s.startsWith("assets/"))return s;try{const u=new URL(s,location.href);return["http:","https:"].includes(u.protocol)?u.href:"#"}catch{return"#"}};
const $=s=>document.querySelector(s);
let albums=[],filter="Todos",cur=null,idx=0;

// Converte uma URL de vídeo em {kind, src, thumb}. Aceita YouTube, Vimeo, Instagram, Facebook e arquivos .mp4/.webm
function parseVideo(raw){
  try{
    const u=new URL(String(raw).trim()),h=u.hostname.replace(/^www\.|^m\./,""),p=u.pathname.split("/").filter(Boolean);
    let id="";
    if(h==="youtu.be")id=p[0];else if(/^(youtube|music\.youtube|youtube-nocookie)\.com$/.test(h))id=u.pathname==="/watch"?u.searchParams.get("v"):(/^(embed|shorts|live)$/.test(p[0])?p[1]:"");
    if(/^[\w-]{11}$/.test(id||""))return{kind:"iframe",src:`https://www.youtube.com/embed/${id}?rel=0&playsinline=1`,thumb:`https://img.youtube.com/vi/${id}/hqdefault.jpg`};
    if(h==="vimeo.com"&&/^\d+$/.test(p[p.length-1]||""))return{kind:"iframe",src:`https://player.vimeo.com/video/${p[p.length-1]}`};
    if(h==="instagram.com"){const i=p.findIndex(x=>/^(p|reel|tv)$/.test(x));if(i>=0&&p[i+1])return{kind:"iframe",src:`https://www.instagram.com/${p[i]}/${p[i+1]}/embed`}}
    if(/^(facebook\.com|fb\.watch)$/.test(h))return{kind:"iframe",src:`https://www.facebook.com/plugins/video.php?show_text=false&href=${encodeURIComponent(u.href)}`};
    if(/\.(mp4|webm|mov|m4v|ogg)$/i.test(u.pathname))return{kind:"file",src:u.href};
  }catch{}
  return null;
}
const mediaOf=a=>[...(a.photos||[]).map(src=>({kind:"img",src})),...(a.videos||[]).map(parseVideo).filter(Boolean)];
const coverOf=a=>(a.photos||[])[0]||(a.videos||[]).map(parseVideo).find(v=>v&&v.thumb)?.thumb||"assets/hero-worship-bg.jpg";
const fmt=d=>{const x=new Date(d+"T12:00:00");return isNaN(x)?(d||""):x.toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"}).replace(/\./g,"").toUpperCase()};

async function load(){
  try{
    const c=window.AL_JOVEM_CONFIG;
    if(c?.SUPABASE_URL&&!c.SUPABASE_URL.includes("COLE_AQUI")){
      const sb=supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY);
      const{data,error}=await sb.from("event_albums").select("*").eq("published",true).order("event_date",{ascending:false});
      if(!error)return data||[];
    }
  }catch(e){console.warn(e)}
  try{const r=await fetch("data.json",{cache:"no-store"});if(r.ok)return(await r.json()).albums||[]}catch{}
  return[];
}

function renderFilters(){
  const cats=["Todos",...new Set(albums.map(a=>a.category).filter(Boolean))],box=$("#evFilters");
  box.innerHTML=cats.length>2?cats.map(c=>`<button class="ev-chip${c===filter?" on":""}" data-c="${esc(c)}">${esc(c)}</button>`).join(""):"";
}
function renderGrid(){
  const list=albums.filter(a=>filter==="Todos"||a.category===filter),g=$("#evGrid");
  $("#evEmpty").classList.toggle("hidden",!!list.length);
  g.innerHTML=list.map(a=>{
    const m=mediaOf(a),np=(a.photos||[]).length,nv=m.length-np,id=esc(a.id);
    const th=m.map((x,k)=>{const s=x.kind==="img"?x.src:x.thumb;return `<button class="ev-th" data-id="${id}" data-i="${k}" aria-label="Abrir mídia ${k+1}">${s?`<img src="${safe(s)}" alt="" loading="lazy">`:""}${x.kind!=="img"?"<i>▶</i>":""}</button>`}).join("");
    return `<article class="ev-post"><div class="ev-banner"><img src="${safe(coverOf(a))}" alt="${esc(a.title)}" loading="lazy">
      <div class="ev-banner-txt"><span class="post-date">${esc(a.category||"Evento")} · ${esc(fmt(a.event_date))}</span><h2>${esc(a.title)}</h2><p>${esc(a.caption||"")}</p>
      <div class="ev-actions">${nv?`<button class="lime-btn small" data-id="${id}" data-i="${np}">▶ ASSISTIR</button>`:""}<button class="${nv?"outline-btn":"lime-btn small"}" data-id="${id}" data-i="0">▣ VER ÁLBUM${np?` (${np})`:""}</button></div></div></div>
      ${m.length>1?`<div class="ev-row">${th}</div>`:""}</article>`;
  }).join("");
}

function show(i){
  const m=mediaOf(cur);if(!m.length)return;idx=(i+m.length)%m.length;const it=m[idx],st=$("#evStage");
  st.querySelector(".ev-media")?.remove();
  const el=it.kind==="img"?Object.assign(document.createElement("img"),{src:safe(it.src),alt:cur.title}):it.kind==="file"?Object.assign(document.createElement("video"),{src:safe(it.src),controls:true,playsInline:true}):Object.assign(document.createElement("iframe"),{src:it.src,allowFullscreen:true,title:cur.title});
  if(it.kind==="iframe")el.allow="autoplay; encrypted-media; picture-in-picture; fullscreen";
  el.className="ev-media";st.prepend(el);
  document.querySelectorAll(".ev-thumbs button").forEach((b,k)=>b.classList.toggle("on",k===idx));
  document.querySelector(".ev-thumbs .on")?.scrollIntoView({block:"nearest",inline:"center"});
}
function open(id,i=0){
  cur=albums.find(a=>String(a.id)===id);if(!cur)return;const m=mediaOf(cur);
  $("#evView").innerHTML=`<div class="ev-layout"><div><div class="ev-stage" id="evStage">${m.length>1?'<button class="ev-arrow prev" aria-label="Anterior">‹</button><button class="ev-arrow next" aria-label="Próximo">›</button>':""}</div>
    ${m.length>1?`<div class="ev-thumbs">${m.map((x,k)=>`<button data-i="${k}" aria-label="Mídia ${k+1}">${x.kind==="img"?`<img src="${safe(x.src)}" alt="">`:(x.thumb?`<img src="${safe(x.thumb)}" alt="">`:"")}${x.kind!=="img"?"<i>▶</i>":""}</button>`).join("")}</div>`:""}</div>
    <div class="ev-info"><span class="post-date">${esc(cur.category||"Evento")} · ${esc(fmt(cur.event_date))}</span><h2>${esc(cur.title)}</h2><p>${esc(cur.caption||"")}</p></div></div>`;
  $("#evDialog").showModal();show(i);
}
function close(){$("#evDialog").close()}

document.addEventListener("DOMContentLoaded",async()=>{
  $("#year").textContent=new Date().getFullYear();
  $("#menuToggle").addEventListener("click",()=>$("#mainNav").classList.toggle("open"));
  albums=await load();renderFilters();renderGrid();
  $("#evFilters").addEventListener("click",e=>{const b=e.target.closest(".ev-chip");if(b){filter=b.dataset.c;renderFilters();renderGrid()}});
  $("#evGrid").addEventListener("click",e=>{const c=e.target.closest("[data-id]");if(c)open(c.dataset.id,+c.dataset.i||0)});
  const d=$("#evDialog");
  d.querySelector(".ev-close").onclick=close;
  d.addEventListener("click",e=>{if(e.target===d)close();if(e.target.closest(".prev"))show(idx-1);if(e.target.closest(".next"))show(idx+1);const t=e.target.closest(".ev-thumbs button");if(t)show(+t.dataset.i)});
  d.addEventListener("keydown",e=>{if(e.key==="ArrowLeft")show(idx-1);if(e.key==="ArrowRight")show(idx+1)});
  d.addEventListener("close",()=>$("#evView").replaceChildren());
});

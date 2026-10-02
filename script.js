const defaultData = {
  agenda: [],
  posts: [
    {title:"Culto Jovem",date:"12 SET 2025",category:"Evento",image:"assets/hero-worship-bg.jpg",excerpt:"Momentos de adoração, comunhão e palavra.",link:"#"},
    {title:"Vem Adorar",date:"08 SET 2025",category:"Louvor",image:"assets/worship-strip.jpg",excerpt:"Foi incrível estar com vocês em mais um momento de louvor.",link:"#"},
    {title:"Encontro de Jovens",date:"03 SET 2025",category:"Comunhão",image:"assets/evento-1.jpeg",excerpt:"Juntos somos mais fortes. Uma geração caminhando em unidade.",link:"#"},
    {title:"A Palavra que guia",date:"28 AGO 2025",category:"Reflexão",image:"assets/evento-2.jpeg",excerpt:"Deus tem um plano e seguimos firmes no propósito.",link:"#"}
  ],
  instagram:[]
};
let agendaItems=[];

function configured(){
  return window.AL_JOVEM_CONFIG &&
    window.AL_JOVEM_CONFIG.SUPABASE_URL &&
    !window.AL_JOVEM_CONFIG.SUPABASE_URL.includes("COLE_AQUI") &&
    window.AL_JOVEM_CONFIG.SUPABASE_ANON_KEY &&
    !window.AL_JOVEM_CONFIG.SUPABASE_ANON_KEY.includes("COLE_AQUI");
}
async function getSupabase(){
  if(!configured()) return null;
  if(!window.supabaseClient){
    const {createClient}=window.supabase;
    window.supabaseClient=createClient(window.AL_JOVEM_CONFIG.SUPABASE_URL,window.AL_JOVEM_CONFIG.SUPABASE_ANON_KEY);
  }
  return window.supabaseClient;
}
async function getData(){
  let fallback=null;
  try{
    const sb=await getSupabase();
    if(sb){
      const [events,posts,instagram,settings]=await Promise.all([
        sb.from("events").select("*").eq("published",true).order("date",{ascending:true}),
        sb.from("posts").select("*").eq("published",true).order("created_at",{ascending:false}),
        sb.from("instagram_posts").select("*").eq("published",true).order("created_at",{ascending:false}),
        sb.from("site_settings").select("*").eq("id",1).maybeSingle()
      ]);
      if(!events.error&&!posts.error&&!instagram.error){
        return {agenda:events.data||[],posts:posts.data||[],instagram:instagram.data||[],settings:settings?.data||{}};
      }
    }
  }catch(e){ console.warn(e); }
  try{
    const response=await fetch("data.json",{cache:"no-store"});
    if(response.ok) fallback=await response.json();
  }catch(e){}
  const local=localStorage.getItem("aliancaJovemData");
  return local?JSON.parse(local):(fallback||defaultData);
}

function formatDateParts(dateString){
  const date=new Date(dateString+"T12:00:00");
  if(Number.isNaN(date.getTime())) return {day:"--",month:""};
  return {day:String(date.getDate()).padStart(2,"0"),month:date.toLocaleDateString("pt-BR",{month:"short"}).replace(".","").toUpperCase()};
}
function agendaSignupLink(item,className="agenda-signup lime-btn small"){
  const number=String(item.whatsapp_number||"").replace(/\D/g,"");
  if(!item.registration_enabled||number.length<10||number.length>15)return "";
  const message=encodeURIComponent(`Olá! Quero me inscrever no evento ${item.title||""}.`);
  return `<a class="${className}" href="https://wa.me/${number}?text=${message}" target="_blank" rel="noopener">INSCREVA-SE <b>→</b></a>`;
}
function renderAgenda(items){
  const list=document.querySelector("#agendaList"),empty=document.querySelector("#agendaEmpty"); list.innerHTML="";
  if(!items?.length){empty.classList.remove("hidden");return} empty.classList.add("hidden");
  agendaItems=[...items].sort((a,b)=>new Date(a.date)-new Date(b.date));
  agendaItems.forEach((item,index)=>{
    const d=formatDateParts(item.date),card=document.createElement("article");card.className=`agenda-card${item.cover_image?" has-cover":""}`;card.dataset.agendaIndex=index;
    const cover=item.cover_image?`<img class="agenda-cover" src="${safeUrl(item.cover_image)}" alt="Capa do evento ${escapeHtml(item.title)}" loading="lazy">`:"";
    card.innerHTML=`${cover}<button class="agenda-open-trigger" type="button" aria-label="Abrir detalhes de ${escapeHtml(item.title)}"></button>
      <div class="agenda-card-body"><div class="date-box"><div class="date-number">${d.day}</div><div class="date-month">${d.month}</div></div>
      <h3>${escapeHtml(item.title)}</h3><div class="agenda-meta"><span>◷ <b>${escapeHtml(item.time||"Horário a confirmar")}</b></span>
      <span>⌖ ${escapeHtml(item.location||"Local a confirmar")}</span>${item.price?`<span>◉ ${escapeHtml(item.price)}</span>`:""}</div>
      <span class="tag">${escapeHtml(item.type||"Evento")}</span>${agendaSignupLink(item)}</div>`;
    list.appendChild(card);
  });
}
function setupAgendaDialog(){
  const list=document.querySelector("#agendaList"),dialog=document.querySelector("#agendaDialog"),content=document.querySelector("#agendaDialogContent");
  let lastTrigger=null;
  list.addEventListener("click",event=>{
    const trigger=event.target.closest(".agenda-open-trigger");if(!trigger)return;
    const item=agendaItems[Number(trigger.closest(".agenda-card").dataset.agendaIndex)];if(!item)return;
    lastTrigger=trigger;
    const d=formatDateParts(item.date),date=new Date(`${item.date}T12:00:00`),cover=item.cover_image?`<img src="${safeUrl(item.cover_image)}" alt="Capa do evento ${escapeHtml(item.title)}">`:"";
    content.innerHTML=`${cover}<div class="agenda-dialog-body"><span class="agenda-dialog-date">${d.day} ${d.month} ${Number.isNaN(date.getTime())?"":date.getFullYear()}</span><h2>${escapeHtml(item.title)}</h2>
      <div class="agenda-meta"><span>◷ <b>${escapeHtml(item.time||"Horário a confirmar")}</b></span><span>⌖ ${escapeHtml(item.location||"Local a confirmar")}</span>${item.price?`<span>◉ ${escapeHtml(item.price)}</span>`:""}</div>
      <span class="tag">${escapeHtml(item.type||"Evento")}</span>${agendaSignupLink(item,"agenda-dialog-signup lime-btn")}</div>`;
    dialog.showModal();dialog.querySelector(".agenda-dialog-close").focus();
  });
  dialog.querySelector(".agenda-dialog-close").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
  dialog.addEventListener("close",()=>{content.replaceChildren();lastTrigger?.focus()});
}
function renderPosts(items){
  const grid=document.querySelector("#postGrid");grid.innerHTML="";
  (items||[]).forEach(item=>{
    const videoId=youtubeVideoId(item.link),card=document.createElement("article");card.className=videoId?"post-card post-video-card":"post-card";
    const media=videoId?`<iframe src="https://www.youtube.com/embed/${videoId}?rel=0&playsinline=1" title="${escapeHtml(item.title)} - YouTube" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" referrerpolicy="origin-when-cross-origin" allowfullscreen></iframe>`:`<img src="${safeUrl(item.image||"assets/evento-1.jpeg")}" alt="${escapeHtml(item.title)}" loading="lazy">`;
    card.innerHTML=`<div class="post-cover${videoId?" post-video-cover":""}">${media}</div>
      <div class="post-content"><span class="post-date">${escapeHtml(item.category||"Post")} · ${escapeHtml(item.date||"")}</span>
      <h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.excerpt||"")}</p>
      ${item.link&&item.link!=="#"&&!videoId?`<a class="post-link" href="${safeUrl(item.link)}" target="_blank" rel="noopener">Ler publicação →</a>`:""}</div>
      ${videoId?"":`<button class="post-expand-trigger" type="button" aria-label="Ampliar post: ${escapeHtml(item.title)}"></button>`}`;
    grid.appendChild(card);
  });
}
function youtubeVideoId(value){
  try{
    const url=new URL(value),host=url.hostname.toLowerCase().replace(/^www\./,"");
    let id="";
    if(host==="youtu.be")id=url.pathname.split("/").filter(Boolean)[0]||"";
    else if(["youtube.com","m.youtube.com","music.youtube.com","youtube-nocookie.com"].includes(host)){
      if(url.pathname==="/watch")id=url.searchParams.get("v")||"";
      else if(/^\/(embed|shorts|live)\//.test(url.pathname))id=url.pathname.split("/")[2]||"";
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id)?id:"";
  }catch{return ""}
}
function renderInstagram(items){
  const grid=document.querySelector("#instagramGrid"),empty=document.querySelector("#instagramEmpty");grid.innerHTML="";
  if(!items?.length){empty.classList.remove("hidden");return}empty.classList.add("hidden");
  items.forEach(item=>{
    const card=document.createElement("div");card.className="instagram-card";
    const url=safeUrl(item.url);
    card.innerHTML=`<blockquote class="instagram-media" data-instgrm-permalink="${url}" data-instgrm-version="14"><a href="${url}" target="_blank" rel="noopener">Ver no Instagram</a></blockquote>`;
    grid.appendChild(card);
  });
  if(window.instgrm?.Embeds)window.instgrm.Embeds.process();
}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function safeUrl(v){const s=String(v||"");if(s.startsWith("assets/")||s.startsWith("#"))return s;try{const u=new URL(s,location.href);return["http:","https:"].includes(u.protocol)?u.href:"#"}catch{return"#"}}
function applyVisualSettings(settings){
  const root=document.documentElement;
  if(settings.hero_image){root.style.setProperty("--hero-image",`url("${settings.hero_image}")`);const img=document.querySelector(".hero-image-frame img");if(img)img.src=settings.hero_image;}
  if(settings.posts_bg){root.style.setProperty("--posts-bg",`url("${settings.posts_bg}")`);}
  if(settings.about_bg){root.style.setProperty("--about-bg",`url("${settings.about_bg}")`);}
}
function setupPostDialog(){
  const grid=document.querySelector("#postGrid"),dialog=document.querySelector("#postDialog"),content=document.querySelector("#postDialogContent");
  let lastTrigger=null;
  grid.addEventListener("click",event=>{
    const trigger=event.target.closest(".post-expand-trigger");if(!trigger)return;
    lastTrigger=trigger;
    const expanded=trigger.closest(".post-card").cloneNode(true);expanded.querySelector(".post-expand-trigger").remove();
    content.replaceChildren(expanded);dialog.showModal();dialog.querySelector(".post-dialog-close").focus();
  });
  dialog.querySelector(".post-dialog-close").addEventListener("click",()=>dialog.close());
  dialog.addEventListener("click",event=>{if(event.target===dialog)dialog.close()});
  dialog.addEventListener("close",()=>{content.replaceChildren();lastTrigger?.focus()});
}
document.addEventListener("DOMContentLoaded",async()=>{
  document.querySelector("#year").textContent=new Date().getFullYear();
  document.querySelector("#menuToggle").addEventListener("click",()=>document.querySelector("#mainNav").classList.toggle("open"));
  document.querySelectorAll("#mainNav a").forEach(a=>a.addEventListener("click",()=>document.querySelector("#mainNav").classList.remove("open")));
  setupAgendaDialog();
  setupPostDialog();
  const data=await getData();applyVisualSettings(data.settings||{});renderAgenda(data.agenda);renderPosts(data.posts);renderInstagram(data.instagram);
});

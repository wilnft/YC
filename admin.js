const cfg=window.AL_JOVEM_CONFIG;
const configured=cfg&&!cfg.SUPABASE_URL.includes("COLE_AQUI")&&!cfg.SUPABASE_ANON_KEY.includes("COLE_AQUI");
const sb=configured?supabase.createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY):null;
let editingId=null;

const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
function notice(msg,error=false){const el=$("#notice");el.textContent=msg;el.className="notice"+(error?" error":"");setTimeout(()=>el.classList.add("hidden"),4500)}
function dateBR(v){if(!v)return"";const d=new Date(v+"T12:00:00");return Number.isNaN(d.getTime())?v:d.toLocaleDateString("pt-BR")}

async function requireUser(){
  if(!sb){$("#setupWarning").classList.remove("hidden");return false}
  const {data:{session}}=await sb.auth.getSession();
  if(!session){location.href="login.html";return false}
  return true;
}

async function loadAll(){
  const [e,p,i]=await Promise.all([
    sb.from("events").select("*").order("date",{ascending:false}),
    sb.from("posts").select("*").order("created_at",{ascending:false}),
    sb.from("instagram_posts").select("*").order("created_at",{ascending:false})
  ]);
  if(e.error||p.error||i.error) throw new Error((e.error||p.error||i.error)?.message||"Não foi possível carregar os dados. Confira o SQL/RLS.");
  renderEvents(e.data||[]);renderPosts(p.data||[]);renderInstagram(i.data||[]);
  $("#statEvents").textContent=(e.data||[]).length;$("#statPosts").textContent=(p.data||[]).length;$("#statInstagram").textContent=(i.data||[]).length;
}
function renderEvents(rows){
  $("#eventsTable").innerHTML=rows.length?rows.map(r=>`<tr><td><b>${esc(dateBR(r.date))}</b></td><td>${esc(r.title)}</td><td>${esc(r.time||"-")}</td><td>${esc(r.location||"-")}</td><td>${r.published?"Publicado":"Rascunho"}</td><td><div class="actions"><button class="small-btn" onclick='editEvent(${JSON.stringify(r)})'>Editar</button><button class="danger-btn" onclick="deleteRow('events','${r.id}')">Excluir</button></div></td></tr>`).join(""):`<tr><td colspan="6">Nenhum evento cadastrado.</td></tr>`;
}
function renderPosts(rows){
  $("#postsTable").innerHTML=rows.length?rows.map(r=>`<tr><td>${r.image?`<img class="thumb" src="${esc(r.image)}">`:"-"}</td><td><b>${esc(r.title)}</b><br><small>${esc(r.category||"")}</small></td><td>${esc(r.date||"-")}</td><td>${r.published?"Publicado":"Rascunho"}</td><td><div class="actions"><button class="small-btn" onclick='editPost(${JSON.stringify(r)})'>Editar</button><button class="danger-btn" onclick="deleteRow('posts','${r.id}')">Excluir</button></div></td></tr>`).join(""):`<tr><td colspan="5">Nenhum post cadastrado.</td></tr>`;
}
function renderInstagram(rows){
  $("#instagramTable").innerHTML=rows.length?rows.map(r=>`<tr><td><b>${esc(r.title||"Instagram")}</b></td><td><a href="${esc(r.url)}" target="_blank">${esc(r.url)}</a></td><td>${r.published?"Publicado":"Rascunho"}</td><td><div class="actions"><button class="small-btn" onclick='editInstagram(${JSON.stringify(r)})'>Editar</button><button class="danger-btn" onclick="deleteRow('instagram_posts','${r.id}')">Excluir</button></div></td></tr>`).join(""):`<tr><td colspan="4">Nenhum link do Instagram cadastrado.</td></tr>`;
}

async function uploadImage(file,folder="posts"){
  if(!file) return null;
  const allowed=["image/jpeg","image/png","image/webp","image/gif"];
  if(!allowed.includes(file.type)) throw new Error("Escolha JPG, PNG, WEBP ou GIF.");
  if(file.size>8*1024*1024) throw new Error("A imagem deve ter no máximo 8 MB.");
  const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");
  const path=`${folder}/${crypto.randomUUID()}.${ext}`;
  const {error}=await sb.storage.from("site-media").upload(path,file,{cacheControl:"31536000",upsert:false,contentType:file.type});
  if(error) throw new Error("Falha no upload: "+error.message);
  const {data}=sb.storage.from("site-media").getPublicUrl(path);
  return data.publicUrl;
}

window.editEvent=r=>{editingId=r.id;showPanel("events");$("#eventForm").classList.remove("hidden");$("#eventTitle").value=r.title||"";$("#eventDate").value=r.date||"";$("#eventTime").value=r.time||"";$("#eventLocation").value=r.location||"";$("#eventPrice").value=r.price||"";$("#eventType").value=r.type||"";$("#eventCover").value=r.cover_image||"";$("#eventPublished").checked=!!r.published;scrollTop()};
window.editPost=r=>{editingId=r.id;showPanel("posts");$("#postForm").classList.remove("hidden");$("#postTitle").value=r.title||"";$("#postDate").value=r.date||"";$("#postCategory").value=r.category||"";$("#postImage").value=r.image||"";$("#postExcerpt").value=r.excerpt||"";$("#postLink").value=r.link||"";$("#postPublished").checked=!!r.published;scrollTop()};
window.editInstagram=r=>{editingId=r.id;showPanel("instagram");$("#instagramForm").classList.remove("hidden");$("#igTitle").value=r.title||"";$("#igUrl").value=r.url||"";$("#igPublished").checked=!!r.published;scrollTop()};
window.deleteRow=async(table,id)=>{if(!confirm("Excluir este item?"))return;const{error}=await sb.from(table).delete().eq("id",id);if(error)notice(error.message,true);else{notice("Item excluído.");loadAll()}};

function showPanel(name){
  document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));document.querySelector("#panel-"+name).classList.add("active");
  document.querySelectorAll(".side-nav button").forEach(b=>b.classList.toggle("active",b.dataset.panel===name));
  const titles={dashboard:"Visão geral",events:"Agenda",posts:"Posts",instagram:"Instagram",visual:"Visual do site"};$("#pageTitle").textContent=titles[name]||"Painel";
}
function scrollTop(){window.scrollTo({top:0,behavior:"smooth"})}
function resetEvent(){editingId=null;$("#eventForm").reset();$("#eventCover").value="";$("#eventPublished").checked=true;$("#eventForm").classList.add("hidden")}
function resetPost(){editingId=null;$("#postForm").reset();$("#postImage").value="";$("#postPublished").checked=true;$("#postForm").classList.add("hidden")}
function resetInstagram(){editingId=null;$("#instagramForm").reset();$("#igPublished").checked=true;$("#instagramForm").classList.add("hidden")}

async function save(table,data,formReset){
  let q=editingId?sb.from(table).update(data).eq("id",editingId):sb.from(table).insert(data);
  const{error}=await q;if(error)throw new Error(error.message);notice("Salvo com sucesso!");formReset();await loadAll();
}

async function loadVisualSettings(){
  const {data,error}=await sb.from("site_settings").select("*").eq("id",1).maybeSingle();
  if(error) return;
  window.currentVisual=data||{};
  $("#visualPreview").innerHTML=`<div><b>Principal</b>${data?.hero_image?`<img src="${esc(data.hero_image)}">`:`<span>Não definida</span>`}</div><div><b>Posts</b>${data?.posts_bg?`<img src="${esc(data.posts_bg)}">`:`<span>Não definida</span>`}</div><div><b>Sobre</b>${data?.about_bg?`<img src="${esc(data.about_bg)}">`:`<span>Não definida</span>`}</div>`;
}
async function saveVisual(){
  const current=window.currentVisual||{};
  const hero=await uploadImage($("#visualHero").files[0],"backgrounds")||current.hero_image||null;
  const posts=await uploadImage($("#visualPosts").files[0],"backgrounds")||current.posts_bg||null;
  const about=await uploadImage($("#visualAbout").files[0],"backgrounds")||current.about_bg||null;
  const {error}=await sb.from("site_settings").upsert({id:1,hero_image:hero,posts_bg:posts,about_bg:about},{onConflict:"id"});
  if(error)throw new Error(error.message);
  window.currentVisual={id:1,hero_image:hero,posts_bg:posts,about_bg:about};
  await loadVisualSettings();notice("Imagens do visual atualizadas!");
}

document.addEventListener("DOMContentLoaded",async()=>{
  if(!(await requireUser()))return;
  $("#setupWarning").classList.add("hidden");
  document.querySelectorAll(".side-nav button").forEach(b=>b.onclick=()=>showPanel(b.dataset.panel));
  $("#logout").onclick=async()=>{await sb.auth.signOut();location.href="login.html"};

  $("#newEvent").onclick=()=>{$("#eventForm").classList.remove("hidden");editingId=null;$("#eventForm").reset();$("#eventPublished").checked=true};
  $("#cancelEvent").onclick=resetEvent;
  $("#eventForm").onsubmit=async e=>{e.preventDefault();try{let cover=$("#eventCover").value||null;if($("#eventCoverFile").files[0])cover=await uploadImage($("#eventCoverFile").files[0],"events");await save("events",{title:$("#eventTitle").value.trim(),date:$("#eventDate").value,time:$("#eventTime").value.trim(),location:$("#eventLocation").value.trim(),price:$("#eventPrice").value.trim(),type:$("#eventType").value.trim(),cover_image:cover,published:$("#eventPublished").checked},resetEvent)}catch(err){notice(err.message,true)}};

  $("#newPost").onclick=()=>{$("#postForm").classList.remove("hidden");editingId=null;$("#postForm").reset();$("#postPublished").checked=true};
  $("#cancelPost").onclick=resetPost;
  $("#postForm").onsubmit=async e=>{e.preventDefault();try{let image=$("#postImage").value||null;if($("#postImageFile").files[0])image=await uploadImage($("#postImageFile").files[0],"posts");await save("posts",{title:$("#postTitle").value.trim(),date:$("#postDate").value.trim(),category:$("#postCategory").value.trim(),image,excerpt:$("#postExcerpt").value.trim(),link:$("#postLink").value.trim()||null,published:$("#postPublished").checked},resetPost)}catch(err){notice(err.message,true)}};

  $("#newInstagram").onclick=()=>{$("#instagramForm").classList.remove("hidden");editingId=null;$("#instagramForm").reset();$("#igPublished").checked=true};
  $("#cancelInstagram").onclick=resetInstagram;
  $("#instagramForm").onsubmit=async e=>{e.preventDefault();try{const url=$("#igUrl").value.trim();if(!/^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\//i.test(url))throw new Error("Cole um link válido de post ou Reel do Instagram.");await save("instagram_posts",{title:$("#igTitle").value.trim(),url,published:$("#igPublished").checked},resetInstagram)}catch(err){notice(err.message,true)}};

  $("#visualForm").onsubmit=async e=>{e.preventDefault();try{notice("Enviando imagens...");await saveVisual()}catch(err){notice(err.message,true)}};
  try{await loadAll();await loadVisualSettings()}catch(e){notice(e.message,true)}
});

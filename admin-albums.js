// Painel do álbum de eventos (usa sb, $, esc, notice, uploadImage, dateBR, showPanel, scrollTop de admin.js)
(()=>{
let aid=null,photos=[],rows=[];
const drawPhotos=()=>{$("#alPhotos").innerHTML=photos.map((u,i)=>`<div><img src="${esc(u)}" alt="" style="height:90px"><button type="button" class="danger-btn" data-rm="${i}" style="margin-top:6px">Remover${i?"":" (capa)"}</button></div>`).join("")};
const reset=()=>{aid=null;photos=[];$("#albumForm").reset();$("#alPublished").checked=true;drawPhotos();$("#albumForm").classList.add("hidden")};
async function loadAlbums(){
  if(!sb)return;
  const{data,error}=await sb.from("event_albums").select("*").order("event_date",{ascending:false});
  if(error){$("#albumsTable").innerHTML=`<tr><td colspan="5">Tabela não encontrada. Execute o arquivo <b>supabase/eventos.sql</b> no SQL Editor do Supabase.</td></tr>`;return}
  rows=data||[];
  $("#albumsTable").innerHTML=rows.length?rows.map(r=>`<tr><td>${r.photos?.[0]?`<img class="thumb" src="${esc(r.photos[0])}" alt="">`:"-"}</td><td><b>${esc(r.title)}</b><br><small>${esc(r.category||"")} · ${(r.photos||[]).length} foto(s) · ${(r.videos||[]).length} vídeo(s)</small></td><td>${esc(dateBR(r.event_date))}</td><td>${r.published?"Publicado":"Rascunho"}</td><td><div class="actions"><button class="small-btn" data-edit="${esc(r.id)}">Editar</button><button class="danger-btn" data-del="${esc(r.id)}">Excluir</button></div></td></tr>`).join(""):`<tr><td colspan="5">Nenhum post cadastrado.</td></tr>`;
}
document.addEventListener("DOMContentLoaded",()=>{
  if(!sb)return;
  $("#newAlbum").onclick=()=>{reset();$("#albumForm").classList.remove("hidden")};
  $("#cancelAlbum").onclick=reset;
  $("#alPhotos").onclick=e=>{const b=e.target.closest("[data-rm]");if(b){photos.splice(+b.dataset.rm,1);drawPhotos()}};
  $("#albumsTable").onclick=async e=>{
    const ed=e.target.closest("[data-edit]"),dl=e.target.closest("[data-del]");
    if(ed){const r=rows.find(x=>x.id===ed.dataset.edit);aid=r.id;photos=[...(r.photos||[])];$("#albumForm").classList.remove("hidden");$("#alTitle").value=r.title||"";$("#alDate").value=r.event_date||"";$("#alCategory").value=r.category||"";$("#alCaption").value=r.caption||"";$("#alVideos").value=(r.videos||[]).join("\n");$("#alPublished").checked=!!r.published;drawPhotos();scrollTop()}
    if(dl&&confirm("Excluir este post do álbum?")){const{error}=await sb.from("event_albums").delete().eq("id",dl.dataset.del);if(error)notice(error.message,true);else{notice("Post excluído.");loadAlbums()}}
  };
  $("#albumForm").onsubmit=async e=>{
    e.preventDefault();
    try{
      notice("Salvando...");
      for(const f of $("#alFiles").files)photos.push(await uploadImage(f,"albums"));
      const videos=$("#alVideos").value.split("\n").map(v=>v.trim()).filter(Boolean);
      if(videos.some(v=>!/^https?:\/\//i.test(v)))throw new Error("Cada vídeo deve ser uma URL completa (começando com https://).");
      const d={title:$("#alTitle").value.trim(),event_date:$("#alDate").value||null,category:$("#alCategory").value.trim(),caption:$("#alCaption").value.trim(),photos,videos,published:$("#alPublished").checked};
      const{error}=aid?await sb.from("event_albums").update(d).eq("id",aid):await sb.from("event_albums").insert(d);
      if(error)throw new Error(error.message);
      notice("Post salvo com sucesso!");reset();loadAlbums();
    }catch(err){notice(err.message,true)}
  };
  loadAlbums();
});
})();

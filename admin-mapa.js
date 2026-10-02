// Painel: Mapa de células + Carrossel de eventos
// (usa sb, $, esc, notice, uploadImage, showPanel, scrollTop de admin.js)
(()=>{
const SQL_HINT="Execute o arquivo <b>supabase/mapa-carrossel.sql</b> no SQL Editor do Supabase.";

// Reduz a foto antes de enviar (o pin é pequeno; evita carregar 8 MB na página pública)
function shrink(file,max=900){
  return new Promise(res=>{
    if(!file||!/^image\/(jpeg|png|webp)$/.test(file.type))return res(file);
    const img=new Image(),url=URL.createObjectURL(file);
    img.onload=()=>{
      URL.revokeObjectURL(url);
      const k=Math.min(1,max/Math.max(img.width,img.height));
      if(k===1&&file.size<600*1024)return res(file);
      const c=document.createElement("canvas");c.width=Math.round(img.width*k);c.height=Math.round(img.height*k);
      c.getContext("2d").drawImage(img,0,0,c.width,c.height);
      c.toBlob(b=>res(b?new File([b],file.name.replace(/\.\w+$/,"")+".jpg",{type:"image/jpeg"}):file),"image/jpeg",.86);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);res(file)};
    img.src=url;
  });
}

/* ===================== MAPA DE CÉLULAS ===================== */
let cid=null,cellRows=[],cellPhoto=null,picker=null,pin=null;
const num=v=>Number(String(v).replace(",","."));

function setPoint(lat,lng,move=true){
  $("#cellLat").value=(+lat).toFixed(6);$("#cellLng").value=(+lng).toFixed(6);
  if(!picker)return;
  if(!pin){
    pin=L.marker([lat,lng],{draggable:true}).addTo(picker);
    pin.on("dragend",()=>{const p=pin.getLatLng();setPoint(p.lat,p.lng,false)});
  }else pin.setLatLng([lat,lng]);
  if(move)picker.setView([lat,lng],Math.max(picker.getZoom(),16));
}
function initPicker(){
  if(!picker){
    picker=L.map("cellPicker").setView([-14.2,-51.9],4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap"}).addTo(picker);
    picker.on("click",e=>setPoint(e.latlng.lat,e.latlng.lng,false));
  }
  setTimeout(()=>picker.invalidateSize(),60);
}
function syncPointFromFields(){
  const la=num($("#cellLat").value),ln=num($("#cellLng").value);
  if(Number.isFinite(la)&&Number.isFinite(ln)&&Math.abs(la)<=90&&Math.abs(ln)<=180)setPoint(la,ln,true);
}
function drawCellPhoto(){
  $("#cellPhotoPrev").innerHTML=cellPhoto?`<div class="cell-photo-prev"><img src="${esc(cellPhoto)}" alt=""><button type="button" class="danger-btn" id="rmCellPhoto">Remover foto</button></div>`:"";
}
function resetCell(hide=true){
  cid=null;cellPhoto=null;$("#cellForm").reset();$("#cellPublished").checked=true;drawCellPhoto();
  if(pin){pin.remove();pin=null}
  if(hide)$("#cellForm").classList.add("hidden");
}
async function searchAddress(){
  const q=$("#cellAddress").value.trim();if(!q)return notice("Digite um endereço para buscar.",true);
  const b=$("#cellSearch");b.disabled=true;b.textContent="Buscando...";
  try{
    const r=await fetch("https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=pt-BR&q="+encodeURIComponent(q));
    const d=await r.json();
    if(!d.length)throw new Error("Endereço não encontrado. Tente incluir cidade e estado, ou clique direto no mapa.");
    setPoint(+d[0].lat,+d[0].lon,true);notice("Endereço localizado. Ajuste o pin se necessário.");
  }catch(e){notice(e.message||"Falha na busca de endereço.",true)}
  finally{b.disabled=false;b.textContent="Buscar no mapa"}
}
async function loadCells(){
  const{data,error}=await sb.from("cell_locations").select("*").order("created_at",{ascending:false});
  if(error){$("#cellsTable").innerHTML=`<tr><td colspan="5">Tabela não encontrada. ${SQL_HINT}</td></tr>`;return}
  cellRows=data||[];
  $("#cellsTable").innerHTML=cellRows.length?cellRows.map(r=>`<tr><td>${r.photo?`<img class="thumb" src="${esc(r.photo)}" alt="">`:"-"}</td><td><b>${esc(r.name)}</b><br><small>${esc(r.schedule||"")}${r.schedule&&r.address?" · ":""}${esc(r.address||"")}</small></td><td>${r.whatsapp_number?esc(r.whatsapp_number):"-"}</td><td>${r.published?"Publicado":"Rascunho"}</td><td><div class="actions"><button class="small-btn" data-cedit="${esc(r.id)}">Editar</button><button class="danger-btn" data-cdel="${esc(r.id)}">Excluir</button></div></td></tr>`).join(""):`<tr><td colspan="5">Nenhuma célula cadastrada.</td></tr>`;
}

/* ===================== CARROSSEL ===================== */
let carPhotos=[];
function drawCar(){
  $("#carList").innerHTML=carPhotos.length?carPhotos.map((u,i)=>`<div class="car-item"><img src="${esc(u)}" alt=""><div class="actions"><button type="button" class="small-btn" data-up="${i}" ${i?"":"disabled"} aria-label="Mover para antes">←</button><button type="button" class="small-btn" data-down="${i}" ${i<carPhotos.length-1?"":"disabled"} aria-label="Mover para depois">→</button><button type="button" class="danger-btn" data-rm="${i}">Remover</button></div></div>`).join(""):`<p class="car-empty">Nenhuma foto enviada — o site está usando as imagens padrão.</p>`;
}
async function loadCarousel(){
  const{data,error}=await sb.from("site_settings").select("events_carousel").eq("id",1).maybeSingle();
  if(error){$("#carList").innerHTML=`<p class="car-empty">Coluna não encontrada. ${SQL_HINT}</p>`;return}
  carPhotos=Array.isArray(data?.events_carousel)?[...data.events_carousel]:[];drawCar();
}

document.addEventListener("DOMContentLoaded",()=>{
  if(!sb)return;

  /* ---- células ---- */
  $("#newCell").onclick=()=>{resetCell(false);$("#cellForm").classList.remove("hidden");initPicker();picker.setView([-14.2,-51.9],4)};
  $("#cancelCell").onclick=()=>resetCell(true);
  $("#cellSearch").onclick=searchAddress;
  $("#cellAddress").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();searchAddress()}});
  $("#cellLat").addEventListener("change",syncPointFromFields);$("#cellLng").addEventListener("change",syncPointFromFields);
  $("#cellPhotoFile").addEventListener("change",async e=>{
    const f=e.target.files[0];if(!f)return;
    try{notice("Enviando foto...");cellPhoto=await uploadImage(await shrink(f,700),"cells");drawCellPhoto();notice("Foto enviada. Salve a célula para aplicar.");}
    catch(err){notice(err.message,true)}finally{e.target.value=""}
  });
  $("#cellPhotoPrev").onclick=e=>{if(e.target.closest("#rmCellPhoto")){cellPhoto=null;drawCellPhoto()}};
  $("#cellsTable").onclick=async e=>{
    const ed=e.target.closest("[data-cedit]"),dl=e.target.closest("[data-cdel]");
    if(ed){
      const r=cellRows.find(x=>x.id===ed.dataset.cedit);if(!r)return;
      resetCell(false);cid=r.id;cellPhoto=r.photo||null;
      $("#cellForm").classList.remove("hidden");
      $("#cellName").value=r.name||"";$("#cellSchedule").value=r.schedule||"";$("#cellAddress").value=r.address||"";
      $("#cellDesc").value=r.description||"";$("#cellWhats").value=r.whatsapp_number||"";$("#cellPublished").checked=!!r.published;
      drawCellPhoto();initPicker();setPoint(r.lat,r.lng,true);scrollTop();
    }
    if(dl&&confirm("Excluir esta célula do mapa?")){
      const{error}=await sb.from("cell_locations").delete().eq("id",dl.dataset.cdel);
      if(error)notice(error.message,true);else{notice("Célula excluída.");loadCells()}
    }
  };
  $("#cellForm").onsubmit=async e=>{
    e.preventDefault();
    try{
      const lat=num($("#cellLat").value),lng=num($("#cellLng").value);
      if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)throw new Error("Defina o ponto no mapa (busque o endereço ou clique no mapa).");
      const w=$("#cellWhats").value.replace(/\D/g,"");
      if(w&&(w.length<10||w.length>15))throw new Error("Informe o WhatsApp com código do país e DDD (ex.: 5511999999999).");
      const d={name:$("#cellName").value.trim(),schedule:$("#cellSchedule").value.trim()||null,address:$("#cellAddress").value.trim()||null,description:$("#cellDesc").value.trim()||null,lat,lng,photo:cellPhoto,whatsapp_number:w||null,published:$("#cellPublished").checked};
      const{error}=cid?await sb.from("cell_locations").update(d).eq("id",cid):await sb.from("cell_locations").insert(d);
      if(error)throw new Error(error.message);
      notice("Célula salva com sucesso!");resetCell(true);loadCells();
    }catch(err){notice(err.message,true)}
  };

  /* ---- carrossel ---- */
  $("#carFiles").addEventListener("change",async e=>{
    const files=[...e.target.files];if(!files.length)return;
    try{
      for(let i=0;i<files.length;i++){notice(`Enviando foto ${i+1} de ${files.length}...`);carPhotos.push(await uploadImage(await shrink(files[i],2000),"carousel"));drawCar()}
      notice("Fotos enviadas. Clique em Salvar carrossel para publicar.");
    }catch(err){notice(err.message,true);drawCar()}finally{e.target.value=""}
  });
  $("#carList").onclick=e=>{
    const up=e.target.closest("[data-up]"),dn=e.target.closest("[data-down]"),rm=e.target.closest("[data-rm]");
    const sw=(a,b)=>{[carPhotos[a],carPhotos[b]]=[carPhotos[b],carPhotos[a]];drawCar()};
    if(up)sw(+up.dataset.up,+up.dataset.up-1);
    if(dn)sw(+dn.dataset.down,+dn.dataset.down+1);
    if(rm){carPhotos.splice(+rm.dataset.rm,1);drawCar()}
  };
  $("#carouselForm").onsubmit=async e=>{
    e.preventDefault();
    try{
      const{error}=await sb.from("site_settings").upsert({id:1,events_carousel:carPhotos},{onConflict:"id"});
      if(error)throw new Error(error.message.includes("events_carousel")?"Coluna não encontrada. Execute supabase/mapa-carrossel.sql no Supabase.":error.message);
      notice("Carrossel salvo! A página Eventos já está atualizada.");
    }catch(err){notice(err.message,true)}
  };

  // O mapa de edição só mede o tamanho certo quando o painel está visível
  document.querySelectorAll('.side-nav button[data-panel="cells"]').forEach(b=>b.addEventListener("click",()=>setTimeout(()=>picker?.invalidateSize(),80)));
  loadCells();loadCarousel();
});
})();

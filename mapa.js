// Mapa de Células Jovem — carrega de cell_locations (Supabase) ou do data.json (fallback).
const $=s=>document.querySelector(s);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const safe=v=>{const s=String(v||"").trim();if(!s)return"";if(s.startsWith("assets/"))return s;try{const u=new URL(s,location.href);return["http:","https:"].includes(u.protocol)?u.href:""}catch{return""}};
const initials=n=>String(n||"?").trim().split(/\s+/).slice(0,2).map(w=>w[0]).join("").toUpperCase();

let cells=[],map,markers=new Map(),currentId=null,meMarker=null;

async function load(){
  try{
    const c=window.AL_JOVEM_CONFIG;
    if(c?.SUPABASE_URL&&!c.SUPABASE_URL.includes("COLE_AQUI")){
      const sb=supabase.createClient(c.SUPABASE_URL,c.SUPABASE_ANON_KEY);
      const{data,error}=await sb.from("cell_locations").select("*").eq("published",true).order("name",{ascending:true});
      if(!error)return data||[];
    }
  }catch(e){console.warn(e)}
  try{const r=await fetch("data.json",{cache:"no-store"});if(r.ok)return(await r.json()).cells||[]}catch{}
  return[];
}

const valid=c=>Number.isFinite(+c.lat)&&Number.isFinite(+c.lng)&&Math.abs(+c.lat)<=90&&Math.abs(+c.lng)<=180;

function pinIcon(c,on){
  const img=safe(c.photo);
  return L.divIcon({
    className:"",html:`<div class="aj-pin${on?" on":""}"><div class="aj-pin-ring">${img?`<img src="${esc(img)}" alt="" loading="lazy">`:`<b>${esc(initials(c.name))}</b>`}</div></div>`,
    iconSize:[52,64],iconAnchor:[26,62]
  });
}

function buildMap(){
  map=L.map("map",{zoomControl:true,scrollWheelZoom:true}).setView([-14.2,-51.9],4);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
  map.on("click",()=>closeDetail());
}

function drawMarkers(){
  markers.forEach(m=>m.remove());markers.clear();
  cells.filter(valid).forEach(c=>{
    const m=L.marker([+c.lat,+c.lng],{icon:pinIcon(c,false),title:c.name,keyboard:true,riseOnHover:true}).addTo(map);
    m.on("click",e=>{if(e.originalEvent)L.DomEvent.stopPropagation(e);select(c.id,true)});
    markers.set(String(c.id),m);
  });
}

function fit(){
  const pts=cells.filter(valid).map(c=>[+c.lat,+c.lng]);
  if(!pts.length)return;
  if(pts.length===1)map.setView(pts[0],15);else map.fitBounds(pts,{padding:[60,60],maxZoom:15});
}

function renderList(){
  const q=($("#mpSearch").value||"").trim().toLowerCase();
  const list=cells.filter(c=>!q||`${c.name} ${c.address||""} ${c.description||""}`.toLowerCase().includes(q));
  $("#mpCount").textContent=cells.length;
  $("#mpEmpty").classList.toggle("hidden",!!list.length);
  $("#mpEmpty").textContent=cells.length?"Nenhuma célula encontrada.":"Nenhuma célula cadastrada ainda.";
  $("#mpItems").innerHTML=list.map(c=>{
    const img=safe(c.photo);
    return `<li><button class="mp-item${String(c.id)===currentId?" on":""}" data-id="${esc(c.id)}"><span class="mp-item-img">${img?`<img src="${esc(img)}" alt="" loading="lazy">`:`<span>${esc(initials(c.name))}</span>`}</span><span><strong>${esc(c.name)}</strong><small>${esc(c.address||c.schedule||"")}</small></span></button></li>`;
  }).join("");
}

function whatsUrl(c){
  const n=String(c.whatsapp_number||"").replace(/\D/g,"");
  if(n.length<10)return"";
  return`https://wa.me/${n}?text=${encodeURIComponent(`Olá! Quero participar da ${/^c[eé]lula/i.test(c.name)?"":"célula "}${c.name}.`)}`;
}
// Abre o Google Maps já com a rota até o ponto (origem = localização do visitante).
const routeUrl=c=>`https://www.google.com/maps/dir/?api=1&destination=${(+c.lat).toFixed(6)},${(+c.lng).toFixed(6)}&travelmode=driving`;

function select(id,pan){
  const c=cells.find(x=>String(x.id)===String(id));if(!c)return;
  currentId=String(c.id);
  markers.forEach((m,k)=>{const cc=cells.find(x=>String(x.id)===k);m.setIcon(pinIcon(cc,k===currentId));m.setZIndexOffset(k===currentId?1000:0)});
  const img=safe(c.photo);
  $("#mpPhoto").innerHTML=img?`<img src="${esc(img)}" alt="${esc(c.name)}">`:`<b>${esc(initials(c.name))}</b>`;
  $("#mpName").textContent=c.name;
  $("#mpSchedule").textContent=c.schedule||"";$("#mpScheduleRow").classList.toggle("hidden",!c.schedule);
  $("#mpAddress").textContent=c.address||"";$("#mpAddressRow").classList.toggle("hidden",!c.address);
  $("#mpDesc").textContent=c.description||"";$("#mpDesc").classList.toggle("hidden",!c.description);
  const w=whatsUrl(c),wb=$("#mpWhats");
  if(w){wb.href=w;wb.classList.remove("disabled")}else{wb.removeAttribute("href");wb.classList.add("disabled")}
  $("#mpRoute").href=routeUrl(c);
  const d=$("#mpDetail");d.classList.remove("hidden");d.scrollTop=0;
  renderList();
  if(pan&&valid(c)){
    // No desktop o painel ocupa o lado direito; desloca o pin para ficar visível ao lado dele.
    const narrow=matchMedia("(max-width:900px)").matches;
    const z=Math.max(map.getZoom(),14);
    const target=map.project([+c.lat,+c.lng],z);
    const off=narrow?[0,Math.round($("#map").clientHeight*.22)]:[Math.round(Math.min(360,$("#map").clientWidth*.5)/2),0];
    map.flyTo(map.unproject(target.add(off),z),z,{duration:.6});
  }
}
function closeDetail(){
  if(!currentId)return;
  const prev=markers.get(currentId),c=cells.find(x=>String(x.id)===currentId);
  currentId=null;if(prev&&c)prev.setIcon(pinIcon(c,false));
  $("#mpDetail").classList.add("hidden");renderList();
}

function locateMe(){
  if(!navigator.geolocation)return alert("Seu navegador não permite localização.");
  navigator.geolocation.getCurrentPosition(p=>{
    const ll=[p.coords.latitude,p.coords.longitude];
    meMarker?.remove();
    meMarker=L.marker(ll,{icon:L.divIcon({className:"",html:'<div class="aj-me"></div>',iconSize:[16,16]}),interactive:false}).addTo(map);
    map.flyTo(ll,14);
  },()=>alert("Não foi possível obter sua localização. Verifique a permissão do navegador."),{enableHighAccuracy:true,timeout:10000});
}

document.addEventListener("DOMContentLoaded",async()=>{
  $("#year").textContent=new Date().getFullYear();
  $("#menuToggle").addEventListener("click",()=>$("#mainNav").classList.toggle("open"));
  buildMap();
  cells=await load();
  drawMarkers();renderList();fit();
  $("#mpItems").addEventListener("click",e=>{const b=e.target.closest("[data-id]");if(b)select(b.dataset.id,true)});
  $("#mpSearch").addEventListener("input",renderList);
  $("#mpDetail .mp-detail-close").addEventListener("click",closeDetail);
  $("#mpLocate").addEventListener("click",locateMe);
  document.addEventListener("keydown",e=>{if(e.key==="Escape")closeDetail()});
  // Link direto: mapa-celulas.html#<id> abre a célula
  const h=decodeURIComponent(location.hash.slice(1));if(h&&cells.some(c=>String(c.id)===h))select(h,true);
});

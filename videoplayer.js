// Player de vídeo do Google Drive + visualização em tela cheia (toque no vídeo).
// Uso: YCVideo.driveId(url) -> id | "" ; YCVideo.poster(id,title) -> HTML do botão-capa.
(function(){
  const ID=/^[\w-]{10,}$/;
  function driveId(raw){
    try{
      const u=new URL(String(raw||"").trim()),h=u.hostname.toLowerCase().replace(/^www\./,"");
      if(h!=="drive.google.com"&&h!=="docs.google.com"&&h!=="drive.usercontent.google.com")return "";
      const m=u.pathname.match(/\/file\/(?:u\/\d+\/)?d\/([\w-]+)/);
      if(m&&ID.test(m[1]))return m[1];
      const q=u.searchParams.get("id");
      if(q&&ID.test(q)&&/^\/(open|uc|download)/.test(u.pathname))return q;
    }catch{}
    return "";
  }
  const embed=id=>`https://drive.google.com/file/d/${id}/preview`;
  const thumb=id=>`https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
  const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

  // Capa clicável: ao tocar, o vídeo abre preenchendo a tela.
  function poster(id,title){
    return `<button type="button" class="yc-vp ev-media" data-yc-drive="${esc(id)}" data-yc-title="${esc(title||"Vídeo")}" aria-label="Assistir em tela cheia: ${esc(title||"vídeo")}">`+
      `<img src="${thumb(id)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`+
      `<span class="yc-vp-play" aria-hidden="true">▶</span><span class="yc-vp-hint">Toque para tela cheia</span></button>`;
  }

  let dlg=null,pushed=false;
  function build(){
    dlg=document.createElement("dialog");dlg.className="yc-vo";dlg.setAttribute("aria-label","Vídeo em tela cheia");
    dlg.innerHTML='<button type="button" class="yc-vo-close" aria-label="Fechar vídeo">✕</button><div class="yc-vo-stage"></div>';
    document.body.appendChild(dlg);
    dlg.querySelector(".yc-vo-close").addEventListener("click",()=>dlg.close());
    dlg.addEventListener("close",()=>{
      dlg.querySelector(".yc-vo-stage").replaceChildren(); // para o vídeo
      document.documentElement.classList.remove("yc-vo-lock");
      if(document.fullscreenElement)document.exitFullscreen?.().catch(()=>{});
      if(pushed){pushed=false;history.back()}
    });
    dlg.addEventListener("click",e=>{if(e.target===dlg)dlg.close()});
    window.addEventListener("popstate",()=>{if(dlg.open&&pushed){pushed=false;dlg.close()}});
  }
  function open(id,title){
    if(!ID.test(id))return;
    if(!dlg)build();
    const f=document.createElement("iframe");
    f.src=embed(id);f.title=title||"Vídeo";f.allow="autoplay; fullscreen; encrypted-media; picture-in-picture";f.allowFullscreen=true;
    dlg.querySelector(".yc-vo-stage").replaceChildren(f);
    document.documentElement.classList.add("yc-vo-lock");
    dlg.showModal();
    try{history.pushState({ycvo:1},"");pushed=true}catch{}
    // Fullscreen real onde o navegador permite (Android/desktop); no iOS fica em tela inteira da página.
    try{dlg.requestFullscreen?.({navigationUI:"hide"}).catch(()=>{})}catch{}
  }
  document.addEventListener("click",e=>{
    const b=e.target.closest?.("[data-yc-drive]");
    if(b){e.preventDefault();open(b.dataset.ycDrive,b.dataset.ycTitle)}
  });
  // Se o usuário sair do fullscreen nativo (gesto do sistema), fecha o visualizador.
  document.addEventListener("fullscreenchange",()=>{if(dlg?.open&&!document.fullscreenElement)dlg.close()});

  window.YCVideo={driveId,embed,thumb,poster,open};
})();

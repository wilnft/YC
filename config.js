// Configuração pública do Supabase. A chave publishable/anon é pública; nunca incluir service_role.
window.AL_JOVEM_CONFIG = {
  SUPABASE_URL: "https://iegsbgfzfzhtfrkazyih.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_pUpq3k_HWnZQ9gcuNxhwQw_xCOACU2g"
};

// Um cliente por página evita criar múltiplos clientes e múltiplos listeners de auth.
window.getAlJovemSupabase = function () {
  const cfg = window.AL_JOVEM_CONFIG;
  if (!cfg?.SUPABASE_URL || !cfg?.SUPABASE_ANON_KEY || !window.supabase?.createClient || cfg.SUPABASE_URL.includes("COLE_AQUI") || cfg.SUPABASE_ANON_KEY.includes("COLE_AQUI")) return null;
  if (!window.supabaseClient) {
    window.supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      global: { headers: { "X-Client-Info": "alianca-jovem-web" } }
    });
  }
  return window.supabaseClient;
};

// Retry breve para falhas transitórias (rede/servidor/limite de requisições).
window.alJovemRetry = async function (request, attempts = 3) {
  let last;
  for (let n = 0; n < attempts; n++) {
    try {
      const result = await request();
      const error = result?.error;
      const status = Number(error?.status || 0);
      const transient = !error || status === 0 || status === 429 || status >= 500 || ["57014", "53300", "08000", "08003", "08006"].includes(error?.code);
      if (!error || !transient || n === attempts - 1) return result;
      last = result;
    } catch (error) {
      last = { data: null, error };
      if (n === attempts - 1) return last;
    }
    await new Promise(resolve => setTimeout(resolve, 300 * (2 ** n)));
  }
  return last;
};

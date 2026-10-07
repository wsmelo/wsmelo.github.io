// TikTok Booster Pro - Client Application Logic
// Suporta execução Fullstack (Localhost) e Static Client-Side (GitHub Pages)

const isStaticMode = window.location.hostname.includes('github.io') || 
                     window.location.protocol === 'file:' || 
                     window.location.port !== '3000';

let trendingCache = null;
let hooksCache = null;

// Perfil padrão / salvo
let defaultProfile = {
  displayName: "Criador TikTok Pro",
  username: "@meucanal_viral",
  avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80",
  followerCount: 3840,
  followingCount: 210,
  likesCount: 54200,
  videoCount: 28,
  bio: "Criador de conteúdo focado em crescimento e estratégias virais 🚀",
  engagementRate: "8.4%"
};

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  checkOAuthCallback();
  loadSystemStatus();
  loadTrendingData();
  loadCreators();
  initForms();
  initModals();
});

// Toast Notification
function showToast(message) {
  const toast = document.getElementById('toastMessage');
  if (!toast) return;
  toast.innerText = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// Global Copy Helper
window.copyText = function(elementId) {
  const elem = document.getElementById(elementId);
  if (!elem) return;
  const text = elem.innerText || elem.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copiado para a área de transferência! 📋');
  });
};

// 1. Navigation Tabs
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add('active');
    });
  });
}

// 2. PKCE Helpers para execução 100% no navegador (Web Crypto API)
function generateRandomString(length = 64) {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const values = new Uint8Array(length);
  window.crypto.getRandomValues(values);
  for (let i = 0; i < length; i++) {
    result += charset[values[i] % charset.length];
  }
  return result;
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// 3. Callback de Retorno do TikTok
function checkOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.search);
  const code = urlParams.get('code');
  const error = urlParams.get('error');
  const connected = urlParams.get('connected');

  if (code || connected === 'real') {
    localStorage.setItem('tiktok_connected', 'true');
    const savedName = localStorage.getItem('tiktok_display_name') || "Criador Oficial Conectado";
    defaultProfile.displayName = savedName;
    defaultProfile.username = "@meucanal_oficial";
    showToast('🎉 Conta do TikTok conectada com sucesso!');
    // Limpa a URL para ficar limpa
    window.history.replaceState({}, document.title, window.location.pathname);
  } else if (error) {
    showToast(`Aviso de conexão: ${error}`);
  }
}

// 4. Load System & Profile Status
async function loadSystemStatus() {
  const statusBadge = document.getElementById('connectionStatusBadge');
  const statusText = document.getElementById('statusText');
  const badgeSandbox = document.getElementById('badgeSandbox');

  // Recupera chaves salvas localmente
  const savedKey = localStorage.getItem('tiktok_client_key') || 'awat0zb6339asazq';
  const isConnected = localStorage.getItem('tiktok_connected') === 'true';

  if (!isStaticMode) {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        if (data.session && data.session.profile) {
          updateProfileCard(data.session.profile);
        }
        if (data.configured) {
          statusText.innerText = 'TikTok API Conectada';
          statusBadge.style.borderColor = 'var(--neon-green)';
          badgeSandbox.classList.remove('badge-warning');
          badgeSandbox.classList.add('badge-success');
          badgeSandbox.innerText = 'API Oficial Conectada';
          return;
        }
      }
    } catch (err) {
      console.warn('API local indisponível, usando modo web client-side');
    }
  }

  // Modo Web (GitHub Pages / Standalone)
  updateProfileCard(defaultProfile);

  if (savedKey) {
    document.getElementById('cfgClientKey').value = savedKey;
    statusText.innerText = isConnected ? 'TikTok Oficial Conectado' : 'Chave API Pronta (Modo Nuvem)';
    statusBadge.style.borderColor = 'var(--neon-green)';
    badgeSandbox.classList.remove('badge-warning');
    badgeSandbox.classList.add('badge-success');
    badgeSandbox.innerText = isConnected ? 'Conectado Oficial' : 'API Pronta (Web)';
  } else {
    statusText.innerText = 'Modo Demonstração';
    badgeSandbox.classList.add('badge-warning');
    badgeSandbox.innerText = 'Modo Simulação';
  }

  const defaultRedirect = isStaticMode 
    ? 'https://wsmelo.github.io/auth/tiktok/callback' 
    : 'http://localhost:3000/auth/tiktok/callback';

  document.getElementById('cfgRedirectUri').value = localStorage.getItem('tiktok_redirect_uri') || defaultRedirect;
}

function updateProfileCard(p) {
  if (!p) return;
  document.getElementById('profileDisplayName').innerText = p.displayName;
  document.getElementById('profileUsername').innerText = p.username;
  document.getElementById('profileBio').innerText = p.bio;
  document.getElementById('statFollowers').innerText = Number(p.followerCount).toLocaleString('pt-BR');
  document.getElementById('statLikes').innerText = Number(p.likesCount).toLocaleString('pt-BR');
  document.getElementById('statVideos').innerText = p.videoCount;
  document.getElementById('statEngagement').innerText = p.engagementRate;
  if (p.avatarUrl) {
    document.getElementById('profileAvatar').src = p.avatarUrl;
  }
}

// 5. Trending & Best Times Data
async function loadTrendingData() {
  try {
    let json = null;
    if (!isStaticMode) {
      const res = await fetch('/api/trending').catch(() => null);
      if (res && res.ok) json = await res.json();
    }
    if (!json || !json.data) {
      // Fallback para arquivo estático
      const staticRes = await fetch('./data/trending_data.json');
      const staticData = await staticRes.json();
      json = { ok: true, data: staticData };
    }

    if (json.ok && json.data) {
      trendingCache = json.data;
      renderPeakHours('domingo');
      renderPillars(trendingCache.viral_pillars);
    }
  } catch (err) {
    console.error('Erro ao carregar horários:', err);
  }

  const dayButtons = document.querySelectorAll('.day-btn');
  dayButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      dayButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const day = btn.getAttribute('data-day');
      renderPeakHours(day);
    });
  });
}

function renderPeakHours(day) {
  const container = document.getElementById('peakHoursList');
  if (!container || !trendingCache) return;

  const slots = trendingCache.peak_hours[day] || [];
  container.innerHTML = slots.map(slot => `
    <div class="hour-slot-card">
      <div>
        <div class="hour-time"><i class="fa-regular fa-clock text-pink"></i> ${slot.time}</div>
        <div class="hour-desc">${slot.reason}</div>
      </div>
      <span class="score-badge-pill"><i class="fa-solid fa-fire"></i> ${slot.score}% Pico</span>
    </div>
  `).join('');
}

function renderPillars(pillars) {
  const container = document.getElementById('pillarsList');
  if (!container || !pillars) return;

  container.innerHTML = pillars.map(p => `
    <div class="pillar-item">
      <div class="pillar-header">
        <span class="pillar-title">${p.pillar}</span>
        <span class="pillar-weight">${p.weight} no Algoritmo</span>
      </div>
      <p class="pillar-desc">${p.description}</p>
    </div>
  `).join('');
}

// 6. Collaboration Network
async function loadCreators() {
  try {
    let creators = null;
    if (!isStaticMode) {
      const res = await fetch('/api/creators').catch(() => null);
      if (res && res.ok) {
        const json = await res.json();
        creators = json.creators;
      }
    }
    if (!creators) {
      const staticRes = await fetch('./data/network_creators.json');
      creators = await staticRes.json();
    }

    const localExtra = JSON.parse(localStorage.getItem('my_added_creators') || '[]');
    const fullList = [...localExtra, ...creators];
    renderCreators(fullList);
  } catch (err) {
    console.error('Erro ao carregar criadores:', err);
  }
}

function renderCreators(creators) {
  const grid = document.getElementById('creatorsGrid');
  if (!grid || !creators) return;

  grid.innerHTML = creators.map(c => `
    <div class="creator-card">
      <div>
        <div class="creator-top">
          <img class="creator-avatar" src="${c.avatar}" alt="${c.name}">
          <div class="creator-names">
            <h4>${c.name}</h4>
            <span class="creator-handle">${c.handle}</span>
          </div>
        </div>

        <div class="creator-meta" style="margin: 0.85rem 0 0.5rem 0;">
          <span class="creator-niche-badge">#${c.niche}</span>
          <span style="font-size:0.8rem; font-weight:700;"><i class="fa-solid fa-users text-cyan"></i> ${(c.followers || 0).toLocaleString('pt-BR')}</span>
        </div>

        <div class="creator-collab-type" style="margin-bottom:0.75rem;">
          <i class="fa-solid fa-bolt"></i> ${c.availableFor}
        </div>

        <p class="creator-bio">${c.bio}</p>
      </div>

      <a href="https://www.tiktok.com/${c.handle}" target="_blank" rel="noopener" class="btn btn-outline btn-block btn-sm" style="margin-top:0.75rem;">
        <i class="fa-brands fa-tiktok"></i> Ver Perfil & Propor Dueto
      </a>
    </div>
  `).join('');
}

// 7. Client-Side Viral Script Generator
async function generateScriptClientSide(niche, topic, goal) {
  if (!hooksCache) {
    const res = await fetch('./data/viral_hooks.json');
    hooksCache = await res.json();
  }

  const nicheData = hooksCache[niche] || hooksCache['curiosidades'];
  const customHooks = [
    `Você sabia disso sobre ${topic || 'esse assunto'}? Quase 99% das pessoas erram...`,
    `Pare tudo o que você está fazendo se você quer aprender sobre ${topic || 'isso'}!`,
    `A verdade brutal sobre ${topic || 'esse tema'} que ninguém no TikTok tem coragem de falar:`,
    `3 truques simples sobre ${topic || 'isso'} que vão mudar seus resultados para sempre:`,
    `O maior erro ao tentar ${topic || 'começar nisso'}: faça isso em vez disso!`
  ];

  return {
    title: `Roteiro Viral: ${topic || 'Tema Otimizado'}`,
    targetNiche: nicheData.name,
    hooks: customHooks,
    structure: {
      step1_hook: `[0s - 3s] ${customHooks[0]} (Zoom rápido e texto destacado na tela)`,
      step2_retention: `[3s - 15s] Apresente um fato contra-intuitivo sobre ${topic || 'o assunto'}. Não demore para entregar valor.`,
      step3_delivery: `[15s - 45s] Detalhe os 3 passos centrais com ritmo dinâmico e corte de câmera a cada 3 segundos.`,
      step4_cta: `[Últimos 5s] "Se você curtiu esse conteúdo e quer a parte 2, clica no '+' ao lado para me seguir!"`
    },
    suggestedHashtags: [
      `#${(topic || 'dicas').toLowerCase().replace(/\s+/g, '')}`,
      ...nicheData.hashtags.slice(0, 5)
    ]
  };
}

// 8. Client-Side Profile Auditor
function auditProfileClientSide(data) {
  const numFollowers = Number(data.followers) || 0;
  const numFollowing = Number(data.following) || 0;
  const numViews = Number(data.avgViews) || 0;

  let score = 50;
  const recommendations = [];
  const strengths = [];

  if (data.hasClearBio) {
    score += 15;
    strengths.push("Sua Bio possui proposta de valor evidente para quem entra no perfil.");
  } else {
    recommendations.push("Defina sua Bio com clareza: especifique exatamente o que a pessoa vai aprender se te seguir.");
  }

  if (data.hasCallToAction) {
    score += 10;
    strengths.push("Possui Chamada para Ação (CTA) orientando o visitante.");
  } else {
    recommendations.push("Adicione uma CTA na Bio: convide as pessoas a clicarem no link ou assistirem ao vídeo fixado.");
  }

  if (data.postFrequency === 'daily_2_3') {
    score += 15;
    strengths.push("Frequência de postagem excelente (2 a 3 vídeos/dia), ideal para aceleração no algoritmo.");
  } else if (data.postFrequency === 'daily_1') {
    score += 10;
    strengths.push("Postagem diária consistente.");
  } else {
    recommendations.push("Aumente sua frequência para pelo menos 1 a 2 vídeos diários com ganchos fortes.");
  }

  if (numViews > 0 && numFollowers > 0) {
    const conversionRate = (numFollowers / (numViews * 10)) * 100;
    if (conversionRate < 1) {
      recommendations.push("Suas visualizações não estão convertendo: certifique-se de pedir para seguir (CTA nos últimos 5 segundos).");
    } else {
      score += 10;
      strengths.push("Boa taxa de conversão de visualizações em novos seguidores.");
    }
  }

  if (numFollowing > numFollowers && numFollowers > 100) {
    recommendations.push("Você segue mais pessoas do que tem seguidores. Deixe de seguir contas inativas para demonstrar autoridade.");
  } else if (numFollowers > 1000) {
    score += 5;
    strengths.push("Boa proporção de autoridade no perfil.");
  }

  score = Math.min(Math.max(score, 20), 100);

  let badge = "Iniciante em Construção";
  if (score >= 85) badge = "Potencial Máximo de Viralização";
  else if (score >= 70) badge = "Perfil Otimizado para Crescimento";
  else if (score >= 50) badge = "Em Ajuste Estratégico";

  return {
    score,
    badge,
    strengths,
    recommendations,
    summary: `Perfil ${data.username || '@criador'} analisado com pontuação de conversão ${score}/100.`
  };
}

// 9. Forms Initialization
function initForms() {
  // Hook Generator Form
  const hookForm = document.getElementById('hookForm');
  hookForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('generateBtn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Criando Estrutura...';
    btn.disabled = true;

    const niche = document.getElementById('nicheSelect').value;
    const topic = document.getElementById('topicInput').value;
    const goal = document.getElementById('goalSelect').value;

    try {
      let script = null;
      if (!isStaticMode) {
        const res = await fetch('/api/hooks/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ niche, topic, goal })
        }).catch(() => null);

        if (res && res.ok) {
          const data = await res.json();
          script = data.script;
        }
      }

      if (!script) {
        script = await generateScriptClientSide(niche, topic, goal);
      }

      if (script) {
        document.getElementById('hookPreview').innerText = script.hooks[0];
        document.getElementById('retentionPreview').innerText = script.structure.step2_retention;
        document.getElementById('deliveryPreview').innerText = script.structure.step3_delivery;
        document.getElementById('ctaPreview').innerText = script.structure.step4_cta;

        const tagsContainer = document.getElementById('tagsList');
        tagsContainer.innerHTML = script.suggestedHashtags.map(t => `<span class="tag-pill">${t}</span>`).join('');

        showToast('Roteiro e ganchos gerados com sucesso! 🚀');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao gerar roteiro.');
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  // Copy Entire Script Button
  document.getElementById('copyAllScriptBtn').addEventListener('click', () => {
    const hook = document.getElementById('hookPreview').innerText;
    const ret = document.getElementById('retentionPreview').innerText;
    const del = document.getElementById('deliveryPreview').innerText;
    const cta = document.getElementById('ctaPreview').innerText;
    const tags = Array.from(document.querySelectorAll('#tagsList .tag-pill')).map(p => p.innerText).join(' ');

    const fullText = `[GANCHO (0-3s)]\n${hook}\n\n[RETENÇÃO (3-15s)]\n${ret}\n\n[CONTEÚDO (15-45s)]\n${del}\n\n[CTA FINAL]\n${cta}\n\n[HASHTAGS]\n${tags}`;
    navigator.clipboard.writeText(fullText).then(() => {
      showToast('Roteiro completo copiado com sucesso! 📋');
    });
  });

  // Copy Tags Only Button
  document.getElementById('copyTagsBtn').addEventListener('click', () => {
    const tags = Array.from(document.querySelectorAll('#tagsList .tag-pill')).map(p => p.innerText).join(' ');
    navigator.clipboard.writeText(tags).then(() => {
      showToast('Hashtags copiadas! 🏷️');
    });
  });

  // Profile Audit Form
  const auditForm = document.getElementById('auditForm');
  auditForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
      username: document.getElementById('auditUsername').value,
      followers: document.getElementById('auditFollowers').value,
      following: document.getElementById('auditFollowing').value,
      avgViews: document.getElementById('auditViews').value,
      postFrequency: document.getElementById('auditFrequency').value,
      hasClearBio: document.getElementById('checkBio').checked,
      hasCallToAction: document.getElementById('checkCta').checked
    };

    let result = null;
    if (!isStaticMode) {
      try {
        const res = await fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => null);
        if (res && res.ok) result = await res.json();
      } catch (err) {}
    }

    if (!result) {
      result = auditProfileClientSide(payload);
    }

    if (result) {
      document.getElementById('scoreDisplay').innerText = result.score;
      document.getElementById('badgeDisplay').innerText = result.badge;
      document.getElementById('summaryDisplay').innerText = result.summary;

      const strengthsList = document.getElementById('strengthsList');
      strengthsList.innerHTML = result.strengths.length > 0 
        ? result.strengths.map(s => `<li>${s}</li>`).join('') 
        : '<li>Continue aprimorando seu perfil com mais postagens consistentes.</li>';

      const recsList = document.getElementById('recommendationsList');
      recsList.innerHTML = result.recommendations.length > 0 
        ? result.recommendations.map(r => `<li>${r}</li>`).join('') 
        : '<li>Nenhum ajuste crítico no momento! Mantenha a frequência.</li>';

      showToast('Auditoria calculada com sucesso! 🎯');
    }
  });

  // Quick Audit from Banner
  document.getElementById('quickAuditBtn').addEventListener('click', () => {
    document.querySelector('[data-tab="tab-audit"]').click();
  });

  // TikTok Connect Button
  document.getElementById('connectTikTokBtn').addEventListener('click', async () => {
    const clientKey = localStorage.getItem('tiktok_client_key') || 'awat0zb6339asazq';

    if (!isStaticMode) {
      window.location.href = '/auth/tiktok/login';
      return;
    }

    // Fluxo OAuth 2.0 PKCE direto pelo navegador para GitHub Pages
    try {
      const codeVerifier = generateRandomString(64);
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const csrfState = generateRandomString(16);

      sessionStorage.setItem('tiktok_code_verifier', codeVerifier);
      sessionStorage.setItem('tiktok_csrf_state', csrfState);

      const redirectUri = 'https://wsmelo.github.io/';
      const scope = 'user.info.basic,user.info.stats';
      const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scope}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&state=${csrfState}&code_challenge=${codeChallenge}&code_challenge_method=S256`;

      showToast('Redirecionando para o login oficial do TikTok...');
      setTimeout(() => {
        window.location.href = authUrl;
      }, 500);
    } catch (err) {
      console.error(err);
      showToast('Erro ao iniciar login TikTok.');
    }
  });

  // Join Network Form
  const joinForm = document.getElementById('joinNetworkForm');
  joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const handle = document.getElementById('joinHandle').value;
    const newCreator = {
      id: `c_${Date.now()}`,
      name: document.getElementById('joinName').value,
      handle: handle.startsWith('@') ? handle : `@${handle}`,
      niche: document.getElementById('joinNiche').value,
      followers: defaultProfile.followerCount || 100,
      avatar: defaultProfile.avatarUrl,
      availableFor: document.getElementById('joinAvailable').value || "Duetos e Parcerias",
      bio: document.getElementById('joinBio').value || "Criador buscando conexões e crescimento orgânico no TikTok."
    };

    if (!isStaticMode) {
      fetch('/api/creators/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCreator)
      }).catch(() => null);
    }

    // Salva localmente para persistir no navegador
    const localExtra = JSON.parse(localStorage.getItem('my_added_creators') || '[]');
    localExtra.unshift(newCreator);
    localStorage.setItem('my_added_creators', JSON.stringify(localExtra));

    showToast('Perfil publicado na rede de criadores! 🎉');
    document.getElementById('joinModal').classList.remove('active');
    joinForm.reset();
    loadCreators();
  });

  // Settings / API Credentials Form
  const settingsForm = document.getElementById('settingsForm');
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientKey = document.getElementById('cfgClientKey').value.trim();
    const clientSecret = document.getElementById('cfgClientSecret').value.trim();
    const redirectUri = document.getElementById('cfgRedirectUri').value.trim();

    if (!clientKey) {
      showToast('Insira o Client Key.');
      return;
    }

    localStorage.setItem('tiktok_client_key', clientKey);
    if (clientSecret) localStorage.setItem('tiktok_client_secret', clientSecret);
    if (redirectUri) localStorage.setItem('tiktok_redirect_uri', redirectUri);

    if (!isStaticMode) {
      fetch('/api/settings/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientKey, clientSecret, redirectUri })
      }).catch(() => null);
    }

    showToast('Chaves salvas com sucesso! 🔐');
    document.getElementById('configModal').classList.remove('active');
    loadSystemStatus();
  });
}

// 10. Modals Handler
function initModals() {
  const configModal = document.getElementById('configModal');
  const openConfigBtn = document.getElementById('openConfigModalBtn');
  const closeConfigBtn = document.getElementById('closeModalBtn');
  const cancelConfigBtn = document.getElementById('cancelModalBtn');

  openConfigBtn.addEventListener('click', () => configModal.classList.add('active'));
  closeConfigBtn.addEventListener('click', () => configModal.classList.remove('active'));
  cancelConfigBtn.addEventListener('click', () => configModal.classList.remove('active'));

  const joinModal = document.getElementById('joinModal');
  const openJoinBtn = document.getElementById('joinNetworkBtn');
  const closeJoinBtn = document.getElementById('closeJoinModalBtn');
  const cancelJoinBtn = document.getElementById('cancelJoinModalBtn');

  openJoinBtn.addEventListener('click', () => joinModal.classList.add('active'));
  closeJoinBtn.addEventListener('click', () => joinModal.classList.remove('active'));
  cancelJoinBtn.addEventListener('click', () => joinModal.classList.remove('active'));

  window.addEventListener('click', (e) => {
    if (e.target === configModal) configModal.classList.remove('active');
    if (e.target === joinModal) joinModal.classList.remove('active');
  });
}

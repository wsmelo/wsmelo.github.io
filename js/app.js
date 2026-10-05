// TikTok Booster Pro - Client Application Logic

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  loadSystemStatus();
  loadTrendingData();
  loadCreators();
  initForms();
  initModals();
});

// Toast Notification
function showToast(message) {
  const toast = document.getElementById('toastMessage');
  toast.innerText = message;
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
  }, 3200);
}

// Global Copy Helper
window.copyText = function(elementId) {
  const elem = document.getElementById(elementId);
  if (!elem) return;
  const text = elem.innerText || elem.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copiado com sucesso para a área de transferência! 📋');
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

// 2. Load System & Profile Status
async function loadSystemStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    const statusBadge = document.getElementById('connectionStatusBadge');
    const statusText = document.getElementById('statusText');
    const badgeSandbox = document.getElementById('badgeSandbox');

    if (data.session && data.session.profile) {
      const p = data.session.profile;
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

    if (data.configured) {
      statusText.innerText = 'TikTok API Conectada';
      statusBadge.style.borderColor = 'var(--neon-green)';
      badgeSandbox.classList.remove('badge-warning');
      badgeSandbox.classList.add('badge-success');
      badgeSandbox.innerText = 'API Oficial Conectada';
    } else {
      statusText.innerText = 'Sandbox / Modo Demonstração';
      badgeSandbox.classList.add('badge-warning');
      badgeSandbox.innerText = 'Modo Simulação';
    }

    // Prefill settings modal if already available
    if (data.redirectUri) {
      document.getElementById('cfgRedirectUri').value = data.redirectUri;
    }
  } catch (err) {
    console.error('Erro ao carregar status:', err);
  }
}

// 3. Trending & Best Times Data
let trendingCache = null;

async function loadTrendingData() {
  try {
    const res = await fetch('/api/trending');
    const json = await res.json();
    if (json.ok && json.data) {
      trendingCache = json.data;
      renderPeakHours('domingo');
      renderPillars(trendingCache.viral_pillars);
    }
  } catch (err) {
    console.error('Erro ao carregar trending:', err);
  }

  // Days selector
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

// 4. Collaboration Network
async function loadCreators() {
  try {
    const res = await fetch('/api/creators');
    const json = await res.json();
    if (json.ok && json.creators) {
      renderCreators(json.creators);
    }
  } catch (err) {
    console.error('Erro ao carregar criadores:', err);
  }
}

function renderCreators(creators) {
  const grid = document.getElementById('creatorsGrid');
  if (!grid) return;

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

// 5. Forms Initialization
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
      const res = await fetch('/api/hooks/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, topic, goal })
      });
      const data = await res.json();

      if (data.ok && data.script) {
        const s = data.script;
        document.getElementById('hookPreview').innerText = s.hooks[0];
        document.getElementById('retentionPreview').innerText = s.structure.step2_retention;
        document.getElementById('deliveryPreview').innerText = s.structure.step3_delivery;
        document.getElementById('ctaPreview').innerText = s.structure.step4_cta;

        const tagsContainer = document.getElementById('tagsList');
        tagsContainer.innerHTML = s.suggestedHashtags.map(t => `<span class="tag-pill">${t}</span>`).join('');

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

    try {
      const res = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (data.ok) {
        document.getElementById('scoreDisplay').innerText = data.score;
        document.getElementById('badgeDisplay').innerText = data.badge;
        document.getElementById('summaryDisplay').innerText = data.summary;

        const strengthsList = document.getElementById('strengthsList');
        strengthsList.innerHTML = data.strengths.length > 0 
          ? data.strengths.map(s => `<li>${s}</li>`).join('') 
          : '<li>Continue aprimorando seu perfil com mais postagens.</li>';

        const recsList = document.getElementById('recommendationsList');
        recsList.innerHTML = data.recommendations.length > 0 
          ? data.recommendations.map(r => `<li>${r}</li>`).join('') 
          : '<li>Nenhum ajuste crítico no momento! Mantenha a frequência.</li>';

        showToast('Auditoria realizada com sucesso! 🎯');
      }
    } catch (err) {
      console.error(err);
      showToast('Erro ao realizar auditoria.');
    }
  });

  // Quick Audit from Banner
  document.getElementById('quickAuditBtn').addEventListener('click', () => {
    document.querySelector('[data-tab="tab-audit"]').click();
  });

  // TikTok Connect Button
  document.getElementById('connectTikTokBtn').addEventListener('click', () => {
    window.location.href = '/auth/tiktok/login';
  });

  // Join Network Form
  const joinForm = document.getElementById('joinNetworkForm');
  joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      name: document.getElementById('joinName').value,
      handle: document.getElementById('joinHandle').value,
      niche: document.getElementById('joinNiche').value,
      availableFor: document.getElementById('joinAvailable').value,
      bio: document.getElementById('joinBio').value
    };

    try {
      const res = await fetch('/api/creators/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.ok) {
        showToast('Perfil adicionado à rede de criadores! 🎉');
        document.getElementById('joinModal').classList.remove('active');
        joinForm.reset();
        loadCreators();
      } else {
        showToast(json.error || 'Erro ao publicar.');
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Settings / API Credentials Form
  const settingsForm = document.getElementById('settingsForm');
  settingsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      clientKey: document.getElementById('cfgClientKey').value,
      clientSecret: document.getElementById('cfgClientSecret').value,
      redirectUri: document.getElementById('cfgRedirectUri').value
    };

    try {
      const res = await fetch('/api/settings/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.ok) {
        showToast('Chaves salvas com sucesso no .env! 🔐');
        document.getElementById('configModal').classList.remove('active');
        loadSystemStatus();
      } else {
        showToast(json.error || 'Erro ao salvar credenciais.');
      }
    } catch (err) {
      console.error(err);
    }
  });
}

// 6. Modals Handler
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

  // Close modals when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === configModal) configModal.classList.remove('active');
    if (e.target === joinModal) joinModal.classList.remove('active');
  });
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Logger de auditoria de requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - UA: ${req.headers['user-agent'] || 'sem-ua'}`);
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Rotas de Verificação do TikTok Developers
app.get('/tiktokNaFsFOUwzQ27qO1MC7wHTsR7FEDjym9w.txt', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send('tiktok-developers-site-verification=NaFsFOUwzQ27qO1MC7wHTsR7FEDjym9w');
});
app.get('/tiktokNaFsFOUwzQ27qO1MC7wHTsR7FEDjym9w', (req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send('tiktok-developers-site-verification=NaFsFOUwzQ27qO1MC7wHTsR7FEDjym9w');
});

// Database references
const hooksFilePath = path.join(__dirname, 'data', 'viral_hooks.json');
const trendingFilePath = path.join(__dirname, 'data', 'trending_data.json');
const creatorsFilePath = path.join(__dirname, 'data', 'network_creators.json');

// Read JSON Helper
function readJSON(file, fallback = {}) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (err) {
    console.error(`Erro ao ler ${file}:`, err);
  }
  return fallback;
}

// Write JSON Helper
function writeJSON(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Erro ao salvar ${file}:`, err);
    return false;
  }
}

// PKCE (Proof Key for Code Exchange) Helpers for TikTok Login v2
function base64UrlEncode(buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function generateCodeVerifier() {
  return base64UrlEncode(crypto.randomBytes(32));
}

function generateCodeChallenge(verifier) {
  const hash = crypto.createHash('sha256').update(verifier).digest();
  return base64UrlEncode(hash);
}

// In-memory store for PKCE verifiers: state -> { verifier, timestamp }
const pkceStore = new Map();

// Global active session state (in-memory for demo / connected account)
let activeUserSession = {
  connected: false,
  isSandbox: true,
  profile: {
    displayName: "Criador TikTok Pro",
    username: "@meucanal_viral",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80",
    followerCount: 3840,
    followingCount: 210,
    likesCount: 54200,
    videoCount: 28,
    bio: "Criador de conteúdo focado em crescimento e estratégias virais 🚀",
    engagementRate: "8.4%"
  }
};

// 1. Status API
app.get('/api/status', (req, res) => {
  const isConfigured = Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
  res.json({
    ok: true,
    configured: isConfigured,
    clientKey: process.env.TIKTOK_CLIENT_KEY ? `${process.env.TIKTOK_CLIENT_KEY.substring(0, 4)}...` : null,
    redirectUri: process.env.TIKTOK_REDIRECT_URI || `http://localhost:${PORT}/auth/tiktok/callback`,
    session: activeUserSession
  });
});

// 2. TikTok OAuth Login URL Generator (com suporte obrigatório a PKCE)
app.get('/auth/tiktok/login', (req, res) => {
  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  const redirectUri = encodeURIComponent(process.env.TIKTOK_REDIRECT_URI || `http://localhost:${PORT}/auth/tiktok/callback`);
  
  if (!clientKey) {
    activeUserSession.connected = true;
    activeUserSession.isSandbox = true;
    return res.redirect('/?connected=sandbox');
  }

  const csrfState = Math.random().toString(36).substring(2) + Date.now().toString(36);
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Armazena verifier na memória referenciado pelo state
  pkceStore.set(csrfState, {
    verifier: codeVerifier,
    timestamp: Date.now()
  });

  // Escopo essencial do TikTok Login Kit v2
  const scope = req.query.scope || 'user.info.basic,user.info.stats';
  const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scope}&response_type=code&redirect_uri=${redirectUri}&state=${csrfState}&code_challenge=${codeChallenge}&code_challenge_method=S256`;
  
  res.redirect(authUrl);
});

// 3. TikTok OAuth Callback Endpoint (validação do PKCE)
app.get('/auth/tiktok/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error('TikTok Auth Error:', error, error_description);
    return res.redirect(`/?error=${encodeURIComponent(error_description || error)}`);
  }

  if (!code) {
    return res.redirect('/?error=missing_code');
  }

  try {
    const pkce = pkceStore.get(state);
    const codeVerifier = pkce ? pkce.verifier : '';
    if (state) pkceStore.delete(state);

    const tokenUrl = 'https://open.tiktokapis.com/v2/oauth/token/';
    const params = new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code: code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TIKTOK_REDIRECT_URI || `http://localhost:${PORT}/auth/tiktok/callback`,
      code_verifier: codeVerifier
    });

    const tokenRes = await axios.post(tokenUrl, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const { access_token, open_id } = tokenRes.data;

    // Buscar dados reais do perfil via TikTok Display API
    const userInfoUrl = 'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count';
    let tiktokData = {};
    try {
      const userRes = await axios.get(userInfoUrl, {
        headers: { Authorization: `Bearer ${access_token}` }
      });
      tiktokData = userRes.data?.data?.user || {};
    } catch (userErr) {
      console.warn('Aviso ao consultar detalhes estendidos do perfil:', userErr.message);
    }

    activeUserSession = {
      connected: true,
      isSandbox: false,
      accessToken: access_token,
      openId: open_id,
      profile: {
        displayName: tiktokData.display_name || "Criador TikTok Conectado",
        username: tiktokData.display_name ? `@${tiktokData.display_name.toLowerCase().replace(/\s+/g, '')}` : "@criador_oficial",
        avatarUrl: tiktokData.avatar_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80",
        followerCount: tiktokData.follower_count || 1,
        followingCount: tiktokData.following_count || 0,
        likesCount: tiktokData.likes_count || 0,
        videoCount: tiktokData.video_count || 0,
        bio: tiktokData.bio_description || "Conta oficial conectada com sucesso!",
        engagementRate: tiktokData.video_count > 0 ? `${((tiktokData.likes_count / (tiktokData.follower_count || 1)) * 10).toFixed(1)}%` : "N/A"
      }
    };

    res.redirect('/?connected=real');
  } catch (err) {
    console.error('Erro na troca do token do TikTok:', err.response?.data || err.message);
    activeUserSession.connected = true;
    activeUserSession.isSandbox = true;
    res.redirect('/?connected=sandbox&note=token_fallback');
  }
});

// Desconectar perfil
app.post('/api/tiktok/disconnect', (req, res) => {
  activeUserSession.connected = false;
  activeUserSession.isSandbox = true;
  res.json({ ok: true, message: "Perfil desconectado com sucesso." });
});

// 4. Salvar Credenciais do Desenvolvedor (.env)
app.post('/api/settings/credentials', (req, res) => {
  const { clientKey, clientSecret, redirectUri } = req.body;

  if (!clientKey || !clientSecret) {
    return res.status(400).json({ ok: false, error: "Client Key e Client Secret são obrigatórios." });
  }

  process.env.TIKTOK_CLIENT_KEY = clientKey.trim();
  process.env.TIKTOK_CLIENT_SECRET = clientSecret.trim();
  if (redirectUri) process.env.TIKTOK_REDIRECT_URI = redirectUri.trim();

  // Salvar no arquivo .env
  const envContent = `PORT=${PORT}\nTIKTOK_CLIENT_KEY=${process.env.TIKTOK_CLIENT_KEY}\nTIKTOK_CLIENT_SECRET=${process.env.TIKTOK_CLIENT_SECRET}\nTIKTOK_REDIRECT_URI=${process.env.TIKTOK_REDIRECT_URI || `http://localhost:${PORT}/auth/tiktok/callback`}\n`;
  fs.writeFileSync(path.join(__dirname, '.env'), envContent, 'utf8');

  res.json({ ok: true, message: "Credenciais salvas com sucesso no .env!" });
});

// 5. Ganchos Virais & Roteiros por Nicho
app.get('/api/hooks', (req, res) => {
  const data = readJSON(hooksFilePath);
  const niche = req.query.niche;
  if (niche && data[niche]) {
    return res.json({ ok: true, niche: data[niche] });
  }
  res.json({ ok: true, niches: data });
});

// 6. Gerador Personalizado de Roteiro e Ganchos
app.post('/api/hooks/generate', (req, res) => {
  const { niche, topic, goal } = req.body;
  const data = readJSON(hooksFilePath);
  const nicheData = data[niche] || data['curiosidades'];

  const customHooks = [
    `Você sabia disso sobre ${topic || 'esse assunto'}? Quase 99% das pessoas erram...`,
    `Pare tudo o que você está fazendo se você quer aprender sobre ${topic || 'isso'}!`,
    `A verdade brutal sobre ${topic || 'esse tema'} que ninguém no TikTok tem coragem de falar:`,
    `3 truques simples sobre ${topic || 'isso'} que vão mudar seus resultados para sempre:`,
    `O maior erro ao tentar ${topic || 'começar nisso'}: faça isso em vez disso!`
  ];

  const generatedScript = {
    title: `Roteiro Viral: ${topic || 'Tema Otimizado'}`,
    targetNiche: nicheData.name,
    hooks: customHooks,
    structure: {
      step1_hook: `[0s - 3s] ${customHooks[0]} (Zoom in rápido e texto destacado na tela)`,
      step2_retention: `[3s - 15s] Apresente um fato contra-intuitivo sobre ${topic || 'o assunto'}. Não demore para entregar valor.`,
      step3_delivery: `[15s - 45s] Detalhe os 3 passos centrais com ritmo dinâmico e B-roll ou troca de ângulo de câmera a cada 4 segundos.`,
      step4_cta: `[Últimos 5s] "Se você curtiu esse conteúdo e quer a parte 2, clica no '+' ao lado para me seguir!"`
    },
    suggestedHashtags: [
      `#${(topic || 'dicas').toLowerCase().replace(/\s+/g, '')}`,
      ...nicheData.hashtags.slice(0, 5)
    ],
    growthTip: "Dica de Ouro: Responda o primeiro comentário do seu próprio vídeo gerando um debate para aumentar o engajamento orgânico!"
  };

  res.json({ ok: true, script: generatedScript });
});

// 7. Auditoria de Perfil e Conversão de Seguidores
app.post('/api/audit', (req, res) => {
  const { username, followers, following, avgViews, postFrequency, hasClearBio, hasCallToAction } = req.body;

  const numFollowers = Number(followers) || 0;
  const numFollowing = Number(following) || 0;
  const numViews = Number(avgViews) || 0;

  let score = 50;
  const recommendations = [];
  const strengths = [];

  // Análise de Bio
  if (hasClearBio) {
    score += 15;
    strengths.push("Sua Bio possui proposta de valor evidente para quem entra no perfil.");
  } else {
    recommendations.push("Defina sua Bio com clareza: especifique exatamente o que a pessoa vai aprender ou ganhar se te seguir.");
  }

  // Análise de CTA na Bio
  if (hasCallToAction) {
    score += 10;
    strengths.push("Possui Chamada para Ação (CTA) orientando o visitante.");
  } else {
    recommendations.push("Adicione uma CTA na Bio: convide as pessoas a clicarem no link ou a assistirem ao vídeo fixado.");
  }

  // Análise de Frequência de Postagem
  if (postFrequency === 'daily_2_3') {
    score += 15;
    strengths.push("Frequência de postagem excelente (2 a 3 vídeos/dia), ideal para aceleração no algoritmo.");
  } else if (postFrequency === 'daily_1') {
    score += 10;
    strengths.push("Postagem diária consistente.");
  } else {
    recommendations.push("Aumente sua frequência para pelo menos 1 a 2 vídeos diários de qualidade para alimentar o algoritmo.");
  }

  // Relação Visualizações vs. Seguidores
  if (numViews > 0 && numFollowers > 0) {
    const conversionRate = (numFollowers / (numViews * 10)) * 100;
    if (conversionRate < 1) {
      recommendations.push("Suas visualizações não estão convertendo em seguidores: certifique-se de pedir para seguir (CTA falada + texto visual) nos últimos 5 segundos de cada vídeo.");
    } else {
      score += 10;
      strengths.push("Boa taxa de conversão de visualizações em novos seguidores.");
    }
  }

  // Proporção de Seguidores vs Seguindo
  if (numFollowing > numFollowers && numFollowers > 100) {
    recommendations.push("Você segue mais pessoas do que tem seguidores. Reduza contas inativas que você segue para transmitir maior autoridade de criador.");
  } else if (numFollowers > 1000) {
    score += 5;
    strengths.push("Boa proporção de autoridade no perfil.");
  }

  score = Math.min(Math.max(score, 15), 100);

  let badge = "Iniciante em Construção";
  if (score >= 85) badge = "Potencial Máximo de Viralização";
  else if (score >= 70) badge = "Perfil Otimizado para Crescimento";
  else if (score >= 50) badge = "Em Ajuste Estratégico";

  res.json({
    ok: true,
    score,
    badge,
    strengths,
    recommendations,
    summary: `Perfil ${username || '@criador'} analisado com pontuação de conversão ${score}/100.`
  });
});

// 8. Melhores Horários e Tendências
app.get('/api/trending', (req, res) => {
  const data = readJSON(trendingFilePath);
  res.json({ ok: true, data });
});

// 9. Central de Co-Criação e Criadores
app.get('/api/creators', (req, res) => {
  const creators = readJSON(creatorsFilePath, []);
  res.json({ ok: true, creators });
});

app.post('/api/creators/join', (req, res) => {
  const { name, handle, niche, bio, availableFor } = req.body;
  if (!name || !handle) {
    return res.status(400).json({ ok: false, error: "Nome e @ do TikTok são obrigatórios." });
  }

  const creators = readJSON(creatorsFilePath, []);
  const newCreator = {
    id: `c_${Date.now()}`,
    name,
    handle: handle.startsWith('@') ? handle : `@${handle}`,
    niche: niche || "geral",
    followers: activeUserSession.profile.followerCount || 100,
    avatar: activeUserSession.profile.avatarUrl,
    availableFor: availableFor || "Duetos e Parcerias",
    bio: bio || "Criador buscando conexões e crescimento orgânico no TikTok."
  };

  creators.unshift(newCreator);
  writeJSON(creatorsFilePath, creators);

  res.json({ ok: true, message: "Você entrou na rede de criadores com sucesso!", creator: newCreator });
});

// Iniciar Servidor
app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🚀 TikTok Booster Pro rodando em: http://localhost:${PORT}`);
  console.log(`======================================================\n`);
});

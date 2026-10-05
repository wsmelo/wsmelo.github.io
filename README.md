# 🚀 TikTok Booster Pro

Uma plataforma completa (Web App & API) desenvolvida especificamente para impulsionar o **crescimento orgânico e aquisição de seguidores no TikTok**, em total conformidade com as diretrizes e algoritmo da plataforma.

---

## 🌟 O que a plataforma faz?

1. **⚡ Gerador de Roteiros & Ganchos Virais dos 3 Segundos:**
   - Cria ganchos irresistíveis por nicho (Curiosidades, Finanças/Negócios, Humor, Fitness, Beleza, Games).
   - Estrutura completa passo a passo: Gancho (0-3s), Retenção (3-15s), Conteúdo (15-45s) e Chamada para Ação (CTA) otimizada para novos seguidores.
   - Pacotes de hashtags inteligentes para o algoritmo.

2. **⏰ Matriz de Melhores Horários & Algoritmo:**
   - Guia diário dos horários com maior fluxo de usuários online no Brasil e América Latina.
   - Explicação detalhada dos 4 pilares do algoritmo (Watch Time, Compartilhamentos, Comentários e Likes).

3. **🔍 Auditoria de Perfil & Conversão de Seguidores:**
   - Analisa seu perfil, bio, CTA e métricas atuais.
   - Gera uma nota de 0 a 100 com diagnóstico prático do que mudar imediatamente para converter visualizações em seguidores fiéis.

4. **🤝 Rede de Co-Criação & Duetos:**
   - Conecta criadores de conteúdo do mesmo nicho para realizar duetos (Duets), costuras (Stitch) e colaborações que atraem audiência qualificada e real.

5. **🔐 Integração com TikTok for Developers:**
   - Suporte a OAuth 2.0 oficial (`Login Kit` e `Display API`).
   - Modo Sandbox/Simulação automático para testes imediatos sem precisar esperar aprovação do app.

---

## 🛠️ Como Iniciar o Projeto

### Opção 1: Com 1 clique (Windows)
Basta dar um duplo clique no arquivo:
```
iniciar.bat
```
Ele abrirá o navegador em `http://localhost:3000` e iniciará o servidor Node.js.

### Opção 2: Pelo Terminal / PowerShell
Navegue até a pasta do projeto e execute:
```bash
npm start
```
Ou:
```bash
node server.js
```
Acesse no seu navegador: [http://localhost:3000](http://localhost:3000)

---

## 🔑 Como Conectar sua Conta do TikTok Oficial

1. Acesse o portal [TikTok for Developers](https://developers.tiktok.com/) e faça login com sua conta.
2. No menu **Manage Apps**, clique em **Add an App**.
3. Adicione os produtos:
   - **Login Kit**
   - **Display API**
4. Configure a **Redirect URI** para:
   ```
   http://localhost:3000/auth/tiktok/callback
   ```
5. Copie o `Client Key` e o `Client Secret`.
6. No painel do **TikTok Booster Pro**, clique em **"Configurar API"** e salve as chaves (ou edite o arquivo `.env`).

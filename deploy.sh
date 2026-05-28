#!/bin/bash
# ─────────────────────────────────────────────
#  Human App — Deploy automático
#  Corre esto UNA VEZ desde la terminal de Cursor:
#  chmod +x deploy.sh && ./deploy.sh
# ─────────────────────────────────────────────

set -e
RED='\033[0;31m'; GREEN='\033[0;32m'; BLUE='\033[0;34m'; YELLOW='\033[1;33m'; NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Human App — Deploy Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

# ── 1. Verificar herramientas necesarias ─────
echo -e "${YELLOW}[1/5] Verificando herramientas...${NC}"
command -v node  >/dev/null || { echo -e "${RED}❌ Instalá Node.js desde nodejs.org${NC}"; exit 1; }
command -v git   >/dev/null || { echo -e "${RED}❌ Instalá Git desde git-scm.com${NC}"; exit 1; }
echo -e "${GREEN}✅ Node $(node -v) y Git $(git --version | cut -d' ' -f3) detectados${NC}"

# ── 2. Instalar Railway CLI ──────────────────
echo -e "\n${YELLOW}[2/5] Instalando Railway CLI...${NC}"
if ! command -v railway >/dev/null 2>&1; then
  npm install -g @railway/cli
  echo -e "${GREEN}✅ Railway CLI instalado${NC}"
else
  echo -e "${GREEN}✅ Railway CLI ya instalado${NC}"
fi

# ── 3. Instalar GitHub CLI ───────────────────
echo -e "\n${YELLOW}[3/5] Verificando GitHub CLI...${NC}"
if ! command -v gh >/dev/null 2>&1; then
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v brew >/dev/null 2>&1; then
      brew install gh
    else
      echo -e "${RED}Instalá GitHub CLI desde: https://cli.github.com${NC}"
      echo -e "${RED}Luego volvé a correr este script.${NC}"
      exit 1
    fi
  fi
fi
echo -e "${GREEN}✅ GitHub CLI listo${NC}"

# ── 4. Login y crear repo en GitHub ─────────
echo -e "\n${YELLOW}[4/5] Conectando con GitHub...${NC}"
echo -e "Se va a abrir el navegador para que autorices con tu cuenta de GitHub."
gh auth login --web --git-protocol https

echo -e "\n${YELLOW}Creando repositorio 'human-app' en GitHub...${NC}"
gh repo create human-app --public --source=. --remote=origin --push \
  --description "Human App — Performance & Health Agent" 2>/dev/null || {
  # Si el repo ya existe, solo pushear
  echo -e "${YELLOW}El repo ya existe, pusheando cambios...${NC}"
  git remote set-url origin "https://github.com/$(gh api user --jq .login)/human-app.git" 2>/dev/null || true
  git push -u origin main 2>/dev/null || git push -u origin master
}
echo -e "${GREEN}✅ Código subido a GitHub${NC}"
GITHUB_URL=$(gh repo view --json url -q .url)
echo -e "${BLUE}   → $GITHUB_URL${NC}"

# ── 5. Deploy en Railway ─────────────────────
echo -e "\n${YELLOW}[5/5] Deployando en Railway...${NC}"
echo -e "Se va a abrir el navegador para que autorices con tu cuenta de Railway."
cd backend
railway login --browserless 2>/dev/null || railway login

railway init --name "human-app-backend" 2>/dev/null || true
railway up --detach

RAILWAY_URL=$(railway status --json 2>/dev/null | grep -o '"url":"[^"]*"' | head -1 | cut -d'"' -f4 || echo "ver en railway.app")
cd ..

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 ¡Deploy completo!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "GitHub:  ${GITHUB_URL}"
echo -e "Railway: ${RAILWAY_URL:-ver en https://railway.app}"
echo -e "\n${YELLOW}⚠️  FALTA: agregar las variables de entorno en Railway:${NC}"
echo -e "   ANTHROPIC_API_KEY   = sk-ant-..."
echo -e "   SUPABASE_URL        = https://xxx.supabase.co"
echo -e "   SUPABASE_SERVICE_KEY= eyJ..."
echo -e "\n${YELLOW}⚠️  FALTA: correr supabase_schema.sql en tu proyecto de Supabase${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

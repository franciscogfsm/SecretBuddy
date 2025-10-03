# Script para fazer deploy das Cloud Functions
# Execute com: .\deploy-functions.ps1

Write-Host "🚀 Deploy Firebase Cloud Functions - SecretBuddy" -ForegroundColor Cyan
Write-Host ""

# Verificar se está na root do projeto
if (-not (Test-Path "functions")) {
    Write-Host "❌ Erro: Pasta 'functions' não encontrada!" -ForegroundColor Red
    Write-Host "Execute este script na root do projeto SecretBuddy" -ForegroundColor Yellow
    exit 1
}

# Verificar se firebase-tools está instalado
Write-Host "📦 A verificar Firebase CLI..." -ForegroundColor Yellow
try {
    $firebaseVersion = firebase --version 2>&1
    Write-Host "✅ Firebase CLI instalado: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI não encontrado!" -ForegroundColor Red
    Write-Host "Instala com: npm install -g firebase-tools" -ForegroundColor Yellow
    exit 1
}

# Entrar na pasta functions
Write-Host ""
Write-Host "📂 A entrar na pasta functions..." -ForegroundColor Yellow
Set-Location -Path "functions"

# Instalar dependências
Write-Host ""
Write-Host "📦 A instalar dependências..." -ForegroundColor Yellow
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao instalar dependências!" -ForegroundColor Red
    Set-Location -Path ".."
    exit 1
}

# Build
Write-Host ""
Write-Host "🔨 A compilar TypeScript..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao compilar!" -ForegroundColor Red
    Set-Location -Path ".."
    exit 1
}

Write-Host "✅ Build concluído com sucesso!" -ForegroundColor Green

# Voltar à root
Set-Location -Path ".."

# Deploy
Write-Host ""
Write-Host "🚀 A fazer deploy das functions..." -ForegroundColor Cyan
firebase deploy --only functions

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Erro no deploy!" -ForegroundColor Red
    Write-Host "Faz login com: firebase login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Deploy concluido com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Ver logs:" -ForegroundColor Cyan
Write-Host "   firebase functions:log" -ForegroundColor White
Write-Host ""
Write-Host "Firebase Console:" -ForegroundColor Cyan
Write-Host "   https://console.firebase.google.com/project/secretbuddy-5637d/functions" -ForegroundColor White
Write-Host ""

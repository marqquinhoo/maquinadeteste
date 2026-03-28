# 🛡️ Start-Platform (Windows PowerShell)
# Localização: Root do Projeto

Write-Host "Iniciando AutoTesteAI Platform..." -ForegroundColor Cyan

# 1. Start Backend (Node/Express em 8091)
Write-Host "[1/2] Iniciando Backend Server (Port 8091)..." -ForegroundColor Yellow
$BackendProcess = Start-Process -NoNewWindow -FilePath "node" -ArgumentList "index.js" -WorkingDirectory "$PSScriptRoot\backend" -PassThru

# 2. Start Frontend (Vite/React em 5173)
Write-Host "[2/2] Iniciando Frontend (Vite)..." -ForegroundColor Yellow
$FrontendProcess = Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory "$PSScriptRoot\frontend" -PassThru

Write-Host "✅ Sucesso: O sistema foi iniciado!" -ForegroundColor Green
Write-Host "🌍 Acesso Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "⚙️  Acesso Backend: http://localhost:8091/maquinadeteste" -ForegroundColor White
Write-Host "Lembre-se: Para parar os processos, feche os terminais ou use: Stop-Process -Id $($BackendProcess.Id), $($FrontendProcess.Id)" -ForegroundColor Gray

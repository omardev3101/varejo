# Script de Deploy Sindmotoristas
# Uso: .\deploy.ps1

$plinkPath = "C:\Program Files\PuTTY\plink.exe"
$vpsIP = "187.45.255.59"
$vpsUser = "root"
$vpsPass = "Omar3101@"
$remotePath = "/var/www/varejo"

# Write-Host "--- Iniciando Build do Frontend ---" -ForegroundColor Cyan
# Set-Location frontend
# npm run build
# if ($LASTEXITCODE -ne 0) { Write-Host "Erro no Build!"; exit }
# Set-Location ..

git remote set-url origin https://github.com/omardev3101/varejo.git

Write-Host "--- Sincronizando com GitHub ---" -ForegroundColor Cyan
git add .
git commit -m "Update via deploy script"
git push origin main

Write-Host "--- Atualizando VPS (Git Pull) ---" -ForegroundColor Cyan
$pullCmd = "cd $remotePath && git pull origin main"
& $plinkPath -pw $vpsPass "$vpsUser@$vpsIP" $pullCmd

# Write-Host "--- Enviando Executável e Manifestos para a VPS ---" -ForegroundColor Cyan
# $pscpPath = "C:\Program Files\PuTTY\pscp.exe"

# Upload cleanup-indexes.js (pequeno)
# & $pscpPath -batch -pw $vpsPass "backend/cleanup-indexes.js" "${vpsUser}@${vpsIP}:${remotePath}/backend/cleanup-indexes.js"

# Envia o manifesto de auto-update (latest.yml)
# if (Test-Path "frontend/dist-electron/latest.yml") {
#     Write-Host "Enviando manifesto de atualização (latest.yml)..." -ForegroundColor Gray
#     & $pscpPath -batch -pw $vpsPass "frontend/dist-electron/latest.yml" "${vpsUser}@${vpsIP}:${remotePath}/frontend/public/downloads/latest.yml"
# }

# Upload dos executáveis com loop de retentativa e compressão (-C)
# $maxRetries = 5

# if (Test-Path "frontend/dist-electron/FarmaBus POS Setup 0.0.0.exe") {
#     # Nomes de destino que precisamos atualizar na VPS
#     $remoteTargets = @("FarmaBus-POS-Setup.exe", "FarmaBus POS Setup 0.0.0.exe")
#     
#     foreach ($targetName in $remoteTargets) {
#         $retryCount = 0
#         $success = $false
#         while (-not $success -and $retryCount -lt $maxRetries) {
#             $retryCount++
#             if ($retryCount -gt 1) {
#                 Write-Host "Tentativa $retryCount de $maxRetries para enviar como $targetName..." -ForegroundColor Yellow
#                 Start-Sleep -Seconds 3
#             }
#             Write-Host "Enviando executável como $targetName (com compressão)..." -ForegroundColor Gray
#             & $pscpPath -batch -C -pw $vpsPass "frontend/dist-electron/FarmaBus POS Setup 0.0.0.exe" "${vpsUser}@${vpsIP}:${remotePath}/frontend/public/downloads/$targetName"
#             if ($LASTEXITCODE -eq 0) {
#                 $success = $true
#                 Write-Host "Envio como $targetName concluído com sucesso!" -ForegroundColor Green
#             } else {
#                 Write-Host "Erro no envio de $targetName. Ocorreu uma desconexão." -ForegroundColor Red
#             }
#         }
#     }
# }

Write-Host "--- Atualizando Dependências e Build na VPS ---" -ForegroundColor Cyan
$buildCmd = "cd $remotePath/backend && mkdir -p backups && npm install && node sync-db.js && node seed.js && (pm2 restart varejo || pm2 start src/app.js --name varejo) && cd ../frontend && npm install && npm run build"
& $plinkPath -pw $vpsPass "$vpsUser@$vpsIP" $buildCmd

Write-Host "--- Deploy Concluído com Sucesso! ---" -ForegroundColor Green

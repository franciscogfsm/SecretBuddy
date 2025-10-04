# 🧪 Comandos de Teste - SecretBuddy (Hourly Pool System)

## 🎯 Sistema Atual: 8 Pools Horários (10h-17h UTC)

**⚠️ IMPORTANTE: Sistema usa UTC internamente, mas mostra hora local no app!**

### Conversão UTC → Portugal (UTC+1):

- **10h UTC** → **11h Portugal** (Pool abre 11:00, fecha 12:00)
- **11h UTC** → **12h Portugal** (Pool abre 12:00, fecha 13:00)
- **12h UTC** → **13h Portugal** (Pool abre 13:00, fecha 14:00)
- **13h UTC** → **14h Portugal** (Pool abre 14:00, fecha 15:00)
- **14h UTC** → **15h Portugal** (Pool abre 15:00, fecha 16:00)
- **15h UTC** → **16h Portugal** (Pool abre 16:00, fecha 17:00)
- **16h UTC** → **17h Portugal** (Pool abre 17:00, fecha 18:00)
- **17h UTC** → **18h Portugal** (Pool abre 18:00, fecha 19:00)

### Como funciona:

1. **User vê:** "Pool 16h is open!" (hora local Portugal)
2. **Clica:** "Join Pool 16h"
3. **Sistema internamente:** Junta ao pool `2025-10-04-15h` (UTC)
4. **✅ Correto!** 16h Portugal = 15h UTC

**Horários UTC!** Todos os comandos abaixo usam UTC (10h-17h)

---

## � **POOL MANAGEMENT**

### 1. Criar Pools Manualmente (Para Testes)

```powershell
# Cria os 8 pools do dia (10h, 11h, 12h, 13h, 14h, 15h, 16h, 17h)
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePools"
Invoke-RestMethod -Uri $url -Method Post
```

**Resposta:**

```json
{
  "success": true,
  "message": "Created 8 pools for 2025-10-04",
  "pools": [
    "2025-10-04-10h",
    "2025-10-04-11h",
    "2025-10-04-12h",
    "2025-10-04-13h",
    "2025-10-04-14h",
    "2025-10-04-15h",
    "2025-10-04-16h",
    "2025-10-04-17h"
  ]
}
```

---

### 2. Fechar Pool Específico e Emparelhar Users

```powershell
# Fechar pool 14h e criar pairs
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualClosePool"
Invoke-RestMethod -Uri $url -Method Post -Body '{"hour": 14}' -ContentType "application/json"

# Fechar pool 13h
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualClosePool"
Invoke-RestMethod -Uri $url -Method Post -Body '{"hour": 13}' -ContentType "application/json"
```

**Resposta:**

```json
{
  "success": true,
  "message": "Closed pool 2025-10-04-14h and created 1 pairs",
  "pairs": 1
}
```

**O que faz:**

- ✅ Fecha pool `2025-10-04-14h`
- ✅ Pega users que **JÁ JOINED** o pool
- ✅ Emparelha com prioridade: friends > country > random
- ✅ Cria pairs com reveal sempre 21:00-22:00
- ✅ Calcula 2 photo times entre join hour e 21:00

---

### 3. Criar Pairs (Modo Teste - TODOS Users)

```powershell
# Modo 1: Só users que joined o pool (normal)
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePairs"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"2025-10-04-14h"}' -ContentType "application/json"

# Modo 2: TODOS users (ignora pool joins - para teste)
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePairs"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"2025-10-04-14h","allUsers":true}' -ContentType "application/json"
```

**Resposta:**

```json
{
  "success": true,
  "pairs": 1,
  "poolId": "2025-10-04-14h",
  "mode": "all-users"
}
```

---

## 📸 **PHOTO NOTIFICATIONS**

### 1. Enviar Notificação Para Pool Inteiro

```powershell
# Enviar para todos paired users do pool 14h
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualTestPhotoNotification"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"2025-10-04-14h"}' -ContentType "application/json"

# Enviar para pool 13h
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualTestPhotoNotification"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"2025-10-04-13h"}' -ContentType "application/json"
```

**Resposta:**

```json
{
  "success": true,
  "message": "Sent notifications to 2 users",
  "sent": 2
}
```

**O que acontece:**

1. ✅ Notificação push chega no device
2. ✅ App mostra "Send Photo" card (mesmo sem clicar notificação!)
3. ✅ Timer 5 minutos começa (sincronizado via Cloud Functions timestamp)
4. ✅ User tem 5 mins para tirar e enviar foto

---

### 2. Enviar Notificação Para User Específico

```powershell
# Enviar só para Francisco
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualTestPhotoNotification"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"2025-10-04-14h","userId":"N64CUFQ3xUWYcElIRJen2pbhIJs1"}' -ContentType "application/json"

# Enviar só para Manel
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualTestPhotoNotification"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"2025-10-04-14h","userId":"u4FhcyXndsRiAjTK2VcC0dUhU643"}' -ContentType "application/json"
```

---

## 🔍 **DEBUG COMMANDS**

### 1. Listar Todos os Users

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/listUsers"
Invoke-RestMethod -Uri $url -Method Get
```

**Resposta:**

```json
{
  "success": true,
  "count": 2,
  "users": [
    {
      "uid": "N64CUFQ3xUWYcElIRJen2pbhIJs1",
      "displayName": "Francisco",
      "expoPushToken": "ExponentPushToken[IGY6TuDnOoX0KUwdzd4K42]"
    },
    {
      "uid": "u4FhcyXndsRiAjTK2VcC0dUhU643",
      "displayName": "Manel",
      "expoPushToken": "ExponentPushToken[DEV_u4FhcyXn]"
    }
  ]
}
```

**Verifica:**

- ✅ Tens 2+ users?
- ✅ Cada user tem `expoPushToken`? (se null, abrir app)
- ✅ UIDs estão corretos?

---

### 2. Listar Todos os Pairs Ativos

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/listPairs"
Invoke-RestMethod -Uri $url -Method Get
```

**Resposta:**

```json
{
  "success": true,
  "count": 1,
  "pairs": [
    {
      "id": "pair123",
      "userA": "N64CUFQ3xUWYcElIRJen2pbhIJs1",
      "userB": "u4FhcyXndsRiAjTK2VcC0dUhU643",
      "poolId": "2025-10-04-14h",
      "status": "active",
      "photosA": 0,
      "photosB": 0,
      "createdAt": "...",
      "photoWindowStart": "...",
      "photoWindowEnd": "...",
      "revealTime": "..."
    }
  ]
}
```

**Verifica:**

- ✅ Pairs count > 0?
- ✅ `userA` e `userB` são os UIDs corretos?
- ✅ `status === "active"`?
- ✅ `poolId` correto? (formato: `2025-10-04-14h`)

---

### 3. Deletar Todos os Pairs (Reset Teste)

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/deleteAllPairs"
Invoke-RestMethod -Uri $url -Method Post
```

**Resposta:**

```json
{
  "success": true,
  "message": "Deleted 1 pairs",
  "count": 1
}
```

**Quando usar:**

- 🔄 Resetar teste completo
- 🔄 Criar pairs novamente do zero
- 🔄 Testar com users diferentes

---

## 🧪 **TESTE COMPLETO - PASSO A PASSO**

### Cenário 1: Teste Rápido Pool 14h

```powershell
Write-Host "🧪 TESTE POOL 14h" -ForegroundColor Cyan
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"

# 1. Criar pools
Write-Host "`n1️⃣ Criando pools..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$base/manualCreatePools" -Method Post

Start-Sleep -Seconds 2

# 2. Fechar pool 14h e emparelhar
Write-Host "`n2️⃣ Fechando pool 14h e emparelhando..." -ForegroundColor Yellow
$pairResult = Invoke-RestMethod -Uri "$base/manualClosePool" -Method Post -Body '{"hour":14}' -ContentType "application/json"
Write-Host "   ✅ Criados $($pairResult.pairs) pairs" -ForegroundColor Green

Start-Sleep -Seconds 2

# 3. Enviar notificação
Write-Host "`n3️⃣ Enviando notificações..." -ForegroundColor Yellow
$notifResult = Invoke-RestMethod -Uri "$base/manualTestPhotoNotification" -Method Post -Body '{"poolId":"2025-10-04-14h"}' -ContentType "application/json"
Write-Host "   ✅ Enviadas $($notifResult.sent) notificações" -ForegroundColor Green

Start-Sleep -Seconds 2

# 4. Verificar pairs
Write-Host "`n4️⃣ Verificando pairs..." -ForegroundColor Yellow
$pairs = Invoke-RestMethod -Uri "$base/listPairs" -Method Get
Write-Host "   ✅ Pairs ativos: $($pairs.count)" -ForegroundColor Green
$pairs.pairs | Format-Table -Property id, userA, userB, poolId, status

Write-Host "`n✅ Teste completo!" -ForegroundColor Green
Write-Host "📱 Verifica app: 'Send Photo' card deve aparecer com timer 5:00" -ForegroundColor Cyan
```

---

### Cenário 2: Reset Completo + Novo Teste

```powershell
Write-Host "🔄 RESET + NOVO TESTE" -ForegroundColor Cyan
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"

# 1. Deletar pairs antigos
Write-Host "`n1️⃣ Deletando pairs antigos..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$base/deleteAllPairs" -Method Post

Start-Sleep -Seconds 2

# 2. Listar users
Write-Host "`n2️⃣ Listando users..." -ForegroundColor Yellow
$users = Invoke-RestMethod -Uri "$base/listUsers" -Method Get
Write-Host "   ✅ Users: $($users.count)" -ForegroundColor Green
$users.users | Format-Table uid, displayName, @{Label="Token"; Expression={if($_.expoPushToken){"✅"}else{"❌"}}}

Start-Sleep -Seconds 2

# 3. Criar pools
Write-Host "`n3️⃣ Criando pools..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$base/manualCreatePools" -Method Post

Start-Sleep -Seconds 2

# 4. Criar pairs (TODOS users - modo teste)
Write-Host "`n4️⃣ Criando pairs (todos users)..." -ForegroundColor Yellow
$createResult = Invoke-RestMethod -Uri "$base/manualCreatePairs" -Method Post -Body '{"poolId":"2025-10-04-14h","allUsers":true}' -ContentType "application/json"
Write-Host "   ✅ Pairs criados: $($createResult.pairs)" -ForegroundColor Green

Start-Sleep -Seconds 2

# 5. Enviar notificação
Write-Host "`n5️⃣ Enviando notificações..." -ForegroundColor Yellow
$notifResult = Invoke-RestMethod -Uri "$base/manualTestPhotoNotification" -Method Post -Body '{"poolId":"2025-10-04-14h"}' -ContentType "application/json"
Write-Host "   ✅ Enviadas: $($notifResult.sent)" -ForegroundColor Green

Write-Host "`n✅ Setup completo!" -ForegroundColor Green
Write-Host "📱 Refresh app (pull down) para ver status paired" -ForegroundColor Cyan
```

---

### Cenário 3: Teste Photo Notification Timing

```powershell
Write-Host "⏰ TESTE TIMING NOTIFICAÇÃO" -ForegroundColor Cyan
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"

# Enviar notificação
Write-Host "`n📸 Enviando notificação..." -ForegroundColor Yellow
$result = Invoke-RestMethod -Uri "$base/manualTestPhotoNotification" -Method Post -Body '{"poolId":"2025-10-04-14h"}' -ContentType "application/json"

Write-Host "`n✅ Enviadas $($result.sent) notificações!" -ForegroundColor Green
Write-Host "`n📱 VERIFICA NA APP:" -ForegroundColor Cyan
Write-Host "   • 'Send Photo' card aparece" -ForegroundColor White
Write-Host "   • Timer mostra: 5:00 → 4:59 → 4:58..." -ForegroundColor White
Write-Host "   • Prompt aleatório exibido" -ForegroundColor White
Write-Host "   • Botão 'Open Camera' funciona" -ForegroundColor White

Write-Host "`n⚠️  IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   • Card aparece MESMO sem clicar notificação" -ForegroundColor White
Write-Host "   • Timer sincronizado via Cloud Functions timestamp" -ForegroundColor White
Write-Host "   • Persistente após logout/login (AsyncStorage)" -ForegroundColor White
```

---

## 🐛 **TROUBLESHOOTING**

### ❌ Problema: "sent: 0" na notificação

**Causa:** Users não têm push tokens

**Solução:**

1. Abrir app em cada device
2. Aguardar logs: `✅ Expo Push Token: ...`
3. Verificar:

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/listUsers"
$users = Invoke-RestMethod -Uri $url -Method Get
$users.users | Where-Object { $null -eq $_.expoPushToken }
```

Se retornar users, eles **não têm tokens** → abrir app!

---

### ❌ Problema: "No Pool Available" mesmo com pair

**Causa:** App não recarregou após criar pair

**Solução:**

1. **Fechar e abrir app** OU
2. **Pull down to refresh** OU
3. **Esperar 30 segundos** (polling automático)

**Verificar pair existe:**

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/listPairs"
Invoke-RestMethod -Uri $url -Method Get
```

Se pair existe mas app não vê:

- Confirmar UIDs corretos
- Confirmar `status === "active"`
- Force refresh na app

---

### ❌ Problema: Botão mostra "Leave Pool" mesmo paired

**Status:** ✅ FIXED!

**Fix aplicado:** Botão agora mostra "✅ Paired - Waiting for Reveal" quando paired

**Se ainda vir "Leave Pool":**

1. Recarregar app
2. Verificar `currentPair` existe nos logs
3. Verificar versão code está atualizada

---

### ❌ Problema: "Send Photo" card desaparece quando outro user envia

**Status:** 🔧 FIXED (teste pendente)

**Fix aplicado:** Removida condição `!hasReceivedPhoto` da visibilidade do card

**Comportamento esperado:**

- User A e User B recebem notificação → Ambos veem "Send Photo" (5min)
- User A envia foto às 14:02 → Card de User A desaparece
- User B AINDA VÊ card com timer (3min restantes) ✅
- User B envia foto às 14:04 → Card de User B desaparece

**Se ainda falhar:**

1. Check AsyncStorage key: deve ser `photoChallengeData` (sem userId suffix)
2. Verificar logs quando User A envia:
   ```
   📸 Photo sent successfully
   ✅ Photo challenge cleared
   ```
3. User B NÃO deve ver estes logs (estados são independentes)

---

### ❌ Problema: Join às 15:13 Portugal → Pool 14h?

**Status:** ✅ FIXED + EXPLAINED!

**Explicação:**

- ❌ **ANTES**: App mostrava "Pool 14h" mas user estava às 15:13 (confuso!)
- ✅ **AGORA**: App mostra "Pool 15h" (hora local Portugal)
- 15:13 Portugal (UTC+1) = **14:13 UTC**
- Sistema internamente usa pool `2025-10-04-14h` (UTC)
- User vê "Join Pool 15h" → Junta ao pool 14h UTC ✅ CORRETO!

**Verificar conversão:**

```powershell
# Ver hora UTC atual
[System.DateTime]::UtcNow.ToString("HH:mm")

# Converter Portugal → UTC
$portugalTime = Get-Date
$utcTime = $portugalTime.ToUniversalTime()
Write-Host "Portugal: $($portugalTime.ToString('HH:mm'))"
Write-Host "UTC: $($utcTime.ToString('HH:mm'))"
Write-Host "Se Portugal = 16:30, UTC = 15:30"
Write-Host "User vê: 'Pool 16h' mas junta ao pool 15h UTC"
```

---

## 📊 **COMANDOS ÚTEIS**

### Ver Output Formatado (PowerShell)

```powershell
# Users table
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/listUsers"
$result = Invoke-RestMethod -Uri $url -Method Get
$result.users | Format-Table uid, displayName, @{Label="HasToken"; Expression={$null -ne $_.expoPushToken}}

# Pairs table
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/listPairs"
$result = Invoke-RestMethod -Uri $url -Method Get
$result.pairs | Format-Table id, userA, userB, status, poolId, photosA, photosB
```

---

### Quick Copy-Paste Test (1-Liner)

```powershell
# Teste rápido: criar pools + pair + notificação
$b="https://us-central1-secretbuddy-5637d.cloudfunctions.net"; Invoke-RestMethod -Uri "$b/manualCreatePools" -Method Post; Start-Sleep 2; Invoke-RestMethod -Uri "$b/manualClosePool" -Method Post -Body '{"hour":14}' -ContentType "application/json"; Start-Sleep 2; Invoke-RestMethod -Uri "$b/manualTestPhotoNotification" -Method Post -Body '{"poolId":"2025-10-04-14h"}' -ContentType "application/json"
```

---

## 📝 **USER IDs REFERENCE**

```
Francisco: N64CUFQ3xUWYcElIRJen2pbhIJs1
Manel:     u4FhcyXndsRiAjTK2VcC0dUhU643
```

---

## ⏰ **SCHEDULED FUNCTIONS (Automáticas)**

Estas funções correm automaticamente, **não precisas triggerar manualmente**:

| Função                    | Schedule        | Descrição                                         |
| ------------------------- | --------------- | ------------------------------------------------- |
| `createDailyPools`        | 00:00 UTC daily | Cria 8 pools (10h-17h)                            |
| `closePool10h`            | 11:00 UTC daily | Fecha pool 10h, emparelha users                   |
| `closePool11h`            | 12:00 UTC daily | Fecha pool 11h, emparelha users                   |
| `closePool12h`            | 13:00 UTC daily | Fecha pool 12h, emparelha users                   |
| `closePool13h`            | 14:00 UTC daily | Fecha pool 13h, emparelha users                   |
| `closePool14h`            | 15:00 UTC daily | Fecha pool 14h, emparelha users                   |
| `closePool15h`            | 16:00 UTC daily | Fecha pool 15h, emparelha users                   |
| `closePool16h`            | 17:00 UTC daily | Fecha pool 16h, emparelha users                   |
| `closePool17h`            | 18:00 UTC daily | Fecha pool 17h, emparelha users                   |
| `checkPhotoNotifications` | Every 1 minute  | Verifica se é hora de enviar photo notifications  |
| `cleanupOldPhotos`        | Every 4 hours   | Deleta fotos antigas (4h soft, 24h hard)          |
| `dailyCleanup`            | 00:01 UTC daily | Deleta pools, poolUsers, messages, photos antigos |

---

## ✅ **CHECKLIST FINAL**

- [ ] Cloud Functions deployed? (todas as funções listadas acima)
- [ ] 2+ users com push tokens registados? (`listUsers`)
- [ ] Pools criados? (`manualCreatePools`)
- [ ] Pairs criados? (`listPairs`)
- [ ] App recarregou após criar pairs? (pull down refresh)
- [ ] UI mostra "✅ Paired - Waiting for Reveal"?
- [ ] Notificações chegam nos devices?
- [ ] "Send Photo" card aparece com timer 5:00?
- [ ] Timer sincronizado (mesma hora em ambos devices)?
- [ ] Card persiste após logout/login?
- [ ] User A envia foto → User B AINDA VÊ card? ⚠️ **TESTAR!**

---

## 🚀 **NEXT STEPS**

1. **Testar bug fix**: User A envia foto → User B ainda vê "Send Photo"?
2. Se funcionar: ✅ Bug resolvido!
3. Se falhar: Investigar AsyncStorage key isolation

**Comando rápido para testar:**

```powershell
# Setup: criar pool + pairs + enviar notificação
$b="https://us-central1-secretbuddy-5637d.cloudfunctions.net"; Invoke-RestMethod -Uri "$b/manualCreatePools" -Method Post; Invoke-RestMethod -Uri "$b/manualClosePool" -Method Post -Body '{"hour":14}' -ContentType "application/json"; Invoke-RestMethod -Uri "$b/manualTestPhotoNotification" -Method Post -Body '{"poolId":"2025-10-04-14h"}' -ContentType "application/json"

# Agora na app:
# 1. Ambos devices veem "Send Photo" (5min timer)
# 2. User A envia foto
# 3. User B AINDA VÊ "Send Photo"? ✅ = bug fixed!
```

---

**Criado:** 2025-10-04  
**Sistema:** Hourly Pool (8 pools, 10h-17h)  
**Última fix:** Photo card visibility bug

# 🧪 GUIA COMPLETO DE TESTES - Push Notifications

## ✅ COMPATIBILIDADE

**As Cloud Functions JÁ funcionam com:**

- ✅ **Expo Go** (development)
- ✅ **iOS Standalone** (production - App Store)
- ✅ **Android Standalone** (production - Play Store)

**Porque?**

- Expo Push Notifications **suportam ambos**
- Token format é o mesmo: `ExponentPushToken[xxx]`
- Não precisas mudar nada no código! 🎉

---

## 📱 FORMATO DOS TOKENS

### Expo Go (Development)

```
ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
```

### iOS/Android Standalone (Production)

```
ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
```

**É o mesmo formato!** 🎯

---

## 🧪 TESTES COMPLETOS - COLA ISTO!

### Teste 1: Limpar e Preparar

```powershell
# 🔄 Reset completo
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"

Write-Host "`n🗑️  Limpando pairs antigos..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$base/deleteAllPairs" -Method Post

Write-Host "✅ Pronto para começar!`n" -ForegroundColor Green
```

---

### Teste 2: Verificar Users e Push Tokens

```powershell
# 👥 Listar todos users
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"

Write-Host "`n👥 Listando users..." -ForegroundColor Cyan
$users = Invoke-RestMethod -Uri "$base/listUsers" -Method Get

Write-Host "`nTotal: $($users.count) users`n" -ForegroundColor Green

# Mostrar tabela formatada
$users.users | ForEach-Object {
    $hasToken = if ($_.expoPushToken) { "✅" } else { "❌" }
    $tokenPreview = if ($_.expoPushToken) {
        $_.expoPushToken.Substring(0, [Math]::Min(30, $_.expoPushToken.Length)) + "..."
    } else {
        "NO TOKEN"
    }

    Write-Host "$hasToken $($_.displayName)" -ForegroundColor White
    Write-Host "   UID: $($_.uid)" -ForegroundColor Gray
    Write-Host "   Token: $tokenPreview" -ForegroundColor Gray
    Write-Host ""
}

# Verificar se todos têm tokens
$missingTokens = $users.users | Where-Object { -not $_.expoPushToken }
if ($missingTokens.Count -gt 0) {
    Write-Host "⚠️  ATENÇÃO: $($missingTokens.Count) user(s) sem push token!" -ForegroundColor Red
    Write-Host "📱 Abre a app nesses devices para registar tokens`n" -ForegroundColor Yellow
}
```

**Output esperado:**

```
✅ João Silva
   UID: N64CUFQ3TJZ9dg5ouYm2k6KGTfB2
   Token: ExponentPushToken[xxxxxxxxxxxxx...]

✅ Maria Santos
   UID: ABC123XYZ789...
   Token: ExponentPushToken[yyyyyyyyyyyyy...]
```

---

### Teste 3: Criar Pairs

```powershell
# 🤝 Criar pairs com TODOS users
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"

Write-Host "`n🤝 Criando pairs..." -ForegroundColor Cyan

$result = Invoke-RestMethod -Uri "$base/manualCreatePairs" -Method Post -Body '{
    "poolId": "morning-2025-10-04",
    "allUsers": true
}' -ContentType "application/json"

Write-Host "✅ Pairs criados: $($result.pairs)" -ForegroundColor Green
Write-Host "📋 Pool: $($result.poolId)" -ForegroundColor White
Write-Host "🔧 Modo: $($result.mode)`n" -ForegroundColor White
```

**Output esperado:**

```
✅ Pairs criados: 1
📋 Pool: morning-2025-10-04
🔧 Modo: all-users
```

---

### Teste 4: Verificar Pairs Criados

```powershell
# 👀 Ver pairs criados
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"

Write-Host "`n👀 Verificando pairs..." -ForegroundColor Cyan
$pairs = Invoke-RestMethod -Uri "$base/listPairs" -Method Get

Write-Host "`nTotal: $($pairs.count) pair(s)`n" -ForegroundColor Green

$pairs.pairs | ForEach-Object {
    $userAShort = $_.userA.Substring(0, 8)
    $userBShort = $_.userB.Substring(0, 8)

    Write-Host "🤝 Pair ID: $($_.id)" -ForegroundColor White
    Write-Host "   User A: $userAShort..." -ForegroundColor Gray
    Write-Host "   User B: $userBShort..." -ForegroundColor Gray
    Write-Host "   Status: $($_.status)" -ForegroundColor Gray
    Write-Host "   Photos: A=$($_.photosA) | B=$($_.photosB)" -ForegroundColor Gray
    Write-Host ""
}
```

**Output esperado:**

```
🤝 Pair ID: morning-2025-10-04-N64CUFQ3-ABC123XYZ
   User A: N64CUFQ3...
   User B: ABC123XY...
   Status: active
   Photos: A=0 | B=0
```

---

### Teste 5: Enviar Notificações

```powershell
# 📬 Enviar notificações de teste
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"

Write-Host "`n📬 Enviando notificações..." -ForegroundColor Cyan

$result = Invoke-RestMethod -Uri "$base/manualTestPhotoNotification" -Method Post -Body '{
    "poolId": "morning-2025-10-04"
}' -ContentType "application/json"

Write-Host "✅ Notificações enviadas: $($result.sent)" -ForegroundColor Green
Write-Host "📝 Mensagem: $($result.message)`n" -ForegroundColor White

if ($result.sent -eq 0) {
    Write-Host "⚠️  Nenhuma notificação enviada!" -ForegroundColor Red
    Write-Host "❓ Possíveis causas:" -ForegroundColor Yellow
    Write-Host "   1. Users não têm push tokens (ver Teste 2)" -ForegroundColor White
    Write-Host "   2. Nenhum pair ativo (ver Teste 4)" -ForegroundColor White
    Write-Host ""
}
```

**Output esperado:**

```
✅ Notificações enviadas: 2
📝 Mensagem: Sent notifications to 2 users
```

---

### Teste 6: Verificar Notificações nos Devices

**No Device/Phone:**

1. **Notificação deve aparecer:**

   ```
   É hora da tua foto do dia 📸
   Toca para enviar a tua foto ao teu mystery buddy!
   ```

2. **Toca na notificação**

   - ✅ App abre
   - ✅ Modal "Send Photo" aparece

3. **Vê prompt aleatório:**

   - Ex: "Show something that makes you smile"

4. **Tira foto:**
   - ✅ Botão "Open Camera" funciona
   - ✅ Camera abre
   - ✅ Foto tirada
   - ✅ Upload + envio automático

---

### Teste 7: Verificar App Recarregou

```powershell
# 🔄 Depois de criar pairs, verifica se app vê o pair
Write-Host "`n🔄 Agora na APP:" -ForegroundColor Cyan
Write-Host "   1. Fecha a app COMPLETAMENTE (não minimizar)" -ForegroundColor White
Write-Host "   2. Abre a app novamente" -ForegroundColor White
Write-Host "   3. Aguarda 2-3 segundos" -ForegroundColor White
Write-Host ""
Write-Host "✅ UI esperada:" -ForegroundColor Green
Write-Host "   Status: 'You're paired! Photo window...'" -ForegroundColor White
Write-Host "   Botão: 'Paired - Check Chat'" -ForegroundColor White
Write-Host ""
```

---

## 🚀 SCRIPT COMPLETO - TESTE TUDO DE UMA VEZ

```powershell
# 🎯 SecretBuddy - Complete Test Suite
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "🎯 SecretBuddy - Push Notifications Test" -ForegroundColor Cyan
Write-Host ("=" * 60) + "`n" -ForegroundColor Cyan

# 1. Limpar
Write-Host "1️⃣  Limpando pairs antigos..." -ForegroundColor Yellow
try {
    $deleteResult = Invoke-RestMethod -Uri "$base/deleteAllPairs" -Method Post
    Write-Host "   ✅ Deletados: $($deleteResult.count) pair(s)`n" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  Sem pairs para deletar`n" -ForegroundColor Gray
}

# 2. Listar users
Write-Host "2️⃣  Verificando users e tokens..." -ForegroundColor Yellow
$users = Invoke-RestMethod -Uri "$base/listUsers" -Method Get
Write-Host "   ✅ Found: $($users.count) user(s)`n" -ForegroundColor Green

$users.users | ForEach-Object {
    $hasToken = if ($_.expoPushToken) { "✅" } else { "❌" }
    Write-Host "   $hasToken $($_.displayName)" -ForegroundColor White
}

$missingTokens = $users.users | Where-Object { -not $_.expoPushToken }
if ($missingTokens.Count -gt 0) {
    Write-Host "`n   ⚠️  WARNING: $($missingTokens.Count) user(s) sem tokens!" -ForegroundColor Red
    Write-Host "   📱 Abre a app nos devices para registar`n" -ForegroundColor Yellow
    Write-Host "   Pressiona Enter após abrir apps..." -ForegroundColor Yellow
    Read-Host
}

# 3. Criar pairs
Write-Host "3️⃣  Criando pairs..." -ForegroundColor Yellow
$createResult = Invoke-RestMethod -Uri "$base/manualCreatePairs" -Method Post -Body '{
    "poolId": "morning-2025-10-04",
    "allUsers": true
}' -ContentType "application/json"
Write-Host "   ✅ Pairs criados: $($createResult.pairs)`n" -ForegroundColor Green

# 4. Verificar pairs
Write-Host "4️⃣  Verificando pairs..." -ForegroundColor Yellow
$pairs = Invoke-RestMethod -Uri "$base/listPairs" -Method Get
Write-Host "   ✅ Pairs ativos: $($pairs.count)`n" -ForegroundColor Green

$pairs.pairs | ForEach-Object {
    $userAShort = $_.userA.Substring(0, 8)
    $userBShort = $_.userB.Substring(0, 8)
    Write-Host "   🤝 $userAShort... ←→ $userBShort..." -ForegroundColor White
}

# 5. Enviar notificações
Write-Host "`n5️⃣  Enviando notificações..." -ForegroundColor Yellow
$notifResult = Invoke-RestMethod -Uri "$base/manualTestPhotoNotification" -Method Post -Body '{
    "poolId": "morning-2025-10-04"
}' -ContentType "application/json"
Write-Host "   ✅ Enviadas: $($notifResult.sent) notificação(ões)`n" -ForegroundColor Green

# 6. Instruções finais
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "✅ Testes Completos!" -ForegroundColor Green
Write-Host ("=" * 60) + "`n" -ForegroundColor Cyan

if ($notifResult.sent -gt 0) {
    Write-Host "📬 Verifica os devices - notificações enviadas!" -ForegroundColor Cyan
    Write-Host "   • Notificação deve aparecer" -ForegroundColor White
    Write-Host "   • Toca → Modal 'Send Photo' abre" -ForegroundColor White
    Write-Host "   • Prompt aleatório exibido" -ForegroundColor White
    Write-Host "   • Camera funciona`n" -ForegroundColor White
} else {
    Write-Host "⚠️  Nenhuma notificação enviada!" -ForegroundColor Red
    Write-Host "   Volta ao passo 2 e regista tokens`n" -ForegroundColor Yellow
}

Write-Host "🔄 Na APP:" -ForegroundColor Cyan
Write-Host "   1. Fecha completamente" -ForegroundColor White
Write-Host "   2. Abre novamente" -ForegroundColor White
Write-Host "   3. Vê: 'Paired - Check Chat'`n" -ForegroundColor White

Write-Host "📊 Resultados:" -ForegroundColor Cyan
Write-Host "   Users: $($users.count)" -ForegroundColor White
Write-Host "   Pairs: $($pairs.count)" -ForegroundColor White
Write-Host "   Notificações: $($notifResult.sent)" -ForegroundColor White
Write-Host ""
```

---

## 📋 CHECKLIST DE VERIFICAÇÃO

### ✅ Push Tokens

- [ ] Todos users têm `expoPushToken`?
- [ ] Tokens começam com `ExponentPushToken[`?
- [ ] Formato correto (não é `DEV_xxx`)?

### ✅ Pairs

- [ ] Pairs criados com sucesso?
- [ ] Status é `"active"`?
- [ ] UIDs corretos (match com users logados)?

### ✅ Notificações

- [ ] `sent > 0`?
- [ ] Notificação apareceu nos devices?
- [ ] Modal "Send Photo" abre ao tocar?
- [ ] Camera funciona?

### ✅ App UI

- [ ] App recarregou (fecha/abre)?
- [ ] Status mostra "You're paired..."?
- [ ] Botão mostra "Paired - Check Chat"?

---

## 🎯 PRODUCTION (iOS/Android Standalone)

### Quando Lançares na App Store/Play Store:

**NADA MUDA!** 🎉

As Cloud Functions **já funcionam** porque:

- ✅ Expo Push Notifications suportam standalone apps
- ✅ Token format é o mesmo
- ✅ Código já está preparado

**Único requisito:**

- Users aceitam notificações quando instalarem app

---

## 🐛 TROUBLESHOOTING

### "sent: 0" - Nenhuma Notificação

**Causa:** Users sem push tokens

**Solução:**

1. Abrir app em cada device
2. Fazer login
3. Aguardar: `✅ Expo Push Token: ...`
4. Rodar Teste 2 para verificar
5. Tentar Teste 5 novamente

---

### Notificação Não Apareceu

**Verifica:**

- ✅ Device com notificações ativadas?
- ✅ App com permissão de notificações?
- ✅ Token registado no Firestore?
- ✅ App em foreground ou background?

**Logs úteis (Firebase Console):**

```powershell
firebase functions:log --only manualTestPhotoNotification
```

Procura por:

```
📸 Sending to X users in morning-2025-10-04
✅ Sent X/X notifications
```

---

### Modal Não Abre

**Causa:** Notification listener não ativo

**Solução:**

1. App precisa estar **aberta** (foreground)
2. Ou **background** (não fechada completamente)
3. Toca na notificação → Modal abre

---

## 💡 DICAS

### Teste Rápido (1 Comando)

```powershell
# Quick test - copia e cola!
$b="https://us-central1-secretbuddy-5637d.cloudfunctions.net"; Invoke-RestMethod -Uri "$b/deleteAllPairs" -Method Post | Out-Null; Invoke-RestMethod -Uri "$b/manualCreatePairs" -Method Post -Body '{"poolId":"morning-2025-10-04","allUsers":true}' -ContentType "application/json"; Start-Sleep -Seconds 2; Invoke-RestMethod -Uri "$b/manualTestPhotoNotification" -Method Post -Body '{"poolId":"morning-2025-10-04"}' -ContentType "application/json"
```

Faz:

1. Delete pairs antigos
2. Cria pairs novos
3. Aguarda 2s
4. Envia notificações

---

### Ver Logs em Tempo Real

```powershell
# Terminal separado
firebase functions:log --only checkPhotoNotifications
```

Vê:

```
⏰ Checking photo notifications at 15:30
📸 morning pool photo time matched! Sending...
📸 Sending to 100 users in morning-2025-10-04
✅ Sent 100/100 notifications
✅ Sent 100 total notifications
```

---

## ✅ PRONTO!

**Cola o Quick Test Script e testa!** 🚀

Se tudo funcionar:

- ✅ Pairs criados
- ✅ Notificações enviadas
- ✅ App mostra "Paired - Check Chat"
- ✅ Modal abre ao tocar notificação

**Sistema 100% operacional!** 🎉

**E funciona em:**

- ✅ Expo Go (dev)
- ✅ iOS Standalone (production)
- ✅ Android Standalone (production)

**Sem mudanças necessárias!** 💪

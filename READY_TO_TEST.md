# 🎉 DEPLOY COMPLETO - Pronto para Testar!

## ✅ Cloud Functions Deployed

- ✅ `listUsers` - Ver todos users e tokens
- ✅ `listPairs` - Ver pairs ativos
- ✅ `deleteAllPairs` - Reset para testes
- ✅ `manualCreatePairs` - Criar pairs (updated)
- ✅ `manualTestPhotoNotification` - Enviar notificações (updated)

---

## 🚀 QUICK START - Cola Tudo Isto!

### Script Completo de Teste

```powershell
# 🧪 SecretBuddy - Complete Test Script
$baseUrl = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"

Write-Host "`n🎯 SecretBuddy Test Suite" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# 1. Delete old pairs
Write-Host "`n1️⃣  Cleaning up old pairs..." -ForegroundColor Yellow
try {
    $deleteResult = Invoke-RestMethod -Uri "$baseUrl/deleteAllPairs" -Method Post
    Write-Host "   ✅ Deleted $($deleteResult.count) pair(s)" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️  No pairs to delete" -ForegroundColor Gray
}

# 2. List users
Write-Host "`n2️⃣  Checking users..." -ForegroundColor Yellow
$users = Invoke-RestMethod -Uri "$baseUrl/listUsers" -Method Get
Write-Host "   ✅ Found $($users.count) user(s)" -ForegroundColor Green
Write-Host "`n   User List:" -ForegroundColor Cyan
$users.users | ForEach-Object {
    $hasToken = if ($_.expoPushToken) { "✅" } else { "❌" }
    Write-Host "   $hasToken $($_.displayName) - $($_.uid.Substring(0, 8))..." -ForegroundColor White
}

# Check if all users have tokens
$usersWithoutTokens = $users.users | Where-Object { -not $_.expoPushToken }
if ($usersWithoutTokens.Count -gt 0) {
    Write-Host "`n   ⚠️  WARNING: $($usersWithoutTokens.Count) user(s) without push tokens!" -ForegroundColor Red
    Write-Host "   📱 Open the app on these devices to register tokens" -ForegroundColor Yellow
    Write-Host "`n   Press Enter after opening apps..." -ForegroundColor Yellow
    Read-Host
}

# 3. Create pairs
Write-Host "`n3️⃣  Creating pairs..." -ForegroundColor Yellow
$createResult = Invoke-RestMethod -Uri "$baseUrl/manualCreatePairs" -Method Post -Body '{"poolId":"morning-2025-10-04","allUsers":true}' -ContentType "application/json"
Write-Host "   ✅ Created $($createResult.pairs) pair(s)" -ForegroundColor Green
Write-Host "   📋 Pool: $($createResult.poolId)" -ForegroundColor White
Write-Host "   🔧 Mode: $($createResult.mode)" -ForegroundColor White

# 4. List pairs
Write-Host "`n4️⃣  Verifying pairs..." -ForegroundColor Yellow
$pairs = Invoke-RestMethod -Uri "$baseUrl/listPairs" -Method Get
Write-Host "   ✅ Found $($pairs.count) active pair(s)" -ForegroundColor Green
Write-Host "`n   Pair Details:" -ForegroundColor Cyan
$pairs.pairs | ForEach-Object {
    $userAShort = $_.userA.Substring(0, 8)
    $userBShort = $_.userB.Substring(0, 8)
    Write-Host "   🤝 $userAShort... ←→ $userBShort..." -ForegroundColor White
    Write-Host "      Status: $($_.status) | Photos: A=$($_.photosA) B=$($_.photosB)" -ForegroundColor Gray
}

# 5. Send notification
Write-Host "`n5️⃣  Sending test notifications..." -ForegroundColor Yellow
$notifResult = Invoke-RestMethod -Uri "$baseUrl/manualTestPhotoNotification" -Method Post -Body '{"poolId":"morning-2025-10-04"}' -ContentType "application/json"
Write-Host "   ✅ Sent to $($notifResult.sent) user(s)" -ForegroundColor Green

if ($notifResult.sent -eq 0) {
    Write-Host "   ⚠️  No users received notifications!" -ForegroundColor Red
    Write-Host "   📱 Make sure users have registered push tokens (Step 2)" -ForegroundColor Yellow
} else {
    Write-Host "`n   📬 Check your devices for notifications!" -ForegroundColor Cyan
}

# Final instructions
Write-Host "`n" + ("=" * 50) -ForegroundColor Cyan
Write-Host "✅ Test Complete!" -ForegroundColor Green
Write-Host "`n📱 NEXT STEPS:" -ForegroundColor Cyan
Write-Host "   1. Close and reopen the app on both devices" -ForegroundColor White
Write-Host "   2. Wait for the app to load (or pull down to refresh)" -ForegroundColor White
Write-Host "   3. You should see: 'Paired - Check Chat'" -ForegroundColor White
Write-Host "   4. If notification was sent, tap it to open 'Send Photo' modal" -ForegroundColor White
Write-Host "`n🐛 TROUBLESHOOTING:" -ForegroundColor Cyan
Write-Host "   • 'No Pool Available'? → Close and reopen the app" -ForegroundColor White
Write-Host "   • No notification? → Check Step 2 (push tokens)" -ForegroundColor White
Write-Host "   • Need help? → Check TEST_COMMANDS.md" -ForegroundColor White
Write-Host ""
```

---

## 🎯 COLA ISTO AGORA!

**PowerShell (copia e cola tudo de uma vez):**

O script acima vai:

1. ✅ Deletar pairs antigos
2. ✅ Listar users e verificar tokens
3. ✅ Avisar se faltam tokens (pausa para abrir apps)
4. ✅ Criar pairs novos
5. ✅ Verificar pairs criados
6. ✅ Enviar notificação teste
7. ✅ Mostrar próximos passos

---

## 📱 Depois de Rodar o Script

### Na App (ambos devices):

1. **Fechar app completamente** (swipe up no iOS, back button no Android)
2. **Abrir app novamente**
3. **Aguardar carregar** (~2 segundos)

**UI esperada:**

```
Status: "You're paired! Photo window and reveal will happen at scheduled times."
Button: "Paired - Check Chat"
```

### Se Notificação Foi Enviada:

1. **Toca na notificação** no device
2. **Modal "Send Photo"** deve abrir
3. **Prompt aleatório** exibido (ex: "Show something that makes you smile")
4. **Botão "Open Camera"** → Camera abre
5. **Tira foto** → Upload + envio automático

---

## ✅ Checklist Final

- [ ] Script rodou sem erros?
- [ ] Users count ≥ 2?
- [ ] Todos users têm push tokens? (✅ green checkmarks)
- [ ] Pairs created ≥ 1?
- [ ] Notifications sent ≥ 1?
- [ ] App fechada e aberta novamente?
- [ ] UI mostra "Paired - Check Chat"?
- [ ] Notificação recebida?
- [ ] Modal "Send Photo" abre?

Se tudo ✅, **sistema está 100% funcional!** 🎉

---

## 🐛 Se Algo Falhar

### "sent: 0" (Nenhuma Notificação)

**Causa:** Users sem push tokens

**Solução:**

```powershell
# Ver quais users não têm tokens
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/listUsers"
$users = Invoke-RestMethod -Uri $url -Method Get
$users.users | Where-Object { -not $_.expoPushToken } | Format-Table uid, displayName
```

Para cada user sem token:

1. Abrir app no device
2. Fazer login
3. Aguardar: `✅ Expo Push Token: ...`
4. Rodar script novamente

---

### "No Pool Available" Após Criar Pairs

**Causa:** App não recarregou

**Solução:**

1. **Fechar app completamente** (não apenas minimizar)
2. **Abrir novamente**
3. Aguardar 2-3 segundos

Se ainda não funciona:

```powershell
# Verificar se pair realmente existe
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/listPairs"
Invoke-RestMethod -Uri $url -Method Get
```

Se pair existe mas app não vê:

- Confirmar UIDs corretos (ver logs da app)
- Confirmar `status === "active"` no Firestore
- Tentar logout/login na app

---

### UIDs Não Match

**Causa:** Users diferentes no Firestore vs App

**Solução:**

1. Ver UID na app (logs):

```
✅ User logged in: { uid: "N64CUFQ3...", ... }
```

2. Ver UIDs no Firestore:

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/listUsers"
Invoke-RestMethod -Uri $url -Method Get
```

3. Se diferentes:
   - Logout/login na app
   - Ou deletar users antigos no Firestore

---

## 🎉 Tudo Pronto!

**Agora roda o Quick Test Script e segue os passos!** 🚀

Se tudo funcionar:

- ✅ Pairs criados
- ✅ Notificações enviadas
- ✅ App mostra "Paired - Check Chat"
- ✅ Modal abre ao tocar notificação

**Sistema está 100% operacional!** 🎊

---

**Need help? Check:**

- `TEST_COMMANDS.md` - Todos comandos detalhados
- `NO_POOL_FIX.md` - Troubleshooting "No Pool Available"
- `PUSH_TOKEN_FIX.md` - Troubleshooting push tokens

**Happy testing!** 🚀📱

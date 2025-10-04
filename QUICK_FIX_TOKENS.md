# 🚀 QUICK FIX - Cola Isto Agora!

## ⚡ PROBLEMA: 0 Notificações Enviadas

**Causa:** Users não têm push tokens registados!

---

## ✅ SOLUÇÃO RÁPIDA

### 1. Ver Quem Não Tem Tokens

```powershell
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"
$users = Invoke-RestMethod -Uri "$base/listUsers" -Method Get

Write-Host "`n📊 Push Token Status:`n" -ForegroundColor Cyan
$users.users | ForEach-Object {
    $status = if ($_.expoPushToken) { "✅ HAS TOKEN" } else { "❌ NO TOKEN - ABRE APP!" }
    $color = if ($_.expoPushToken) { "Green" } else { "Red" }
    Write-Host "$status - $($_.displayName)" -ForegroundColor $color
}
Write-Host ""
```

---

### 2. Abre Apps nos Devices

**Para CADA user marcado com ❌:**

1. ✅ Abre a app no device
2. ✅ Faz login
3. ✅ Aguarda 3 segundos
4. ✅ Vê log: `✅ Expo Push Token: ExponentPushToken[xxx]`

---

### 3. Verifica e Testa

```powershell
# Aguarda tokens registarem
Start-Sleep -Seconds 10

# Verifica novamente
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"
$users = Invoke-RestMethod -Uri "$base/listUsers" -Method Get

$withTokens = @($users.users | Where-Object { $_.expoPushToken })
$withoutTokens = @($users.users | Where-Object { -not $_.expoPushToken })

Write-Host "`n📊 Status Atualizado:" -ForegroundColor Cyan
Write-Host "✅ Com tokens: $($withTokens.Count)" -ForegroundColor Green
Write-Host "❌ Sem tokens: $($withoutTokens.Count)`n" -ForegroundColor Red

if ($withoutTokens.Count -eq 0) {
    Write-Host "🎉 Todos têm tokens! Testando notificações...`n" -ForegroundColor Green

    $result = Invoke-RestMethod -Uri "$base/manualTestPhotoNotification" -Method Post -Body '{
        "poolId": "morning-2025-10-04"
    }' -ContentType "application/json"

    Write-Host "✅ Notificações enviadas: $($result.sent)`n" -ForegroundColor Green

    if ($result.sent -gt 0) {
        Write-Host "🎉 SUCESSO! Verifica devices!" -ForegroundColor Green
    }
} else {
    Write-Host "⚠️  Ainda faltam $($withoutTokens.Count) token(s)!" -ForegroundColor Red
    Write-Host "Volta ao passo 2!`n" -ForegroundColor Yellow
}
```

---

## 🎯 SCRIPT COMPLETO - COLA TUDO!

```powershell
# 🔧 Fix Push Tokens
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"

Write-Host "`n🔧 Push Token Registration Fix`n" -ForegroundColor Cyan

# Check status
$users = Invoke-RestMethod -Uri "$base/listUsers" -Method Get
$withoutTokens = @($users.users | Where-Object { -not $_.expoPushToken })

if ($withoutTokens.Count -gt 0) {
    Write-Host "❌ $($withoutTokens.Count) user(s) sem tokens:`n" -ForegroundColor Red
    $withoutTokens | ForEach-Object {
        Write-Host "   📱 $($_.displayName) - ABRE APP!" -ForegroundColor Yellow
    }

    Write-Host "`n⏳ Aguardando apps abrirem..." -ForegroundColor Yellow
    Write-Host "(Pressiona Enter após abrir todas apps)" -ForegroundColor Gray
    Read-Host

    Write-Host "`n⏳ Waiting 10s for tokens to register..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10

    # Recheck
    $users = Invoke-RestMethod -Uri "$base/listUsers" -Method Get
    $withoutTokens = @($users.users | Where-Object { -not $_.expoPushToken })
}

if ($withoutTokens.Count -eq 0) {
    Write-Host "`n✅ All users have tokens!`n" -ForegroundColor Green

    Write-Host "📬 Sending notifications..." -ForegroundColor Cyan
    $result = Invoke-RestMethod -Uri "$base/manualTestPhotoNotification" -Method Post -Body '{"poolId":"morning-2025-10-04"}' -ContentType "application/json"

    Write-Host "`n✅ Sent: $($result.sent) notification(s)`n" -ForegroundColor Green

    if ($result.sent -gt 0) {
        Write-Host "🎉 SUCCESS! Check your devices!" -ForegroundColor Green
    } else {
        Write-Host "❌ Still 0! Check Firestore manually." -ForegroundColor Red
    }
} else {
    Write-Host "`n❌ Still $($withoutTokens.Count) without tokens!" -ForegroundColor Red
    Write-Host "Try again or check app logs.`n" -ForegroundColor Yellow
}
```

---

## ✅ RESULTADO ESPERADO

```
🔧 Push Token Registration Fix

✅ All users have tokens!

📬 Sending notifications...

✅ Sent: 2 notification(s)

🎉 SUCCESS! Check your devices!
```

**Nos devices:**

- 🔔 Notificação aparece
- 👆 Toca → Modal "Send Photo" abre
- 📸 Tira foto → Upload funciona

---

## 🐛 SE AINDA 0

### Debug Firestore

1. **Firebase Console**
2. **Firestore Database**
3. **Collection: `users`**
4. **Abre cada user**
5. **Verifica campo `expoPushToken`**

**Deve existir:**

```
expoPushToken: "ExponentPushToken[xxxxxx]"
pushTokenUpdatedAt: Timestamp
```

**Se não existir:**

- App não está a salvar token
- Verifica logs da app para erros
- Verifica se `notificationService.registerForPushNotifications()` é chamado

---

## 💡 TL;DR

1. **Roda script** (cola acima)
2. **Abre apps** quando pedir
3. **Aguarda 10s**
4. **Vê resultado**
5. **Se `sent > 0`:** ✅ Sucesso!
6. **Se `sent = 0`:** ❌ Debug Firestore

---

**Cola o script completo agora!** 🚀

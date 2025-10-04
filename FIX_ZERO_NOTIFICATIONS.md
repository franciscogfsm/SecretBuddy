# 🔧 FIX: 0 Notificações Enviadas

## ❌ PROBLEMA

```
5️⃣  Enviando notificações...
   ✅ 0 enviada(s)

⚠️  Nenhuma notificação - regista tokens!
```

**Causa:** Users não têm push tokens registados no Firestore!

---

## ✅ SOLUÇÃO - PASSO A PASSO

### Passo 1: Verificar Tokens Atuais

```powershell
# Ver quais users NÃO têm tokens
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"
$users = Invoke-RestMethod -Uri "$base/listUsers" -Method Get

Write-Host "`n📊 Status dos Push Tokens:`n" -ForegroundColor Cyan

$users.users | ForEach-Object {
    if ($_.expoPushToken) {
        Write-Host "✅ $($_.displayName) - HAS TOKEN" -ForegroundColor Green
        Write-Host "   Token: $($_.expoPushToken.Substring(0, 30))..." -ForegroundColor Gray
    } else {
        Write-Host "❌ $($_.displayName) - NO TOKEN" -ForegroundColor Red
        Write-Host "   UID: $($_.uid)" -ForegroundColor Gray
        Write-Host "   📱 PRECISA ABRIR A APP!" -ForegroundColor Yellow
    }
    Write-Host ""
}
```

**Output esperado:**

```
❌ João Silva - NO TOKEN
   UID: N64CUFQ3TJZ9dg5ouYm2k6KGTfB2
   📱 PRECISA ABRIR A APP!

❌ Maria Santos - NO TOKEN
   UID: ABC123XYZ...
   📱 PRECISA ABRIR A APP!
```

---

### Passo 2: Abrir App em CADA Device

**Para CADA user sem token:**

1. **Abre a app no device/phone**
2. **Faz login** (se não estiver)
3. **Aguarda 2-3 segundos**
4. **Vê os logs no Metro:**

```
📱 Getting Expo Push Token...
✅ Expo Push Token: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
✅ Push token saved to Firestore
```

**Se não vês esses logs:**

- Reinicia a app (fecha completamente e abre)
- Verifica se `notificationService.ts` está a ser chamado
- Verifica logs de erro

---

### Passo 3: Verificar Tokens Registados

```powershell
# Aguarda 10 segundos após abrir apps
Start-Sleep -Seconds 10

# Verifica novamente
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"
$users = Invoke-RestMethod -Uri "$base/listUsers" -Method Get

Write-Host "`n✅ Tokens Registados:`n" -ForegroundColor Green

$withTokens = $users.users | Where-Object { $_.expoPushToken }
$withoutTokens = $users.users | Where-Object { -not $_.expoPushToken }

Write-Host "✅ Com token: $($withTokens.Count)" -ForegroundColor Green
Write-Host "❌ Sem token: $($withoutTokens.Count)" -ForegroundColor Red

if ($withoutTokens.Count -gt 0) {
    Write-Host "`n⚠️  Ainda faltam tokens! Volta ao Passo 2.`n" -ForegroundColor Yellow
} else {
    Write-Host "`n🎉 Todos users têm tokens! Pronto para testar!`n" -ForegroundColor Green
}
```

---

### Passo 4: Testar Notificações Novamente

```powershell
# Agora deve funcionar!
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"

Write-Host "`n📬 Enviando notificações..." -ForegroundColor Cyan

$result = Invoke-RestMethod -Uri "$base/manualTestPhotoNotification" -Method Post -Body '{
    "poolId": "morning-2025-10-04"
}' -ContentType "application/json"

Write-Host "`n✅ Notificações enviadas: $($result.sent)" -ForegroundColor Green

if ($result.sent -eq 0) {
    Write-Host "❌ AINDA 0! Volta ao Passo 1`n" -ForegroundColor Red
} else {
    Write-Host "🎉 SUCESSO! Verifica devices!`n" -ForegroundColor Green
}
```

**Output esperado (depois de registar tokens):**

```
✅ Notificações enviadas: 2
🎉 SUCESSO! Verifica devices!
```

---

## 🔍 TROUBLESHOOTING

### Problema 1: App Não Regista Token

**Verifica se `notificationService` é chamado:**

```typescript
// AuthContext.tsx ou onde fazes login
import { registerForPushNotifications } from "./services/notificationService";

useEffect(() => {
  if (user) {
    // Regista push token
    registerForPushNotifications(user.uid);
  }
}, [user]);
```

**Se não tiveres isto, adiciona!**

---

### Problema 2: Token Registado Mas Ainda 0

**Verifica Firestore:**

1. Firebase Console → Firestore
2. Collection: `users`
3. Abre cada user document
4. Verifica campo: `expoPushToken`

**Deve ter:**

```json
{
  "uid": "N64CUFQ3...",
  "displayName": "João Silva",
  "expoPushToken": "ExponentPushToken[xxxxxx]",
  "pushTokenUpdatedAt": "2025-10-04T23:45:00.000Z"
}
```

**Se não tiver:**

- Token não foi salvo no Firestore
- Verifica logs de erro na app
- Verifica se `updateDoc` funciona

---

### Problema 3: Permissão Negada

**Se user negou notificações:**

**iOS:**

```
Settings → SecretBuddy → Notifications → Allow
```

**Android:**

```
Settings → Apps → SecretBuddy → Notifications → Allow
```

Depois **fecha e abre app** novamente.

---

## 🚀 SCRIPT AUTOMÁTICO - FIX COMPLETO

```powershell
# 🔧 SecretBuddy - Fix Push Tokens
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "🔧 SecretBuddy - Push Token Registration" -ForegroundColor Cyan
Write-Host ("=" * 60) + "`n" -ForegroundColor Cyan

# 1. Check current status
Write-Host "📊 Verificando status atual...`n" -ForegroundColor Yellow
$users = Invoke-RestMethod -Uri "$base/listUsers" -Method Get

$withTokens = @($users.users | Where-Object { $_.expoPushToken })
$withoutTokens = @($users.users | Where-Object { -not $_.expoPushToken })

Write-Host "✅ Com token: $($withTokens.Count)" -ForegroundColor Green
Write-Host "❌ Sem token: $($withoutTokens.Count)`n" -ForegroundColor Red

if ($withoutTokens.Count -gt 0) {
    Write-Host "📱 Users que precisam abrir a app:" -ForegroundColor Yellow
    $withoutTokens | ForEach-Object {
        Write-Host "   • $($_.displayName) ($($_.uid.Substring(0, 8))...)" -ForegroundColor White
    }

    Write-Host "`n🎯 INSTRUÇÕES:" -ForegroundColor Cyan
    Write-Host "   1. Abre a app em CADA device acima" -ForegroundColor White
    Write-Host "   2. Faz login (se necessário)" -ForegroundColor White
    Write-Host "   3. Aguarda ver log: '✅ Expo Push Token: ...'" -ForegroundColor White
    Write-Host "   4. Pressiona Enter quando todos abrirem apps`n" -ForegroundColor White

    Read-Host "Pressiona Enter para continuar"

    # Wait a bit for tokens to register
    Write-Host "`n⏳ Aguardando tokens registarem..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    # Check again
    Write-Host "🔄 Verificando novamente...`n" -ForegroundColor Yellow
    $users = Invoke-RestMethod -Uri "$base/listUsers" -Method Get
    $withTokens = @($users.users | Where-Object { $_.expoPushToken })
    $withoutTokens = @($users.users | Where-Object { -not $_.expoPushToken })

    Write-Host "✅ Com token: $($withTokens.Count)" -ForegroundColor Green
    Write-Host "❌ Sem token: $($withoutTokens.Count)`n" -ForegroundColor Red

    if ($withoutTokens.Count -gt 0) {
        Write-Host "⚠️  ATENÇÃO: Ainda faltam $($withoutTokens.Count) token(s)!" -ForegroundColor Red
        Write-Host "Verifica se apps estão abertas e com login feito`n" -ForegroundColor Yellow
        exit
    }
}

# 2. All tokens registered - test notifications
Write-Host "🎉 Todos users têm tokens!`n" -ForegroundColor Green

Write-Host "📬 Enviando notificações de teste..." -ForegroundColor Cyan
$result = Invoke-RestMethod -Uri "$base/manualTestPhotoNotification" -Method Post -Body '{
    "poolId": "morning-2025-10-04"
}' -ContentType "application/json"

Write-Host "`n✅ Notificações enviadas: $($result.sent)" -ForegroundColor Green

# 3. Final result
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
if ($result.sent -gt 0) {
    Write-Host "🎉 SUCESSO!" -ForegroundColor Green
    Write-Host ("=" * 60) + "`n" -ForegroundColor Cyan

    Write-Host "📱 Verifica os devices:" -ForegroundColor Cyan
    Write-Host "   • Notificação deve aparecer" -ForegroundColor White
    Write-Host "   • Toca → Modal 'Send Photo' abre" -ForegroundColor White
    Write-Host "   • Prompt aleatório exibido" -ForegroundColor White
    Write-Host "   • Camera funciona`n" -ForegroundColor White
} else {
    Write-Host "❌ FALHOU - 0 notificações enviadas" -ForegroundColor Red
    Write-Host ("=" * 60) + "`n" -ForegroundColor Cyan

    Write-Host "🔍 Debug:" -ForegroundColor Yellow
    Write-Host "   1. Verifica Firebase Console → users collection" -ForegroundColor White
    Write-Host "   2. Verifica se expoPushToken existe" -ForegroundColor White
    Write-Host "   3. Verifica logs da app para erros`n" -ForegroundColor White
}
```

---

## 📋 CHECKLIST

### Antes de Enviar Notificações:

- [ ] **Step 1:** Verificar status atual (`listUsers`)
- [ ] **Step 2:** Identificar users sem tokens
- [ ] **Step 3:** Abrir app em cada device
- [ ] **Step 4:** Ver log `✅ Expo Push Token:`
- [ ] **Step 5:** Verificar Firestore tem `expoPushToken`
- [ ] **Step 6:** Confirmar todos users têm tokens
- [ ] **Step 7:** Enviar notificações
- [ ] **Step 8:** Verificar `sent > 0`

---

## ✅ QUANDO FUNCIONAR

**Output esperado:**

```
📬 Enviando notificações de teste...

✅ Notificações enviadas: 2

🎉 SUCESSO!

📱 Verifica os devices:
   • Notificação deve aparecer
   • Toca → Modal 'Send Photo' abre
   • Prompt aleatório exibido
   • Camera funciona
```

**Nos devices:**

1. 🔔 Notificação aparece
2. 👆 Toca → Modal abre
3. 📸 Prompt exibido
4. 📷 Camera funciona
5. ✅ Upload + envio

---

## 💡 TL;DR

**Problema:** `sent: 0`

**Causa:** Users sem push tokens

**Fix:**

1. Abrir app em cada device
2. Ver log: `✅ Expo Push Token:`
3. Verificar Firestore
4. Testar novamente

**Script:** Cola o **"Script Automático - Fix Completo"** acima! 🚀

---

**Agora cola o script e segue as instruções!** 📱

# 🧪 Comandos de Teste - SecretBuddy

## ✅ Setup Completo

### 1. Owner Atualizado

- ✅ `app.json` → `"owner": "inaciobalu"`
- ✅ EAS Project criado: `fce3b08f-a412-435b-b80c-fab92b570c1b`
- ✅ Push tokens funcionam sem erros

### 2. Novas Cloud Functions (Deploy em progresso)

- `listUsers` - Ver todos users e seus UIDs
- `listPairs` - Ver todos pairs ativos
- `deleteAllPairs` - Limpar pairs para novo teste

---

## 🔍 COMANDOS DE DEBUG

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
      "uid": "N64CUFQ3TJZ9dg5ouYm2k6KGTfB2",
      "displayName": "User 1",
      "email": "user1@example.com",
      "expoPushToken": "ExponentPushToken[xxxxx]",
      "createdAt": "..."
    },
    {
      "uid": "ABC123XYZ...",
      "displayName": "User 2",
      "email": "user2@example.com",
      "expoPushToken": "ExponentPushToken[yyyyy]",
      "createdAt": "..."
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
      "userA": "N64CUFQ3TJZ9dg5ouYm2k6KGTfB2",
      "userB": "ABC123XYZ...",
      "poolId": "morning-2025-10-04",
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
- ✅ `poolId` correto?

---

### 3. Criar Pairs (Com Todos Users)

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePairs"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"morning-2025-10-04","allUsers":true}' -ContentType "application/json"
```

**Resposta:**

```json
{
  "success": true,
  "pairs": 1,
  "poolId": "morning-2025-10-04",
  "mode": "all-users"
}
```

**O que faz:**

- ✅ Pega **TODOS** users da database
- ✅ Cria entradas em `poolUsers` para cada um
- ✅ Emparelha users aleatoriamente
- ✅ Cria pairs com status "active"

---

### 4. Enviar Notificação Teste

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualTestPhotoNotification"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"morning-2025-10-04"}' -ContentType "application/json"
```

**Resposta:**

```json
{
  "success": true,
  "message": "Sent notifications to 2 users",
  "sent": 2
}
```

**Verifica:**

- ✅ `sent > 0`? (se 0, users não têm push tokens)
- ✅ Notificação apareceu no device?
- ✅ Modal "Send Photo" abriu?

---

### 5. Deletar Todos os Pairs (Limpar Teste)

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

## 🧪 TESTE COMPLETO - PASSO A PASSO

### Passo 1: Reset Completo

```powershell
# Delete todos pairs existentes
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/deleteAllPairs"
Invoke-RestMethod -Uri $url -Method Post
```

---

### Passo 2: Abrir App em 2 Devices

1. **Device 1:** Abrir app → Login
2. **Device 2:** Abrir app → Login
3. **Aguardar push tokens registarem:**

```
📱 Getting Expo Push Token...
✅ Expo Push Token: ExponentPushToken[xxxxx]
✅ Push token saved to Firestore
```

---

### Passo 3: Verificar Users

```powershell
# Listar users e confirmar UIDs + tokens
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/listUsers"
$users = Invoke-RestMethod -Uri $url -Method Get
$users.users | Format-Table uid, displayName, expoPushToken
```

**Confirma:**

- ✅ 2+ users listados
- ✅ Cada user tem `expoPushToken` (não null)

---

### Passo 4: Criar Pairs

```powershell
# Criar pairs com TODOS users
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePairs"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"morning-2025-10-04","allUsers":true}' -ContentType "application/json"
```

**Resposta esperada:**

```json
{ "success": true, "pairs": 1, "mode": "all-users" }
```

---

### Passo 5: Verificar Pairs

```powershell
# Listar pairs criados
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/listPairs"
$pairs = Invoke-RestMethod -Uri $url -Method Get
$pairs.pairs | Format-Table id, userA, userB, status
```

**Confirma:**

- ✅ 1+ pair listado
- ✅ `userA` e `userB` são UIDs corretos
- ✅ `status === "active"`

---

### Passo 6: Force Refresh na App

**Em cada device:**

**Opção A - Pull to Refresh:**

1. No HomeScreen, **pull down** (gesto de refresh)
2. Aguardar 2s

**Opção B - Fechar e Abrir:**

1. Fechar app completamente
2. Abrir app novamente
3. Aguardar carregar

**Opção C - Esperar:**

1. Aguardar 30 segundos (polling automático)

**Logs esperados:**

```
🔄 Loading pool status...
👥 Current pair: { id: "pair123", userA: "...", userB: "...", status: "active" }
```

**UI esperada:**

- Status: `"You're paired! Photo window and reveal will happen at scheduled times."`
- Botão: `"Paired - Check Chat"`

---

### Passo 7: Testar Notificação

```powershell
# Enviar notificação teste
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualTestPhotoNotification"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"morning-2025-10-04"}' -ContentType "application/json"
```

**O que deve acontecer:**

1. ✅ Resposta: `{ "success": true, "sent": 2 }`
2. ✅ Notificação aparece em cada device:
   - Título: "É hora da tua foto do dia 📸"
   - Body: "Toca para enviar a tua foto ao teu mystery buddy!"
3. ✅ User toca notificação
4. ✅ Modal "Send Photo" abre
5. ✅ Prompt aleatório exibido (ex: "Show something that makes you smile")
6. ✅ Botão "Open Camera" funciona
7. ✅ Foto tirada → Upload + envio

---

## 🐛 TROUBLESHOOTING

### Problema: "sent: 0" na notificação

**Causa:** Users não têm push tokens registados

**Solução:**

1. Abrir app em cada device
2. Aguardar logs: `✅ Expo Push Token: ...`
3. Verificar Firestore: `users/{uid}.expoPushToken` existe
4. Tentar enviar notificação novamente

**Verificar:**

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/listUsers"
$users = Invoke-RestMethod -Uri $url -Method Get
$users.users | Where-Object { $null -eq $_.expoPushToken }
```

Se retornar users, eles **não têm tokens** → abrir app!

---

### Problema: "No Pool Available" mesmo com pair

**Causa:** App não recarregou após criar pair

**Solução:**

1. **Fechar e abrir app**
2. Ou **pull down to refresh**
3. Ou **esperar 30 segundos**

**Verificar pair existe:**

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/listPairs"
Invoke-RestMethod -Uri $url -Method Get
```

Se pair existe mas app não vê:

- ✅ Confirmar UIDs corretos (listar users)
- ✅ Confirmar `status === "active"`
- ✅ Force refresh na app

---

### Problema: Pair tem UIDs errados

**Causa:** Users na database diferentes dos logados na app

**Solução:**

1. Ver UIDs reais nos logs da app:

```
✅ User logged in: { uid: "N64CUFQ3...", ... }
```

2. Ver UIDs no Firestore:

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/listUsers"
Invoke-RestMethod -Uri $url -Method Get
```

3. Se diferentes:
   - Users antigos na database (logout/login na app)
   - Users não sincronizados (verificar Firebase Auth)

---

## 📊 COMANDOS ÚTEIS

### Ver Output Formatado (PowerShell)

```powershell
# Users table
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/listUsers"
$result = Invoke-RestMethod -Uri $url -Method Get
$result.users | Format-Table uid, displayName, @{Label="HasToken"; Expression={$null -ne $_.expoPushToken}}

# Pairs table
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/listPairs"
$result = Invoke-RestMethod -Uri $url -Method Get
$result.pairs | Format-Table id, userA, userB, status, photosA, photosB
```

### Quick Test Script

```powershell
# Test completo automático
$baseUrl = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"

Write-Host "🧪 Starting test..." -ForegroundColor Cyan

# 1. Delete pairs
Write-Host "`n1️⃣ Deleting old pairs..." -ForegroundColor Yellow
Invoke-RestMethod -Uri "$baseUrl/deleteAllPairs" -Method Post

# 2. List users
Write-Host "`n2️⃣ Listing users..." -ForegroundColor Yellow
$users = Invoke-RestMethod -Uri "$baseUrl/listUsers" -Method Get
Write-Host "   Found $($users.count) users" -ForegroundColor Green
$users.users | Format-Table uid, displayName, @{Label="HasToken"; Expression={$null -ne $_.expoPushToken}}

# 3. Create pairs
Write-Host "`n3️⃣ Creating pairs..." -ForegroundColor Yellow
$createResult = Invoke-RestMethod -Uri "$baseUrl/manualCreatePairs" -Method Post -Body '{"poolId":"morning-2025-10-04","allUsers":true}' -ContentType "application/json"
Write-Host "   Created $($createResult.pairs) pair(s)" -ForegroundColor Green

# 4. List pairs
Write-Host "`n4️⃣ Listing pairs..." -ForegroundColor Yellow
$pairs = Invoke-RestMethod -Uri "$baseUrl/listPairs" -Method Get
Write-Host "   Found $($pairs.count) pair(s)" -ForegroundColor Green
$pairs.pairs | Format-Table id, userA, userB, status

# 5. Send notification
Write-Host "`n5️⃣ Sending test notification..." -ForegroundColor Yellow
$notifResult = Invoke-RestMethod -Uri "$baseUrl/manualTestPhotoNotification" -Method Post -Body '{"poolId":"morning-2025-10-04"}' -ContentType "application/json"
Write-Host "   Sent to $($notifResult.sent) user(s)" -ForegroundColor Green

Write-Host "`n✅ Test complete!" -ForegroundColor Green
Write-Host "📱 Now refresh the app (pull down or close/open)" -ForegroundColor Cyan
```

Copia e cola este script todo de uma vez! 🚀

---

## ✅ Checklist Final

- [ ] Owner atualizado para `inaciobalu`? ✅
- [ ] EAS Project criado? ✅
- [ ] Push tokens funcionam? (sem erro "Invalid uuid") ✅
- [ ] Cloud Functions deployed? (listUsers, listPairs, deleteAllPairs)
- [ ] 2+ users com push tokens registados?
- [ ] Pairs criados com `allUsers=true`?
- [ ] App recarregou após criar pairs?
- [ ] UI mostra "Paired - Check Chat"?
- [ ] Notificações chegam nos devices?
- [ ] Modal "Send Photo" abre?

Se tudo ✅, o sistema está **100% funcional**! 🎉

---

**Próximo passo:** Aguardar deploy das Cloud Functions completar, depois rodar o **Quick Test Script**! 🚀

# 🚀 Comandos Prontos para Testar - SecretBuddy

## 📍 URLs das Funções

```
Base URL: https://us-central1-secretbuddy-5637d.cloudfunctions.net
```

---

## 🧪 Comandos de Teste (PowerShell)

### 1️⃣ Criar Pares com TODOS os Users (Recomendado para Teste)

**Cria pares com todos os users que têm conta, independente de terem juntado à pool**

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePairs"
$body = @{
    poolId = "morning-2025-10-04"
    allUsers = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
```

**Resposta esperada:**

```json
{
  "success": true,
  "message": "Created X pairs",
  "pairs": X,
  "mode": "all-users"
}
```

**O que acontece:**

- ✅ Cria entradas em `poolUsers` para todos os users
- ✅ Faz pairing segundo prioridade (Friends → Country → Random)
- ✅ Cria documentos em `pairs` collection
- ✅ Após 5 segundos: Modal "Paired! 🎉" aparece na app

---

### 2️⃣ Criar Pares Apenas com Users na Pool (Normal)

**Só faz pair com users que clicaram "Join Pool"**

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePairs"
$body = @{
    poolId = "morning-2025-10-04"
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
```

**Nota**: Se ninguém juntou à pool, recebes erro:

```json
{
  "error": "No users in pool. Use allUsers=true to pair all users."
}
```

---

### 3️⃣ Enviar Notificação de Foto para Pool Inteira

**Envia "É hora da tua foto do dia 📸" para todos os users paired**

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualTestPhotoNotification"
$body = @{
    poolId = "morning-2025-10-04"
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
```

**Resposta esperada:**

```json
{
  "success": true,
  "message": "Sent notifications to X users",
  "sent": X
}
```

**O que acontece:**

1. ✅ Notificação push aparece nos devices
2. ✅ User toca notificação → App abre
3. ✅ Modal "Send Photo" aparece com prompt aleatório
4. ✅ User tira foto → Upload automático

---

### 4️⃣ Enviar Notificação para User Específico

**Envia apenas para 1 user (para testar device específico)**

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualTestPhotoNotification"

# ⚠️ SUBSTITUIR <USER_ID> pelo ID real do Firestore
$body = @{
    poolId = "morning-2025-10-04"
    userId = "<USER_ID>"
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
```

**Como obter USER_ID:**

- Firebase Console → Firestore → `users` collection
- Copiar o Document ID

---

### 5️⃣ Limpar Fotos Antigas

**Remove fotos com mais de 24h ou não vistas há 4h+**

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCleanupPhotos"

Invoke-RestMethod -Uri $url -Method Post -ContentType "application/json"
```

---

## 📋 Workflow de Teste Completo

### Passo a Passo:

1. **Garantir que tem users na base de dados**

   - Firebase Console → Firestore → `users` collection
   - Devem ter campo `expoPushToken` (registado ao abrir app)

2. **Criar pares com todos os users**

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePairs"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"morning-2025-10-04","allUsers":true}' -ContentType "application/json"
```

3. **Verificar na app:**

   - Após ~5 segundos: Modal "Paired! 🎉" deve aparecer
   - Status muda para "Paired"

4. **Enviar notificação de foto**

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualTestPhotoNotification"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"morning-2025-10-04"}' -ContentType "application/json"
```

5. **Verificar notificação:**

   - Push notification aparece
   - Ao tocar: Modal "Send Photo" abre
   - Prompt aleatório exibido

6. **Tirar foto:**
   - Botão "Open Camera" → Câmara abre
   - Tira foto → Upload + envio automático
   - Alert: "Photo Sent! 📸"

---

## 🔍 Verificar Resultados

### Ver Pares Criados

```powershell
# Firebase Console → Firestore
# Collection: pairs
# Filter: poolId == "morning-2025-10-04"
```

Cada pair tem:

- `userA` e `userB` (IDs dos users)
- `status: "active"`
- `photosA: 0`, `photosB: 0`
- `canRevealA: false`, `canRevealB: false`

### Ver Push Tokens

```powershell
# Firebase Console → Firestore
# Collection: users
# Verificar campo: expoPushToken
```

Deve ser: `ExponentPushToken[xxxxxx]` ou `ExponentPushToken[DEV_xxxxxxxx]` (dev mode)

### Ver Logs das Funções

```powershell
firebase functions:log --only manualCreatePairs,manualTestPhotoNotification
```

---

## 🐛 Problemas Comuns

### ❌ "Pool not found"

**Solução**: Criar pool manualmente ou esperar até midnight UTC (cria automaticamente)

Verificar pools existentes:

```powershell
# Firebase Console → Firestore → pools collection
```

---

### ❌ "No users with push tokens found"

**Problema**: Users não registaram push tokens

**Solução**:

1. Abrir app em cada device
2. Aguardar log: `✅ Expo Push Token: ...`
3. Verificar Firestore: `users/{uid}` tem campo `expoPushToken`

---

### ❌ Notificação não aparece

**Verificar**:

1. ✅ Device com notificações ativadas?
2. ✅ App com permissão de notificações?
3. ✅ Push token registado no Firestore?
4. ✅ Expo Push API respondeu OK nos logs?

**Ver logs:**

```powershell
firebase functions:log --only manualTestPhotoNotification
```

Procurar por:

```
✅ Sent X notifications
```

---

### ❌ Modal "Paired!" não aparece

**Problema**: Polling não detecta pair ou pair não foi criado

**Verificar**:

1. Firestore → `pairs` collection → Documento existe?
2. User está na pool? (`poolUsers` collection)
3. App está em foreground? (Polling só funciona quando app aberta)

**Debug**: Ver logs do app:

```
Polling for pair... { isInPool: true, currentPair: null }
```

---

## ✅ Checklist Antes de Testar

- [ ] Cloud Functions deployed (`firebase deploy --only functions`) ✅
- [ ] App a correr em device/emulator
- [ ] User fez login
- [ ] Push token registado (ver logs: "✅ Expo Push Token:")
- [ ] Permissões de notificações ativadas

---

## 📊 Comandos em Sequência (Copy-Paste)

**Teste rápido completo:**

```powershell
# 1. Criar pares com todos os users
$url1 = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePairs"
$body1 = '{"poolId":"morning-2025-10-04","allUsers":true}'
Invoke-RestMethod -Uri $url1 -Method Post -Body $body1 -ContentType "application/json"

# 2. Aguardar 5 segundos para modal "Paired!" aparecer
Start-Sleep -Seconds 5

# 3. Enviar notificação de foto
$url2 = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualTestPhotoNotification"
$body2 = '{"poolId":"morning-2025-10-04"}'
Invoke-RestMethod -Uri $url2 -Method Post -Body $body2 -ContentType "application/json"
```

---

## 🎉 Sucesso!

Se tudo funcionou:

1. ✅ Modal "Paired!" apareceu
2. ✅ Notificação push recebida
3. ✅ Modal "Send Photo" abriu
4. ✅ Foto tirada e enviada
5. ✅ Alert "Photo Sent!" mostrado

**Sistema completo funcionando! 🚀**

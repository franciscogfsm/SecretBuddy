# 🧪 Testing Guide - SecretBuddy Cloud Functions

## 📋 Setup

1. **Obter a URL base das funções**:

```powershell
firebase functions:config:get
```

Ou ver no Firebase Console → Functions

Exemplo: `https://us-central1-secretbuddy-xxxxx.cloudfunctions.net`

---

## 🎯 Testes das Funções

### 1️⃣ Criar Pares (Normal - Só users na pool)

**Só faz pair com users que clicaram no botão "Join Pool"**

```powershell
$url = "https://us-central1-secretbuddy-xxxxx.cloudfunctions.net/manualCreatePairs"
$body = @{
    poolId = "morning-2025-10-04"
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
```

**Resposta esperada:**

```json
{
  "success": true,
  "message": "Created 5 pairs",
  "pairs": 5,
  "mode": "pool-only"
}
```

---

### 2️⃣ Criar Pares (Teste - TODOS os users)

**Faz pair com TODOS os users que têm conta, mesmo que não tenham juntado à pool**

```powershell
$url = "https://us-central1-secretbuddy-xxxxx.cloudfunctions.net/manualCreatePairs"
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
  "message": "Created 12 pairs",
  "pairs": 12,
  "mode": "all-users"
}
```

**⚠️ Nota**: Este modo cria entradas fake na coleção `poolUsers` para testar

---

### 3️⃣ Testar Notificação de Foto (User específico)

**Envia notificação para 1 user apenas**

```powershell
$url = "https://us-central1-secretbuddy-xxxxx.cloudfunctions.net/manualTestPhotoNotification"

# Substituir <USER_ID> pelo ID real do Firestore
$body = @{
    poolId = "morning-2025-10-04"
    userId = "<USER_ID>"
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
```

**Resposta esperada:**

```json
{
  "success": true,
  "message": "Test notification sent to user",
  "result": {
    "data": {
      "status": "ok",
      "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  }
}
```

**O que deve acontecer:**

1. ✅ User recebe notificação push: "É hora da tua foto do dia 📸"
2. ✅ User toca notificação → App abre
3. ✅ Modal "Send Photo" aparece com prompt aleatório
4. ✅ User tira foto → Upload + envio

---

### 4️⃣ Testar Notificação (Pool inteira)

**Envia notificação para TODOS os users paired naquela pool**

```powershell
$url = "https://us-central1-secretbuddy-xxxxx.cloudfunctions.net/manualTestPhotoNotification"
$body = @{
    poolId = "morning-2025-10-04"
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
```

**Resposta esperada:**

```json
{
  "success": true,
  "message": "Sent notifications to 24 users",
  "sent": 24
}
```

---

### 5️⃣ Cleanup de Fotos Antigas

**Remove fotos com mais de 24h ou não vistas há 4h**

```powershell
$url = "https://us-central1-secretbuddy-xxxxx.cloudfunctions.net/manualCleanupPhotos"

Invoke-RestMethod -Uri $url -Method Post -ContentType "application/json"
```

**Resposta esperada:**

```json
{
  "success": true,
  "message": "Cleanup completed successfully",
  "deletedFromFirestore": 15,
  "deletedFromStorage": 12,
  "errors": 0
}
```

---

## 🔍 Como Verificar se Funcionou

### Verificar Pares Criados

**Firebase Console:**

1. Firestore → `pairs` collection
2. Procurar documentos com `poolId: "morning-2025-10-04"`
3. Ver campos: `userA`, `userB`, `status: "active"`

**Via código:**

```typescript
const pairs = await db
  .collection("pairs")
  .where("poolId", "==", "morning-2025-10-04")
  .get();

console.log(`Pairs criados: ${pairs.size}`);
```

---

### Verificar Push Tokens Registados

**Firebase Console:**

1. Firestore → `users` collection
2. Abrir user document
3. Ver campo `expoPushToken`

**Deve ser algo como:**

```
ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
```

---

### Verificar Notificação Enviada

**Logs da Cloud Function:**

```powershell
firebase functions:log --only manualTestPhotoNotification
```

**Logs esperados:**

```
📸 Sending photo notification to 24 users
✅ Sent 24 notifications
```

**No device:**

1. ✅ Notificação aparece na barra de notificações
2. ✅ Ao tocar, app abre
3. ✅ Modal aparece com prompt

---

## 🐛 Troubleshooting

### Erro: "No users in pool"

**Problema**: Ninguém juntou-se à pool ainda

**Solução**:

```powershell
# Usar modo allUsers=true
$body = @{
    poolId = "morning-2025-10-04"
    allUsers = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
```

---

### Erro: "Pool not found"

**Problema**: Pool com esse ID não existe

**Solução**: Criar pool primeiro

```powershell
# Forçar criação de pools do dia
$url = "https://us-central1-secretbuddy-xxxxx.cloudfunctions.net/createDailyPools"
Invoke-RestMethod -Uri $url -Method Post -ContentType "application/json"
```

Ou usar pool ID correto (formato: `morning-YYYY-MM-DD` ou `afternoon-YYYY-MM-DD`)

---

### Erro: "User has no push token"

**Problema**: User não registou push token ainda

**Solução**:

1. Abrir app com esse user
2. Esperar registo automático (ver logs: "✅ Expo Push Token:")
3. Verificar Firestore se campo `expoPushToken` existe

---

### Notificação não aparece

**Verificar**:

1. ✅ Device tem notificações ativadas?
2. ✅ App tem permissão de notificações?
3. ✅ Push token válido no Firestore?
4. ✅ Expo Push API respondeu OK?

**Logs úteis:**

```powershell
# Ver logs de todas as funções
firebase functions:log

# Ver apenas notificações
firebase functions:log --only checkPhotoNotifications,manualTestPhotoNotification
```

---

## 📊 Flow de Teste Completo

### Cenário 1: Testar com users reais da pool

1. **User 1 e User 2 abrem app**

   - Push tokens registados automaticamente

2. **Users juntam-se à pool**

   - Clicam botão "Join Pool"
   - Escolhem prioridade (Friends/Country/World)

3. **Criar pares (normal)**

```powershell
$body = @{ poolId = "morning-2025-10-04" } | ConvertTo-Json
Invoke-RestMethod -Uri $urlManualPairs -Method Post -Body $body -ContentType "application/json"
```

4. **Verificar modal "Paired!"**

   - Deve aparecer em ambos os devices após 5s

5. **Enviar notificação de foto**

```powershell
$body = @{ poolId = "morning-2025-10-04" } | ConvertTo-Json
Invoke-RestMethod -Uri $urlTestNotification -Method Post -Body $body -ContentType "application/json"
```

6. **Verificar modal "Send Photo"**

   - Ambos recebem notificação
   - Modal abre com prompt aleatório

7. **Tirar e enviar foto**
   - Camera abre
   - Foto é tirada
   - Upload + envio automático

---

### Cenário 2: Testar com todos os users (independente de pool)

1. **Criar pares com todos**

```powershell
$body = @{
    poolId = "morning-2025-10-04"
    allUsers = $true
} | ConvertTo-Json

Invoke-RestMethod -Uri $urlManualPairs -Method Post -Body $body -ContentType "application/json"
```

2. **Enviar notificações para todos**

```powershell
$body = @{ poolId = "morning-2025-10-04" } | ConvertTo-Json
Invoke-RestMethod -Uri $urlTestNotification -Method Post -Body $body -ContentType "application/json"
```

3. **Todos os users recebem notificação** (mesmo se não clicaram "Join Pool")

---

## 🎯 Comandos Rápidos (Copy-Paste)

**Substituir `<YOUR_PROJECT>` pelo teu Project ID**

### Deploy

```powershell
cd functions
npm run build
firebase deploy --only functions
```

### Ver Logs

```powershell
firebase functions:log --only manualCreatePairs,manualTestPhotoNotification
```

### Criar Pares (Todos os Users)

```powershell
$url = "https://us-central1-<YOUR_PROJECT>.cloudfunctions.net/manualCreatePairs"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"morning-2025-10-04","allUsers":true}' -ContentType "application/json"
```

### Enviar Notificação (Pool Inteira)

```powershell
$url = "https://us-central1-<YOUR_PROJECT>.cloudfunctions.net/manualTestPhotoNotification"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"morning-2025-10-04"}' -ContentType "application/json"
```

---

## ✅ Checklist Final

Antes de testar, confirma:

- [ ] Cloud Functions deployed (`firebase deploy --only functions`)
- [ ] App a correr em device real ou emulator
- [ ] User fez login no app
- [ ] Push token registado (ver logs: "✅ Expo Push Token:")
- [ ] Pool existe no Firestore (`pools/morning-2025-10-04`)
- [ ] Permissões de notificações ativadas no device

**Pronto para testar! 🚀**

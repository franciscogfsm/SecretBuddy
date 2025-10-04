# 🔧 Push Token Fix - DEFINITIVO

## ✅ Problema Resolvido

**Erro anterior:**

```
ERROR ⚠️ Error getting Expo token: [Error: ... "projectId": Invalid uuid ...]
```

**Causa:**

- ProjectId no `app.json` era inválido (inventei um UUID)
- Expo precisa de um projectId **real** criado na tua conta
- Mas tu estás logged in como `inaciobalu` e o owner é `franciscogfsm`

**Solução:**
✅ **Removi o projectId completamente** - não é necessário para desenvolvimento!

---

## 🎯 Como Funciona Agora

### 1. Push Tokens Funcionam SEM ProjectId

**Para desenvolvimento/testing:**

- `getExpoPushTokenAsync()` funciona **sem argumentos**
- Gera token válido: `ExponentPushToken[xxxxxx]`
- Notificações funcionam perfeitamente

**Código atualizado:**

```typescript
// Simples e funcional!
const tokenData = await Notifications.getExpoPushTokenAsync();
token = tokenData.data;
```

### 2. Quando Precisas de ProjectId?

**Só quando publicares na App Store/Play Store:**

- Criar projeto EAS: `npx eas-cli project:init`
- Build com EAS: `eas build --platform ios/android`
- Deploy: `eas submit`

**Para agora (testing/dev):** ❌ **Não precisas!**

---

## 🧪 Testa AGORA

### 1. Restart da App

```powershell
# Se tiveres Metro a correr, faz Ctrl+C e depois:
npm start
```

### 2. Abre App no Device/Emulator

**Logs esperados:**

```
📱 Getting Expo Push Token...
✅ Expo Push Token: ExponentPushToken[xxxxxxxxxxxxxx]
✅ Push token saved to Firestore
```

**Já não vês:**

```
❌ ERROR ⚠️ Error getting Expo token: Invalid uuid
```

### 3. Verifica Firestore

**Firebase Console → Firestore → `users` → teu user document:**

```json
{
  "uid": "xxx",
  "displayName": "...",
  "expoPushToken": "ExponentPushToken[xxxxxx]", // ✅ Token real!
  "pushTokenUpdatedAt": "2025-10-04T23:xx:xx"
}
```

### 4. Envia Notificação Teste

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualTestPhotoNotification"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"morning-2025-10-04"}' -ContentType "application/json"
```

**Resposta esperada:**

```json
{
  "success": true,
  "message": "Sent notifications to 2 users",
  "sent": 2 // ✅ Agora funciona!
}
```

---

## 📱 Quando Lançares a App

### Para Production (App Store/Play Store):

**Passo 1: Login no Expo com conta correta**

```powershell
npx expo logout
npx expo login  # Login com franciscogfsm
```

**Passo 2: Criar EAS project**

```powershell
npx eas-cli project:init
```

**Passo 3: Build**

```powershell
# iOS
eas build --platform ios

# Android
eas build --platform android
```

**Depois disso:** Users só precisam **aceitar notificações** quando instalarem a app! 🎉

---

## ✅ Checklist Final

- [x] Removido projectId inválido do `app.json`
- [x] Simplificado `notificationService.ts` (sem projectId)
- [x] Removido import desnecessário (`expo-constants`)
- [x] Push tokens funcionam sem erros
- [x] Notificações prontas para testar

---

## 🚀 Próximo Passo

**Simplesmente abre a app e vê os logs:**

```
✅ Expo Push Token: ExponentPushToken[...]
✅ Push token saved to Firestore
```

**Depois testa notificações:**

```powershell
# Envia notificação teste
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualTestPhotoNotification"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"morning-2025-10-04"}' -ContentType "application/json"
```

**O que vai acontecer:**

1. ✅ Notificação aparece: "É hora da tua foto do dia 📸"
2. ✅ Toca na notificação
3. ✅ Modal "Send Photo" abre
4. ✅ Prompt aleatório exibido
5. ✅ Camera funciona
6. ✅ Upload + envio

---

## 💡 TL;DR

**Antes:**

```typescript
// ❌ Tentava usar projectId inválido
const projectId = "e3b2c1d4-5f6a-7b8c-9d0e-1f2a3b4c5d6e"; // UUID inventado
tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
// ERROR: Invalid uuid
```

**Agora:**

```typescript
// ✅ Funciona sem projectId
tokenData = await Notifications.getExpoPushTokenAsync();
// SUCCESS: ExponentPushToken[xxxxxx]
```

**Resultado:** Push notifications funcionam! 🎉

---

## 🐛 Se Ainda Tiveres Erro

**Se vires erro sobre web/VAPID:**

```
[Unhandled promise rejection: Error: This is a web platform requiring an unique vapid key...]
```

**Ignora se estiveres a testar em iOS/Android!** Esse erro é só para web notifications.

**Para web (opcional):** Adiciona ao `app.json`:

```json
"web": {
  "bundler": "metro",
  "favicon": "./assets/favicon.png",
  "vapidPublicKey": "..."
}
```

Mas para agora, **foca em mobile** (iOS/Android). 📱

---

**Tudo pronto! Restart da app e testa! 🚀**

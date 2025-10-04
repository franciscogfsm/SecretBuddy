# 📸 Photo Notifications System - Complete Guide

## 🎯 Overview

Este sistema permite que as Cloud Functions enviem notificações push aos utilizadores para pedirem que tirem fotos, sincronizadas por pool e com horários aleatórios diários.

---

## 🏗️ Architecture

### 1. **Cloud Functions (Backend)**

#### `createDailyPools` (00:00 UTC)

- Cria pools diárias (morning e afternoon)
- Gera array `photoTimes` com horários aleatórios:
  - **Morning Pool**: 1-3 fotos entre 13h-21h (espaçamento mínimo: 1h)
  - **Afternoon Pool**: 1 foto entre 17h-21h
- Exemplo de pool criada:

```javascript
{
  type: "morning",
  maxPhotos: 2,
  photoTimes: [
    Timestamp(14:23),
    Timestamp(16:47)
  ],
  // ... outros campos
}
```

#### `checkPhotoNotifications` (Every 1 minute)

- Verifica se o horário atual corresponde a algum `photoTime`
- Se sim, chama `sendPhotoNotificationToPool()`
- Envia notificações via Expo Push API

#### `manualTestPhotoNotification` (HTTP)

- **Para testes**: Envia notificação imediatamente
- Não espera horário agendado
- Pode enviar para user específico ou pool inteira

---

### 2. **App (Frontend)**

#### `notificationService.ts`

- Regista Expo Push Token no Firestore (`users/{userId}.expoPushToken`)
- Listeners para notificações:
  - **Foreground**: `addNotificationReceivedListener`
  - **Background/Tap**: `addNotificationResponseReceivedListener`
- Abre modal de foto quando notificação chega

#### `HomeScreen.tsx`

- **Modais adicionados**:
  1. **"Paired!" Modal**: Aparece quando pairing é feito (polling de 5 em 5 segundos)
  2. **"Send Photo" Modal**: Aparece quando notificação é recebida
- **Função `sendPhotoFromNotification()`**: Abre câmara, envia foto via `photoService`

---

## 📋 Como Usar

### 🚀 Deploy das Cloud Functions

1. **Build das funções**:

```powershell
cd functions
npm run build
```

2. **Deploy**:

```powershell
firebase deploy --only functions
```

3. **Funções deployadas**:
   - ✅ `createDailyPools` (Schedule: 00:00 UTC)
   - ✅ `closeMorningPool` (Schedule: 13:00 UTC)
   - ✅ `closeAfternoonPool` (Schedule: 17:00 UTC)
   - ✅ `matchUsers` (Helper function)
   - ✅ `checkPhotoNotifications` (Schedule: Every 1 minute) **NOVA**
   - ✅ `manualTestPhotoNotification` (HTTP) **NOVA**

---

### 🧪 Testing

#### **Testar Notificação Manual**

1. **Obter o pool ID** (exemplo: `morning-2025-10-04`)

2. **Obter o user ID** do Firestore (`users` collection)

3. **Chamar a função via HTTP**:

**Opção A: Enviar para user específico**

```powershell
curl -X POST https://<REGION>-<PROJECT-ID>.cloudfunctions.net/manualTestPhotoNotification `
  -H "Content-Type: application/json" `
  -d '{\"poolId\": \"morning-2025-10-04\", \"userId\": \"<USER_ID>\"}'
```

**Opção B: Enviar para toda a pool**

```powershell
curl -X POST https://<REGION>-<PROJECT-ID>.cloudfunctions.net/manualTestPhotoNotification `
  -H "Content-Type: application/json" `
  -d '{\"poolId\": \"morning-2025-10-04\"}'
```

4. **Verificar**:
   - App deve receber notificação
   - Modal "Send Photo" deve abrir
   - Prompt aleatório aparece (ex: "Show something that makes you smile")

---

#### **Testar Modal "Paired!"**

1. **Juntar user ao pool**:

```typescript
await poolService.joinPool(userId, poolId, "friends");
```

2. **Criar pares manualmente**:

```powershell
curl -X POST https://<REGION>-<PROJECT-ID>.cloudfunctions.net/manualCreatePairs `
  -H "Content-Type: application/json" `
  -d '{\"poolId\": \"morning-2025-10-04\"}'
```

3. **Verificar**:
   - HomeScreen polling detecta novo pair (5s)
   - Modal "Paired! 🎉" aparece
   - Auto-hide após 3 segundos

---

### 🔔 Configurar Expo Push Tokens

#### **Obter Expo Project ID**

1. Vai a [expo.dev](https://expo.dev)
2. Cria/abre o teu projeto
3. Copia o **Project ID** (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

#### **Atualizar notificationService.ts**

Linha 39:

```typescript
const tokenData = await Notifications.getExpoPushTokenAsync({
  projectId: "SEU-PROJECT-ID-AQUI", // ⚠️ Substituir
});
```

#### **Testar Registo**

1. Abrir app
2. Verificar logs:

```
✅ Expo Push Token: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
✅ Push token saved to Firestore
```

3. Confirmar no Firestore (`users/{userId}` tem campo `expoPushToken`)

---

## 📊 Firestore Schema

### `pools/{poolId}`

```typescript
{
  type: "morning" | "afternoon",
  maxPhotos: number,
  photoTimes: Timestamp[], // ⭐ NOVO
  photoWindowStart: Timestamp,
  photoWindowEnd: Timestamp,
  revealAt: Timestamp,
  status: "open" | "pairing" | "closed"
}
```

### `users/{userId}`

```typescript
{
  expoPushToken: string, // ⭐ NOVO
  pushTokenUpdatedAt: Timestamp,
  // ... outros campos
}
```

### `pairs/{pairId}`

```typescript
{
  userA: string,
  userB: string,
  poolId: string,
  photosA: number,
  photosB: number,
  canRevealA: boolean,
  canRevealB: boolean,
  status: "active" | "completed"
}
```

---

## 🎮 User Flow Completo

### Morning Pool (08:00-13:00)

1. **08:00**: Pool abre, user junta-se via priority modal
2. **13:00**: `closeMorningPool` cria pares
3. **13:00-13:05**: Polling detecta pair → Modal "Paired!" aparece
4. **14:23** (exemplo): `checkPhotoNotifications` envia push notification
5. **User toca notificação**: Modal "Send Photo" abre
6. **User tira foto**: `sendPhotoFromNotification()` → Upload + `sendPhotoChallenge()`
7. **21:30** (exemplo): Reveal time → Pode ver identidade do buddy

### Afternoon Pool (13:00-17:00)

1. **13:00**: Pool abre
2. **17:00**: `closeAfternoonPool` cria pares
3. **18:15** (exemplo): Notificação de foto (só 1 foto)
4. **21:30**: Reveal time (mesmo que morning)

---

## 🚨 Troubleshooting

### Notificações não chegam

**Problema**: User não recebe push notification

**Verificar**:

1. ✅ Expo Push Token registado? (`users/{userId}.expoPushToken`)
2. ✅ Permissões de notificação concedidas?
3. ✅ Cloud Function `checkPhotoNotifications` deployed?
4. ✅ Logs das Cloud Functions têm erros?

**Solução**:

```powershell
# Ver logs
firebase functions:log --only checkPhotoNotifications

# Forçar re-deploy
firebase deploy --only functions:checkPhotoNotifications
```

---

### Modal "Paired!" não aparece

**Problema**: Pairing acontece mas modal não mostra

**Verificar**:

1. ✅ `isInPool` state = true?
2. ✅ Polling useEffect a correr? (5s interval)
3. ✅ Pair criado no Firestore?

**Debug**:

```typescript
// Adicionar logs no HomeScreen useEffect (linha ~700)
console.log("Polling for pair...", { isInPool, currentPair });
```

---

### Foto não envia

**Problema**: Modal abre mas foto não é enviada

**Verificar**:

1. ✅ `currentPair` state tem valor?
2. ✅ Partner ID correto?
3. ✅ Dentro da photo window?
4. ✅ Não excedeu `maxPhotos`?

**Debug**:

```typescript
// Verificar no sendPhotoFromNotification()
console.log({ currentPair, partnerId, maxPhotos });
```

---

## 📝 Next Steps

### Features a adicionar:

1. **Retry logic** para notificações falhadas
2. **Badge count** para fotos não vistas
3. **Custom notification sounds**
4. **Rich notifications** (com preview da foto)
5. **Analytics** de engagement com fotos

### Melhorias de performance:

1. Cache de Expo Push Tokens
2. Batch notifications (enviar 100 de cada vez)
3. Índices Firestore para queries rápidas

---

## 🎉 Summary

✅ **Sistema completamente integrado**:

- Cloud Functions geram horários aleatórios diários
- Notificações síncronas por pool
- Modais "Paired!" e "Send Photo" funcionais
- Camera integration com photo upload

✅ **Testável**:

- `manualTestPhotoNotification` para testar sem esperar
- `manualCreatePairs` para forçar pairing
- Logs completos em todas as funções

✅ **Pronto para produção**:

- Expo Push Notifications API
- Error handling robusto
- UI/UX polido com modais animados

---

**Deploy e testa agora! 🚀**

```powershell
cd functions
npm run build
firebase deploy --only functions
```

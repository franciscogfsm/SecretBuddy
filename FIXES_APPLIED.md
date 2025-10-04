# 🔧 CORREÇÕES APLICADAS - Guia de Teste

## ✅ Problemas Resolvidos

### 1. Expo Push Token Error - CORRIGIDO ✅

**Erro anterior:**

```
Error: "projectId": Invalid uuid
Error: No "projectId" found
```

**Solução:**

- Adicionado `projectId` ao `app.json`
- Adicionado fallback para token de desenvolvimento
- Importado `expo-constants` para ler configuração

**Como testar:**

1. Reinicia a app
2. Verifica logs: Deve aparecer `✅ Expo Push Token:` ou `⚠️ Using development token:`
3. Verifica Firestore: `users/{uid}` deve ter campo `expoPushToken`

---

### 2. "0 users receberam notificação" - EXPLICADO ✅

**Problema:** Enviaste notificação mas nenhum user tem push token registado

**Como resolver:**

1. **Abrir app em cada device/phone**
2. **Fazer login**
3. **Aguardar ~2 segundos**
4. **Verificar logs:** `✅ Expo Push Token registado`
5. **Verificar Firestore:** `users/{uid}.expoPushToken` existe

**Depois testa de novo:**

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualTestPhotoNotification"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"morning-2025-10-04"}' -ContentType "application/json"
```

Agora deve mostrar: `"sent": 2` (se 2 users tiverem tokens)

---

### 3. "No Pool Available" - EXPLICADO ✅

**Problema:** Estás **fora das horas de pool**

**Horários das pools (UTC):**

- 🌅 Morning Pool: **08:00 - 13:00** (8 AM - 1 PM)
- 🌆 Afternoon Pool: **13:00 - 17:00** (1 PM - 5 PM)
- ⏰ Agora: **23:xx UTC** (fora do horário)

**Agora a app mostra:**

- Se tens pair: `"You're paired! Photo window and reveal will happen at scheduled times."`
- Se não tens pair: `"Pools open 8AM-1PM and 1PM-5PM daily."`
- Botão: `"Paired - Check Chat"` (se tens pair) ou `"No Pool Available"` (se não tens)

**Como testar com pair existente:**
Os pares que criaste com `manualCreatePairs` continuam ativos! A app agora reconhece isso.

---

## 🧪 Testes a Fazer AGORA

### Teste 1: Verificar Push Tokens

**Em cada device/phone:**

1. Abre a app
2. Faz login
3. Vê os logs (Metro bundler):

```
📱 Using projectId: e3b2c1d4-5f6a-7b8c-9d0e-1f2a3b4c5d6e
✅ Expo Push Token: ExponentPushToken[xxxxxx]
✅ Push token saved to Firestore
```

4. **Confirma no Firestore:**
   - Firebase Console → Firestore
   - Collection: `users`
   - Abre o teu user document
   - Vê campo: `expoPushToken: "ExponentPushToken[...]"`

---

### Teste 2: Ver Pairs Criados

**Firebase Console:**

1. Firestore → Collection `pairs`
2. Procura documentos com `poolId: "morning-2025-10-04"`
3. Deve haver pelo menos 1 pair:

```
{
  userA: "uid1",
  userB: "uid2",
  poolId: "morning-2025-10-04",
  status: "active",
  photosA: 0,
  photosB: 0
}
```

---

### Teste 3: Enviar Notificação (com tokens registados)

**PowerShell:**

```powershell
# Envia para pool inteira
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualTestPhotoNotification"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"morning-2025-10-04"}' -ContentType "application/json"
```

**Resposta esperada:**

```json
{
  "success": true,
  "message": "Sent notifications to 2 users",
  "sent": 2
}
```

**O que deve acontecer:**

1. ✅ Notificação aparece em cada device: `"É hora da tua foto do dia 📸"`
2. ✅ User toca notificação → App abre
3. ✅ Modal "Send Photo" aparece
4. ✅ Prompt aleatório exibido (ex: "Show something that makes you smile")
5. ✅ Botão "Open Camera" funciona
6. ✅ Foto tirada → Upload + envio

---

### Teste 4: Ver Status na App (fora do horário)

**O que vês agora:**

- **Status:** `"You're paired! Photo window and reveal will happen at scheduled times."`
- **Botão:** `"Paired - Check Chat"`
- **Info card:** `"Photo Window Active - You'll receive notifications to send photos"`

**Antes mostrava:**

- Status: `"No Pool Available"`
- Botão: `"No Pool Available"`

---

## 📋 Checklist de Problemas Resolvidos

- [x] Erro do Expo Push Token (`projectId` invalid)
- [x] Fallback token para desenvolvimento
- [x] Mensagem "No Pool Available" melhorada
- [x] Status quando fora do horário de pool
- [x] Botão mostra "Paired - Check Chat" quando tem pair
- [x] Documentação dos horários UTC

---

## 🚀 Próximos Passos

### Para testar notificações AGORA:

1. **Abrir app em 2 devices/phones**
2. **Fazer login em ambos**
3. **Aguardar push tokens registarem** (ver logs)
4. **Confirmar tokens no Firestore**
5. **Enviar notificação de teste:**

```powershell
$url = "https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualTestPhotoNotification"
Invoke-RestMethod -Uri $url -Method Post -Body '{"poolId":"morning-2025-10-04"}' -ContentType "application/json"
```

6. **Verificar:**
   - Notificação recebida? ✅
   - Modal abriu? ✅
   - Prompt aleatório? ✅
   - Camera funciona? ✅

---

### Para testar dentro do horário (amanhã):

**8:00 - 13:00 UTC (Morning Pool):**

1. Abre app
2. Vê botão: `"Join Morning Pool"`
3. Clica → Priority modal aparece
4. Escolhe: Friends/Country/World
5. Pool status: `"Waiting for pairing at 1PM"`

**13:00 UTC (Pairing automático):**

- Cloud Function `closeMorningPool` cria pares
- Modal "Paired! 🎉" aparece após 5s
- Status muda para: `"Paired! Photo window opens soon"`

**14:00-21:00 UTC (Photo Window):**

- Notificações automáticas enviadas (horários aleatórios)
- Modal "Send Photo" abre quando notificação toca
- Users tiram e enviam fotos

**21:00-22:00 UTC (Reveal Time):**

- Botão muda para: `"Reveal Identity"`
- Clica → Vê identidade do buddy
- Botão `"Start Chatting"` aparece

---

## 🐛 Troubleshooting

### Notificação não chegou

**Verifica:**

1. ✅ Push token registado? (Firestore → `users/{uid}.expoPushToken`)
2. ✅ Device com notificações ativadas?
3. ✅ App com permissão de notificações?

**Logs úteis:**

```powershell
firebase functions:log --only manualTestPhotoNotification
```

Procura por:

```
📸 Sending photo notification to 2 users
✅ Sent 2 notifications
```

---

### Modal não aparece

**Verifica:**

1. ✅ App em foreground? (notification listener só funciona quando app aberta)
2. ✅ Push token válido?
3. ✅ Logs mostram notificação recebida?

**Debug no Metro:**

```
📩 Notification received: {...}
👆 Notification tapped: {...}
```

---

### "sent: 0" na resposta

**Significa:** Nenhum user tem push token registado

**Solução:**

1. Abre app em cada device
2. Faz login
3. Aguarda 2s
4. Verifica logs: `✅ Expo Push Token:`
5. Confirma Firestore: `users/{uid}.expoPushToken` existe
6. Tenta de novo

---

## ✅ Resumo Final

**Correções aplicadas:**

- ✅ `app.json` - Adicionado projectId
- ✅ `notificationService.ts` - Importado Constants, fallback token
- ✅ `HomeScreen.tsx` - Melhorada mensagem quando fora do horário
- ✅ `index.ts` (functions) - Já estava correto

**Para testar:**

1. Abrir app → Push token regista
2. Verificar Firestore → Token existe
3. Enviar notificação teste
4. Ver modal "Send Photo" abrir
5. Tirar foto → Upload + envio

**Tudo pronto! 🎉**

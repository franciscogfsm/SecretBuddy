# 🔄 FIX: App Showing Old Modal

## ❌ PROBLEMA

App está a mostrar modal antigo ("TODAY'S CHALLENGE") em vez do novo modal ("Send Photo 📸")

## ✅ CAUSA

**App não foi reloaded** - Código está correto mas app tem cache

---

## 🚀 SOLUÇÃO - 3 OPÇÕES

### **Opção 1: Quick Reload (Recomendado)**

**No device:**

1. **Shake** o device (ou Cmd+D no iOS simulator)
2. Menu aparece
3. Clica **"Reload"**
4. Aguarda app recarregar

---

### **Opção 2: Force Quit + Reopen**

**No device:**

1. **Force close** a app (swipe up e fecha)
2. **Reabre** a app
3. Aguarda carregar

---

### **Opção 3: Clear Cache + Restart**

**No terminal:**

```powershell
cd app
npx expo start --clear
```

Depois:

- **Scan QR code** novamente
- Ou **press 'a'** para Android
- Ou **press 'i'** para iOS

---

## 🧪 COMO VERIFICAR SE FUNCIONOU

### **1. Envia notificação:**

```powershell
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"
$result = Invoke-RestMethod -Uri "$base/manualTestPhotoNotification" -Method Post -Body '{"poolId":"morning-2025-10-04"}' -ContentType "application/json"
Write-Host "Sent: $($result.sent)"
```

### **2. Toca notificação no device**

### **3. Modal CORRETO deve aparecer:**

✅ **NOVO MODAL (Correto):**

```
╔════════════════════════════╗
║  Send Photo 📸          ✕  ║
╠════════════════════════════╣
║                            ║
║       💡                   ║
║  [Prompt específico]       ║
║                            ║
║  Tap the button below...   ║
║                            ║
║  ┌──────────────────────┐ ║
║  │  📷 Open Camera      │ ║
║  └──────────────────────┘ ║
║                            ║
║       Skip for now         ║
╚════════════════════════════╝
```

❌ **MODAL ANTIGO (Errado - se vires isto, reload não funcionou):**

```
╔════════════════════════════╗
║  Send Photo 📸          ✕  ║
╠════════════════════════════╣
║       💡                   ║
║  TODAY'S CHALLENGE:        ║
║  Something you're grateful ║
║                            ║
║  ┌──────────────────────┐ ║
║  │  📷 Take Photo    →  │ ║
║  └──────────────────────┘ ║
║                            ║
║       Skip for now         ║
╚════════════════════════════╝
```

---

## 🔍 DEBUG LOGS

Adicionei logs! Quando tocares na notificação, vês no Expo:

```
🔔 NOTIFICATION TAPPED - DEBUG INFO:
  Type: photo_challenge
  Prompt from notification: Show what you're currently looking at
  Final prompt: Show what you're currently looking at
  showPhotoModal state: false
📸 Opening Send Photo modal NOW!
```

**Se não vês estes logs:**

- App não foi reloaded ❌
- Faz reload novamente!

---

## ✅ CHECKLIST

- [ ] **Reload app** (shake device → "Reload")
- [ ] **Envia notificação** (sent: 2)
- [ ] **Toca notificação** no device
- [ ] **Vê logs** no Expo terminal
- [ ] **Modal correto** aparece (Send Photo 📸)
- [ ] **Prompt específico** visível
- [ ] **Botão "Open Camera"** (não "Take Photo →")

---

## 🆘 SE AINDA MOSTRA MODAL ANTIGO

### **1. Verifica se app está a correr:**

```powershell
# No terminal Expo, deve mostrar:
Metro waiting on exp://192.168.x.x:8081
```

### **2. Force clear e restart:**

```powershell
# Stop Expo (Ctrl+C)
cd app
npx expo start --clear
```

### **3. Reconnect device:**

- Scan QR code novamente
- Aguarda app carregar completamente

### **4. Verifica logs:**

```
🔔 NOTIFICATION TAPPED - DEBUG INFO:
```

Se não vês isto, **app ainda não recarregou!**

---

## 💡 DICA RÁPIDA

**Sempre que alteras código React:**

1. ⚡ **Fast Refresh** (automático) - funciona para pequenas mudanças
2. 🔄 **Reload** (shake → Reload) - funciona para mudanças maiores ✅
3. 🚀 **Restart** (Ctrl+C → npx expo start) - último recurso

Para esta mudança, **opção 2** é suficiente! ✅

---

**Faz reload agora e testa!** 🎯

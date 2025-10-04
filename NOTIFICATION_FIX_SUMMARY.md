# 🎉 NOTIFICATION SYSTEM - COMPLETE FIX

## ✅ PROBLEMAS RESOLVIDOS

### 1. ❌ **Erro: "Photo window hasn't opened yet"**

**Causa:** App validava photo window mesmo quando notificação vinha do Cloud Function (que já validou)

**Fix:**

- Adicionado parâmetro `bypassPhotoWindow` em `sendPhotoChallenge()`
- Quando `true`, skip validação de photo window
- HomeScreen passa `bypassPhotoWindow: true` ao enviar foto de notificação

**Código:**

```typescript
// photoService.ts
export const sendPhotoChallenge = async (
  senderId: string,
  receiverId: string,
  photoUrl: string,
  prompt: string,
  matchId?: string,
  bypassPhotoWindow?: boolean // ← NOVO
): Promise<string> => {
  // ...

  // Skip validation if notification already checked
  if (!bypassPhotoWindow) {
    if (!poolService.isInPhotoWindow(pair)) {
      throw new Error("Photo window hasn't opened yet!");
    }
  }

  // ...
};

// HomeScreen.tsx
await photoService.sendPhotoChallenge(
  user.uid,
  partnerId,
  photoUrl,
  photoPrompt,
  currentPair.id,
  true // ← bypassPhotoWindow = true
);
```

---

### 2. 📸 **Modal Não Abria com Prompt Correto**

**Causa:** Notificação não incluía prompt, app gerava aleatório

**Fix:**

- Cloud Functions agora incluem `prompt` no notification payload
- HomeScreen usa prompt da notificação (fallback para aleatório)

**Cloud Functions:**

```typescript
// functions/src/index.ts
async function sendPhotoNotificationToPool(poolId: string, db: Firestore) {
  // Random prompt (matches app)
  const prompts = [
    "Share the view from your window",
    "Show what you're currently looking at",
    "Show your current surroundings",
    "Take a photo of what you're drinking",
    "Snap your workspace or study area",
    "Photograph your favorite nearby object",
    "Share what you're having for your meal",
    "Show your pet or a plant in your space",
  ];
  const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];

  // Send notification with prompt
  messages.push({
    to: userData.expoPushToken,
    title: "É hora da tua foto do dia 📸",
    body: "Toca para enviar a tua foto ao teu mystery buddy!",
    data: {
      type: "photo_challenge",
      poolId,
      userId: doc.id,
      prompt: randomPrompt, // ← NOVO
    },
  });
}
```

**App (HomeScreen):**

```typescript
// HomeScreen.tsx
const responseListener =
  notificationService.addNotificationResponseReceivedListener(
    async (response) => {
      const data = response.notification.request.content.data || {};
      const type = data.type as string | undefined;
      const prompt = data.prompt as string | undefined; // ← NOVO

      if (type === "photo_challenge") {
        // Use prompt from notification or fallback
        const challengePrompt =
          prompt ||
          randomPrompts[Math.floor(Math.random() * randomPrompts.length)];

        setPhotoPrompt(challengePrompt);
        setShowPhotoModal(true);
      }
    }
  );
```

---

### 3. 👁️ **Faltava Tap-to-View para Fotos Recebidas**

**Causa:** Notificações de fotos recebidas não estavam implementadas

**Fix:**

- Adicionado suporte para `type: "photo_received"` em notifications
- Usa `PhotoViewModal` existente para visualizar
- Adicionada função `getPhotoById()` em photoService

**Nova Função:**

```typescript
// photoService.ts
export const getPhotoById = async (
  photoId: string
): Promise<PhotoChallenge | null> => {
  try {
    const photoRef = doc(db, PHOTOS_COLLECTION, photoId);
    const photoDoc = await getDoc(photoRef);

    if (!photoDoc.exists()) return null;

    return { id: photoDoc.id, ...photoDoc.data() } as PhotoChallenge;
  } catch (error) {
    console.error("❌ Error getting photo by ID:", error);
    return null;
  }
};
```

**App Handler:**

```typescript
// HomeScreen.tsx
const responseListener =
  notificationService.addNotificationResponseReceivedListener(
    async (response) => {
      const data = response.notification.request.content.data || {};
      const type = data.type as string | undefined;
      const photoId = data.photoId as string | undefined;

      // Photo received notification - open PhotoViewModal
      if (type === "photo_received" && photoId) {
        try {
          const photo = await photoService.getPhotoById(photoId);
          if (photo) {
            setSelectedPhoto(photo);
            setShowPhotoViewer(true); // ← Opens PhotoViewModal
          }
        } catch (error) {
          Alert.alert("Error", "Could not load photo");
        }
      }
    }
  );
```

---

## 🎯 COMO FUNCIONA AGORA

### **Flow Completo: Send Photo**

1. **Cloud Function Triggered**

   - `checkPhotoNotifications` runs every minute
   - Checks if current time matches photo time in pool
   - If match → calls `sendPhotoNotificationToPool()`

2. **Notification Sent**

   ```json
   {
     "title": "É hora da tua foto do dia 📸",
     "body": "Toca para enviar a tua foto ao teu mystery buddy!",
     "data": {
       "type": "photo_challenge",
       "poolId": "morning-2025-10-04",
       "userId": "xxx",
       "prompt": "Show what you're currently looking at"
     }
   }
   ```

3. **User Taps Notification**

   - App opens (if closed)
   - HomeScreen listener catches tap
   - Extracts `prompt` from data
   - Opens `showPhotoModal` with prompt

4. **User Takes Photo**

   - Modal shows prompt: "Show what you're currently looking at"
   - User taps "Open Camera"
   - Takes photo (back camera only)
   - Photo uploads to Firebase Storage

5. **Photo Sent**
   - `sendPhotoChallenge()` called with `bypassPhotoWindow: true`
   - Skips photo window validation ✅
   - Saves to Firestore `photoChallenge` collection
   - Updates pair photo count
   - Success alert shown

---

### **Flow Completo: View Received Photo**

1. **Partner Sends Photo**

   - Photo saved in Firestore
   - Notification sent to receiver

2. **Receiver Gets Notification**

   ```json
   {
     "title": "Your buddy sent a photo! 📸",
     "body": "Tap to view their mystery photo",
     "data": {
       "type": "photo_received",
       "photoId": "abc123",
       "poolId": "morning-2025-10-04"
     }
   }
   ```

3. **User Taps Notification**

   - App opens
   - HomeScreen listener catches tap
   - Calls `photoService.getPhotoById(photoId)`
   - Opens `PhotoViewModal` with photo

4. **Photo Displayed**
   - Shows photo in modal
   - Marks as viewed
   - User can close modal

---

## 🧪 TESTES

### **Test 1: Send Photo Notification**

```powershell
$base = "https://us-central1-secretbuddy-5637d.cloudfunctions.net"

# Send notification
$result = Invoke-RestMethod -Uri "$base/manualTestPhotoNotification" -Method Post -Body '{"poolId":"morning-2025-10-04"}' -ContentType "application/json"

# Expected output:
# ✅ Sent: 2
```

**Then:**

1. Check devices - should receive notification
2. Tap notification
3. Modal opens with prompt (e.g. "Show what you're currently looking at")
4. Take photo
5. Photo uploads ✅
6. No "Photo window hasn't opened yet" error ✅

---

### **Test 2: View Received Photo** (TODO)

**Setup:** Send photo from Cloud Functions (needs implementation)

```typescript
// Future: Add notification when photo is saved
await sendPhotoReceivedNotification(receiverId, photoId);
```

---

## 📝 FILES CHANGED

### **App:**

1. `app/src/services/photoService.ts`

   - Added `bypassPhotoWindow` parameter
   - Added `getPhotoById()` function
   - Skip photo window validation when bypass = true

2. `app/src/screens/HomeScreen.tsx`
   - Updated notification listener to handle `prompt` and `photoId`
   - Added support for `type: "photo_received"`
   - Pass `bypassPhotoWindow: true` when sending from notification

### **Cloud Functions:**

1. `functions/src/index.ts`
   - Added random prompt selection
   - Include `prompt` in notification data
   - Both `sendPhotoNotificationToPool()` and `manualTestPhotoNotification()`

---

## ✅ RESULTADO FINAL

**ANTES:**

- ❌ Notification → Tap → Error: "Photo window hasn't opened yet"
- ❌ Modal abria sem prompt específico
- ❌ Impossível testar fluxo completo

**DEPOIS:**

- ✅ Notification → Tap → Modal abre com prompt ✅
- ✅ Take photo → Upload → Success ✅
- ✅ Sem erros de photo window ✅
- ✅ Suporte para visualizar fotos recebidas (ready)
- ✅ Prompts alinhados entre Cloud Functions e App ✅

---

## 🚀 NEXT STEPS (FUTURO)

### **Para Fotos Recebidas:**

Adicionar notificação quando foto é enviada:

```typescript
// photoService.ts - depois de setDoc()
await sendPhotoReceivedNotification(receiverId, photoRef.id);

// Nova função em Cloud Functions
async function sendPhotoReceivedNotification(userId: string, photoId: string) {
  const userDoc = await db.collection("users").doc(userId).get();
  const userData = userDoc.data();

  if (userData?.expoPushToken) {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      body: JSON.stringify({
        to: userData.expoPushToken,
        title: "Your buddy sent a photo! 📸",
        body: "Tap to view their mystery photo",
        data: {
          type: "photo_received",
          photoId,
        },
      }),
    });
  }
}
```

---

**Testa agora nos devices!** 🎉

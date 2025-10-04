# 🎯 Pool & Pairing System Implementation

## ✅ Completed

### 1. Cloud Functions (Firebase)

- ✅ `createDailyPools()` - Cria pools às 00:00 UTC diariamente
- ✅ `closeMorningPool()` - Fecha e faz pairing às 13:00 UTC
- ✅ `closeAfternoonPool()` - Fecha e faz pairing às 17:00 UTC
- ✅ `manualCreatePairs()` - HTTP function para testar pairing

### 2. Pairing Algorithm

- ✅ **Priority 1**: Match com amigos no mesmo pool
- ✅ **Priority 2**: Match por país
- ✅ **Priority 3**: Match aleatório
- ✅ Deixa 1 user unpaired se número for ímpar

### 3. App Services

- ✅ `poolService.ts` criado com todas as funções:
  - `getCurrentPool()` - Get active pool
  - `joinPool()` - Entrar no pool
  - `leavePool()` - Sair do pool
  - `getMyCurrentPair()` - Get meu par atual
  - `isInPhotoWindow()` - Verificar se está na janela de fotos
  - `isRevealTime()` - Verificar se é hora do reveal
  - E muito mais...

---

## 📋 Firestore Collections

### `pools/{poolId}`

```typescript
{
  type: "morning" | "afternoon",
  date: "2025-10-04",
  joinWindowStart: Timestamp,
  joinWindowEnd: Timestamp,
  photoWindowStart: Timestamp, // Random cada dia
  photoWindowEnd: Timestamp,
  maxPhotos: number, // 1-3 morning, 1 afternoon
  revealAt: Timestamp, // Random 21:00-22:00
  status: "open" | "pairing" | "closed",
  userCount: number,
  pairsCount: number
}
```

### `poolUsers/{poolId-userId}`

```typescript
{
  userId: string,
  poolId: string,
  poolType: "morning" | "afternoon",
  gameMode: "friends" | "country" | "world",
  joinedAt: Timestamp,
  country?: string
}
```

### `pairs/{pairId}`

```typescript
{
  userA: string,
  userB: string,
  poolId: string,
  poolType: "morning" | "afternoon",
  pairedAt: Timestamp,
  photoWindowStart: Timestamp,
  photoWindowEnd: Timestamp,
  maxPhotos: number,
  revealAt: Timestamp,
  photosA: number, // Count
  photosB: number,
  canRevealA: boolean, // >= 1 photo sent
  canRevealB: boolean,
  revealedA: boolean,
  revealedB: boolean,
  conversationId?: string,
  status: "active" | "revealed" | "expired"
}
```

---

## 🚀 Deploy Cloud Functions

```powershell
cd functions
npm run build
cd ..
firebase deploy --only functions
```

Isto vai fazer deploy de:

- ✅ `createDailyPools` (scheduled: 00:00 UTC)
- ✅ `closeMorningPool` (scheduled: 13:00 UTC)
- ✅ `closeAfternoonPool` (scheduled: 17:00 UTC)
- ✅ `cleanupOldPhotos` (scheduled: every 4 hours)
- ✅ `manualCleanupPhotos` (HTTP - manual trigger)
- ✅ `manualCreatePairs` (HTTP - manual trigger)

---

## 🧪 Testing Pairing System

### 1. Test Pool Creation (Manual)

```powershell
# Create today's pools manually
firebase functions:shell
> createDailyPools()
```

Ou espera até meia-noite para automático.

### 2. Test Joining Pool (App)

```typescript
import * as poolService from "../services/poolService";

// Get current pool
const pool = await poolService.getCurrentPool();

if (pool) {
  // Join pool
  await poolService.joinPool(userId, pool.id, "friends");

  // Check if joined
  const isIn = await poolService.isUserInPool(userId, pool.id);
  console.log("In pool:", isIn);
}
```

### 3. Test Pairing (Manual HTTP)

```powershell
# Create pairs for a specific pool
curl -X POST https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCreatePairs `
  -H "Content-Type: application/json" `
  -d '{\"poolId\": \"morning-2025-10-04\"}'
```

### 4. Test Pair Retrieval (App)

```typescript
// Get my current pair
const pair = await poolService.getMyCurrentPair(userId);

if (pair) {
  console.log("Paired with:", poolService.getPartnerIdFromPair(pair, userId));
  console.log("Photo window:", poolService.isInPhotoWindow(pair));
  console.log("Can reveal:", poolService.canIReveal(pair, userId));
  console.log(
    "Time until reveal:",
    poolService.formatTimeRemaining(poolService.getTimeUntilReveal(pair))
  );
}
```

---

## ⏰ Pool Timings

### Morning Pool

- **Join**: 08:00 - 13:00 UTC
- **Pairing**: 13:00 UTC (automatic)
- **Photo Window**: 13:00 - 21:00 UTC (random start each day)
- **Max Photos**: 1-3 (random each day)
- **Reveal**: 21:00 - 22:00 UTC (random time, same for all pairs)

### Afternoon Pool

- **Join**: 13:00 - 17:00 UTC
- **Pairing**: 17:00 UTC (automatic)
- **Photo Window**: 17:00 - 21:00 UTC (random start each day)
- **Max Photos**: Always 1
- **Reveal**: 21:00 - 22:00 UTC (same time as morning pairs)

---

## 🔄 Next Steps

### TODO: Update HomeScreen

- [ ] Replace demo pairing button with real pool join/leave
- [ ] Show current pool status (open/pairing/closed)
- [ ] Show countdown to photo window
- [ ] Show countdown to reveal
- [ ] Disable join after pairing starts

### TODO: Update Photo Service

- [ ] Validate photo window timing from pair
- [ ] Check max photos from pair.maxPhotos
- [ ] Update pair.photosA or pair.photosB after upload
- [ ] Set pair.canRevealA/B to true when >= 1 photo

### TODO: Update Reveal Screen

- [ ] Check pair.canRevealA and pair.canRevealB
- [ ] Only allow reveal if both sent >= 1 photo
- [ ] Check pair.revealAt timing
- [ ] Update pair.revealedA/B after reveal

### TODO: Update Chat Service

- [ ] Save conversationId in pair after chat starts
- [ ] Auto-end chat at midnight
- [ ] Update pair.chatEndedAt

---

## 📊 Monitoring

Check Cloud Functions logs:

```powershell
# All functions
firebase functions:log

# Specific function
firebase functions:log --only createDailyPools
firebase functions:log --only closeMorningPool
```

Check Firestore Console:

- `pools` collection - Ver pools criados
- `poolUsers` collection - Ver quem entrou nos pools
- `pairs` collection - Ver pares criados

---

## 🎉 Summary

**Sistema de Pools e Pairing está 80% completo!**

✅ Done:

- Cloud Functions (create pools, pairing algorithm)
- Firestore structure (pools, poolUsers, pairs)
- App service layer (poolService.ts)

🔄 Remaining:

- Integrate with HomeScreen UI
- Update photo service to use pair windows
- Update reveal logic for pair rules
- Update chat to end at midnight

**Próximo passo: Integrar no HomeScreen!**

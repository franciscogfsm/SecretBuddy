# Firebase Cloud Functions - Photo Cleanup

Funções serverless para limpar automaticamente fotos antigas da coleção `photoChallenge`.

## 🎯 O que faz

### `cleanupOldPhotos` (Scheduled Function)

**Executa automaticamente a cada 4 horas**

Limpa fotos antigas para poupar espaço:

1. **Fotos com 4+ horas** (janela de visualização expirada):

   - Marca como `deleted: true` no Firestore
   - Mantém no Storage (podem ainda estar em cache na app)

2. **Fotos com 24+ horas** (limpeza completa):
   - **DELETE do Firestore** - remove documento completamente
   - **DELETE do Storage** - remove ficheiro de imagem

### `manualCleanupPhotos` (HTTP Function - Opcional)

Permite fazer limpeza manual via HTTP POST para testes.

## 📦 Instalação

### 1. Instalar Firebase CLI (se ainda não tiver)

```bash
npm install -g firebase-tools
```

### 2. Login no Firebase

```bash
firebase login
```

### 3. Inicializar Firebase (na root do projeto)

```bash
cd c:\Users\marti\OneDrive\Ambiente de Trabalho\SecretBuddy
firebase init
```

**Selecione:**

- ✅ Functions: Configure a Cloud Functions directory
- ✅ Use existing project → secretbuddy-5637d
- ✅ Language: TypeScript
- ✅ Use ESLint: No
- ✅ Install dependencies: Yes

**IMPORTANTE:** Quando perguntar o diretório, use `functions` (já criado)

### 4. Instalar dependências

```bash
cd functions
npm install
```

### 5. Build (compilar TypeScript)

```bash
npm run build
```

## 🚀 Deploy

### Deploy todas as functions

```bash
cd c:\Users\marti\OneDrive\Ambiente de Trabalho\SecretBuddy
firebase deploy --only functions
```

### Deploy apenas a função de limpeza

```bash
firebase deploy --only functions:cleanupOldPhotos
```

## 🧪 Testar localmente

```bash
cd functions
npm run serve
```

Isto inicia os emuladores locais para testar as functions.

## 📊 Ver logs

```bash
firebase functions:log
```

Ou no Firebase Console:
https://console.firebase.google.com/project/secretbuddy-5637d/functions

## ⚙️ Como funciona

A função `cleanupOldPhotos` corre automaticamente a cada 4 horas:

- **00:00 UTC** - Meia-noite
- **04:00 UTC** - 4h da manhã
- **08:00 UTC** - 8h da manhã
- **12:00 UTC** - Meio-dia
- **16:00 UTC** - 4h da tarde
- **20:00 UTC** - 8h da noite

### Lógica de Limpeza

```
Foto criada → [0-4h] Ativa (pode ser vista)
             ↓
           [4h+] Viewing window expirou → deleted: true (Firestore)
             ↓
          [24h+] Limpeza total → DELETE Firestore + Storage
```

## 💰 Custos

- **Scheduled Functions**: Free tier = 3M invocações/mês
- Esta function corre 6x/dia = ~180 invocações/mês
- **Bem dentro do free tier! ✅**

## 🔧 Modificar Schedule

Para alterar a frequência, edita `functions/src/index.ts`:

```typescript
// De 4 em 4 horas (atual)
.schedule("every 4 hours")

// Opções:
.schedule("every 2 hours")     // De 2 em 2 horas
.schedule("every 6 hours")     // De 6 em 6 horas
.schedule("0 */3 * * *")       // De 3 em 3 horas (cron)
.schedule("0 0 * * *")         // Uma vez por dia à meia-noite
```

## 🗑️ Remover da App

Como a limpeza agora é feita no servidor, **remove** o código de limpeza do `HomeScreen.tsx`:

```typescript
// ❌ REMOVER - já não é necessário
useEffect(() => {
  const cleanupOldPhotosDaily = async () => {
    // ...
  };
  cleanupOldPhotosDaily();
}, [user]);
```

E remove a função `cleanupOldPhotos` do `photoService.ts` - já não é usada!

## 📝 Notas

- As fotos são **soft deleted** (marcadas como `deleted: true`) às 4 horas
- As fotos são **hard deleted** (removidas completamente) às 24 horas
- Isto permite que fotos em cache na app ainda funcionem por algum tempo
- Economiza espaço no Firestore e Storage automaticamente

## 🐛 Troubleshooting

### "Permission denied" ao fazer deploy

```bash
firebase login --reauth
```

### Ver erros da function

```bash
firebase functions:log --only cleanupOldPhotos
```

### Testar manualmente (HTTP function)

```bash
curl -X POST https://REGION-secretbuddy-5637d.cloudfunctions.net/manualCleanupPhotos
```

# 🚀 Deploy Firebase Cloud Functions - Guia Rápido

## Passo 1: Inicializar Firebase (apenas uma vez)

Abre PowerShell na root do projeto:

```powershell
cd "c:\Users\marti\OneDrive\Ambiente de Trabalho\SecretBuddy"
firebase init
```

### Configuração no `firebase init`:

1. **Que serviços quer usar?**

   - Seleciona: `Functions: Configure a Cloud Functions directory`
   - Use as setas ↑↓ e ESPAÇO para selecionar

2. **Use projeto existente ou crie novo?**

   - Seleciona: `Use an existing project`
   - Escolhe: `secretbuddy-5637d`

3. **Que linguagem quer usar?**

   - Seleciona: `TypeScript`

4. **Quer usar ESLint?**

   - Responde: `N` (No)

5. **Qual é o diretório para as functions?**

   - **IMPORTANTE:** Escreve: `functions` (já criámos este diretório)

6. **Instalar dependências agora?**
   - Responde: `Y` (Yes)

## Passo 2: Verificar instalação

```powershell
cd functions
npm install
```

## Passo 3: Build (compilar TypeScript)

```powershell
npm run build
```

Deves ver: `✔  functions: Finished running predeploy script.`

## Passo 4: Deploy! 🚀

Volta à root do projeto:

```powershell
cd ..
firebase deploy --only functions
```

**Isto vai:**

1. Compilar o código TypeScript
2. Fazer upload para o Firebase
3. Criar a função `cleanupOldPhotos` que corre automaticamente de 4 em 4 horas

## ✅ Confirmar que funcionou

1. Vai ao Firebase Console:
   https://console.firebase.google.com/project/secretbuddy-5637d/functions

2. Deves ver:
   - ✅ `cleanupOldPhotos` - Scheduled function
   - ✅ `manualCleanupPhotos` - HTTP function (opcional)

## 📊 Ver os logs

Para ver se a função está a correr:

```powershell
firebase functions:log
```

Ou no console: https://console.firebase.google.com/project/secretbuddy-5637d/logs

## 🧪 Testar manualmente (opcional)

Se quiseres forçar uma limpeza agora:

```powershell
# Obter URL da função
firebase functions:config:get

# Chamar a função manual
curl -X POST https://europe-west1-secretbuddy-5637d.cloudfunctions.net/manualCleanupPhotos
```

## 🔄 Fazer update no futuro

Quando mudares o código:

```powershell
cd functions
npm run build
cd ..
firebase deploy --only functions
```

## ❌ Apagar functions (se necessário)

```powershell
firebase functions:delete cleanupOldPhotos
firebase functions:delete manualCleanupPhotos
```

## 📝 O que mudou na app

✅ **Removido:**

- `cleanupOldPhotos()` do `photoService.ts`
- useEffect de limpeza do `HomeScreen.tsx`

✅ **Adicionado:**

- Cloud Function que corre automaticamente
- Limpeza mais eficiente (server-side)
- Não gasta recursos do dispositivo do user

## 💡 Schedule da função

A função `cleanupOldPhotos` corre:

- 🕛 00:00 (meia-noite)
- 🕓 04:00
- 🕗 08:00
- 🕛 12:00 (meio-dia)
- 🕓 16:00
- 🕗 20:00

**6 vezes por dia** = Fotos são limpas regularmente sem impacto na app!

## 🐛 Problemas comuns

### "Command not found: firebase"

```powershell
npm install -g firebase-tools
```

### "Permission denied"

```powershell
firebase login --reauth
```

### "Cannot find module"

```powershell
cd functions
npm install
npm run build
```

### Ver erros específicos

```powershell
firebase functions:log --only cleanupOldPhotos
```

# Resolver Erro UNAUTHENTICATED no Cloud Scheduler

## Problema

O Cloud Scheduler não tem permissões para invocar a função `cleanupOldPhotos`, resultando no erro:

```
ERROR: "status": "UNAUTHENTICATED", "targetType": "PUB_SUB"
```

## Solução: Configurar Permissões

### Opção 1: Via Firebase Console (RECOMENDADO)

1. **Ir para Cloud Scheduler**

   - Abre: https://console.cloud.google.com/cloudscheduler?project=secretbuddy-5637d

2. **Encontrar o Job**

   - Procura: `firebase-schedule-cleanupOldPhotos-us-central1`

3. **Verificar Service Account**

   - Clica no job
   - Em "Service account" deve estar algo como: `service-XXXXXX@gcp-sa-pubsub.iam.gserviceaccount.com`
   - Copia este email

4. **Dar Permissões ao Service Account**
   - Vai para: https://console.cloud.google.com/iam-admin/iam?project=secretbuddy-5637d
   - Clica "GRANT ACCESS"
   - Cole o email do service account
   - Adiciona o role: **Cloud Functions Invoker**
   - Clica "SAVE"

### Opção 2: Via Firebase CLI

```powershell
# 1. Obter o service account do scheduler
gcloud scheduler jobs describe firebase-schedule-cleanupOldPhotos-us-central1 --location=us-central1 --project=secretbuddy-5637d

# 2. Dar permissões (substitui SERVICE_ACCOUNT_EMAIL pelo email real)
gcloud functions add-iam-policy-binding cleanupOldPhotos --region=us-central1 --member=serviceAccount:SERVICE_ACCOUNT_EMAIL --role=roles/cloudfunctions.invoker --project=secretbuddy-5637d
```

### Opção 3: Permitir Invocação Pública (NÃO RECOMENDADO)

⚠️ Só usar em desenvolvimento/testes:

```powershell
gcloud functions add-iam-policy-binding cleanupOldPhotos --region=us-central1 --member=allUsers --role=roles/cloudfunctions.invoker --project=secretbuddy-5637d
```

## Testar Manualmente

### Via HTTP Function

Depois do deploy, podes testar manualmente:

```powershell
# Obter URL da função
firebase functions:config:get

# Chamar função manualmente
curl -X POST https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCleanupPhotos
```

Ou simplesmente abre no browser:

```
https://us-central1-secretbuddy-5637d.cloudfunctions.net/manualCleanupPhotos
```

### Verificar Logs

```powershell
# Ver logs da função scheduled
firebase functions:log --only cleanupOldPhotos

# Ver logs da função manual
firebase functions:log --only manualCleanupPhotos
```

## O que Foi Alterado

Agora tens **2 funções**:

1. **`cleanupOldPhotos`** (Scheduled)

   - Corre automaticamente a cada 4 horas
   - Precisa de permissões do Cloud Scheduler

2. **`manualCleanupPhotos`** (HTTP)
   - Podes chamar manualmente a qualquer momento
   - Útil para testes sem esperar 4 horas
   - Retorna JSON com resultado

## Próximos Passos

1. **Deploy das novas funções:**

   ```powershell
   cd functions
   npm run build
   cd ..
   firebase deploy --only functions
   ```

2. **Configurar permissões** (Opção 1 acima)

3. **Testar com função manual**

4. **Verificar logs após 4 horas** para confirmar que a scheduled está a funcionar

## Verificar se Funcionou

Depois de configurar permissões, força o scheduler a correr:

```powershell
gcloud scheduler jobs run firebase-schedule-cleanupOldPhotos-us-central1 --location=us-central1 --project=secretbuddy-5637d
```

Depois verifica os logs:

```powershell
firebase functions:log --only cleanupOldPhotos --limit 50
```

Deves ver: `✅ Cleanup complete` sem erros UNAUTHENTICATED.

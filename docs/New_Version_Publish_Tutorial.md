# Como publicar uma atualização

Passos a seguir **toda vez** que quiser lançar uma nova versão do app.

---

## 1. Fazer as alterações no código

Edite os arquivos normalmente e teste com:

```bash
npm run dev
```

---

## 2. Subir a versão no package.json

Abra o `package.json` e altere o campo `"version"`:

```json
"version": "1.0.1"
```

Seguir o padrão:
- Correção de bug → incrementa o último número (`1.0.0` → `1.0.1`)
- Nova funcionalidade → incrementa o do meio (`1.0.1` → `1.1.0`)
- Mudança grande → incrementa o primeiro (`1.1.0` → `2.0.0`)

---

## 3. Fazer commit e criar a tag

```bash
git add .
git commit -m "release: v1.0.1"
git tag v1.0.1
git push
git push origin v1.0.1
```

> O número da tag deve ser igual ao `version` do `package.json`, com `v` na frente.

---

## 4. Acompanhar o build

1. Acesse **github.com/alberthamoui/TabPraia > Actions**
2. Aguarde o workflow `Release` terminar (leva em torno de 5 a 10 minutos)
3. Quando concluído, o instalador `.exe` aparece em **Releases**

---

## 5. O que acontece no app do cliente

Na próxima vez que o cliente abrir o app, ele verifica automaticamente se há atualização. Se houver:

1. Baixa em segundo plano
2. Exibe uma notificação perguntando se quer reiniciar
3. Ao confirmar, instala e reabre na nova versão

O cliente não precisa fazer nada manualmente.

# Deploy no VPS (meuzapweb.com.br)

## Pré-requisitos

- Node.js 20+ instalado no VPS
- PM2 para gerenciar o processo (`npm install -g pm2`)
- Nginx como reverse proxy
- Conta no Supabase configurada
- Chave da API OpenAI

## 1. Configurar Supabase

### 1.1 Criar projeto em supabase.com

### 1.2 Executar o schema
No Supabase Dashboard → SQL Editor → New Query, cole e execute o conteúdo de:
`supabase/migrations/001_initial.sql`

### 1.3 Criar bucket de storage
Dashboard → Storage → New Bucket
- Nome: `documents`
- Public: **OFF**

### 1.4 Criar o primeiro usuário admin
Dashboard → Authentication → Users → Add User
Depois execute no SQL Editor:
```sql
UPDATE profiles SET role = 'admin', name = 'Seu Nome' WHERE id = 'UUID-DO-USUARIO';
```

## 2. Configurar no VPS

```bash
# Clone o projeto para o VPS
git clone <repo> /var/www/sava-ia
cd /var/www/sava-ia

# Instalar dependências
npm install

# Criar arquivo .env.local
cp .env.local.example .env.local
nano .env.local
# Preencha as variáveis com os valores do Supabase e OpenAI

# Build de produção
npm run build
```

## 3. Variáveis de Ambiente (.env.local)

```
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OPENAI_API_KEY=sk-...
```

## 4. Iniciar com PM2

```bash
# Instalar PM2 globalmente (se não tiver)
npm install -g pm2

# Iniciar o app
pm2 start npm --name "sava-ia" -- start

# Configurar para iniciar no boot
pm2 startup
pm2 save
```

## 5. Configurar Nginx

```nginx
server {
    listen 80;
    server_name sava.meuzapweb.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Para streaming (análise e chat com IA)
        proxy_buffering off;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
```

```bash
# Ativar o site
sudo ln -s /etc/nginx/sites-available/sava-ia /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# SSL com Let's Encrypt
sudo certbot --nginx -d sava.meuzapweb.com.br
```

## 6. Atualizar o sistema

```bash
cd /var/www/sava-ia
git pull
npm install
npm run build
pm2 restart sava-ia
```

## Notas importantes

- **Streaming**: O Nginx precisa de `proxy_buffering off` para o streaming da IA funcionar corretamente
- **Timeout**: PDFs grandes podem demorar; o timeout de 300s é necessário
- **Storage Supabase**: Os PDFs são armazenados no Supabase Storage, não no VPS
- **Modelos OpenAI**: Por padrão usa `gpt-4o` (primary) e `gpt-4o-mini` (secondary). Para usar `gpt-5.2` quando disponível, atualize `lib/openai.ts`

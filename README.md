# Kanban PNCP — Backend com Busca Automática

Sistema que busca automaticamente licitações no PNCP (Portal Nacional de Contratações Públicas) às 6:00 e 15:00, filtra por palavras-chave do setor audiovisual e popula o Kanban.

---

## PASSO A PASSO (para quem nunca fez isso antes)

### PASSO 1: Criar conta no Supabase (banco de dados gratuito)

1. Acesse **https://supabase.com** e clique em "Start your project"
2. Faça login com sua conta do GitHub (ou crie uma)
3. Clique em **"New project"**
4. Escolha um nome (ex: `kanban-pncp`)
5. Crie uma senha para o banco (ANOTE essa senha!)
6. Região: escolha **South America (São Paulo)**
7. Clique em "Create new project" e espere criar

### PASSO 2: Criar as tabelas no banco

1. No Supabase, clique em **"SQL Editor"** no menu lateral
2. Clique em **"New query"**
3. Copie TODO o conteúdo do arquivo `schema.sql` deste projeto
4. Cole no editor SQL
5. Clique em **"Run"** (botão verde)
6. Deve aparecer "Success" — as tabelas foram criadas

### PASSO 3: Pegar as chaves do Supabase

1. No menu lateral, clique em **"Settings"** (engrenagem)
2. Clique em **"API"**
3. Copie:
   - **Project URL** (ex: `https://abc123.supabase.co`)
   - **anon public key** (começa com `eyJ...`)
4. Guarde esses dois valores

### PASSO 4: Criar conta na Vercel (hospedagem gratuita)

1. Acesse **https://vercel.com** e clique em "Sign Up"
2. Faça login com sua conta do GitHub

### PASSO 5: Subir o código para o GitHub

1. Acesse **https://github.com** (crie conta se não tiver)
2. Clique em **"+"** > **"New repository"**
3. Nome: `kanban-pncp` | Visibilidade: Private
4. Clique em **"Create repository"**
5. No seu computador, abra o terminal na pasta do projeto e rode:

```
git init
git add .
git commit -m "primeiro commit"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/kanban-pncp.git
git push -u origin main
```

### PASSO 6: Deploy na Vercel

1. Na Vercel, clique em **"Add New" > "Project"**
2. Selecione o repositório `kanban-pncp`
3. Antes de clicar deploy, vá em **"Environment Variables"**
4. Adicione:
   - `NEXT_PUBLIC_SUPABASE_URL` = (a URL do passo 3)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (a chave do passo 3)
   - `CRON_SECRET` = (invente uma senha, ex: `netfocus2026`)
5. Clique em **"Deploy"**
6. Espere concluir (leva uns 2 minutos)

### PASSO 7: Testar

Seu app vai estar em algo como `https://kanban-pncp.vercel.app`

Para testar a busca manual:
```
curl -X POST https://kanban-pncp.vercel.app/api/search
```

Para ver as oportunidades salvas:
```
https://kanban-pncp.vercel.app/api/oportunidades
```

O cron job vai rodar automaticamente às 6:00 e 15:00 (horário de Brasília).

---

## Arquivos do projeto

```
kanban-pncp/
├── .env.example          ← Template das variáveis de ambiente
├── package.json          ← Dependências do projeto
├── vercel.json           ← Configuração do cron (6h e 15h)
├── schema.sql            ← Schema do banco de dados
├── lib/
│   ├── supabase.js       ← Conexão com o banco
│   └── pncp.js           ← Motor de busca no PNCP
└── pages/api/
    ├── search.js          ← Busca manual (POST)
    ├── cron.js            ← Busca automática (cron)
    └── oportunidades.js   ← Lista/atualiza oportunidades
```

## APIs disponíveis

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | /api/search | Dispara busca manual no PNCP |
| GET | /api/cron | Busca automática (chamada pelo Vercel) |
| GET | /api/oportunidades | Lista todas as oportunidades ativas |
| PUT | /api/oportunidades | Atualiza coluna/prioridade de uma oportunidade |
| POST | /api/oportunidades | Adiciona oportunidade manual |

## Horário do cron

O `vercel.json` usa horário UTC. A configuração `"0 9,18 * * *"` significa:
- 9:00 UTC = **6:00 horário de Brasília**
- 18:00 UTC = **15:00 horário de Brasília**

## Próximos passos

- [ ] Conectar o frontend (prototype.jsx) ao backend real
- [ ] Adicionar notificação por email/WhatsApp quando encontrar nova oportunidade
- [ ] Autenticação de usuários
- [ ] Integração real com ChatGPT e Claude

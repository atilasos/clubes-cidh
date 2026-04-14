# Deployment numa máquina da escola com Docker e Cloudflare Tunnel

Este guia é a opção mais barata quando a escola já tem boa Internet, um domínio na Cloudflare e uma máquina dedicada para o serviço.

## Quando usar esta opção

Use esta opção se:

- a escola tem uma máquina dedicada ou mini-PC estável;
- a ligação da escola é fiável;
- quer expor o portal sem abrir portas públicas no firewall;
- quer o menor custo recorrente possível.

## Arquitetura

- `app`: Next.js em Docker
- `db`: PostgreSQL em Docker
- `tunnel`: `cloudflared` em Docker
- acesso público por subdomínio na Cloudflare

O exemplo base está em `deploy/docker-compose.school-cloudflare.yml`.

## 1. Preparar a máquina

Recomendado:

- Ubuntu Server 24.04 LTS
- 2 vCPU
- 4 GB RAM
- 40+ GB SSD
- ligação por cabo
- UPS pequena, se possível

Instalar Docker:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

## 2. Obter o projeto

```bash
git clone https://github.com/atilasos/clubes-cidh.git
cd clubes-cidh
cp .env.production.example .env.production
```

## 3. Preencher `.env.production`

Defina pelo menos:

```env
NODE_ENV=production
PORT=3000
ADMIN_PASSWORD=uma-password-forte
CAMPAIGN_SESSION_SECRET=um-segredo-longo-e-aleatorio
APP_BASE_URL=https://clubes.example.edu
DATABASE_URL=postgresql://clubes:change-me@db:5432/clubes?schema=public
POSTGRES_DB=clubes
POSTGRES_USER=clubes
POSTGRES_PASSWORD=change-me
CLOUDFLARE_TUNNEL_TOKEN=colar-o-token-aqui
```

Gerar um segredo seguro:

```bash
openssl rand -hex 32
```

## 4. Configurar o Tunnel na Cloudflare

1. Adicione o domínio à Cloudflare.
2. Vá a **Zero Trust** → **Networks** → **Tunnels**.
3. Crie um tunnel novo.
4. Crie um **public hostname** para o subdomínio, por exemplo `clubes.example.edu`.
5. Aponte o serviço para `http://app:3000`.
6. Copie o token do tunnel para `CLOUDFLARE_TUNNEL_TOKEN`.

Este modelo evita abrir portas públicas na rede da escola. O `cloudflared` cria apenas ligações de saída.

## 5. Arrancar os containers

```bash
docker compose -f deploy/docker-compose.school-cloudflare.yml --env-file .env.production up -d --build
```

Ver logs:

```bash
docker compose -f deploy/docker-compose.school-cloudflare.yml logs -f
```

## 6. Verificar o primeiro arranque

Teste localmente na máquina:

```bash
curl http://127.0.0.1:3000/api/health
```

Esta verificação confirma apenas que a app respondeu; não substitui um teste real de ligação ao admin e de escrita na base de dados.

Depois teste no browser:

- `https://clubes.example.edu`
- `https://clubes.example.edu/admin`

## 7. Atualizações

```bash
git pull
docker compose -f deploy/docker-compose.school-cloudflare.yml --env-file .env.production up -d --build
```

## 8. Backups

Backup manual da base de dados:

```bash
docker compose -f deploy/docker-compose.school-cloudflare.yml --env-file .env.production exec -T db sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > backup-$(date +%F).sql
```

Recomendação: agendar backup diário para outra máquina, NAS ou disco externo.

## 9. Observações práticas

- Não use esta máquina para outras tarefas da escola.
- Teste o portal antes de cada abertura de campanha.
- Se quiser endurecer o painel admin, adicione Cloudflare Access apenas ao caminho `/admin*`.
- Se a escola deixar de ter operador técnico local, uma VPS passa a ser a opção mais segura operacionalmente.

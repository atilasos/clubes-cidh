# Deployment numa VPS com subdomínio

Este guia é a melhor opção se já tem uma VPS a alojar outro projeto e quer publicar este portal num subdomínio separado, com custo baixo e operação previsível.

## Quando usar esta opção

Use esta opção se:

- já tem uma VPS estável;
- quer alojar o portal num subdomínio próprio;
- prefere evitar dependência da rede física da escola;
- quer manter custo baixo com melhor previsibilidade operacional.

## Arquitetura

- `app`: Next.js em Docker
- `db`: PostgreSQL em Docker
- `caddy`: reverse proxy com HTTPS automático
- subdomínio dedicado, por exemplo `clubes.example.edu`

Os ficheiros de apoio estão em:

- `deploy/docker-compose.vps-subdomain.yml`
- `deploy/Caddyfile.vps`

## 1. Preparar DNS

Crie o subdomínio a apontar para o IP da VPS:

- `A clubes.example.edu -> <IP da VPS>`
- `AAAA clubes.example.edu -> <IPv6 da VPS>` (se aplicável)

Se usar Cloudflare como DNS, pode manter o subdomínio proxied ou DNS only, conforme a política do resto da VPS.

## 2. Preparar a VPS

Instale Docker:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

Firewall mínima:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 3. Obter o projeto

```bash
git clone https://github.com/atilasos/clubes-cidh.git
cd clubes-cidh
cp .env.example .env.production
```

## 4. Preencher `.env.production`

Exemplo:

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
SERVER_NAME=clubes.example.edu
```

## 5. Arrancar o stack

```bash
docker compose -f deploy/docker-compose.vps-subdomain.yml --env-file .env.production up -d --build
```

O Caddy trata automaticamente do TLS e faz proxy para a app.

## 6. Verificar a app

```bash
docker compose -f deploy/docker-compose.vps-subdomain.yml --env-file .env.production exec app node -e "fetch('http://127.0.0.1:3000/api/health').then(r => r.json()).then(console.log)"
docker compose -f deploy/docker-compose.vps-subdomain.yml logs -f --tail=100
```

Depois, já com DNS e TLS ativos, confirme também do exterior:

```bash
curl https://clubes.example.edu/api/health
```

Tal como no outro guia, este endpoint é apenas uma verificação de liveness.

Depois teste no browser:

- `https://clubes.example.edu`
- `https://clubes.example.edu/admin`

## 7. Convivência com outros projetos na mesma VPS

Se já existe outro projeto na mesma VPS, use este portal num subdomínio separado e confirme:

- que a porta 80/443 continua a ser gerida por um único reverse proxy;
- que não existe outro container a ocupar os mesmos nomes/portas;
- que os volumes do PostgreSQL deste projeto são independentes.

Se já tem um reverse proxy global na VPS, pode não usar o serviço `caddy` deste exemplo e ligar apenas o container `app` atrás do proxy já existente.

## 8. Atualizações

```bash
git pull
docker compose -f deploy/docker-compose.vps-subdomain.yml --env-file .env.production up -d --build
```

## 9. Backups

Backup manual:

```bash
docker compose -f deploy/docker-compose.vps-subdomain.yml --env-file .env.production exec -T db sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > backup-$(date +%F).sql
```

Guarde os backups fora da VPS sempre que possível.

## 10. Observações práticas

- Para este projeto, a prioridade não é escalar: é funcionar bem nas semanas críticas.
- Mesmo numa VPS barata, mantenha backups e um teste funcional antes de cada semestre.
- Se futuramente separar ficheiros da base de dados, pode mover documentos para object storage sem alterar o modelo base de deployment.

# TCCON — instalação e operação

Sistema web de orçamentos com frontend React autocontido e servidor Node.js
sem dependências npm de terceiros.

> **Segurança:** não deixe a porta do Node aberta para toda a internet. Como o
> Traefik está em outra VPS, permita acesso à porta somente a partir do IP da
> VPS do Traefik ou, preferencialmente, use uma rede privada/WireGuard. A
> aplicação ainda não possui sessões e autorização próprias; por isso o
> middleware HTTP Basic do Traefik é obrigatório. O bundle também contém a
> carga inicial de clientes e não deve ser distribuído publicamente.

## Endereços e portas

A interface e a API não usam portas separadas. Ambas são servidas pelo mesmo
processo Node:

| Componente | Endereço |
|---|---|
| Interface pública | `https://TCCON_DOMAIN/` |
| API pública | `https://TCCON_DOMAIN/api/*` |
| Backend visto pelo Traefik | `TCCON_BACKEND_URL` (ex.: `http://10.0.0.20:3000`) |
| Porta publicada na VPS da aplicação | `TCCON_BIND_IP:TCCON_PORT` |
| Porta interna do container | `3000` |

```text
Navegador
   │ HTTPS + HTTP Basic
   ▼
Traefik na VPS de proxy :443
   │ rede privada/VPN ou firewall restrito
   ▼
VPS da aplicação :TCCON_PORT
   └── Node.js :3000
       ├── /                  interface
       ├── /api/*             API
       ├── data/store.json    dados compartilhados
       └── data/auth.json     hashes de senha
```

O DNS do domínio deve apontar para a VPS do **Traefik**, não para a VPS da
aplicação.

## Pré-requisitos

- VPS da aplicação com Docker Engine e Docker Compose atualizados;
- VPS do Traefik com entrypoint HTTPS, resolvedor ACME e file provider;
- conectividade privada entre as VPSs ou firewall por IP de origem;
- domínio com registro DNS apontando para a VPS do Traefik;
- backup externo para a pasta `data/`.

Para execução sem Docker, use Node.js `24.x` LTS.

## Configuração por `.env`

Na VPS da aplicação:

```bash
cp .env.example .env
nano .env
```

Principais variáveis:

| Variável | Exemplo | Finalidade |
|---|---|---|
| `TCCON_DOMAIN` | `orcamentos.exemplo.com.br` | domínio público, sem protocolo ou caminho |
| `TCCON_BIND_IP` | `10.0.0.20` | IP privado/VPN em que a porta será publicada |
| `TCCON_PORT` | `3000` | porta que o Traefik remoto acessará |
| `TCCON_BACKEND_URL` | `http://10.0.0.20:3000` | origin completo visto pela VPS do Traefik |
| `TRAEFIK_ENTRYPOINT` | `websecure` | entrypoint HTTPS existente no Traefik |
| `TRAEFIK_CERT_RESOLVER` | `letsencrypt` | resolvedor ACME existente no Traefik |
| `TRAEFIK_AUTH_USERS_FILE` | `/etc/traefik/tccon-users` | arquivo de usuários na VPS do Traefik |

Para que o botão **Esqueci minha senha** envie a solicitação ao financeiro,
configure também uma conta SMTP autorizada no `.env` da VPS:

```dotenv
TCCON_SMTP_HOST=smtp.seuprovedor.com.br
TCCON_SMTP_PORT=587
TCCON_SMTP_SECURE=false
TCCON_SMTP_USER=conta-de-envio@tccon.com.br
TCCON_SMTP_PASSWORD=senha-ou-token-do-provedor
TCCON_SMTP_FROM=conta-de-envio@tccon.com.br
TCCON_PASSWORD_RESET_TO=financeiro@tccon.com.br
```

Use `TCCON_SMTP_SECURE=true` para SMTP TLS implícito, normalmente na porta
465. Na porta 587, mantenha `false`; o servidor exige e negocia STARTTLS antes
de autenticar. A senha SMTP deve existir somente no `.env` da VPS.

`TCCON_DOMAIN` também limita o cabeçalho `Host` aceito pela aplicação. Os nomes
`localhost` e os IPs de loopback continuam liberados para healthchecks locais.
O `.env` real é ignorado pelo Git; somente `.env.example` deve ser versionado.

As demais variáveis controlam diretórios e limites:

| Variável | Padrão no Docker |
|---|---|
| `HOST` | `0.0.0.0` |
| `PORT` | `3000` |
| `DATA_DIR` | `/app/data` |
| `PUBLIC_DIR` | `/app/public` |
| `MAX_BODY_BYTES` | `20971520` |
| `MAX_STORE_BYTES` | `52428800` |
| `TCCON_MEMORY_LIMIT` | `512m` |
| `TCCON_CPU_LIMIT` | `1.0` |

## Instalação da aplicação

```bash
mkdir -p data
sudo chown 1000:1000 data
sudo chmod 700 data

docker compose config
docker compose build --pull
docker compose up -d
docker compose ps
curl --fail --silent http://127.0.0.1:3000/api/ready
```

Se `TCCON_BIND_IP` for um IP privado específico, faça o teste nesse IP em vez de
`127.0.0.1`. Nunca use permissões `777` em `data/`.

No firewall ou security group da VPS da aplicação, permita
`TCCON_PORT/tcp` **somente** a partir do IP da VPS do Traefik. Exemplo com UFW,
ajustando os dois valores antes de executar:

```bash
sudo ufw allow from IP_DA_VPS_TRAEFIK to any port 3000 proto tcp
sudo ufw deny 3000/tcp
sudo ufw status numbered
```

Confira as regras existentes antes de aplicá-las para não bloquear SSH ou a
rede privada. Com WireGuard, use os IPs do túnel em `TCCON_BIND_IP` e
`TCCON_BACKEND_URL`.

## Configuração do Traefik remoto

Na VPS do Traefik, crie a credencial interativamente:

```bash
sudo apt install -y apache2-utils
sudo install -d -m 750 /etc/traefik
sudo htpasswd -cB /etc/traefik/tccon-users operador
sudo chmod 640 /etc/traefik/tccon-users
```

O usuário que executa o Traefik precisa conseguir ler esse arquivo. Não coloque
o hash ou a senha no `.env` ou no repositório.

Na VPS da aplicação, gere a configuração dinâmica usando o `.env`:

```bash
npm run traefik:config
scp deploy/traefik-dynamic.generated.yml USUARIO@VPS_TRAEFIK:/tmp/tccon.yml
ssh USUARIO@VPS_TRAEFIK \
  'sudo install -o root -g root -m 640 /tmp/tccon.yml /etc/traefik/dynamic/tccon.yml && rm /tmp/tccon.yml'
```

O arquivo de origem é `deploy/traefik-dynamic.yml.template`; o arquivo gerado
contém o domínio e o endereço privado do backend e é ignorado pelo Git. A
configuração cria:

- roteamento de `/` e `/api/*` para o mesmo backend;
- TLS pelo cert resolver configurado;
- HTTP Basic obrigatório;
- rate limit adicional em `/api/auth/*`;
- healthcheck em `/api/ready`;
- headers de segurança.

O file provider do Traefik deve observar `/etc/traefik/dynamic/` (ou o diretório
equivalente da sua instalação). Se o Traefik estiver em container, monte também
o arquivo de usuários no mesmo caminho configurado em
`TRAEFIK_AUTH_USERS_FILE`. Depois de copiar:

```bash
curl --fail http://IP_PRIVADO_DA_APLICACAO:3000/api/ready \
  -H 'Host: orcamentos.exemplo.com.br'
docker logs --since=10m NOME_DO_CONTAINER_TRAEFIK
curl -I https://orcamentos.exemplo.com.br/
```

O primeiro `curl` é executado a partir da VPS do Traefik. O último deve pedir
autenticação (`401`) sem credenciais e responder normalmente após autenticar.

## Desenvolvimento e validação

Não há compilação do React: `public/index.html` é um bundle pré-gerado e as
fontes originais não acompanham o repositório.

```bash
npm run lint
npm test
npm run build
npm run check
npm run traefik:config
```

## Validação pós-deploy

```bash
docker compose ps
docker compose logs --since=10m tccon
curl --fail --silent http://127.0.0.1:3000/api/health
curl --fail --silent https://SEU_DOMINIO/api/ready -u operador
```

No navegador, valide login HTTP Basic, entrada em um perfil de teste, busca de
material, criação e salvamento de orçamento, histórico após recarregar e
responsividade em tela móvel. Os logs do Node são JSON e não registram corpos de
requisição.

## Backup

Copie `store.json` e `auth.json` como um conjunto. Para consistência:

```bash
sudo install -d -m 700 /var/backups/tccon
docker compose stop tccon
sudo tar -C /opt/tccon-orcamentos \
  -czf "/var/backups/tccon/tccon-$(date -u +%Y%m%dT%H%M%SZ).tar.gz" data
docker compose start tccon
sudo sha256sum /var/backups/tccon/tccon-*.tar.gz
```

Teste restaurações periodicamente e replique uma cópia criptografada para outro
host. Os arquivos `.bak` locais não substituem backup externo.

## Atualização e rollback

Antes de atualizar, gere e valide um backup, preserve `.env` e `data/`, execute
`npm run check`, `docker compose config` e `docker compose build --pull`.
Depois:

```bash
docker compose up -d
docker compose ps
curl --fail --silent https://SEU_DOMINIO/api/ready -u operador
```

Para rollback de código, volte ao commit/imagem anterior e recrie o serviço sem
substituir `data/`. Restaure dados apenas quando houver corrupção confirmada,
com a aplicação parada e uma cópia de preservação do estado atual.

## Alternativa systemd

`deploy/tccon.service` lê `/etc/tccon/tccon.env` e aplica hardening. Configure no
mínimo `TCCON_DOMAIN`, `HOST`, `PORT`, `DATA_DIR` e `PUBLIC_DIR` nesse arquivo.
Use um IP privado em `HOST` quando possível e aplique a mesma restrição de
firewall exigida para Docker. O Traefik remoto continua responsável por TLS e
HTTP Basic.

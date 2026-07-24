# TCCON — instalação e operação

Sistema web de orçamentos com catálogo de materiais, clientes, perfis de
vendedores e histórico de propostas. O frontend é um artefato React autocontido;
o servidor é Node.js puro, sem pacotes npm de terceiros.

> **Estado de segurança:** não exponha o processo Node nem a porta 3000 à
> internet. A aplicação ainda não possui sessão e autorização próprias. O Nginx
> fornecido exige autenticação HTTP Basic como barreira externa temporária.
> Além disso, o artefato web atual contém a carga inicial de clientes; não o
> distribua como arquivo público.
> Consulte [AUDITORIA-TECNICA.md](AUDITORIA-TECNICA.md) antes do deploy.

Senhas novas nunca são salvas em texto puro no navegador. Alterar uma senha já
definida exige informar a senha atual. Ao encontrar uma senha legada no
armazenamento local, o frontend tenta migrá-la para o hash do servidor e remove
o texto puro somente depois da confirmação da API. Se o servidor estiver
indisponível, criação e alteração de senha são recusadas.

## Arquitetura

```text
Navegador
   │ HTTPS + autenticação HTTP Basic
   ▼
Nginx :443
   │ HTTP em loopback
   ▼
Node.js :3000
   ├── public/index.html
   ├── data/store.json       clientes, materiais, usuários e orçamentos
   ├── data/store.json.bak   versão anterior automática
   ├── data/auth.json        hashes de senha dos perfis
   └── data/auth.json.bak    versão anterior automática
```

Não há banco relacional, migrations, filas, cache, jobs, webhooks ou serviço de
upload. Fotos de perfil são reduzidas no navegador e armazenadas como dados no
JSON compartilhado.

## Pré-requisitos

- VPS Linux x86-64 ou arm64 com horário sincronizado.
- Docker Engine e plugin Docker Compose mantidos e atualizados.
- Nginx, `apache2-utils` e Certbot no host.
- Domínio apontado para o VPS para emissão de TLS.
- Espaço de backup fora da pasta da aplicação e, idealmente, cópia externa.

Para execução sem Docker, use exclusivamente uma versão Node.js `24.x` LTS.

## Desenvolvimento e validação

Não há etapa de compilação do React: `public/index.html` é o artefato gerado e as
fontes originais não acompanham o repositório. Os comandos disponíveis são:

```bash
npm run lint
npm test
npm run build
npm run check
```

`lint` valida a sintaxe JavaScript; `test` executa os testes nativos do Node;
`build` valida a estrutura e os recursos do bundle; e `check` executa tudo.
O script `scripts/patch-frontend.js` registra de forma reproduzível as correções
aplicadas ao template gerado e é idempotente. Execute-o somente ao substituir o
bundle por uma nova exportação.

## Variáveis

Copie `.env.example` para `.env`. O arquivo `.env` não deve ser versionado.

| Variável | Obrigatória | Padrão | Finalidade |
|---|---:|---|---|
| `HOST` | não | `0.0.0.0` no Docker | Interface interna do processo |
| `PORT` | não | `3000` | Porta interna |
| `DATA_DIR` | não | `/app/data` | Persistência |
| `PUBLIC_DIR` | não | `/app/public` | Artefato web |
| `MAX_BODY_BYTES` | não | `20971520` | Limite por requisição JSON |
| `MAX_STORE_BYTES` | não | `52428800` | Limite do armazenamento |
| `TCCON_PORT` | não | `3000` | Porta no loopback do host |
| `TCCON_MEMORY_LIMIT` | não | `512m` | Memória do container |
| `TCCON_CPU_LIMIT` | não | `1.0` | CPUs do container |
| `TCCON_LOG_MAX_SIZE` | não | `10m` | Tamanho por arquivo de log |
| `TCCON_LOG_MAX_FILES` | não | `5` | Quantidade de arquivos de log |

Nenhuma variável secreta é aceita pela aplicação. A credencial da barreira
externa fica somente no arquivo `/etc/nginx/tccon.htpasswd`.

## Primeira instalação com Docker

No diretório escolhido, por exemplo `/opt/tccon-orcamentos`:

```bash
cp .env.example .env
mkdir -p data
sudo chown 1000:1000 data
sudo chmod 700 data

docker compose config
docker compose build --pull
docker compose up -d
docker compose ps
curl --fail --silent http://127.0.0.1:3000/api/ready
```

O Compose publica `127.0.0.1:3000`, nunca `0.0.0.0:3000`. O container executa
como usuário não root, com capabilities removidas, filesystem raiz somente para
leitura, limites de CPU/memória/PIDs, healthcheck e rotação de logs.
A imagem usa Node 24 LTS sobre Alpine e remove npm, Corepack e Yarn do runtime,
pois a aplicação não possui dependências instaladas; isso reduz a superfície de
ataque sem afetar a execução.

Se o container não puder escrever em `data/`, confira:

```bash
stat -c '%u:%g %a %n' data
sudo chown -R 1000:1000 data
sudo chmod 700 data
```

Não altere permissões para `777`.

## Nginx, autenticação e HTTPS

Crie a credencial interativamente, sem colocar a senha na linha de comando:

```bash
sudo apt update
sudo apt install -y nginx apache2-utils certbot python3-certbot-nginx
sudo htpasswd -c /etc/nginx/tccon.htpasswd operador
sudo chown root:www-data /etc/nginx/tccon.htpasswd
sudo chmod 640 /etc/nginx/tccon.htpasswd
```

Depois:

```bash
sudo cp deploy/nginx-tccon.conf /etc/nginx/sites-available/tccon
sudoedit /etc/nginx/sites-available/tccon
# Substitua somente orcamentos.seudominio.com.br pelo domínio real.
sudo ln -s /etc/nginx/sites-available/tccon /etc/nginx/sites-enabled/tccon
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d SEU_DOMINIO
```

Mantenha somente SSH, HTTP e HTTPS liberados no firewall. A porta 3000 não deve
ser aberta.

## Validação pós-inicialização

```bash
docker compose ps
curl --fail --silent http://127.0.0.1:3000/api/health
curl --fail --silent http://127.0.0.1:3000/api/ready
docker compose logs --since=10m tccon
```

Além do healthcheck, valide no navegador:

1. autenticação HTTP Basic;
2. carregamento da tela de perfis;
3. entrada em um perfil de teste;
4. busca de material;
5. criação e salvamento de um orçamento de teste;
6. reaparecimento no histórico após recarregar;
7. exclusão dos dados de teste conforme a regra operacional aprovada.

Procure nos logs por `startup_failed`, `request_failed`, reinicializações e
qualquer dado sensível inesperado. Os logs do servidor são JSON estruturado e
não registram corpos de requisição.

## Backup recomendado

Os dois JSONs devem ser copiados como um conjunto. Para uma cópia consistente,
faça uma breve janela de manutenção:

```bash
sudo install -d -m 700 /var/backups/tccon
docker compose stop tccon
sudo tar -C /opt/tccon-orcamentos \
  -czf "/var/backups/tccon/tccon-$(date -u +%Y%m%dT%H%M%SZ).tar.gz" data
docker compose start tccon
sudo sha256sum /var/backups/tccon/tccon-*.tar.gz
```

Em seguida:

- teste periodicamente a extração em outra pasta;
- valide `store.json` e `auth.json` com um parser JSON;
- retenha cópias diárias, semanais e mensais conforme a política do cliente;
- replique uma cópia criptografada para outro host/provedor;
- monitore espaço livre e sucesso do job;
- nunca considere os arquivos `.bak` substitutos de um backup externo.

## Restauração

Faça primeiro uma cópia de preservação do estado atual. Nunca extraia por cima
de uma instância em execução.

```bash
docker compose stop tccon
sudo mv data "data.pre-restore-$(date -u +%Y%m%dT%H%M%SZ)"
sudo mkdir data
sudo tar -xzf /CAMINHO/backup-validado.tar.gz --strip-components=1 -C data

sudo chown -R 1000:1000 data
sudo chmod 700 data
sudo chmod 600 data/*.json data/*.bak 2>/dev/null || true
docker compose run --rm --no-deps tccon node -e \
  "JSON.parse(require('fs').readFileSync('/app/data/store.json','utf8'))"
docker compose run --rm --no-deps tccon node -e \
  "JSON.parse(require('fs').readFileSync('/app/data/auth.json','utf8'))"
docker compose start tccon
curl --fail --silent http://127.0.0.1:3000/api/ready
```

Só remova a pasta `data.pre-restore-*` depois de validar os fluxos e obter
confirmação de que a restauração está correta.

## Atualização segura

1. agende a janela e avise os usuários;
2. confirme espaço em disco e estado saudável;
3. gere e teste um backup;
4. registre o commit e a imagem atualmente executados;
5. obtenha a versão revisada sem sobrescrever `.env` nem `data/`;
6. execute `docker compose config`;
7. execute os testes com Node 24: `npm run check`;
8. construa com `docker compose build --pull`;
9. aplique com `docker compose up -d`;
10. aguarde o healthcheck e execute a validação pós-inicialização.

Não há migrations na versão atual.

## Rollback

### Somente código

Volte ao commit/imagem anterior e recrie o serviço, preservando `data/`:

```bash
git checkout COMMIT_ANTERIOR
docker compose build --pull
docker compose up -d
curl --fail --silent http://127.0.0.1:3000/api/ready
```

Não restaure dados apenas porque o código voltou. Isso descartaria alterações
legítimas feitas após o deploy.

### Código e dados

Use o procedimento de restauração somente se houver corrupção ou alteração
incompatível confirmada. Registre o horário de corte, preserve o estado atual e
obtenha autorização do responsável pelos dados.

## Alternativa systemd

O arquivo `deploy/tccon.service` executa o processo em loopback como `www-data`
e aplica hardening do systemd. Antes de habilitá-lo:

```bash
sudo chown -R root:root /opt/tccon-orcamentos
sudo install -d -o www-data -g www-data -m 700 /opt/tccon-orcamentos/data
sudo cp deploy/tccon.service /etc/systemd/system/tccon.service
sudo systemctl daemon-reload
sudo systemctl enable --now tccon
sudo systemctl status tccon
```

Use Node 24 LTS e mantenha o Nginx com autenticação e TLS também nessa opção.

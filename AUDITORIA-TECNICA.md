# Auditoria técnica — TCCON

Data: 24 de julho de 2026.

## Veredito

O código e o processo de execução local foram estabilizados e endurecidos, mas
o sistema **ainda não deve ser publicado diretamente na internet**. O deploy
somente é aceitável para uma equipe confiável atrás do Nginx fornecido, com
autenticação HTTP Basic e HTTPS.

Restam dois riscos estruturais que exigem decisões de produto e governança:

1. os perfis do frontend não são sessões de segurança e a API não separa
   permissões por vendedor;
2. o bundle contém a carga inicial de 2.523 clientes, incluindo identificadores,
   telefones e endereços.

Não houve exclusão ou migração automática desses dados, pois isso poderia causar
perda e depende de política de acesso, retenção e origem legal.

## Estado inicial

- Frontend React 18.3.1 autocontido em `public/index.html`, sem fontes originais
  ou ferramenta de build.
- Backend HTTP Node.js puro, sem dependências npm.
- Persistência compartilhada em `store.json` e hashes em `auth.json`.
- Ausência de testes, limites robustos, escrita atômica, readiness, shutdown
  gracioso e headers de segurança no código original.
- Container exposto em todas as interfaces, executado como root e sem limites.
- Frontend sem breakpoint responsivo, com overflow horizontal em 375 px.
- Perfis e resultados de busca clicáveis apenas com mouse.
- Senha substituível sem exigir a credencial atual e fallback de senha em texto
  puro no navegador.
- Falhas de sincronização ignoradas pelo frontend.

## Arquitetura e comandos

```text
Navegador
   │ HTTPS + HTTP Basic
   ▼
Nginx :443
   │ HTTP em loopback
   ▼
Node.js :3000
   ├── public/index.html
   ├── data/store.json
   └── data/auth.json
```

Comandos oficiais:

```bash
npm run lint
npm test
npm run build
npm run check
npm start
docker compose config
docker compose build --pull
docker compose up -d
```

`npm run build` valida o bundle pré-gerado; não recompila React porque as fontes
não estão no repositório.

## Achados e correções

### Críticos

1. **API sem sessão/autorização por vendedor — bloqueio de produto.**
   - Causa: estado e `isAdmin` vêm do `localStorage`; as rotas trabalham com um
     mapa compartilhado.
   - Mitigação: processo publicado somente em loopback; Nginx exige HTTP Basic;
     documentação proíbe exposição direta.
   - Pendente: definir papéis, propriedade dos dados, bootstrap administrativo,
     recuperação de senha e retenção antes de criar sessões e ACLs.

2. **Dados pessoais no bundle — bloqueio de governança.**
   - Causa: a exportação incorporou 2.523 clientes no JavaScript.
   - Mitigação: `index.html` usa `Cache-Control: no-store`; acesso externo deve
     passar pela barreira do Nginx.
   - Pendente: aprovar migração para armazenamento protegido e acesso por papel.

### Altos

1. **Perda/corrupção de persistência — corrigido.**
   - Escrita temporária exclusiva, `fsync`, rename, permissões `0600` e backup
     anterior; erro de disco ocorre antes da resposta de sucesso.
   - JSON inválido ou arquivo acima do limite bloqueia o startup.

2. **Concorrência descartava chaves — corrigido.**
   - As gravações atualizam o estado confirmado e são serializadas por operações
     síncronas curtas no backend.

3. **Redefinição de senha existente sem prova — corrigido.**
   - Alteração agora exige a senha atual; comparação permanece constante.
   - `scrypt` passou para a API assíncrona para não bloquear o event loop.

4. **Senha em texto puro no fallback — corrigido para novos fluxos.**
   - Criação/alteração de senha é recusada sem servidor.
   - Senhas legadas são migradas para hash e removidas do mapa somente após
     confirmação; falhas são informadas ao operador.

5. **Falha silenciosa de sincronização — corrigido.**
   - Alterações entram em uma fila durável local, são enviadas em ordem e não
     são sobrescritas pelo pull; pendências sobrevivem a recarga e geram aviso.

6. **Container com superfície excessiva — corrigido.**
   - Node 24.18.0 LTS em Alpine 3.24, usuário não root, npm/Corepack/Yarn
     removidos, porta em loopback, raiz read-only, capabilities removidas e
     limites de CPU, memória, processos e logs.

### Médios

- Limites de corpo e armazenamento, erros JSON consistentes e validação de
  `Content-Type` — corrigidos.
- Traversal, URL inválida e rotas de API desconhecidas — corrigidos.
- Health/readiness, timeouts, shutdown e logs estruturados — adicionados.
- Rate limiting de senha com memória limitada e atraso de 401 no Nginx —
  adicionados.
- Headers de segurança e CSP compatível com o bundle legado — adicionados.
- Layout sem breakpoint e overflow móvel — corrigidos para 375 px; tabelas usam
  rolagem interna em telas estreitas.
- Elementos clicáveis sem teclado, título/idioma ausentes, botões destrutivos
  sem nome e toast não anunciado — corrigidos.
- Ausência de testes e validação do bundle — corrigida com testes nativos.

### Baixos / dívida técnica

- O bundle monolítico ainda exige `unsafe-inline` e `unsafe-eval` na CSP.
- Não existem fontes React, sourcemaps ou pipeline reprodutível de compilação.
- Valores financeiros usam ponto flutuante; recomenda-se centavos inteiros ou
  decimal em uma evolução futura.
- IDs e números de orçamento continuam baseados em relógio/aleatoriedade.
- O rate limit é por processo e reinicia junto com o servidor.
- Não há métricas, teste de carga ou restauração automatizada.

## Arquivos alterados

- `server.js`: persistência, validação, limites, erros HTTP, segurança estática,
  senha assíncrona, mudança autenticada de senha, rate limit, health/readiness,
  logs e shutdown.
- `public/index.html`: responsividade, acessibilidade, fila de sincronização,
  migração de senha, idioma e título.
- `scripts/patch-frontend.js`: aplicação idempotente das correções no artefato.
- `scripts/validate-frontend.js`: validação estrutural do bundle.
- `test/server.test.js`, `test/frontend.test.js`: regressões de API,
  persistência, segurança e bundle.
- `Dockerfile`, `docker-compose.yml`: runtime mínimo e hardening.
- `deploy/nginx-tccon.conf`, `deploy/tccon.service`: proxy, autenticação, atraso
  de falhas, timeouts e hardening.
- `package.json`: comandos de qualidade e bloqueio de publicação npm.
- `.gitignore`, `.dockerignore`, `.env.example`: higiene e configuração.
- `LEIA-ME-INSTALACAO.md`: instalação, validação, backup, restauração e rollback.

## Validações

- Node.js 24.14.0 do ambiente de auditoria.
- `node --check` em servidor, scripts e testes.
- 9 testes nativos aprovados, 0 falhas.
- Validador do bundle: 40 recursos, template JSON íntegro.
- Navegador real em 375 × 812:
  - sem overflow horizontal;
  - entrada no administrador por teclado;
  - busca e adição de material por teclado;
  - totais e margem recalculados;
  - orçamento salvo e reapresentado após recarga;
  - histórico responsivo;
  - nenhum erro ou warning de console.
- Busca por segredos e marcadores de manutenção; somente credenciais fictícias
  de testes foram encontradas.
- Node 24.18.0 confirmado como LTS e as tags oficiais da imagem confirmadas.

Não executado neste host:

- `docker compose config`, build/scan da imagem e healthcheck do container:
  Docker não está instalado.
- `nginx -t`, systemd, Certbot e restauração: o host de auditoria é Windows.
- teste de carga: não há meta de usuários simultâneos ou staging representativo.

Essas verificações são obrigatórias antes da produção.

## Decisões necessárias para eliminar riscos restantes

1. Quem cria/remove usuários e redefine credenciais?
2. Administrador acessa todos os orçamentos?
3. Vendedor enxerga somente os próprios registros?
4. Materiais e clientes são globais, por filial ou por empresa?
5. Qual a política de recuperação e revogação de acesso?
6. Qual a retenção ao excluir perfil, cliente ou orçamento?
7. A numeração deve ser única, sequencial e auditável?
8. Qual a base legal e o conjunto mínimo dos 2.523 cadastros embarcados?
9. Quais são RPO, RTO, retenção de backup e capacidade simultânea?

Após essas respostas, a etapa seguinte é retirar os clientes do bundle, criar
bootstrap administrativo, sessões `HttpOnly`/`Secure`/`SameSite`, autorização
por rota e registro, CSRF, expiração, revogação e testes de acesso horizontal.

# TCCON — Sistema de Orçamentos · instalação no VPS (Ubuntu 24.04)

App web com **dados compartilhados** entre todos os vendedores: perfis, orçamentos,
materiais e clientes ficam salvos no servidor (VPS), então o que um edita aparece
para os outros. Sem servidor não é possível sincronizar entre aparelhos.

O servidor é **Node.js puro, sem dependências** (não precisa `npm install`).

---

## 1. Enviar os arquivos para o VPS

No seu computador, envie a pasta `server/` para o VPS (via SCP, SFTP/FileZilla, ou git).
Exemplo com scp (rode no seu PC):

```
scp -r server/ root@SEU_IP_DO_VPS:/opt/tccon-orcamentos
```

Fica assim no VPS:
```
/opt/tccon-orcamentos/
  ├── server.js
  ├── package.json
  ├── public/index.html        (o app)
  └── data/                    (criado sozinho; guarda store.json)
```

## 2. Instalar o Node.js (uma vez só)

Conecte no VPS por SSH (`ssh root@SEU_IP`) e rode:

```
sudo apt update
sudo apt install -y nodejs npm
node -v        # precisa ser 18 ou maior
```

Se a versão for menor que 18, instale a 20:
```
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

## 3. Testar

```
cd /opt/tccon-orcamentos
node server.js
```
Abra no navegador: `http://SEU_IP_DO_VPS:3000` — o app deve carregar.
Pare o teste com `Ctrl + C`.

## 4. Deixar rodando sempre (systemd)

```
sudo chown -R www-data:www-data /opt/tccon-orcamentos
sudo cp /opt/tccon-orcamentos/deploy/tccon.service /etc/systemd/system/tccon.service
sudo systemctl daemon-reload
sudo systemctl enable --now tccon
sudo systemctl status tccon      # deve aparecer "active (running)"
```

O app reinicia sozinho se cair ou se o VPS reiniciar.

## 5. (Recomendado) Domínio + porta 80 com Nginx

```
sudo apt install -y nginx
sudo cp /opt/tccon-orcamentos/deploy/nginx-tccon.conf /etc/nginx/sites-available/tccon
# edite o arquivo e troque o server_name pelo seu domínio:
sudo nano /etc/nginx/sites-available/tccon
sudo ln -s /etc/nginx/sites-available/tccon /etc/nginx/sites-enabled/tccon
sudo nginx -t && sudo systemctl reload nginx
```

Agora acesse por `http://seu-dominio` (sem `:3000`).

### HTTPS grátis (cadeado) — se tiver domínio apontado para o VPS
```
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d orcamentos.seudominio.com.br
```

## 6. Firewall

```
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
# Se NÃO usar nginx e acessar direto pela 3000:
# sudo ufw allow 3000
sudo ufw enable
```

---

## Atualizar o app depois (nova versão)

Substitua o arquivo `public/index.html` pelo novo e reinicie:
```
sudo systemctl restart tccon
```
Os dados em `data/store.json` são preservados.

## Backup dos dados

Tudo fica em **`/opt/tccon-orcamentos/data/store.json`**. Para backup:
```
cp /opt/tccon-orcamentos/data/store.json ~/backup-tccon-$(date +%F).json
```

## Como usar no dia a dia

- Acesse o endereço do VPS pelo navegador do PC ou celular.
- No celular: menu do navegador → "Adicionar à tela inicial" → abre como app.
- Todos os aparelhos que abrirem o mesmo endereço compartilham os mesmos dados.

## Observações técnicas

- Sincronização: cada alteração (materiais, clientes, perfis, orçamentos) é enviada
  ao servidor e recarregada quando outro aparelho abre/atualiza a página.
- Concorrência simples (última gravação vence por chave). Para poucos vendedores é ok.
- O app também funciona offline como arquivo único (`TCCON-Orcamentos-App.html`),
  mas nesse modo os dados ficam só naquele aparelho, sem sincronizar.

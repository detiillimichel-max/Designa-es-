# Escala de Reuniões

PWA para gerar, editar, salvar, consultar e compartilhar escalas de reuniões. O frontend permanece no GitHub Pages e funciona offline com IndexedDB, PDFs locais e service worker.

> **Estado atual:** o frontend e os recursos offline estão publicados. O Prisma Postgres e a pasta Cloudinary foram preparados. A API intermediária ainda precisa ser publicada para ativar login, sincronização entre dispositivos, mensagens e notificações push.

## Links

- Aplicativo: https://detiillimichel-max.github.io/Designa-es-/
- Repositório: https://github.com/detiillimichel-max/Designa-es-
- Branch de produção: `main`
- Último commit do frontend: `5fff4fc Fix complete schedule table in PDF`

## Recursos implementados

O app gera de 1 a 52 semanas, distribui funções por rodízio, considera ausências e bloqueia escalas impossíveis. A programação permite editar presidente, discurso e leitor antes do salvamento, mantendo o dirigente fixo protegido.

O cadastro de membros permite inserir nomes e selecionar papéis elegíveis. O IndexedDB v2 guarda membros, escalas, configuração e designações individuais. Escalas antigas são migradas automaticamente para o histórico.

A área de discurso possui cidade, bairro, rua/estrada/avenida, congregação, tema, cântico, data, horário, observações e urgências/eventualidades. Os campos principais aceitam 120 caracteres; observações e urgências aceitam 180 caracteres.

O PDF geral contém Semana, Data, Dirigente, Presidente, Discurso e Leitor. O compositor gera PDFs separados por semana, inclusive para meses com cinco semanas, e permite baixar ou compartilhar cada designação. Lucide e jsPDF são distribuídos localmente para preservar o uso offline.

## Estrutura

```text
index.html                 Interface
manifest.json              Instalação PWA
sw.js                      Cache offline
vendor/                    Lucide e jsPDF locais
src/data/db.js             IndexedDB e histórico
src/data/membros.js        Membros padrão
src/logic/geradorEscala.js Regras de geração
src/ui/app.js              Interface, PDFs e eventos
README.md                  Documentação principal
CONTINUIDADE.md            Ponto de parada e próximos passos
```

## Prisma Postgres

Foi criado o banco `escala-reunioes-prod` no projeto `pwa-detilli`, em US East (N. Virginia). O esquema inicial foi criado por migração aditiva.

| Tabela | Finalidade |
|---|---|
| `app_users` | Usuários, e-mail, nome, hash de senha e URL da foto |
| `auth_sessions` | Sessões com tokens armazenados como hash |
| `congregations` | Congregações e endereço |
| `congregation_memberships` | Associação de usuários e permissões |
| `members` | Participantes e papéis elegíveis |
| `schedules` | Escalas, ausências e dados do discurso |
| `assignments` | Designações por semana e função |
| `messages` | Mensagens entre usuários |
| `push_devices` | Dispositivos Web Push/VAPID |
| `backup_records` | Referências e checksums de backups |
| `api_credentials` | Credenciais armazenadas por hash e escopo |

`app_users.photo_url` deve guardar somente o texto da URL. Imagens não devem ser gravadas como bytes no banco. A `DATABASE_URL` nunca deve ser commitada ou enviada ao navegador.

## Cloudinary

O conector Cloudinary Asset foi ativado e foi criada a pasta exclusiva `app-escala`. Todo upload deste app deve usar `folder: "app-escala"`.

Fluxo planejado: o usuário escolhe uma foto; o servidor autoriza o upload; o arquivo é enviado ao Cloudinary; a URL retornada é salva em `app_users.photo_url`. A chave privada do Cloudinary nunca deve chegar ao frontend.

## Cloudflare

O conector Cloudflare Worker Bindings foi ativado. Os Workers existentes `pwa-tv-hls-proxy` e `flat-thunder-698b` não foram alterados porque pertencem a outros projetos.

Situação atual:

- Não há namespace KV criado para este app.
- O R2 ainda precisa ser habilitado no Dashboard Cloudflare.
- O conector atual permite consultar recursos, mas não publicou nem editou um Worker nesta sessão.
- Ainda não existe Worker de API ligado ao GitHub Pages.

O Worker planejado será a camada segura entre o PWA, Prisma e Cloudinary. Ele deverá fornecer login, sincronização, upload assinado, histórico, mensagens e Web Push. Segredos do Prisma, Cloudinary e VAPID devem ficar em variáveis secretas do Worker.

## Arquitetura planejada

```text
GitHub Pages       PWA, IndexedDB, PDFs e fila offline
Cloudflare Worker  API autenticada e sincronização
Prisma Postgres    Usuários, escalas, histórico e mensagens
Cloudinary         Fotos na pasta app-escala
Web Push/VAPID     Notificações para dispositivos
```

GitHub Pages não executa código de servidor. Portanto, a API precisa ser publicada em um Worker ou serviço equivalente. O frontend deve conhecer somente a URL pública da API.

## Segurança

Nenhuma credencial deve ser commitada. Senhas devem ser armazenadas como hash forte. Sessões e chaves de API devem ser armazenadas como hash. Toda API deve verificar a associação do usuário com a congregação solicitada. O frontend não é mecanismo de segurança.

## Desenvolvimento local

```bash
npx http-server -p 4173
node --check src/ui/app.js
node --check src/data/db.js
npx --yes html-validate index.html
git diff --check
```

O ponto de parada detalhado está em [CONTINUIDADE.md](CONTINUIDADE.md).

## Referências

[1]: https://github.com/detiillimichel-max/Designa-es- "Repositório do aplicativo"
[2]: https://www.prisma.io/docs "Documentação do Prisma"
[3]: https://cloudinary.com/documentation/upload_images "Documentação de upload do Cloudinary"
[4]: https://developers.cloudflare.com/workers/ "Documentação do Cloudflare Workers"
[5]: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API "Documentação da IndexedDB API"
[6]: https://developer.mozilla.org/en-US/docs/Web/API/Push_API "Documentação da Push API"

Documentação mantida por **Manus AI**.

[1] [2] [3] [4] [5] [6]

# Continuidade do Projeto Escala de Reuniões

**Data do registro:** 13 de setembro de 2026  
**Repositório:** `detiillimichel-max/Designa-es-`  
**Branch:** `main`  
**Aplicativo:** https://detiillimichel-max.github.io/Designa-es/

## Onde o projeto parou

O projeto continua no repositório original e no GitHub Pages. Não foi criado um aplicativo substituto e nenhum dos Workers Cloudflare existentes foi alterado.

O frontend está funcional para uso offline. Ele gera escalas, permite edição de participantes, mantém histórico local, cadastra membros, registra informações de discurso, gera PDF geral e gera PDFs individuais por semana.

O Prisma Postgres foi criado e recebeu o esquema inicial para usuários, sessões, congregações, membros, escalas, designações, mensagens, dispositivos push, backups e credenciais de API.

O Cloudinary foi conectado e recebeu a pasta exclusiva `app-escala`. O banco deverá guardar somente URLs de fotos, nunca os arquivos binários.

O conector Cloudflare Worker Bindings foi habilitado. A conta possui os Workers `pwa-tv-hls-proxy` e `flat-thunder-698b`, que não devem ser reutilizados sem confirmação porque pertencem a outros projetos. Não há KV criado para este aplicativo. O R2 ainda precisa ser habilitado.

A API ainda não está publicada. Portanto, login, senha, foto sincronizada, sincronização entre celulares e computador, mensagens, backups remotos e Web Push ainda não estão ativos no aplicativo público.

## O que já foi feito

| Área | Estado | Observação |
|---|---|---|
| GitHub Pages | Concluído | Continua sendo a implantação do frontend |
| Geração de escala | Concluído | Regras de ausência e validações implementadas |
| Edição de designações | Concluído | Participantes podem ser ajustados antes do salvamento |
| IndexedDB | Concluído | Histórico e funcionamento offline no dispositivo |
| PDFs | Concluído | PDF geral e PDFs separados por semana |
| Campo de discurso | Concluído | Limites de 120 e 180 caracteres conforme o campo |
| Prisma Postgres | Preparado | Schema central criado, ainda sem API conectada |
| Cloudinary | Preparado | Pasta `app-escala` criada |
| Cloudflare Worker | Pendente | Falta publicar a API do app |
| R2 | Pendente | Deve ser habilitado se o backup usar objetos |
| KV | Pendente | Pode ser usado para rate limit ou tokens temporários |
| Login | Pendente | Depende da API segura |
| Sincronização | Pendente | Depende de identidade, permissões e endpoints |
| Mensagens | Pendente | Tabela prevista, interface e API ainda faltam |
| Web Push/VAPID | Pendente | Dispositivos e chaves ainda não integrados |

## Próximos passos recomendados

### Fase 1 — Publicar a API mínima

Criar um Worker exclusivo para este app sem alterar os Workers existentes. Configurar as variáveis secretas da API, incluindo a conexão do Prisma, segredo de sessão e credenciais privadas do Cloudinary.

Definir a URL pública da API no frontend. O frontend deve enviar apenas dados de negócio e tokens de sessão; nenhum segredo deve ser colocado no JavaScript publicado.

Criar endpoints autenticados para:

- verificar a sessão atual;
- criar e encerrar sessão;
- listar congregações do usuário;
- sincronizar membros;
- sincronizar escalas e designações;
- consultar histórico.

### Fase 2 — Login e perfil

Implementar cadastro ou método de login escolhido pelo proprietário. Armazenar a senha somente como hash forte. Criar recuperação de sessão, encerramento de sessão e proteção contra tentativas excessivas.

Adicionar seleção de foto pela câmera ou galeria. O Worker deverá gerar upload autorizado para Cloudinary na pasta `app-escala`, e o Prisma deverá armazenar apenas a URL retornada.

### Fase 3 — Sincronização offline

Adicionar uma fila de operações no IndexedDB. Quando houver conexão, enviar operações pendentes para a API usando identificadores idempotentes.

Definir política de conflito para o caso de dois dispositivos alterarem a mesma escala. A opção recomendada é registrar versão, data de atualização e usuário responsável, evitando sobrescrever silenciosamente uma alteração mais nova.

### Fase 4 — Compartilhamento e permissões

Implementar congregações, convites e papéis. Restringir cada escala, membro, histórico e mensagem aos usuários autorizados.

Adicionar compartilhamento por link somente se houver uma política clara de expiração e permissão. PDFs individuais podem continuar sendo compartilhados pelo sistema operacional sem publicar dados no servidor.

### Fase 5 — Mensagens e notificações

Implementar mensagens no Prisma e a interface correspondente. Depois cadastrar dispositivos no banco e integrar Web Push/VAPID para avisos de novas designações, alterações e mensagens.

Notificações devem ser opcionais, revogáveis e enviadas somente para dispositivos autorizados pelo usuário.

### Fase 6 — Backup e recuperação

Definir o formato de backup antes de implementar. O backup deve incluir uma exportação versionada de dados, checksum e data de criação. O R2 pode armazenar o arquivo, enquanto o Prisma guarda apenas a referência e o checksum.

A restauração deve exigir autenticação e confirmação explícita, pois pode substituir dados existentes. O backup local em JSON deve continuar disponível para o modo offline.

## Variáveis e segredos necessários no backend

Os nomes exatos dependem do Worker escolhido, mas a configuração deverá conter secretamente:

```text
DATABASE_URL
SESSION_SECRET
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
```

A chave pública VAPID pode ser distribuída ao frontend. A chave privada nunca pode ser publicada.

## Checklist de retomada

- [ ] Confirmar que o Worker novo será exclusivo do app.
- [ ] Habilitar publicação/edição de Worker no Cloudflare.
- [ ] Publicar API mínima com health check sem expor segredos.
- [ ] Configurar `DATABASE_URL` como secret do Worker.
- [ ] Criar testes de autenticação e autorização.
- [ ] Integrar login ao frontend GitHub Pages.
- [ ] Integrar upload assinado para `app-escala`.
- [ ] Sincronizar membros, escalas e histórico.
- [ ] Testar dois dispositivos com alterações offline.
- [ ] Ativar mensagens.
- [ ] Ativar Web Push/VAPID.
- [ ] Habilitar R2 e implementar backup versionado.
- [ ] Atualizar este documento a cada fase publicada.

## Regras para não perder o trabalho

Não commitar connection strings, tokens, chaves privadas ou arquivos `.env`. Não editar os Workers `pwa-tv-hls-proxy` e `flat-thunder-698b`. Não remover o IndexedDB: ele é necessário para o funcionamento offline. Não colocar imagens no Prisma como bytes; guardar somente URLs do Cloudinary. Não publicar a API no GitHub Pages, pois Pages não executa código de servidor.

## Referências

[1]: https://github.com/detiillimichel-max/Designa-es- "Repositório do aplicativo"
[2]: https://www.prisma.io/docs "Documentação do Prisma"
[3]: https://developers.cloudflare.com/workers/ "Documentação do Cloudflare Workers"
[4]: https://cloudinary.com/documentation/upload_images "Documentação de upload do Cloudinary"
[5]: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API "Documentação da IndexedDB API"
[6]: https://developer.mozilla.org/en-US/docs/Web/API/Push_API "Documentação da Push API"

[1] [2] [3] [4] [5] [6]

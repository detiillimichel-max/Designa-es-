# Gerador de Escalas de Reuniões

Aplicativo Web Progressivo (PWA) offline para gerar, salvar e compartilhar escalas de reuniões. A aplicação distribui funções por rodízio, evita duas funções na mesma semana e bloqueia a geração quando as ausências tornam uma escala impossível.

## Funcionalidades

- Geração de 1 a 52 semanas a partir de uma data inicial.
- Rodízio por menor número de participações e desempate aleatório.
- Controle de ausências para dirigente, presidente, orador e leitor.
- Validação inline de data e quantidade de semanas.
- Persistência local no dispositivo usando IndexedDB.
- Exportação da escala em PDF usando jsPDF distribuído localmente.
- Compartilhamento do PDF pela Web Share API quando suportado, com fallback para download.
- Ícones da biblioteca Lucide distribuídos localmente para manter o funcionamento offline.
- Service worker versionado com cache dos arquivos da aplicação e das bibliotecas.

## Estrutura

```text
index.html
manifest.json
sw.js
vendor/
  lucide.js
  jspdf.umd.min.js
src/
  data/
    membros.js
    db.js
  logic/
    geradorEscala.js
  ui/
    app.js
```

## Regras de segurança

Uma pessoa marcada como ausente nunca é usada automaticamente como fallback. Quando não existe candidato elegível, a geração é interrompida e a tela informa a semana, o papel e a causa do bloqueio. O usuário deve ajustar as ausências ou a configuração antes de gerar novamente.

## Desenvolvimento local

Sirva a pasta com qualquer servidor HTTP estático, pois os módulos JavaScript e o service worker não funcionam corretamente via `file://`. Por exemplo:

```bash
npx http-server -p 4173
```

Depois, abra `http://127.0.0.1:4173/`.
## Histórico e cadastro offline

A versão atual usa o IndexedDB v2 com as coleções `membros`, `escalas`, `config` e `designacoes`. O usuário pode cadastrar novos membros e escolher os papéis elegíveis. Cada célula de participante da escala pode ser alterada antes do salvamento. Ao salvar, o app registra as quatro designações de cada semana e permite consultar até dois participantes no painel de histórico.

Escalas gravadas em versões anteriores são migradas automaticamente para o histórico individual na primeira abertura da nova versão. Os dados permanecem locais ao navegador e ao dispositivo.


## Informações do discurso

A área de informações do discurso salva no IndexedDB local os campos de cidade, bairro, rua/estrada/avenida, congregação, tema, cântico, data, horário, observações e urgências/eventualidades. Os campos de texto têm limite de 120 caracteres, enquanto observações e urgências têm limite de 180 caracteres. O usuário deve usar “Salvar neste dispositivo” para persistir a escala e os dados preenchidos.

GitHub Pages
  └── interface do app e funcionamento offline

Cloudflare Worker
  └── API segura do mesmo app

Prisma Postgres
  └── usuários, escalas, históricos e mensagens

Cloudinary / app-escala
  └── fotos dos usuários

Web Push / VAPID
  └── notificações
  

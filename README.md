# 📋 Gerador de Escalas de Reuniões - PWA

Aplicativo Web Progressivo (PWA) simples, rápido e 100% offline projetado para gerenciar e distribuir automaticamente designações de reuniões entre integrantes, garantindo que ninguém receba duas funções na mesma semana.

---

## 🛠️ Arquitetura e Competência dos Arquivos

O projeto segue uma estrutura **modular por responsabilidade** para garantir que alterações na interface ou no banco não quebrem a lógica do algoritmo ou o funcionamento offline:

```text
meu-pwa-reunioes/
├── manifest.json            # Configurações do PWA (ícone, nome, modo tela cheia)
├── sw.js                    # Service Worker (Cache offline de todos os arquivos)
├── index.html               # Estrutura visual e layout da aplicação
├── README.md                # Documentação técnica do projeto
└── src/
    ├── data/
    │   ├── membros.js       # Lista estática de integrantes e papéis permitidos
    │   └── db.js            # Gerenciador de banco de dados offline (IndexedDB)
    ├── logic/
    │   └── geradorEscala.js # Algoritmo de distribuição sem conflitos
    └── ui/
        └── app.js           # Controlador da interface (conecta HTML, DB e Lógica)

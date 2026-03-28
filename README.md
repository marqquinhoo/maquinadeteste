# 🛡️ MCP Maquina de Testes (Testes Inteligentes Multi-Motor)

Uma plataforma de automação e descoberta de testes ponta-a-ponta, utilizando múltiplos motores dinâmicos (**Playwright**, **Selenium WebDriver** e **Cypress**). Desenvolvida para ser flexível, permitindo testar tanto aplicações web públicas quanto projetos locais através de uma interface moderna e intuitiva, com persistência na nuvem pelo **Supabase**.

## 🚀 Funcionalidades Principais

- **Motores Inteligentes (Multi-Engine)**: Escolha dinamicamente rodar seus testes usando Playwright, Selenium ou Cypress.
- **Configuração Dinâmica**: Insira URLs ou caminhos de diretórios locais (convertidos automaticamente).
- **Navegação Inteligente**: O motor executa fluxos baseados em passos a passo dinâmicos definidos no frontend.
- **Logs em Tempo Real**: Acompanhamento detalhado de cada clique, navegação e ação via WebSockets.
- **Armazenamento Otimizado**: Captura de screenshots automáticos processados e armazenados localmente (`/public/screenshots/`), reduzindo a carga do banco de dados.
- **Supabase Integrado**: Histórico e relatórios persistidos no banco de dados distribuído PostgreSQL da Supabase.
- **Isolamento de Execução**: Cada teste roda em um contexto de navegador individual, garantindo integridade dos resultados.

---

## 📂 Estrutura do Projeto

```text
testes-dev/
├── backend/                    # Backend (Executor Core)
│   ├── index.js                # API Express + Socket.io
│   ├── runner.js               # Orquestrador dos Motores
│   ├── runner-playwright.js    # Lógica do Playwright
│   ├── runner-selenium.js      # Lógica do Selenium WebDriver
│   ├── runner-cypress.js       # Lógica do Cypress
│   └── public/screenshots/     # Armazenamento de evidências visuais (imagens salvas em disco)
├── frontend/                   # Frontend (Painel de Controle)
│   ├── src/App.jsx             # Dashbord em React com Dropdown de motor
│   └── src/index.css           # Design System & Estilização
└── start-platform.ps1          # Script de Inicialização Automática (Windows)
```

---

## 🛠️ Requisitos

- **Node.js**: Versão 18 ou superior.
- **NPM**: Gerenciador de pacotes.
- **Banco de Dados (Supabase)**: Conta ativa no [Supabase](https://supabase.com/) com PostgreSQL.

---

## 📦 Instalação e Configuração

### 1. Preparar o Banco de Dados (Supabase)
Crie um projeto no Supabase e copie a chave de conexão do Database (Transaction Pooler). Configure o seu arquivo `.env` dentro da pasta `backend`:
```env
DATABASE_URL=postgresql://postgres:[SUA-SENHA]@db.[sua-rota].supabase.co:5432/postgres
```

### 2. Configurar o Backend e Instalar Browsers
```bash
cd backend
npm install
# Instalar binários do Playwright
npx playwright install chromium --with-deps
```

### 3. Rodar Migrações do Banco
Execute as migrações para criar as tabelas no Supabase:
```bash
npx knex migrate:latest
```

---

### 4. Configurar o Frontend
```bash
cd ../frontend
npm install
```

---

## ▶️ Como Executar

O sistema requer que ambos o Backend e o Frontend estejam rodando simultaneamente.

### Opção via PowerShell (Windows)
Se preferir, você pode usar o script de automação corrigido:
```powershell
./start-platform.ps1
```

### Manualmente
1.  **Terminal 1 (Backend):**
    ```bash
    cd backend
    npm start
    ```
2.  **Terminal 2 (Frontend):**
    ```bash
    cd frontend
    npm run dev
    ```
3.  **Acesso:** Abra **http://localhost:5173** no seu navegador. Os relatórios de API apontam para a **porta 8084**.

---

## 🧪 Como Usar

1. **URL/Diretório**: Insira um endereço web (ex: `https://playwright.dev`) ou um caminho local (ex: `C:\Users\User\Project`).
2. **Motor de Teste**: Selecione qual driver rodará a automação (Playwright, Selenium ou Cypress).
3. **Passos da Automação**: Crie o fluxo (ex: Clique, Digite) via blocos (Filtros) ou cole instruções em texto plano.
4. **Executar**: Clique em "Iniciar fluxo de teste" e acompanhe os logs em tempo real e os prints (que agora são salvos como arquivos fisicamente).

---

## 🔧 Tecnologias Utilizadas

- **Playwright / Selenium / Cypress**: Tríade de engines para automação cross-browser.
- **Express / Node.js**: API REST para gerenciamento de testes e orquestração.
- **Socket.io**: Comunicação bidirecional para logs em tempo real.
- **Supabase (PostgreSQL)**: Persistência distribuída no banco de dados.
- **React 19**: Frontend moderno e reativo.
- **Framer Motion**: Animações de interface.
- **Lucide Icons**: Conjunto de ícones premium.

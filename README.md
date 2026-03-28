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
API_PREFIX=/maquinadeteste
SOCKET_PATH=/maquinadeteste/socket.io
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
3.  **Acesso:** Abra **http://localhost:5173** no seu navegador. Os relatórios de API apontam para a **porta 3002**.

---

## 🧪 Como Usar

1. **URL/Diretório**: Insira um endereço web (ex: `https://playwright.dev`) ou um caminho local (ex: `C:\Users\User\Project`).
2. **Motor de Teste**: Selecione qual driver rodará a automação (Playwright, Selenium ou Cypress).
3. **Passos da Automação**: Crie o fluxo (ex: Clique, Digite) via blocos (Filtros) ou cole instruções em texto plano.
4. **Executar**: Clique em "Iniciar fluxo de teste" e acompanhe os logs em tempo real e os prints (que agora são salvos como arquivos fisicamente).

---

## � Segurança e Controle de Acesso (Admin)

O motor do AutoTesteAI foi projetado para rodar em um ambiente corporativo controlado. Para evitar execuções fora de contexto (como testes em sites adultos, redes não relacionadas ao negócio ou domínios não autorizados), a plataforma possui uma **lista restrita de URLs permitidas**.

- **Painel Administrativo (`/config`)**: O responsável pelos testes (QA Lead / Manager) deve acessar a aba de Configurações no menu lateral para cadastrar as URLs base e portas locais do projeto.
- **Credenciais Iniciais**: O acesso padrão é `admin` / `admin123`. No primeiro login, o sistema exigirá a troca obrigatória da senha para sua segurança.
- Apenas os domínios liberados nesta tela estarão disponíveis para o usuário comum selecionar e iniciar os fluxos de teste na página inicial. A responsabilidade por essas configurações fica a cargo da equipe gestora.

---

## �🔧 Tecnologias Utilizadas

### ⚙️ Backend (Orquestrador e API)
- **Node.js & Express**: Base do servidor responsável por expor a API RESTful e orquestrar as execuções dos testes de forma assíncrona.
- **Motores de Teste (Playwright, Selenium WebDriver, Cypress)**: A tríade de engines utilizada para interagir com o DOM e executar a automação cross-browser, permitindo ampla cobertura e simulação de uso real.
- **Knex.js & pg**: Ferramentas responsáveis por construir queries seguras e conectar-se de forma nativa ao PostgreSQL.
- **Socket.io**: WebSockets integrados para enviar logs, status e etapas de execução em tempo real para a interface de usuário.
- **Supabase (PostgreSQL)**: Banco de dados relacional (na nuvem) de alta performance utilizado para registrar o histórico de relatórios.

### 🎨 Frontend (Dashboard e Interface)
- **React 19 & Vite**: Framework super reativo e servidor de desenvolvimento ágil para a criação da interface do usuário (SPA).
- **React Router DOM**: Gerenciamento das rotas locais e navegação fluida entre histórico e novas automações.
- **Axios**: Cliente HTTP para padronizar o consumo e comunicação com a API do backend.
- **Framer Motion & Lucide React**: Responsáveis, respectivamente, por transições modernas na interface de usuário e iconografia escalável.

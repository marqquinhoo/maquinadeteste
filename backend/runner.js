const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

/**
 * Executes a testing flow using Playwright with support for API Requests and Browser actions.
 */
async function runGenericTest(testId, testData, io, onUpdate = () => {}) {
  const { url, goal, context } = testData;
  const browser = await chromium.launch({ headless: true });
  
  const addLog = (message, type = 'info', screenshot = null) => {
    const log = { timestamp: new Date(), message, type, screenshot };
    testData.logs.push(log);
    if (screenshot) testData.screenshots.push(screenshot);
    io.emit('test_update', { testId, log, status: testData.status });
    onUpdate(testData); 
  };

  try {
    const page = await browser.newPage();
    
    // JS/Network listeners
    page.on('console', msg => { if (msg.type() === 'error') addLog(`🚫 [CONSOLO JS] ${msg.text()}`, 'error'); });
    page.on('pageerror', exception => { addLog(`💥 [EXCEÇÃO JS] ${exception.message}`, 'error'); });
    page.on('response', response => { if (response.status() >= 400) addLog(`🛑 [HTTP ${response.status()}] ${response.url()}`, 'error'); });

    addLog(`🚀 Iniciando Motor AutoTesteAI...`, 'info');

    let navigationUrl = url;
    if (fs.existsSync(url)) {
      navigationUrl = `file://${path.resolve(url)}`;
      addLog(`📁 Drive local: ${navigationUrl}`, 'info');
    }

    addLog(`🧭 Navegando para base: ${navigationUrl}`, 'info');
    await page.goto(navigationUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    
    const initialShot = await page.screenshot({ encoding: 'base64' });
    addLog('📸 Screenshot inicial capturado.', 'success', initialShot);

    // TASK-PARSE
    let tasks = [];
    try {
      if (context) {
        const parsed = (typeof context === 'string') ? JSON.parse(context) : context;
        tasks = Array.isArray(parsed) ? parsed : [parsed];
      }
    } catch (e) {
      addLog(`⚡ Convertendo texto plano em steps...`, 'info');
      const lines = context.split(';').map(l => l.trim()).filter(l => l.length > 0);
      tasks = lines.map(line => ({ action: 'click', selector: `text="${line}"`, description: line }));
    }

    if (tasks.length > 0) {
      addLog(`📑 Processando ${tasks.length} etapas...`, 'info');

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        addLog(`>> [PASSO ${i+1}/${tasks.length}]: ${task.description}`, 'info');

        try {
           if (task.action === 'access' || task.url && task.action !== 'request') {
             await page.goto(task.url || task.value, { waitUntil: 'networkidle', timeout: 30000 });
           }

           if (task.action === 'click') {
              await page.waitForSelector(task.selector, { timeout: 10000, state: 'visible' });
              await page.click(task.selector);
              await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
              addLog(`🖱️ Sucesso: CLICK realizado.`, 'success');
           } else if (task.action === 'type') {
              await page.waitForSelector(task.selector, { timeout: 10000, state: 'visible' });
              await page.click(task.selector);
              await page.fill(task.selector, task.value);
              addLog(`⌨️ Sucesso: Preenchido com "${task.value}".`, 'success');
           } else if (task.action === 'request') {
              // API Request usando o contexto do navegador (herda cookies/sessão)
              const requestUrl = task.url.startsWith('http') ? task.url : new URL(task.url, page.url()).href;
              const response = await page.request.fetch(requestUrl, {
                 method: task.method || 'GET',
                 data: task.value ? (typeof task.value === 'string' && task.value.startsWith('{') ? JSON.parse(task.value) : task.value) : undefined,
                 headers: { 'Content-Type': 'application/json' }
              });
              const status = response.status();
              const responseText = await response.text();
              addLog(`🌐 [API ${task.method}] ${requestUrl} -> Status: ${status}`, status < 400 ? 'success' : 'error');
              addLog(`📄 Resposta: ${responseText.substring(0, 300)}...`, 'info');
           } else if (task.action === 'wait') {
              await page.waitForTimeout(parseInt(task.value) || 3000);
           }

           await page.waitForTimeout(800);
           const shotBase64 = await page.screenshot({ encoding: 'base64' });
           addLog(`📸 Evidência #${i+1} registrada.`, 'success', shotBase64);

        } catch (taskError) {
           addLog(`❌ Falha no passo #${i+1}: ${taskError.message}.`, 'error');
           const errShot = await page.screenshot({ encoding: 'base64', fullPage: true });
           addLog(`📷 Print do erro capturado.`, 'error', errShot);
           throw new Error(`Fluxo interrompido no passo #${i+1}: ${taskError.message}`);
        }
        
        addLog(`<< Etapa concluída.`, 'info');
      }
    }

    addLog(`✅ Fluxo concluído com sucesso.`, 'success');
    testData.status = 'completed';
  } catch (error) {
    addLog(`❌ Falha crítica: ${error.message}`, 'error');
    testData.status = 'failed';
  } finally {
    await browser.close();
    onUpdate(testData);
  }
}

module.exports = { runGenericTest };

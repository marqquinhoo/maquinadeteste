const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.join(__dirname, 'public', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

async function runSeleniumTest(testId, testData, io, onUpdate = () => { }) {
    const { url, goal, context } = testData;

    const options = new chrome.Options();
    options.addArguments('--headless=new');

    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();

    const addLog = (message, type = 'info', screenshotUrl = null) => {
        const log = { timestamp: new Date(), message, type, screenshot: screenshotUrl };
        testData.logs.push(log);
        if (screenshotUrl) testData.screenshots.push(screenshotUrl);
        io.emit('test_update', { testId, log, status: testData.status });
        onUpdate(testData);
    };

    try {
        addLog(`🚀 Iniciando Maquina de Testes (Selenium)...`, 'info');

        let navigationUrl = url;
        if (fs.existsSync(url)) {
            navigationUrl = `file://${path.resolve(url)}`;
            addLog(`📁 Drive local: ${navigationUrl}`, 'info');
        }

        addLog(`🧭 Navegando para base: ${navigationUrl}`, 'info');
        await driver.get(navigationUrl);

        const initialBase64 = await driver.takeScreenshot();
        const initialPath = path.join(screenshotsDir, `${testId}_initial_${Date.now()}.png`);
        fs.writeFileSync(initialPath, initialBase64, 'base64');
        addLog('📸 Screenshot inicial capturado.', 'success', `/maquinadeteste/screenshots/${path.basename(initialPath)}`);

        let tasks = [];
        try {
            if (context) {
                const parsed = (typeof context === 'string') ? JSON.parse(context) : context;
                tasks = Array.isArray(parsed) ? parsed : [parsed];
            }
        } catch (e) {
            addLog(`⚡ Convertendo texto plano em steps...`, 'info');
            const lines = context.split(';').map(l => l.trim()).filter(l => l.length > 0);
            tasks = lines.map(line => ({ action: 'click', selector: `//*[text()="${line}"]`, description: line }));
        }

        const mapSelector = (sel) => {
            if (sel.startsWith('text=')) {
                return By.xpath(`//*[contains(text(), '${sel.replace('text=', '').replace(/"/g, '')}')]`);
            }
            // Fallback to CSS
            return By.css(sel);
        };

        if (tasks.length > 0) {
            addLog(`📑 Processando ${tasks.length} etapas...`, 'info');

            for (let i = 0; i < tasks.length; i++) {
                const task = tasks[i];
                addLog(`>> [PASSO ${i + 1}/${tasks.length}]: ${task.description}`, 'info');

                try {
                    if (task.action === 'access' || task.url && task.action !== 'request') {
                        await driver.get(task.url || task.value);
                    }

                    if (task.action === 'click') {
                        if (!task.selector) {
                            addLog(`⚠️ Aviso: Ação CLICK ignorada (seletor vazio).`, 'warning');
                        } else {
                            const by = mapSelector(task.selector);
                            const element = await driver.wait(until.elementLocated(by), 10000);
                            await driver.wait(until.elementIsVisible(element), 10000);
                            await element.click();
                            addLog(`🖱️ Sucesso: CLICK realizado em "${task.selector}".`, 'success');
                        }
                    } else if (task.action === 'type') {
                        if (!task.selector) {
                            addLog(`⚠️ Aviso: Ação TYPE ignorada (seletor vazio).`, 'warning');
                        } else {
                            const isSensitive = (task.selector && /password|pass|senha|token|secret/i.test(task.selector));
                            const displayValue = isSensitive ? '<REDACTED>' : task.value;
                            addLog(`✍️ Digitando '${displayValue}' em '${task.selector}'...`, 'info');

                            const by = mapSelector(task.selector);
                            const element = await driver.wait(until.elementLocated(by), 10000);
                            await driver.wait(until.elementIsVisible(element), 10000);
                            await element.clear();
                            await element.sendKeys(task.value);
                            addLog(`⌨️ Sucesso: "${displayValue}" digitado em "${task.selector}".`, 'success');
                        }
                    } else if (task.action === 'request') {
                        addLog(`⚠️ [Aviso API] Simulação via JS Fetch.`, 'info');
                        await driver.executeAsyncScript(`
                 var callback = arguments[arguments.length - 1];
                 fetch(arguments[0], { method: arguments[1] })
                   .then(r => r.text())
                   .then(t => callback(t))
                   .catch(e => callback("ERROR"));
              `, task.url, task.method || 'GET');
                    } else if (task.action === 'wait') {
                        await driver.sleep(parseInt(task.value) || 3000);
                    }

                    await driver.sleep(800);
                    const stepBase64 = await driver.takeScreenshot();
                    const stepPath = path.join(screenshotsDir, `${testId}_step${i + 1}_${Date.now()}.png`);
                    fs.writeFileSync(stepPath, stepBase64, 'base64');
                    addLog(`📸 Evidência #${i + 1} registrada.`, 'success', `/maquinadeteste/screenshots/${path.basename(stepPath)}`);

                } catch (taskError) {
                    addLog(`❌ Falha no passo #${i + 1}: ${taskError.message}.`, 'error');
                    const errBase64 = await driver.takeScreenshot();
                    const errPath = path.join(screenshotsDir, `${testId}_err_step${i + 1}_${Date.now()}.png`);
                    fs.writeFileSync(errPath, errBase64, 'base64');
                    addLog(`📷 Print do erro capturado.`, 'error', `/maquinadeteste/screenshots/${path.basename(errPath)}`);
                    throw new Error(`Fluxo interrompido no passo #${i + 1}: ${taskError.message}`);
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
        await driver.quit();
        onUpdate(testData);
    }
}

module.exports = { runSeleniumTest };

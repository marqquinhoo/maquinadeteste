const cypress = require('cypress');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.join(__dirname, 'public', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
}

const cyDir = path.join(__dirname, 'cypress', 'e2e');
if (!fs.existsSync(cyDir)) {
    fs.mkdirSync(cyDir, { recursive: true });
}

async function runCypressTest(testId, testData, io, onUpdate = () => { }) {
    const { url, goal, context } = testData;

    const addLog = (message, type = 'info', screenshotUrl = null) => {
        const log = { timestamp: new Date(), message, type, screenshot: screenshotUrl };
        testData.logs.push(log);
        if (screenshotUrl) testData.screenshots.push(screenshotUrl);
        io.emit('test_update', { testId, log, status: testData.status });
        onUpdate(testData);
    };

    addLog(`🚀 Iniciando Maquina de Testes (Cypress)...`, 'info');

    let tasks = [];
    try {
        if (context) {
            const parsed = (typeof context === 'string') ? JSON.parse(context) : context;
            tasks = Array.isArray(parsed) ? parsed : [parsed];
        }
    } catch (e) {
        const lines = context.split(';').map(l => l.trim()).filter(l => l.length > 0);
        tasks = lines.map(line => ({ action: 'click', selector: `text="${line}"`, description: line }));
    }

    const specSteps = tasks.map((t, i) => {
        let code = '';
        if (t.action === 'access') {
            code = `cy.visit('${t.url || t.value}');`;
        } else if (t.action === 'click') {
            let sel = t.selector.startsWith('text=') ? `contains('${t.selector.replace('text=', '').replace(/"/g, '')}')` : `get('${t.selector}')`;
            code = `cy.${sel}.click();`;
        } else if (t.action === 'type') {
            const isSensitive = t.elementType === 'Input Password' || (t.selector && /password|pass|senha|token|secret/i.test(t.selector));
            const displayValue = isSensitive ? '<REDACTED>' : t.value;
            code = `cy.log("✍️ Digitando '${displayValue}' em '${t.selector}'");\n        cy.get("${t.selector}").type("${t.value}");`;
        } else if (t.action === 'wait') {
            code = `cy.wait(${parseInt(t.value) || 3000});`;
        }
        code += `\n        cy.screenshot('${testId}_step${i + 1}', { overwrite: true });`;
        return code;
    }).join('\n        ');

    const specCode = `
    describe('AutoTesteAI - ${testId}', () => {
      it('Executa o fluxo', () => {
        cy.visit('${url}');
        cy.screenshot('${testId}_initial', { overwrite: true });

        ${specSteps}
      });
    });
  `;

    const specPath = path.join(cyDir, `${testId}.cy.js`);
    fs.writeFileSync(specPath, specCode);

    try {
        addLog(`📑 Cypress rodando em background (logs serão agrupados no final)...`, 'info');

        // Cypress internal folder for running this
        const result = await cypress.run({
            spec: specPath,
            quiet: true,
            config: {
                e2e: {
                    supportFile: false,
                    video: false,
                    screenshotsFolder: screenshotsDir
                }
            }
        });

        // Debug result structure in console
        console.log('Cypress Run Result:', JSON.stringify(result, null, 2));

        if (!result.runs) {
            const msg = result.message || 'Erro desconhecido na execução do Cypress';
            addLog(`❌ Falha no Cypress: ${msg}`, 'error');
            testData.status = 'failed';
        } else {
            const totalFailed = result.totalFailed || 0;
            if (totalFailed > 0) {
                addLog(`❌ Cypress encontrou ${totalFailed} falha(s).`, 'error');
                testData.status = 'failed';
            } else {
                addLog(`✅ Fluxo concluído com sucesso no Cypress.`, 'success');
                testData.status = 'completed';
            }

            // Detailed logs from results
            result.runs.forEach(run => {
                if (run.tests) {
                    run.tests.forEach(test => {
                        const state = test.state;
                        const title = test.title.join(' > ');
                        const icon = state === 'passed' ? '✅' : '❌';
                        addLog(`${icon} Teste: ${title} (${state})`, state === 'passed' ? 'success' : 'error');

                        if (test.displayError) {
                            addLog(`💡 Erro: ${test.displayError}`, 'error');
                        }
                    });
                }
            });
        }

        // Capture screenshots from results and move/rename them properly to public/screenshots
        if (result.runs && result.runs.length > 0) {
            const run = result.runs[0];
            for (const shot of run.screenshots) {
                // shot.path is the absolute path where cypress saved it
                if (fs.existsSync(shot.path)) {
                    const newName = `${Date.now()}_${path.basename(shot.path)}`;
                    const finalPath = path.join(screenshotsDir, newName);
                    fs.renameSync(shot.path, finalPath);
                    addLog(`📸 Evidência Cypress:`, 'success', `/maquinadeteste/screenshots/${newName}`);
                }
            }
        }
    } catch (error) {
        addLog(`❌ Falha crítica no Cypress: ${error.message}`, 'error');
        testData.status = 'failed';
    } finally {
        if (fs.existsSync(specPath)) fs.unlinkSync(specPath);
        onUpdate(testData);
    }
}

module.exports = { runCypressTest };

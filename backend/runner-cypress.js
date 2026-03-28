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

    addLog(`🚀 Iniciando Motor AutoTesteAI (Cypress)...`, 'info');

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

    const specCode = `
    describe('AutoTesteAI - ${testId}', () => {
      it('Executa o fluxo', () => {
        cy.visit('${url}');
        cy.screenshot('${testId}_initial', { overwrite: true });

        ${tasks.map((t, i) => {
        let code = '';
        if (t.action === 'access') {
            code = `cy.visit('${t.url || t.value}');`;
        } else if (t.action === 'click') {
            let sel = t.selector.startsWith('text=') ?\`contains('\${t.selector.replace('text=', '').replace(/"/g, '')}')\` : \`get('\${t.selector}')\`;
             code = `cy.\${ sel }.click(); `;
           } else if (t.action === 'type') {
             let sel = t.selector.startsWith('text=') ? \`contains('\${t.selector.replace('text=', '').replace(/"/g, '')}')\` : \`get('\${t.selector}')\`;
             code = `cy.\${ sel }.type('${t.value}'); `;
           } else if (t.action === 'wait') {
             code = `cy.wait(${ parseInt(t.value) || 3000
        }); `;
           }
           code += `\\n        cy.screenshot('${testId}_step${i+1}', { overwrite: true }); `;
           return code;
        }).join('\n        ')}
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

        if (result.status === 'failed' || result.totalFailed > 0) {
            addLog(`❌ Cypress encontrou falhas. (Consulte os screenshots)`, 'error');
            testData.status = 'failed';
        } else {
            addLog(`✅ Fluxo concluído com sucesso no Cypress.`, 'success');
            testData.status = 'completed';
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

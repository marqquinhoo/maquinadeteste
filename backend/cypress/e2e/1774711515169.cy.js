
    describe('AutoTesteAI - 1774711515169', () => {
      it('Executa o fluxo', () => {
        cy.visit('http://localhost:3001');
        cy.screenshot('1774711515169_initial', { overwrite: true });

        
        cy.screenshot('1774711515169_step1', { overwrite: true });
        cy.contains('Acessar Empresa').click();
        cy.screenshot('1774711515169_step2', { overwrite: true });
        cy.get('#username').click();
        cy.screenshot('1774711515169_step3', { overwrite: true });
        cy.get('#username').type('fazboavista');
        cy.screenshot('1774711515169_step4', { overwrite: true });
        cy.get('#password').click();
        cy.screenshot('1774711515169_step5', { overwrite: true });
        cy.get('#password').type('123@456');
        cy.screenshot('1774711515169_step6', { overwrite: true });
        cy.contains('Formulador').click();
        cy.screenshot('1774711515169_step7', { overwrite: true });
        cy.contains('Formulações Salvas').click();
        cy.screenshot('1774711515169_step8', { overwrite: true });
        cy.contains('Novo Cálculo').click();
        cy.screenshot('1774711515169_step9', { overwrite: true });
      });
    });
  
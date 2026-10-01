(() => {
    const form = document.getElementById('mobile-registration-form');
    const status = document.getElementById('mobile-form-status');
    if (!form || !status) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        const button = form.querySelector('button[type="submit"]');
        if (!button) return;
        button.disabled = true;
        button.textContent = 'Enviando…';
        status.textContent = '';

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: new FormData(form),
                headers: { Accept: 'application/json' },
            });
            if (!response.ok) throw new Error('Falha no envio');
            form.reset();
            status.textContent = 'Cadastro enviado. A equipe entrará em contato caso seu dispositivo seja selecionado.';
        } catch (_) {
            status.textContent = 'Não foi possível enviar agora. Tente novamente em alguns minutos.';
        } finally {
            button.disabled = false;
            button.innerHTML = 'Enviar cadastro <span aria-hidden="true">↗</span>';
        }
    });
})();

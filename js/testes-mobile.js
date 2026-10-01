(() => {
    const form = document.getElementById('mobile-registration-form');
    const status = document.getElementById('mobile-form-status');
    if (!form || !status) return;

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        status.textContent = 'Dados validados neste navegador. Conecte um serviço de cadastro para concluir o envio.';
    });
})();

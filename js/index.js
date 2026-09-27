(function() {
            var banner = document.getElementById('cookie-consent');
            var btn = document.getElementById('btn-aceitar-cookies');
            if (localStorage.getItem('sentinela-cookies-aceitos') === '1') {
                if (banner) banner.classList.add('hidden');
            }
            if (btn) btn.addEventListener('click', function() {
                localStorage.setItem('sentinela-cookies-aceitos', '1');
                if (banner) banner.classList.add('hidden');
            });
        })();

(function() {
            const btn = document.getElementById('btn-inscreva');
            const modal = document.getElementById('modal-boletim');
            const closeBtn = document.getElementById('modal-close');
            const form = document.getElementById('form-boletim');

            function openModal() {
                modal.classList.add('open');
                document.body.style.overflow = 'hidden';
                var email = modal.querySelector('input[type="email"]');
                if (email) email.focus();
            }
            function closeModal() {
                modal.classList.remove('open');
                document.body.style.overflow = '';
                if (btn) btn.focus();
            }

            if (btn) btn.addEventListener('click', openModal);
            if (closeBtn) closeBtn.addEventListener('click', closeModal);
            if (modal) modal.addEventListener('click', function(e) {
                if (e.target === modal) closeModal();
            });
            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
            });

            if (form) form.addEventListener('submit', async function(e) {
                e.preventDefault();
                var btn = form.querySelector('.btn-submit');
                btn.disabled = true;
                btn.textContent = 'Enviando…';
                try {
                    var fd = new FormData(form);
                    var res = await fetch(form.action, { method: 'POST', body: fd, headers: { 'Accept': 'application/json' } });
                    if (res.ok) {
                        var msg = document.createElement('p');
                        msg.className = 'form-success-msg';
                        msg.textContent = 'Obrigado! Em breve você receberá o boletim.';
                        form.appendChild(msg);
                        setTimeout(closeModal, 1500);
                    } else {
                        btn.disabled = false;
                        btn.textContent = 'Inscrever-se';
                        alert('Ocorreu um erro. Tente novamente.');
                    }
                } catch (err) {
                    btn.disabled = false;
                    btn.textContent = 'Inscrever-se';
                    alert('Ocorreu um erro. Tente novamente.');
                }
            });
        })();

        (function() {
            const POSTS_URL = new URL('posts.json', window.location.href).href;
            const POLL_MS = 2 * 60 * 1000; // 2 min – atualização em tempo quasi-real

            const FALLBACK = {
                lastUpdated: new Date().toISOString(),
                posts: [
                    { url: "https://tiparaleigo.wordpress.com/2026/04/03/como-instalar-um-cluster-k3s-com-varios-nos-no-ubuntu-24-04/", text: "Como instalar um cluster K3s com vários nós no Ubuntu 24.04 — O K3s é uma distribuição Kubernetes leve, projetada para simplicidade e baixo consumo de recursos. É ideal para laboratórios, aprendizado de Kubernetes, implantações de borda e ambientes pequenos. Neste guia, aprenderemos passo a passo como instalar… Continuar Lendo →", meta: "Blog de Ti · 3 abr. 2026", date: "2026-04-03T17:25:33.000Z" },
                    { url: "https://tiparaleigo.wordpress.com/2026/04/03/%f0%9f%9b%a0%ef%b8%8f-o-futuro-do-trafego-no-kubernetes-gateway-api/", text: "🛠️ O Futuro do Tráfego no Kubernetes: Gateway API — Neste guia, aprenderemos como instalar a API Gateway no Kubernetes com o Istio como controlador. O Ingress tradicional do Kubernetes tem limitações: é específico do fornecedor, carece de padronização e oferece recursos de roteamento limita… Continuar Lendo →", meta: "Blog de Ti · 3 abr. 2026", date: "2026-04-03T17:20:47.000Z" },
                    { url: "https://tiparaleigo.wordpress.com/2026/03/23/o-que-e-a-vulcan-defense-a-empresa-de-ciberseguranca-que-fala-a-lingua-do-seu-negocio/", text: "O que é a Vulcan Defense? A empresa de cibersegurança que fala a língua do seu negócio — Imagine que a sua empresa é uma casa. Você tem portas, janelas, talvez até uma grade. Mas você sabe se alguém poderia entrar sem que você percebesse? É exatamente isso que a Vulcan Defense faz — só que no mundo digital. 🛡️ Em linguagem si… Continuar Lendo →", meta: "Blog de Ti · 23 mar. 2026", date: "2026-03-23T15:17:12.000Z" },
                    { url: "https://tiparaleigo.wordpress.com/2026/03/15/como-instalar-gateway-api-no-kubernetes/", text: "Como Instalar Gateway API no Kubernetes — Guia prático para redes modernas em clusters Kubernetes Por Rodrigo Carran A forma tradicional de expor aplicações no Kubernetes sempre foi através do Ingress. Porém, esse modelo possui algumas limitações importantes: Para resolver esses p… Continuar Lendo →", meta: "Blog de Ti · 15 mar. 2026", date: "2026-03-15T20:55:41.000Z" },
                    { url: "https://tiparaleigo.wordpress.com/2026/03/15/%f0%9f%92%a1-dica-rapida-para-quem-trabalha-com-redes-automacao-ou-scripts/", text: "💡 Dica rápida para quem trabalha com redes, automação ou scripts — Recentemente precisei editar um grande volume de comandos de configuração de OLT e remover 2 caracteres do final de cada linha. Fazer isso manualmente levaria muito tempo. Resolvi em segundos usando Regex no Notepad++. ⚙️ Passo a passo 1️⃣… Continuar Lendo →", meta: "Blog de Ti · 15 mar. 2026", date: "2026-03-15T20:50:23.000Z" },
                    { url: "https://tiparaleigo.wordpress.com/2026/03/15/zabbix-como-monitorar-emails-nao-lidos-maildir-em-servidores-linux/", text: "Zabbix: Como Monitorar Emails Não Lidos (Maildir) em Servidores Linux — Autor: Rodrigo Carran Em ambientes de NOC, SOC ou suporte técnico, muitas solicitações críticas chegam por email ou voicemail automatizado. Quando essas mensagens não são lidas rapidamente, podem ocorrer problemas como: Uma solução simples… Continuar Lendo →", meta: "Blog de Ti · 15 mar. 2026", date: "2026-03-15T19:36:07.000Z" },
                    { url: "https://tiparaleigo.wordpress.com/2026/03/15/restricao-de-acesso-por-ip-no-proftpd-ip-access-restriction/", text: "Restrição de Acesso por IP no ProFTPd (IP Access Restriction) — Por Rodrigo Carran Controlar quem pode acessar um serviço exposto na rede é uma prática fundamental de segurança. Servidores FTP, por exemplo, são frequentemente alvo de brute force, enumeração de usuários e exfiltração de dados quando não… Continuar Lendo →", meta: "Blog de Ti · 15 mar. 2026", date: "2026-03-15T19:29:33.000Z" },
                    { url: "https://tiparaleigo.wordpress.com/2026/03/15/script-de-backup-via-ftp-com-lftp-no-linux-automatizando-sincronizacao-de-arquivos/", text: "Script de Backup via FTP com LFTP no Linux (Automatizando Sincronização de Arquivos) — Por Rodrigo Carran A automação de backups continua sendo uma das práticas mais importantes para garantir resiliência operacional, recuperação de dados e continuidade de negócios. Mesmo em ambientes modernos com armazenamento em nuvem e pip… Continuar Lendo →", meta: "Blog de Ti · 15 mar. 2026", date: "2026-03-15T18:50:05.000Z" },
                    { url: "https://tiparaleigo.wordpress.com/2025/09/04/como-pesquisar-dentro-de-arquivos-no-linux-com-grep-find-e-ripgrep/", text: "Como Pesquisar Dentro de Arquivos no Linux com grep, find e ripgrep — Trabalhar com Linux muitas vezes significa lidar com milhares de arquivos: logs, configurações, scripts, códigos-fonte. Abrir um por um para encontrar uma linha específica é perda de tempo. É aqui que entram ferramentas como grep, find e r… Continuar Lendo →", meta: "Blog de Ti · 4 set. 2025", date: "2025-09-04T11:50:57.000Z" },
                    { url: "https://tiparaleigo.wordpress.com/2025/09/04/bash-command-substitution-o-guia-definitivo/", text: "Bash Command Substitution: O Guia Definitivo — Se você já usa Linux ou trabalha com scripts, provavelmente já ouviu falar em command substitution (substituição de comandos) no Bash. À primeira vista pode parecer complicado, mas na prática é um recurso simples e extremamente poderoso. E… Continuar Lendo →", meta: "Blog de Ti · 4 set. 2025", date: "2025-09-04T11:47:10.000Z" },
                    { url: "https://tiparaleigo.wordpress.com/", text: "Ver todas as postagens no Blog de Ti →", meta: "Tiparaleigo · Aprofundando seus conhecimentos", date: "2020-01-01T00:00:00.000Z" }
                ]
            };

            function esc(t) {
                const d = document.createElement('div');
                d.textContent = t;
                return d.innerHTML;
            }

            /** Apenas URLs absolutas https — evita javascript:, //host e dados vindos de posts.json. */
            function safePostHref(u) {
                try {
                    const url = new URL(u);
                    return url.protocol === 'https:' ? url.href : '';
                } catch (_) {
                    return '';
                }
            }

            function fmtTime(iso) {
                if (!iso) return '';
                const d = new Date(iso);
                const diff = (Date.now() - d) / 60000;
                if (diff < 1) return 'agora';
                if (diff < 60) return 'há ' + Math.floor(diff) + ' min';
                return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
            }

            function render(data) {
                const c = document.getElementById('linkedin-posts-container');
                const i = document.getElementById('linkedin-posts-update');
                if (!data?.posts?.length) {
                    c.innerHTML = '<div class="posts-loading">Nenhuma publicação.</div>';
                    i.textContent = '';
                    return;
                }
                const sorted = [...data.posts].sort((a,b) => new Date(b.date||0) - new Date(a.date||0));
                const html = sorted.map(p => {
                    const href = safePostHref(p.url);
                    if (!href) return '';
                    return `
                    <a href="${esc(href)}" target="_blank" rel="noopener noreferrer" class="post-card">
                        <p>${esc(p.text)}</p>
                        <span class="post-meta">${esc(p.meta)}</span>
                    </a>`;
                }).filter(Boolean).join('');
                c.innerHTML = html || '<div class="posts-loading">Nenhuma publicação.</div>';
                i.textContent = 'Atualizado ' + fmtTime(data.lastUpdated) + ' · próxima verificação em 2 min';
            }

            async function load() {
                try {
                    const r = await fetch(POSTS_URL);
                    if (r.ok) {
                        const d = await r.json();
                        render(d);
                        return;
                    }
                } catch (_) {}
                render(FALLBACK);
            }

            load();
            setInterval(load, POLL_MS);
        })();

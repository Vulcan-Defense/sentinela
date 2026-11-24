/* Sentinela — contribuidores recentes do CriptoChat.
   Mostra as contas dos pull requests recentes e a participação de cada uma. */
(function () {
    'use strict';

    var USE_PROXY = /^(www\.)?sentinelacibernetica\.com\.br$/.test(location.hostname) || /\.pages\.dev$/.test(location.hostname);
    var REPOS = [
        { key: 'desktop', full: 'hacking-table/crptochat-oss' },
        { key: 'mobile', full: 'Vulcan-Defense/crptochat-android' }
    ];
    var root = document.getElementById('cc-contributors');
    if (!root) return;

    function endpoint(repo) {
        if (!USE_PROXY) {
            return 'https://api.github.com/repos/' + repo.full + '/pulls?state=closed&sort=updated&direction=desc&per_page=10';
        }
        return '/api/github/crptochat?repo=' + repo.key + '&kind=pulls&v=4';
    }

    function placeholder(text) {
        root.textContent = '';
        var p = document.createElement('p');
        p.className = 'cc-activity-placeholder';
        p.textContent = text;
        root.appendChild(p);
    }

    function element(tag, className, text) {
        var node = document.createElement(tag);
        if (className) node.className = className;
        if (text) node.textContent = text;
        return node;
    }

    function render(users) {
        var list = Object.keys(users).map(function (login) {
            return users[login];
        }).filter(function (user) {
            return user.count > 0;
        }).sort(function (a, b) {
            return b.count - a.count || a.login.localeCompare(b.login);
        }).slice(0, 6);

        if (!list.length) {
            placeholder('Nenhum pull request recente para mostrar. Confira os repositórios no GitHub.');
            return;
        }

        var total = list.reduce(function (sum, user) {
            return sum + user.count;
        }, 0);

        root.textContent = '';
        var grid = element('div', 'cc-contributor-grid');

        list.forEach(function (user) {
            var percent = Math.round((user.count / total) * 100);
            var card = element('a', 'cc-contributor');
            card.href = user.url || ('https://github.com/' + encodeURIComponent(user.login));
            card.target = '_blank';
            card.rel = 'noopener noreferrer';
            card.setAttribute('aria-label', 'Perfil de @' + user.login + ' no GitHub');

            var avatar = element('img', 'cc-contributor-avatar');
            avatar.src = user.avatar || '';
            avatar.alt = 'Foto do perfil de @' + user.login;
            avatar.width = 48;
            avatar.height = 48;
            avatar.loading = 'lazy';
            avatar.referrerPolicy = 'no-referrer';

            var meta = element('span', 'cc-contributor-meta');
            meta.appendChild(element('strong', '', '@' + user.login));
            meta.appendChild(element('small', '', user.count + (user.count === 1 ? ' PR · ' : ' PRs · ') + percent + '%'));

            var bar = element('span', 'cc-contributor-bar');
            bar.setAttribute('role', 'img');
            bar.setAttribute('aria-label', percent + '% das contribuições recentes');
            var fill = element('span', 'cc-contributor-fill');
            fill.style.width = percent + '%';
            bar.appendChild(fill);

            card.appendChild(avatar);
            card.appendChild(meta);
            card.appendChild(bar);
            grid.appendChild(card);
        });

        root.appendChild(grid);
    }

    var calls = REPOS.map(function (repo) {
        return fetch(endpoint(repo), {
            headers: { 'Accept': 'application/vnd.github+json' },
            cache: 'no-store'
        }).then(function (response) {
            if (!response.ok) throw new Error('GitHub respondeu ' + response.status);
            return response.json();
        });
    });

    Promise.allSettled(calls).then(function (results) {
        var users = {};
        var ok = 0;

        results.forEach(function (result) {
            if (result.status !== 'fulfilled' || !Array.isArray(result.value)) return;
            ok += 1;
            result.value.forEach(function (pr) {
                var account = pr && pr.user;
                if (!account || !account.login || !pr.merged_at) return;
                var entry = users[account.login] || (users[account.login] = {
                    login: account.login,
                    avatar: account.avatar_url,
                    url: account.html_url,
                    count: 0
                });
                entry.count += 1;
            });
        });

        if (!ok) {
            placeholder('Não foi possível carregar as contribuições agora. Abra os repositórios no GitHub para ver os dados mais recentes.');
            return;
        }
        render(users);
    }).catch(function () {
        placeholder('Não foi possível carregar as contribuições agora. Abra os repositórios no GitHub para ver os dados mais recentes.');
    });
})();

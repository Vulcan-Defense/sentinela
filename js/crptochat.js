/* Sentinela — painel do projeto CriptoChat
   Consulta a API pública do GitHub, sem token, com cache por sessão. */
(function () {
    'use strict';

    var CACHE_KEY = 'sentinela-crptochat-v1';
    var CACHE_TTL = 10 * 60 * 1000;
    var REPOS = [
        {
            key: 'desktop',
            label: 'crptochat-oss',
            api: 'https://api.github.com/repos/hacking-table/crptochat-oss',
            commits: 'https://api.github.com/repos/hacking-table/crptochat-oss/commits?per_page=4'
        },
        {
            key: 'mobile',
            label: 'crptochat-android',
            api: 'https://api.github.com/repos/Vulcan-Defense/crptochat-android',
            commits: 'https://api.github.com/repos/Vulcan-Defense/crptochat-android/commits?per_page=4'
        }
    ];

    var status = document.getElementById('cc-update');
    var activity = document.getElementById('cc-activity');
    if (!status || !activity) return;

    function readCache() {
        try {
            var raw = sessionStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            var entry = JSON.parse(raw);
            if (!entry.data || Date.now() - entry.time > CACHE_TTL || !entry.data.repos) return null;
            return entry;
        } catch {
            return null;
        }
    }

    function writeCache(data) {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data: data }));
        } catch {
            /* Armazenamento indisponível: a página continua funcionando. */
        }
    }

    function getJSON(url) {
        return fetch(url, {
            headers: { 'Accept': 'application/vnd.github+json' },
            cache: 'no-store'
        }).then(function (response) {
            if (!response.ok) throw new Error('GitHub respondeu ' + response.status);
            return response.json();
        });
    }

    function number(value) {
        return typeof value === 'number' ? value.toLocaleString('pt-BR') : '—';
    }

    function date(iso) {
        if (!iso) return '—';
        var parsed = new Date(iso);
        if (isNaN(parsed.getTime())) return '—';
        return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
    }

    function relative(iso) {
        if (!iso) return '';
        var parsed = new Date(iso);
        if (isNaN(parsed.getTime())) return '';
        var minutes = Math.floor((Date.now() - parsed.getTime()) / 60000);
        if (minutes < 1) return 'agora';
        if (minutes < 60) return 'há ' + minutes + ' min';
        var hours = Math.floor(minutes / 60);
        if (hours < 24) return 'há ' + hours + ' h';
        var days = Math.floor(hours / 24);
        if (days < 30) return 'há ' + days + ' d';
        return date(iso);
    }

    function hour() {
        return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(new Date());
    }

    function paintStats(repo, payload) {
        var card = document.querySelector('[data-repo="' + repo.key + '"]');
        if (!card || !payload) return;
        var fields = {
            stargazers_count: number(payload.stargazers_count),
            forks_count: number(payload.forks_count),
            open_issues_count: number(payload.open_issues_count),
            pushed_at: date(payload.pushed_at)
        };
        Object.keys(fields).forEach(function (key) {
            var cell = card.querySelector('[data-metric="' + key + '"]');
            if (cell) cell.textContent = fields[key];
        });
    }

    function paintCommits(entries) {
        activity.textContent = '';

        if (!entries.length) {
            var empty = document.createElement('p');
            empty.className = 'cc-activity-placeholder';
            empty.textContent = 'Nenhum commit recente disponível. Confira os repositórios diretamente no GitHub.';
            activity.appendChild(empty);
            return;
        }

        entries.sort(function (a, b) {
            return new Date(b.when) - new Date(a.when);
        }).slice(0, 8).forEach(function (entry) {
            var row = document.createElement('article');
            row.className = 'cc-commit' + (entry.repo.key === 'mobile' ? ' is-mobile' : '');

            var repo = document.createElement('span');
            repo.className = 'cc-commit-repo';
            repo.textContent = entry.repo.label;

            var link = document.createElement('a');
            link.className = 'cc-commit-title';
            link.href = entry.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = (entry.message || 'Ver commit no GitHub').split('\n')[0];

            var when = document.createElement('time');
            when.className = 'cc-commit-date';
            when.dateTime = entry.when;
            when.textContent = relative(entry.when);

            row.appendChild(repo);
            row.appendChild(link);
            row.appendChild(when);
            activity.appendChild(row);
        });
    }

    function collectCommits(data) {
        var entries = [];
        REPOS.forEach(function (repo) {
            var list = data.commits[repo.key] || [];
            list.forEach(function (commit) {
                var info = commit && commit.commit;
                if (!info || !commit.html_url) return;
                entries.push({
                    repo: repo,
                    url: commit.html_url,
                    message: info.message,
                    when: info.committer && info.committer.date ? info.committer.date : info.author && info.author.date
                });
            });
        });
        return entries;
    }

    function apply(data, cached) {
        REPOS.forEach(function (repo) {
            paintStats(repo, data.repos[repo.key]);
        });
        paintCommits(collectCommits(data));
        status.classList.remove('is-error');
        status.textContent = (cached ? 'Dados em cache de ' : 'Dados do GitHub atualizados às ') + hour() + '.';
    }

    function fail() {
        status.classList.add('is-error');
        status.textContent = 'GitHub indisponível agora — use os links dos repositórios para ver os dados mais recentes.';
        if (!activity.children.length || activity.querySelector('.cc-activity-placeholder')) {
            paintCommits([]);
        }
    }

    var cached = readCache();
    if (cached) apply(cached.data, true);

    var requests = [];
    REPOS.forEach(function (repo) {
        requests.push(getJSON(repo.api).then(function (payload) {
            return { repo: repo, kind: 'stats', payload: payload };
        }));
        requests.push(getJSON(repo.commits).then(function (payload) {
            return { repo: repo, kind: 'commits', payload: payload };
        }));
    });

    Promise.all(requests).then(function (results) {
        var data = { repos: {}, commits: {} };
        results.forEach(function (result) {
            if (result.kind === 'stats') data.repos[result.repo.key] = result.payload;
            else data.commits[result.repo.key] = Array.isArray(result.payload) ? result.payload : [];
        });
        writeCache(data);
        apply(data, false);
    }).catch(fail);
})();

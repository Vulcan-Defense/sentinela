/* Sentinela — status do CriptoChat Android na página de testes mobile.
   Usa o proxy same-origin do Cloudflare Worker quando disponível. */
(function () {
    'use strict';

    var STATS_URL = 'https://api.github.com/repos/Vulcan-Defense/crptochat-android';
    var COMMITS_URL = STATS_URL + '/commits?per_page=3';
    var USE_PROXY = /^(www\.)?sentinelacibernetica\.com\.br$/.test(location.hostname) || /\.pages\.dev$/.test(location.hostname);
    var CACHE_KEY = 'sentinela-mobile-status-v1';
    var CACHE_TTL = 10 * 60 * 1000;

    var update = document.getElementById('mobile-status-update');
    var commitList = document.getElementById('mobile-status-commits');
    var metricNodes = document.querySelectorAll('[data-status-metric]');
    if (!update || !commitList) return;

    function endpoint(kind) {
        if (!USE_PROXY) return kind === 'stats' ? STATS_URL : COMMITS_URL;
        return '/api/github/crptochat?repo=mobile&kind=' + kind + '&v=3';
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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

    function readCache() {
        try {
            var raw = sessionStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            var entry = JSON.parse(raw);
            if (!entry.data || Date.now() - entry.time > CACHE_TTL) return null;
            return entry;
        } catch {
            return null;
        }
    }

    function writeCache(data) {
        try {
            sessionStorage.setItem(CACHE_KEY, JSON.stringify({ time: Date.now(), data: data }));
        } catch {
            /* Sem armazenamento, o painel continua funcionando. */
        }
    }

    function apply(data, fromCache) {
        var repo = data.stats || {};
        metricNodes.forEach(function (node) {
            var key = node.getAttribute('data-status-metric');
            node.textContent = key === 'pushed_at' ? date(repo.pushed_at) : number(repo[key]);
        });

        var commits = Array.isArray(data.commits) ? data.commits : [];
        if (!commits.length) {
            commitList.innerHTML = '<li>Nenhum commit recente encontrado.</li>';
        } else {
            commitList.innerHTML = commits.slice(0, 3).map(function (item) {
                var commit = item.commit || {};
                var message = String(commit.message || '').split('\n')[0];
                var url = item.html_url || '#';
                var when = commit.author && commit.author.date ? commit.author.date : '';
                return '<li><a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' +
                    escapeHtml(message) + '</a>' +
                    (when ? '<time datetime="' + escapeHtml(when) + '">' + escapeHtml(date(when)) + '</time>' : '') +
                    '</li>';
            }).join('');
        }

        update.textContent = fromCache ? 'Dados salvos · atualizando…' : 'Atualizado agora · fonte: GitHub';
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

    var cached = readCache();
    if (cached) apply(cached.data, true);

    Promise.allSettled([getJSON(endpoint('stats')), getJSON(endpoint('commits'))]).then(function (results) {
        if (results[0].status !== 'fulfilled' || results[1].status !== 'fulfilled') {
            update.textContent = 'GitHub indisponível · tente recarregar em instantes.';
            return;
        }
        var data = { stats: results[0].value, commits: results[1].value };
        writeCache(data);
        apply(data, false);
    });
})();

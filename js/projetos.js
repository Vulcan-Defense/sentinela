(function () {
    'use strict';

    var els = {
        grid: document.getElementById('project-grid'),
        empty: document.getElementById('projects-empty'),
        result: document.getElementById('projects-result'),
        update: document.getElementById('projects-update'),
        refresh: document.getElementById('projects-refresh'),
        search: document.getElementById('projects-search'),
        sort: document.getElementById('projects-sort'),
        filters: Array.prototype.slice.call(document.querySelectorAll('.projects-filter')),
        totalProjects: document.getElementById('total-projects'),
        totalStars: document.getElementById('total-stars'),
        totalForks: document.getElementById('total-forks'),
        totalCollaborators: document.getElementById('total-collaborators')
    };

    if (!els.grid) return;

    var state = {
        data: null,
        filter: 'all',
        sort: 'score',
        query: ''
    };

    var numberFormat = new Intl.NumberFormat('pt-BR');
    var dateFormat = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' });
    var relativeFormat = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function daysSince(iso) {
        var time = Date.parse(iso);
        if (isNaN(time)) return 9999;
        return Math.max(0, Math.floor((Date.now() - time) / 86400000));
    }

    function relativeDate(iso) {
        var days = daysSince(iso);
        if (days === 0) return 'atualizado hoje';
        if (days < 30) return 'atualizado ' + relativeFormat.format(-days, 'day');
        if (days < 365) return 'atualizado ' + relativeFormat.format(-Math.floor(days / 30), 'month');
        return 'atualizado ' + relativeFormat.format(-Math.floor(days / 365), 'year');
    }

    function score(project) {
        var freshness = Math.max(0, 60 - daysSince(project.pushedAt)) / 60;
        return project.stars * 3 + project.forks * 2 + project.collaborators + freshness * 8;
    }

    function visibleProjects() {
        var query = state.query.trim().toLocaleLowerCase('pt-BR');

        var list = state.data.projects.filter(function (project) {
            if (state.filter === 'featured' && !project.featured) return false;
            if (state.filter !== 'all' && state.filter !== 'featured' && project.owner !== state.filter) return false;
            if (!query) return true;
            var haystack = [project.name, project.fullName, project.description, project.language]
                .concat(project.tags || [])
                .join(' ')
                .toLocaleLowerCase('pt-BR');
            return haystack.indexOf(query) !== -1;
        });

        var sorters = {
            score: function (a, b) { return score(b) - score(a); },
            stars: function (a, b) { return b.stars - a.stars || b.forks - a.forks; },
            forks: function (a, b) { return b.forks - a.forks || b.stars - a.stars; },
            collaborators: function (a, b) { return b.collaborators - a.collaborators || b.stars - a.stars; },
            updated: function (a, b) { return Date.parse(b.pushedAt) - Date.parse(a.pushedAt); },
            name: function (a, b) { return a.name.localeCompare(b.name, 'pt-BR'); }
        };

        return list.sort(sorters[state.sort] || sorters.score);
    }

    function cardHtml(project, index) {
        var badge = project.featured
            ? '<span class="project-badge">destaque</span>'
            : project.isFork
                ? '<span class="project-badge is-fork">fork</span>'
                : '';

        var tags = (project.tags || []).map(function (tag) {
            return '<span class="project-tag">' + escapeHtml(tag) + '</span>';
        }).join('');

        var homepage = project.homepage
            ? '<a href="' + escapeHtml(project.homepage) + '" target="_blank" rel="noopener noreferrer">site do projeto ↗</a>'
            : '';

        return '<article class="project-card' + (project.featured ? ' is-featured' : '') + '" data-accent="' + escapeHtml(project.accent || 'lime') + '">' +
            '<div class="project-card-head">' +
                '<span class="project-rank">#' + String(index + 1).padStart(2, '0') + '</span>' +
                badge +
            '</div>' +
            '<div>' +
                '<h3>' + escapeHtml(project.name) + '</h3>' +
                '<span class="project-fullname">' + escapeHtml(project.fullName) + '</span>' +
                '<p class="project-description">' + escapeHtml(project.description || 'Projeto público sem descrição no GitHub.') + '</p>' +
            '</div>' +
            (tags ? '<div class="project-tags">' + tags + '</div>' : '') +
            '<dl class="project-stats">' +
                '<div class="project-stat"><dt>Estrelas</dt><dd>' + numberFormat.format(project.stars) + '</dd></div>' +
                '<div class="project-stat"><dt>Forks</dt><dd>' + numberFormat.format(project.forks) + '</dd></div>' +
                '<div class="project-stat"><dt>Colaboradores</dt><dd>' + numberFormat.format(project.collaborators) + '</dd></div>' +
            '</dl>' +
            '<p class="project-meta"><span>' + escapeHtml(project.language) + '</span><span>' + escapeHtml(project.license) + '</span><span>' + escapeHtml(relativeDate(project.pushedAt)) + '</span></p>' +
            '<div class="project-links">' +
                '<a href="' + escapeHtml(project.url) + '" target="_blank" rel="noopener noreferrer">ver no GitHub ↗</a>' +
                homepage +
            '</div>' +
        '</article>';
    }

    function renderCounters() {
        var projects = state.data.projects || [];
        els.totalProjects.textContent = numberFormat.format(projects.length);
        els.totalStars.textContent = numberFormat.format(projects.reduce(function (t, p) { return t + p.stars; }, 0));
        els.totalForks.textContent = numberFormat.format(projects.reduce(function (t, p) { return t + p.forks; }, 0));
        els.totalCollaborators.textContent = numberFormat.format(projects.reduce(function (t, p) { return t + p.collaborators; }, 0));
        els.update.textContent = 'Instantâneo de ' + dateFormat.format(new Date(state.data.generatedAt)) + ' · fonte: API pública do GitHub';
    }

    function render() {
        if (!state.data) return;

        renderCounters();

        var list = visibleProjects();
        var sortLabels = {
            score: 'relevância', stars: 'estrelas', forks: 'forks',
            collaborators: 'colaboradores', updated: 'atividade recente', name: 'nome'
        };

        els.result.textContent = list.length + ' de ' + state.data.projects.length + ' projetos · ordenados por ' + (sortLabels[state.sort] || 'relevância');
        els.grid.innerHTML = list.map(cardHtml).join('');
        els.empty.hidden = list.length !== 0;
    }

    function contributorsCount(fullName) {
        return fetch('https://api.github.com/repos/' + fullName + '/contributors?per_page=1&anon=false', {
            headers: { Accept: 'application/vnd.github+json' }
        }).then(function (response) {
            var link = response.headers.get('link') || '';
            var match = link.match(/[?&]page=(\d+)>; rel="last"/);
            if (match) return Number(match[1]);
            if (!response.ok) return 0;
            return response.json().then(function (json) { return json.length; });
        });
    }

    function refresh() {
        if (!state.data) return;

        els.refresh.disabled = true;
        els.refresh.textContent = 'Atualizando…';
        els.update.textContent = 'Consultando a API do GitHub…';

        var projects = state.data.projects;
        var chain = Promise.resolve();

        projects.forEach(function (project) {
            chain = chain.then(function () {
                return fetch('https://api.github.com/repos/' + project.fullName, {
                    headers: { Accept: 'application/vnd.github+json' }
                }).then(function (response) {
                    if (!response.ok) throw new Error('GitHub respondeu ' + response.status);
                    var remaining = Number(response.headers.get('x-ratelimit-remaining'));
                    if (!isNaN(remaining) && remaining < 3) throw new Error('Limite de requisições da API atingido');
                    return response.json();
                }).then(function (repo) {
                    project.stars = repo.stargazers_count;
                    project.forks = repo.forks_count;
                    project.issues = repo.open_issues_count;
                    project.pushedAt = repo.pushed_at;
                    project.language = repo.language || '—';
                    project.homepage = repo.homepage || '';
                    project.license = repo.license ? repo.license.spdx_id : '—';
                    project.isFork = repo.fork;
                    return contributorsCount(project.fullName);
                }).then(function (count) {
                    project.collaborators = count;
                });
            });
        });

        chain.then(function () {
            state.data.generatedAt = new Date().toISOString();
            render();
            els.update.textContent = 'Dados atualizados às ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + ' · fonte: API pública do GitHub';
        }).catch(function (error) {
            els.update.textContent = 'Não foi possível atualizar (' + error.message + '). Exibindo o último instantâneo salvo.';
        }).then(function () {
            els.refresh.disabled = false;
            els.refresh.textContent = 'Atualizar do GitHub';
        });
    }

    els.search.addEventListener('input', function (event) {
        state.query = event.target.value || '';
        render();
    });

    els.sort.addEventListener('change', function (event) {
        state.sort = event.target.value;
        render();
    });

    els.filters.forEach(function (button) {
        button.addEventListener('click', function () {
            state.filter = button.getAttribute('data-filter');
            els.filters.forEach(function (item) {
                item.setAttribute('aria-pressed', String(item === button));
            });
            render();
        });
    });

    els.refresh.addEventListener('click', refresh);

    fetch('data/projetos.json', { cache: 'no-store' })
        .then(function (response) {
            if (!response.ok) throw new Error('HTTP ' + response.status);
            return response.json();
        })
        .then(function (data) {
            state.data = data;
            render();
        })
        .catch(function () {
            els.grid.innerHTML = '';
            els.update.textContent = 'Não foi possível carregar data/projetos.json.';
            els.empty.hidden = false;
        });
})();

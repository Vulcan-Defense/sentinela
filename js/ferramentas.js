(function () {
    'use strict';

    var tools = Array.isArray(window.SENTINELA_TOOL_CATALOG) ? window.SENTINELA_TOOL_CATALOG : [];
    var search = document.getElementById('tool-search');
    var grid = document.getElementById('tool-grid');
    var filters = document.getElementById('category-filters');
    var result = document.getElementById('catalog-result');
    var empty = document.getElementById('catalog-empty');
    var selectedCategory = 'Todas';
    var categories = Array.from(new Set(tools.map(function (tool) { return tool.category; })));

    document.getElementById('total-tools').textContent = String(tools.length);
    document.getElementById('total-categories').textContent = String(categories.length);

    function appendText(parent, tag, text, className) {
        var element = document.createElement(tag);
        element.textContent = text;
        if (className) element.className = className;
        parent.appendChild(element);
        return element;
    }

    function createFilter(category) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'filter-button';
        button.textContent = category;
        button.dataset.category = category;
        button.setAttribute('aria-pressed', String(category === selectedCategory));
        button.addEventListener('click', function () {
            selectedCategory = category;
            Array.prototype.forEach.call(filters.querySelectorAll('button'), function (item) {
                item.setAttribute('aria-pressed', String(item.dataset.category === selectedCategory));
            });
            render();
        });
        filters.appendChild(button);
    }

    function matches(tool, query) {
        if (selectedCategory !== 'Todas' && tool.category !== selectedCategory) return false;
        if (!query) return true;
        return [tool.name, tool.purpose, tool.application, tool.access, tool.platform, tool.notes, tool.category]
            .join(' ')
            .toLocaleLowerCase('pt-BR')
            .indexOf(query) !== -1;
    }

    function createToolCard(tool) {
        var card = document.createElement('article');
        card.className = 'catalog-card';
        var top = document.createElement('div');
        top.className = 'card-top';
        var heading = document.createElement('h3');
        var link = document.createElement('a');
        link.href = tool.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = tool.name;
        link.setAttribute('aria-label', 'Abrir ' + tool.name + ' em uma nova guia');
        heading.appendChild(link);
        top.appendChild(heading);
        appendText(top, 'span', tool.category, 'tool-category');
        card.appendChild(top);
        appendText(card, 'p', tool.purpose, 'tool-purpose');
        appendText(card, 'p', tool.application, 'tool-application');

        var metadata = document.createElement('div');
        metadata.className = 'tool-metadata';
        appendText(metadata, 'span', tool.access, 'tool-badge');
        appendText(metadata, 'span', tool.platform, 'tool-badge');
        card.appendChild(metadata);

        var details = document.createElement('details');
        var summary = document.createElement('summary');
        summary.textContent = 'Ver observações';
        details.appendChild(summary);
        appendText(details, 'p', tool.notes, 'tool-notes');
        card.appendChild(details);
        return card;
    }

    function render() {
        var query = search.value.trim().toLocaleLowerCase('pt-BR');
        var visible = tools.filter(function (tool) { return matches(tool, query); });
        grid.replaceChildren();
        visible.forEach(function (tool) { grid.appendChild(createToolCard(tool)); });
        result.textContent = visible.length + (visible.length === 1 ? ' ferramenta encontrada' : ' ferramentas encontradas');
        empty.hidden = visible.length !== 0;
    }

    createFilter('Todas');
    categories.forEach(createFilter);
    search.addEventListener('input', render);
    render();

    var banner = document.getElementById('cookie-consent');
    var acceptButton = document.getElementById('btn-aceitar-cookies');
    if (localStorage.getItem('sentinela-cookies-aceitos') === '1') banner.classList.add('hidden');
    acceptButton.addEventListener('click', function () {
        localStorage.setItem('sentinela-cookies-aceitos', '1');
        banner.classList.add('hidden');
    });
}());

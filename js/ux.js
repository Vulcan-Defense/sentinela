(function () {
    try {
        document.documentElement.classList.add('js-motion');
        if (localStorage.getItem('sentinela-cookies-aceitos') === '1') {
            document.documentElement.classList.add('cookies-ok');
        }
    } catch (e) {}

    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    onReady(function () {
        var banner = document.getElementById('cookie-consent');
        var btn = document.getElementById('btn-aceitar-cookies');
        var accepted = document.documentElement.classList.contains('cookies-ok');

        if (banner && !accepted) {
            requestAnimationFrame(function () {
                banner.classList.add('is-visible');
            });
        }

        if (btn && banner) {
            btn.addEventListener('click', function () {
                try {
                    localStorage.setItem('sentinela-cookies-aceitos', '1');
                } catch (e) {}
                banner.classList.remove('is-visible');
                banner.classList.add('hidden');
                banner.addEventListener('transitionend', function () {
                    document.documentElement.classList.add('cookies-ok');
                }, { once: true });
            });
        }

        var els = document.querySelectorAll('[data-reveal]');
        if (!els.length) return;

        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce || !('IntersectionObserver' in window)) {
            els.forEach(function (el) { el.classList.add('is-in'); });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('is-in');
                io.unobserve(entry.target);
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });

        els.forEach(function (el) { io.observe(el); });
    });
})();

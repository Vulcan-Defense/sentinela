(function () {
    'use strict';

    function positionMenu(toggle, menu) {
        var rect = toggle.getBoundingClientRect();
        var menuRect = menu.getBoundingClientRect();
        var margin = 12;
        var gap = 8;
        var left = rect.left;
        var maxLeft = window.innerWidth - menuRect.width - margin;

        if (left > maxLeft) left = maxLeft;
        if (left < margin) left = margin;

        menu.style.setProperty('--nav-menu-left', Math.round(left) + 'px');
        menu.style.setProperty('--nav-menu-top', Math.round(rect.bottom + gap) + 'px');
    }

    function initDropdown(toggle) {
        var menu = document.getElementById(toggle.getAttribute('aria-controls'));
        if (!menu) return;

        var open = function () {
            menu.hidden = false;
            toggle.setAttribute('aria-expanded', 'true');
            positionMenu(toggle, menu);
        };

        var close = function (restoreFocus) {
            menu.hidden = true;
            toggle.setAttribute('aria-expanded', 'false');
            if (restoreFocus) toggle.focus();
        };

        toggle.addEventListener('click', function () {
            if (menu.hidden) open();
            else close(false);
        });

        toggle.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                open();
                var firstLink = menu.querySelector('a');
                if (firstLink) firstLink.focus();
            }
        });

        menu.addEventListener('keydown', function (event) {
            if (event.key === 'Escape') {
                event.preventDefault();
                close(true);
            }
        });

        document.addEventListener('click', function (event) {
            if (!menu.hidden && !toggle.contains(event.target) && !menu.contains(event.target)) {
                close(false);
            }
        });

        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && !menu.hidden && !menu.contains(document.activeElement)) {
                close(false);
            }
        });

        window.addEventListener('resize', function () {
            if (!menu.hidden) positionMenu(toggle, menu);
        }, { passive: true });

        window.addEventListener('scroll', function () {
            if (!menu.hidden) positionMenu(toggle, menu);
        }, { passive: true });

        var navInner = toggle.closest('.nav-inner');
        if (navInner) {
            navInner.addEventListener('scroll', function () {
                if (!menu.hidden) positionMenu(toggle, menu);
            }, { passive: true });
        }
    }

    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    onReady(function () {
        document.querySelectorAll('[data-nav-menu-toggle]').forEach(initDropdown);
    });
})();

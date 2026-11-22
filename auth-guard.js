/**
 * InisCare Supervisors Security Gate
 * Enforces 4-digit PIN authentication (1024) across all supervisory forms.
 */
(function() {
    'use strict';
    var isAuth = sessionStorage.getItem('iniscare_pin_unlocked') === '1024';
    if (!isAuth) {
        var currentPath = window.location.pathname.split('/').pop() || 'index.html';
        if (currentPath !== 'index.html' && currentPath !== 'portal-auth-preview.html') {
            window.location.replace('index.html?blocked=1&from=' + encodeURIComponent(currentPath));
        }
    }
})();

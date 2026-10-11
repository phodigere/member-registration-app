(function () {
  'use strict';

  var healthEl = document.getElementById('db-health');
  if (healthEl) {
    fetch('/health')
      .then(function (r) { return r.json(); })
      .then(function (data) {
        if (data.status === 'ok') {
          healthEl.textContent = 'db ' + data.database + ' connected';
          healthEl.classList.add('is-ok');
        } else {
          healthEl.textContent = 'db unavailable';
          healthEl.classList.add('is-down');
        }
      })
      .catch(function () {
        healthEl.textContent = 'db unavailable';
        healthEl.classList.add('is-down');
      });
  }

  var form = document.getElementById('member-form');
  var submitBtn = document.getElementById('submit-btn');

  if (form && submitBtn) {
    form.addEventListener('submit', function () {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving…';
    });
  }

  var panel = document.getElementById('register-panel');
  if (panel && window.location.hash === '#register') {
    panel.hidden = false;
    var first = document.getElementById('name');
    if (first) first.focus();
  }

  document.querySelectorAll('.table tbody tr').forEach(function (row) {
    row.querySelectorAll('td').forEach(function (cell) {
      var header = cell.previousElementSibling;
      if (header && header.tagName === 'TH') cell.setAttribute('data-label', header.textContent.trim());
    });
  });
})();

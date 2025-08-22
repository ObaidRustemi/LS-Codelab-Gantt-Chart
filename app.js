(function () {
  'use strict';

  // Minimal starter script. Pure DOM for now.
  function init() {
    var root = document.getElementById('gantt-root');
    if (!root) return;

    var info = document.createElement('div');
    info.className = 'badge';
    info.textContent = 'Starter ready';

    var msg = document.createElement('p');
    msg.style.marginTop = '8px';
    msg.style.color = 'var(--muted)';
    msg.textContent = 'Add tasks, timeline grid, and bars next.';

    root.appendChild(info);
    root.appendChild(msg);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

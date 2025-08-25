// Minimal LS sanity: prove the pipeline renders something on screen
(function () {
  const el = document.createElement('div');
  el.textContent = 'HELLO PIPELINE';
  el.style.position = 'absolute';
  el.style.left = '12px';
  el.style.top = '12px';
  el.style.color = '#f59e0b';
  el.style.font = 'bold 18px system-ui, -apple-system, Segoe UI, Roboto, Arial';
  document.body.appendChild(el);
})();



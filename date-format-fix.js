(() => {
  const apply = () => {
    document.documentElement.lang = 'en-GB';
    document.querySelectorAll('input[type="date"]').forEach(input => {
      input.lang = 'en-GB';
      input.title = 'Date format: DD/MM/YYYY';
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  new MutationObserver(apply).observe(document.body,{childList:true,subtree:true});
})();

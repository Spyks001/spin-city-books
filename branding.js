(() => {
  const logoSrc = 'assets/spin-city-logo.webp';
  const addBranding = () => {
    const appView = document.getElementById('appView');
    if (!appView) return;

    const nav = appView.querySelector('.nav');
    if (nav && !appView.querySelector('.app-logo-banner')) {
      const banner = document.createElement('div');
      banner.className = 'app-logo-banner';
      banner.innerHTML = `<img src="${logoSrc}" alt="Spin City Laundry Services logo"><div><strong>spincity</strong><span>Spin City Laundry Services</span></div>`;
      nav.insertAdjacentElement('beforebegin', banner);
    }

    appView.querySelectorAll('.tab').forEach(tab => {
      if (tab.querySelector('.page-logo')) return;
      const heading = tab.querySelector('h2, h3');
      const logo = document.createElement('div');
      logo.className = 'page-logo';
      logo.innerHTML = `<img src="${logoSrc}" alt="Spin City Laundry Services logo"><span>spincity</span>`;
      if (heading) heading.parentElement.insertBefore(logo, heading);
      else tab.insertBefore(logo, tab.firstChild);
    });
  };

  const style = document.createElement('style');
  style.textContent = `
    .app-logo-banner{display:flex;align-items:center;gap:14px;background:#fff;border:1px solid #dce7f5;border-radius:14px;padding:10px 16px;margin:0 0 14px;box-shadow:0 2px 8px #0b3a6b12}
    .app-logo-banner img{width:58px;height:42px;object-fit:contain;border-radius:8px}
    .app-logo-banner strong{display:block;font-size:21px;line-height:1;color:#0758b8;text-transform:lowercase}
    .app-logo-banner span{display:block;margin-top:4px;font-size:11px;color:#536b8f}
    .page-logo{display:flex;align-items:center;gap:10px;margin:0 0 12px;padding-bottom:10px;border-bottom:1px solid #dce7f5}
    .page-logo img{width:52px;height:38px;object-fit:contain;border-radius:7px}
    .page-logo span{font-weight:800;font-size:18px;color:#0758b8;text-transform:lowercase}
    @media(max-width:520px){.app-logo-banner{padding:8px 12px}.app-logo-banner img{width:48px;height:36px}}
  `;
  document.head.appendChild(style);

  addBranding();
  new MutationObserver(addBranding).observe(document.body, { childList: true, subtree: true });
})();

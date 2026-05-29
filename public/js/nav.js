function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function initNav() {
  const brand = document.querySelector('.nav-brand');
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');

  if (toggle && links) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', links.classList.contains('open'));
    });
    links.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => links.classList.remove('open'));
    });
  }

  try {
    const s = await Api.getSettings();
    if (brand) {
      brand.innerHTML = `
        <img src="/images/logo.png" alt="" class="nav-logo" width="60" height="60">
        <span class="nav-brand-text">${escapeHtml(s.restaurant_name)}</span>`;
    }
    if (document.title.includes('Restaurant')) {
      document.title = document.title.replace(/Restaurant[^—]*/i, s.restaurant_name);
    }
  } catch {
    if (brand && !brand.querySelector('.nav-logo')) {
      brand.innerHTML = `
        <img src="/images/logo.png" alt="" class="nav-logo" width="60" height="60">
        <span class="nav-brand-text">Shanthi Foods</span>`;
    }
  }
}

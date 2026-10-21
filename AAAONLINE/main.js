/* 渲染脚本：日常只需编辑 content.js，并把图片放入 assets 文件夹。 */
(() => {
  const d = window.siteContent;
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => document.querySelectorAll(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>\'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]));

  let lang = 'zh';
  try { lang = localStorage.getItem('siteLanguage') || 'zh'; } catch (_) { /* local preview may block storage */ }
  let category = 'all';
  let shown = 8;

  const path = (object, key) => key.split('.').reduce((value, part) => value?.[part], object);
  const t = (key) => path(d.locales[lang], key) ?? path(d.locales.zh, key) ?? '';
  const l = (localized) => localized?.[lang] ?? localized?.zh ?? '';

  // 卡片优先使用 assets/optimized/ 里的 WebP 小图，图片不存在时会自动换回原图。
  // 原图只在大图弹窗里使用，所以产品页打开会快很多。
  const optimized = (url) => {
    if (!url || /^assets\/optimized\//.test(url) || /\.webp$/i.test(url)) return url;
    return url.replace(/^assets\//, 'assets/optimized/').replace(/\.(png|jpe?g)$/i, '.webp');
  };
  const optionalImage = (url, className, alt = '') => {
    if (!url) return '';
    return `<img class="${className} optional-image" data-optional-image src="${esc(optimized(url))}" data-original="${esc(url)}" alt="${esc(alt)}" loading="lazy" decoding="async">`;
  };

  // A reserved image area is only activated after its image has loaded successfully.
  // This keeps missing/blank image slots completely unobtrusive in normal browsing.
  const setBackgroundImage = (selector, url, className = 'has-image') => {
    const element = typeof selector === 'string' ? $(selector) : selector;
    if (!element) return;
    element.classList.remove(className);
    element.style.backgroundImage = '';
    if (!url) return;

    const load = () => {
      const probe = new Image();
      probe.onload = () => {
        element.style.backgroundImage = `url("${url.replace(/["\\]/g, '\\$&')}")`;
        element.classList.add(className);
      };
      probe.onerror = () => {
        element.style.backgroundImage = '';
        element.classList.remove(className);
      };
      probe.src = url;
    };

    // 大图滚动到附近时才加载，首屏会更快。
    const section = element.closest('section') || element;
    if (!('IntersectionObserver' in window)) {
      load();
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      load();
    }, { rootMargin: '500px 0px' });
    observer.observe(section);
  };

  const activateOptionalImages = (root = document) => {
    root.querySelectorAll('img[data-optional-image]').forEach((image) => {
      if (image.dataset.optionalBound) return;
      image.dataset.optionalBound = '1';
      const loaded = () => {
        image.classList.remove('image-missing');
        image.classList.add('image-loaded');
        image.closest('.product-card')?.classList.add('has-product-image');
        const figure = image.closest('figure');
        figure?.classList.remove('is-empty');
        figure?.classList.add('has-gallery-image');
      };
      const failed = () => {
        // 缩略图不存在时，自动换回原图，避免卡片整张消失。
        if (image.dataset.original && !image.dataset.fallbackTried) {
          image.dataset.fallbackTried = '1';
          image.src = image.dataset.original;
          return;
        }
        image.classList.remove('image-loaded');
        image.classList.add('image-missing');
        image.closest('.product-card')?.classList.remove('has-product-image');
        const figure = image.closest('figure');
        if (figure) {
          figure.classList.remove('has-gallery-image');
          figure.classList.add('is-empty');
          figure.removeAttribute('data-gallery-image');
          figure.removeAttribute('data-gallery-title');
          figure.removeAttribute('tabindex');
          figure.removeAttribute('role');
          figure.removeAttribute('aria-label');
        }
      };
      image.addEventListener('load', loaded);
      image.addEventListener('error', failed);
      if (image.complete && image.naturalWidth > 0) loaded();
    });
  };

  const activateBrandLogos = () => {
    $$('[data-brand-logo]').forEach((image) => {
      const brand = image.closest('.brand');
      image.classList.remove('image-loaded');
      if (!d.assets.logo) {
        if (brand) brand.classList.remove('has-logo');
        image.removeAttribute('src');
        return;
      }
      image.onload = () => {
        image.classList.add('image-loaded');
        if (brand) brand.classList.add('has-logo');
      };
      image.onerror = () => {
        image.classList.remove('image-loaded');
        if (brand) brand.classList.remove('has-logo');
      };
      image.src = d.assets.logo;
    });
  };

  const openDetail = (title, body, image = '') => {
    let modal = $('#detailModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'detailModal';
      modal.className = 'detail-modal';
      modal.innerHTML = `<div class="detail-backdrop" data-detail-close></div>
        <section class="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detailTitle">
          <button class="detail-close" type="button" aria-label="${esc(t('labels.close'))}" data-detail-close>×</button>
          <div class="detail-image"></div>
          <div class="detail-copy"><p class="eyebrow" data-detail-eyebrow></p><h2 id="detailTitle"></h2>
            <p class="detail-body"></p><a class="button lime detail-contact" href="#contact"><span></span><b>↗</b></a>
          </div>
        </section>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', (event) => {
        if (event.target.closest('[data-detail-close]') || event.target.closest('.detail-contact')) {
          modal.classList.remove('is-open');
          document.body.classList.remove('detail-modal-open');
        }
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          modal.classList.remove('is-open');
          document.body.classList.remove('detail-modal-open');
        }
      });
    }

    modal.querySelector('#detailTitle').textContent = title;
    modal.querySelector('.detail-body').textContent = body || t('labels.defaultDetailText');
    modal.querySelector('[data-detail-eyebrow]').textContent = t('labels.detailEyebrow');
    modal.querySelector('.detail-contact span').textContent = t('actions.productInquiry');
    const imageElement = modal.querySelector('.detail-image');
    imageElement.style.backgroundImage = '';
    imageElement.style.display = 'none';
    if (image) {
      const probe = new Image();
      probe.onload = () => {
        imageElement.style.backgroundImage = `url("${image.replace(/["\\]/g, '\\$&')}")`;
        imageElement.style.display = 'block';
      };
      probe.onerror = () => {
        imageElement.style.backgroundImage = '';
        imageElement.style.display = 'none';
      };
      probe.src = image;
    }
    modal.classList.add('is-open');
    document.body.classList.add('detail-modal-open');
  };

  const renderProducts = () => {
    const allProducts = d.products.filter((product) => category === 'all' || product.category === category);
    const visibleProducts = allProducts.slice(0, shown);
    $('#productsGrid').innerHTML = visibleProducts.map((product) => `
      <article class="product-card ${esc(product.tone || 'dark')}"
        data-detail-title="${esc(l(product.name))}"
        data-detail-body="${esc(l(product.text))}"
        data-detail-image="${esc(product.image)}">
        ${optionalImage(product.image, 'product-image')}
        <div class="product-art"><i></i><i></i></div>
        <div class="product-info"><small>${esc(product.no)} · ${esc(t('products.categories.' + product.category))}</small>
          <h3>${esc(l(product.name))}</h3><p>${esc(l(product.text))}</p>
          <button class="product-detail-trigger" type="button" aria-label="${esc(t('labels.moreAbout') + ' ' + l(product.name))}">↗</button>
        </div>
      </article>`).join('');
    $('#loadMore').style.display = allProducts.length > shown ? 'inline-flex' : 'none';
    activateOptionalImages($('#productsGrid'));
  };

  const render = () => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang;
    document.title = d.company.name;
    $('#languageSelect').innerHTML = ['zh', 'en', 'id'].map((code) => `<option value="${code}">${esc(t('labels.languageNames.' + code))}</option>`).join('');
    $('#languageSelect').value = lang;
    $$('[data-brand]').forEach((element) => { element.textContent = d.company.initial; });
    $$('[data-brand-name]').forEach((element) => { element.textContent = d.company.name; });
    $('[data-copyright]').textContent = d.company.copyright;
    $$('[data-t]').forEach((element) => { element.textContent = t(element.dataset.t); });
    $$('[data-aria-t]').forEach((element) => { element.setAttribute('aria-label', t(element.dataset.ariaT)); });
    $$('[data-html]').forEach((element) => { element.innerHTML = t(element.dataset.html); });

    $('#stats').innerHTML = t('stats').map((item) => `
      <article class="stat"><strong>${esc(item.number)}<small>${esc(item.suffix)}</small></strong><span>${esc(item.label)}</span></article>`).join('');

    $('#productFilter').innerHTML = d.productCategories.map((key) => `
      <button data-category="${esc(key)}" class="${key === category ? 'active' : ''}">${esc(t('products.categories.' + key))}</button>`).join('');
    renderProducts();

    $('#solutionsList').innerHTML = d.solutions.map((solution, index) => `
      <button type="button" class="solution-item" style="--solution:url('${esc(solution.image)}')"
        data-detail-title="${esc(l(solution.title))}" data-detail-image="${esc(solution.image)}">
        ${optionalImage(solution.image, 'solution-thumb')}
        <span>0${index + 1}</span><strong>${esc(l(solution.title))}</strong><b>↗</b>
      </button>`).join('');

    $('#supportGrid').innerHTML = d.support.map((item) => `
      <button type="button" class="support-card" data-detail-title="${esc(l(item.title))}" data-detail-body="${esc(l(item.text))}" data-detail-image="${esc(item.image || '')}">
        ${optionalImage(item.image, 'support-thumb')}
        <b>${esc(item.label ? l(item.label) : item.icon)}</b><h3>${esc(l(item.title))}</h3><p>${esc(l(item.text))}</p><i>↗</i>
      </button>`).join('');

    $('#galleryGrid').innerHTML = d.gallery.map((item) => {
      const title = l(item.title);
      const image = optionalImage(item.image, 'gallery-image', title);
      const open = image
        ? ` data-gallery-image="${esc(item.image)}" data-gallery-title="${esc(title)}" tabindex="0" role="button" aria-label="${esc(title)}"`
        : '';
      return `<figure class="${esc(item.size)}${image ? '' : ' is-empty'}"${open}>${image}<figcaption>${esc(title)}</figcaption></figure>`;
    }).join('');

    $('#contactLinks').innerHTML = d.contactLinks.map((item) => item.type === 'qr' ? `
      <div class="contact-link qr"><button class="qr-zoom" type="button" aria-label="${esc(l(item.label))} - ${esc(t('labels.enlargeQr'))}"><img src="${esc(item.image)}" alt="${esc(l(item.label))}"></button><div><strong>${esc(l(item.label))}</strong><small>${esc(l(item.note))}</small></div></div>` : `
      <a class="contact-link" href="${esc(item.url)}" target="_blank" rel="noopener"><div><strong>${esc(l(item.label))}</strong><small>${esc(l(item.note))}</small></div><b>${esc(item.icon || '↗')}</b></a>`).join('');

    $('[data-contact-main]').href = d.contactMainLink;
    $('#footerContact').innerHTML = d.company.contact.map((contact) => `<span>${esc(contact)}</span>`).join('');
    activateOptionalImages($('#solutionsList'));
    activateOptionalImages($('#supportGrid'));
    activateOptionalImages($('#galleryGrid'));
    activateBrandLogos();
  };

  // 大页面图片路径写在 index.html 对应页面标题附近的 data-page-image 属性中。
  // 没填写路径或图片不存在时，图片区域自动隐藏，不显示破图或空白框。
  const applyPageImage = (sectionSelector, imageSelector) => {
    const section = $(sectionSelector);
    setBackgroundImage(imageSelector, section?.dataset.pageImage || '');
  };
  applyPageImage('#home', '#heroImage');
  applyPageImage('#about', '#introImage');
  applyPageImage('#vision', '#visionImage');
  applyPageImage('#products', '#productsImage');
  applyPageImage('#solutions', '#solutionsImage');
  applyPageImage('#support', '#supportImage');
  applyPageImage('.gallery', '#galleryImage');
  applyPageImage('#contact', '#contactImage');
  $('#languageSelect').value = lang;
  render();

  $('#languageSelect').addEventListener('change', (event) => {
    lang = event.target.value;
    try { localStorage.setItem('siteLanguage', lang); } catch (_) { /* optional persistence */ }
    render();
  });
  $('#productFilter').addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    category = button.dataset.category;
    shown = 8;
    render();
  });
  $('#loadMore').addEventListener('click', () => {
    shown += 8;
    renderProducts();
  });
  const header = $('.site-header');
  addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 45), { passive: true });
  $('.menu-toggle').addEventListener('click', () => $('.main-nav').classList.toggle('open'));

  const closeZoom = (modal) => {
    modal.classList.remove('is-open');
    document.body.classList.remove('zoom-open');
  };

  // 二维码和企业画廊共用同一个放大弹窗；kind 为 'photo' 时按大图比例显示。
  const openZoom = (source, label, kind = 'qr') => {
    let modal = $('#qrZoomModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'qrZoomModal';
      modal.className = 'qr-zoom-modal';
      modal.innerHTML = `<button class="qr-zoom-backdrop" type="button" aria-label="${esc(t('labels.closeQr'))}" data-qr-close></button>
        <section class="qr-zoom-dialog" role="dialog" aria-modal="true" aria-label="${esc(t('labels.qrDialog'))}">
          <button class="qr-zoom-close" type="button" aria-label="${esc(t('labels.close'))}" data-qr-close>×</button>
          <img class="qr-zoom-large" alt="">
          <p class="qr-zoom-caption"></p>
          <small>${esc(t('labels.closeQrHint'))}</small>
        </section>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', (event) => {
        if (event.target.closest('[data-qr-close]')) closeZoom(modal);
      });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeZoom(modal);
      });
    }
    const dialog = modal.querySelector('.qr-zoom-dialog');
    dialog.classList.toggle('is-photo', kind === 'photo');
    dialog.setAttribute('aria-label', kind === 'photo' ? label : t('labels.qrDialog'));
    modal.querySelector('.qr-zoom-large').src = source;
    modal.querySelector('.qr-zoom-large').alt = label;
    modal.querySelector('.qr-zoom-caption').textContent = label;
    modal.classList.add('is-open');
    document.body.classList.add('zoom-open');
  };

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const item = document.activeElement?.closest?.('[data-gallery-image]');
    if (!item) return;
    event.preventDefault();
    openZoom(item.dataset.galleryImage, item.dataset.galleryTitle || '', 'photo');
  });

  document.addEventListener('click', (event) => {
    const qrButton = event.target.closest('.qr-zoom');
    if (qrButton) {
      const qrImage = qrButton.querySelector('img');
      if (qrImage) openZoom(qrImage.currentSrc || qrImage.src, qrImage.alt || qrButton.getAttribute('aria-label') || t('labels.qrGeneric'));
      return;
    }
    const galleryItem = event.target.closest('[data-gallery-image]');
    if (galleryItem) {
      event.preventDefault();
      openZoom(galleryItem.dataset.galleryImage, galleryItem.dataset.galleryTitle || '', 'photo');
      return;
    }
    const trigger = event.target.closest('[data-detail-title],.product-detail-trigger,[data-detail-static]');
    if (!trigger) return;
    const card = trigger.matches('.product-detail-trigger') ? trigger.closest('.product-card') : trigger;
    if (trigger.hasAttribute('data-detail-static')) {
      event.preventDefault();
      const key = trigger.dataset.detailStatic;
      const title = t(key + '.title').replace(/<br\s*\/?\s*>/gi, ' ');
      openDetail(title, t(key + '.text'), key === 'vision' ? '' : d.assets.sustainability);
      return;
    }
    event.preventDefault();
    openDetail(
      card.dataset.detailTitle || card.querySelector('h3,strong')?.textContent || '',
      card.dataset.detailBody || '',
      card.dataset.detailImage || ''
    );
  });
})();

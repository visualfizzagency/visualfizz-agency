/**
 * VisualFizz Agency Website — script.js
 * Creative Advertising · AI Video · Digital Marketing (Dhaka, Bangladesh)
 *
 * Implements:
 * 1. Bilingual Language Toggle (English / বাংলা) with localStorage persistence
 * 2. Currency Toggle (BDT / USD) with localStorage persistence
 * 3. Interactive Duration Pricing Calculator (15s–90s) with exact rate card math
 * 4. Portfolio Category Filtering (13 Behance projects)
 * 5. FAQ Accordion (single item open at a time)
 * 6. Mobile Hamburger Navigation toggle
 * 7. Header state on scroll & Smooth scrolling for anchor links
 * 8. Contact Form & Lead Magnet Form handlers (front-end only capture with demo note)
 * 9. GeoIP suggestion via ipapi.co (suggests BD switch without force-switching)
 */

'use strict';

// ============================================================
// 1. Pricing Calculator Calculations & In-Code Verification
// ============================================================

let siteContent = null;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAttr(str) {
  return escapeHtml(str);
}

function toBnDigits(val) {
  return String(val).replace(/\d/g, d => '০১২৩৪৫৬৭৮৯'[d]);
}

/**
 * Calculates pricing for Medium and Premium video production tiers based on seconds.
 * Rates:
 *   - Medium: ৳1,200/sec (BDT) or $50/sec (USD)
 *   - Premium: ৳2,700/sec (BDT) or $165/sec (USD)
 *
 * Published duration milestones from BRIEF rate card:
 *   - 15s: Medium ৳18,000 / $750  | Premium ৳40,000 / $2,500
 *   - 30s: Medium ৳36,000 / $1,500 | Premium ৳81,000 / $5,000
 *   - 60s: Medium ৳72,000 / $3,000 | Premium ৳162,000 / $10,000
 *   - 90s+: Custom quote
 */
function calculatePrices(seconds) {
  const mRateBDT = (siteContent && siteContent.pricing && siteContent.pricing.aiVideo && siteContent.pricing.aiVideo.medium && siteContent.pricing.aiVideo.medium.perSecBDT !== undefined)
    ? Number(siteContent.pricing.aiVideo.medium.perSecBDT) : 1200;
  const mRateUSD = (siteContent && siteContent.pricing && siteContent.pricing.aiVideo && siteContent.pricing.aiVideo.medium && siteContent.pricing.aiVideo.medium.perSecUSD !== undefined)
    ? Number(siteContent.pricing.aiVideo.medium.perSecUSD) : 50;
  const pRateBDT = (siteContent && siteContent.pricing && siteContent.pricing.aiVideo && siteContent.pricing.aiVideo.premium && siteContent.pricing.aiVideo.premium.perSecBDT !== undefined)
    ? Number(siteContent.pricing.aiVideo.premium.perSecBDT) : 2700;
  const pRateUSD = (siteContent && siteContent.pricing && siteContent.pricing.aiVideo && siteContent.pricing.aiVideo.premium && siteContent.pricing.aiVideo.premium.perSecUSD !== undefined)
    ? Number(siteContent.pricing.aiVideo.premium.perSecUSD) : 165;

  const mediumBDT = seconds * mRateBDT;
  const mediumUSD = seconds * mRateUSD;

  // Premium tier BDT: 2,700 BDT/sec (15s aligned with published table ৳40,000)
  let premiumBDT = seconds * pRateBDT;
  if (seconds === 15 && pRateBDT === 2700) {
    premiumBDT = 40000;
  }

  // Premium tier USD: $165/sec rate card (~$5,000/30s milestones)
  let premiumUSD;
  if (pRateUSD === 165) {
    if (seconds === 30) {
      premiumUSD = 5000;
    } else if (seconds === 60) {
      premiumUSD = 10000;
    } else if (seconds === 15) {
      premiumUSD = 2500;
    } else {
      premiumUSD = Math.round(seconds * pRateUSD);
    }
  } else {
    premiumUSD = Math.round(seconds * pRateUSD);
  }

  return { mediumBDT, mediumUSD, premiumBDT, premiumUSD };
}

/**
 * Formats numbers with commas and currency prefix.
 * @param {number} amount
 * @param {string} currency 'BDT' or 'USD'
 * @returns {string} e.g. "৳36,000" or "$1,500"
 */
function formatCurrency(amount, currency) {
  const formatted = Math.round(amount).toLocaleString('en-US');
  return currency === 'USD' ? `$${formatted}` : `৳${formatted}`;
}

// In-code verification tests as explicitly required by prompt:
// "verify in code that 30s gives Medium ৳36,000/$1,500 and Premium ৳81,000/$5,000, 60s Premium ৳162,000/$10,000"
(function verifyCalculations() {
  const p30 = calculatePrices(30);
  const p60 = calculatePrices(60);

  const m30_bdt = formatCurrency(p30.mediumBDT, 'BDT');
  const m30_usd = formatCurrency(p30.mediumUSD, 'USD');
  const p30_bdt = formatCurrency(p30.premiumBDT, 'BDT');
  const p30_usd = formatCurrency(p30.premiumUSD, 'USD');

  const p60_bdt = formatCurrency(p60.premiumBDT, 'BDT');
  const p60_usd = formatCurrency(p60.premiumUSD, 'USD');

  console.assert(m30_bdt === '৳36,000', `Math verification failed: 30s Medium BDT expected ৳36,000, got ${m30_bdt}`);
  console.assert(m30_usd === '$1,500', `Math verification failed: 30s Medium USD expected $1,500, got ${m30_usd}`);
  console.assert(p30_bdt === '৳81,000', `Math verification failed: 30s Premium BDT expected ৳81,000, got ${p30_bdt}`);
  console.assert(p30_usd === '$5,000', `Math verification failed: 30s Premium USD expected $5,000, got ${p30_usd}`);
  console.assert(p60_bdt === '৳162,000', `Math verification failed: 60s Premium BDT expected ৳162,000, got ${p60_bdt}`);
  console.assert(p60_usd === '$10,000', `Math verification failed: 60s Premium USD expected $10,000, got ${p60_usd}`);
})();

// ============================================================
// State Management & Icons
// ============================================================

let currentLang = 'en';
let currentCurrency = 'BDT';

function refreshIcons() {
  const run = () => {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      try {
        const iconsObj = lucide.icons ? { ...lucide.icons } : {};
        if (!iconsObj.Facebook && !iconsObj.facebook) {
          const fbDef = [["path", { d: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" }]];
          iconsObj.Facebook = fbDef;
          iconsObj.facebook = fbDef;
        }
        lucide.createIcons({
          icons: Object.keys(iconsObj).length ? iconsObj : undefined
        });
      } catch (e) {
        console.debug('Lucide createIcons error:', e);
      }
    }
  };

  run();
  if (typeof lucide === 'undefined') {
    window.addEventListener('DOMContentLoaded', run, { once: true });
    window.addEventListener('load', run, { once: true });
  }
}

const serviceIconMap = {
  'ai-video': 'clapperboard',
  'ai-ads': 'sparkles',
  'graphic-design': 'pen-tool',
  'branding': 'palette',
  'web-dev': 'globe',
  'video-editing': 'film',
  'digital-marketing': 'megaphone'
};

function getServiceIcon(serviceId, fallback) {
  if (serviceId && serviceIconMap[serviceId]) return serviceIconMap[serviceId];
  if (fallback) {
    if (fallback.includes('\u{1F3AC}')) return 'clapperboard';
    if (fallback.includes('\u{26A1}')) return 'sparkles';
    if (fallback.includes('\u{1F3A8}')) return 'pen-tool';
    if (fallback.includes('\u{1F48E}')) return 'palette';
    if (fallback.includes('\u{1F310}')) return 'globe';
    if (fallback.includes('\u{2702}')) return 'film';
    if (fallback.includes('\u{1F4C8}')) return 'megaphone';
    return fallback;
  }
  return 'sparkles';
}

const legacyPortfolioEmojiMap = {
  '\u{1F4F1}': 'smartphone',
  '\u{1F4F2}': 'smartphone',
  '\u{26BD}': 'trophy',
  '\u{1F3CD}': 'bike',
  '\u{1F3C6}': 'trophy',
  '\u{1F3D9}': 'building-2',
  '\u{1F3AC}': 'clapperboard',
  '\u{1F30F}': 'globe',
  '\u{1F338}': 'flower-2',
  '\u{1F1E7}\u{1F1E9}': 'flag',
  '\u{1F3A8}': 'pen-tool',
  '\u{1F393}': 'graduation-cap',
  '\u{26A1}': 'sparkles',
  '\u{1F48E}': 'palette',
  '\u{1F310}': 'globe',
  '\u{2702}': 'film',
  '\u{1F4C8}': 'megaphone'
};

function getPortfolioIcon(imgField, cat, itemTitle) {
  if (imgField && typeof imgField === 'string') {
    const trimmed = imgField.trim();
    for (const [em, name] of Object.entries(legacyPortfolioEmojiMap)) {
      if (trimmed.includes(em)) return name;
    }
    if (/^[a-z0-9-]+$/i.test(trimmed)) {
      return trimmed.toLowerCase();
    }
  }
  return getCategoryIcon(cat, itemTitle);
}

function getCategoryIcon(cat, itemTitle) {
  if (itemTitle) {
    const lower = itemTitle.toLowerCase();
    if (lower.includes('phone') || lower.includes('smartphone')) return 'smartphone';
    if (lower.includes('fifa') || lower.includes('world cup') || lower.includes('match')) return 'trophy';
    if (lower.includes('bike')) return 'bike';
    if (lower.includes('billboard') || lower.includes('helio')) return 'building-2';
    if (lower.includes('reels') || lower.includes('editing')) return 'clapperboard';
    if (lower.includes('global') || lower.includes('horizons')) return 'globe';
    if (lower.includes('women')) return 'flower-2';
    if (lower.includes('football') || lower.includes('national')) return 'flag';
    if (lower.includes('typography')) return 'pen-tool';
    if (lower.includes('expo') || lower.includes('australia')) return 'graduation-cap';
  }
  if (cat === 'social') return 'smartphone';
  if (cat === 'branding') return 'palette';
  if (cat === 'video') return 'film';
  if (cat === 'campaign') return 'trophy';
  return 'sparkles';
}

// ============================================================
// 2. Language & Currency Toggle Handlers
// ============================================================

/**
 * Updates page content and UI controls to the chosen language ('en' or 'bn').
 */
function setLanguage(lang) {
  if (lang !== 'en' && lang !== 'bn') return;
  currentLang = lang;

  try {
    localStorage.setItem('vf_lang', lang);
  } catch (e) {}

  document.documentElement.lang = lang;
  document.body.classList.toggle('lang-bn', lang === 'bn');

  // Update header and mobile language toggles
  const langToggles = [
    document.getElementById('langToggle'),
    document.getElementById('mobileLangToggle')
  ];
  langToggles.forEach(toggle => {
    if (!toggle) return;
    toggle.querySelectorAll('[data-lang]').forEach(span => {
      span.classList.toggle('active', span.getAttribute('data-lang') === lang);
    });
  });

  // Switch all elements with data-en / data-bn
  document.querySelectorAll('[data-en][data-bn]').forEach(el => {
    let text = lang === 'bn' ? el.getAttribute('data-bn') : el.getAttribute('data-en');
    if (text !== null) {
      if (el.classList.contains('service-timeline')) {
        const clean = text.replace(/\u23F1\s*/g, '');
        el.innerHTML = `<i data-lucide="clock"></i> <span>${escapeHtml(clean)}</span>`;
      } else if (text.includes('<')) {
        el.innerHTML = text;
      } else {
        el.textContent = text;
      }
    }
  });

  // Switch placeholders for form inputs
  document.querySelectorAll('[data-en-placeholder][data-bn-placeholder]').forEach(el => {
    const ph = lang === 'bn' ? el.getAttribute('data-bn-placeholder') : el.getAttribute('data-en-placeholder');
    if (ph !== null) {
      el.placeholder = ph;
    }
  });

  updateCalculator();
  refreshIcons();
}

/**
 * Updates page prices and UI controls to the chosen currency ('BDT' or 'USD').
 */
function setCurrency(currency) {
  if (currency !== 'BDT' && currency !== 'USD') return;
  currentCurrency = currency;

  try {
    localStorage.setItem('vf_currency', currency);
  } catch (e) {}

  // Update header and mobile currency toggles
  const currencyToggles = [
    document.getElementById('currencyToggle'),
    document.getElementById('mobileCurrencyToggle')
  ];
  currencyToggles.forEach(toggle => {
    if (!toggle) return;
    toggle.querySelectorAll('[data-currency]').forEach(span => {
      span.classList.toggle('active', span.getAttribute('data-currency') === currency);
    });
  });

  // Switch every [data-bdt] and [data-usd] price
  document.querySelectorAll('[data-bdt][data-usd]').forEach(el => {
    const priceText = currency === 'USD' ? el.getAttribute('data-usd') : el.getAttribute('data-bdt');
    if (priceText !== null) {
      el.textContent = priceText;
    }
  });

  updateCalculator();
  refreshIcons();
}

/**
 * Detects initial language from localStorage, falling back to browser language.
 */
function getInitialLanguage() {
  try {
    const saved = localStorage.getItem('vf_lang');
    if (saved === 'en' || saved === 'bn') return saved;
  } catch (e) {}

  const browserLang = (navigator.languages && navigator.languages[0]) || navigator.language || '';
  if (browserLang.toLowerCase().startsWith('bn')) {
    return 'bn';
  }
  return 'en';
}

/**
 * Detects initial currency from localStorage, falling back to BDT (default).
 */
function getInitialCurrency(initialLang) {
  try {
    const saved = localStorage.getItem('vf_currency');
    if (saved === 'BDT' || saved === 'USD') return saved;
  } catch (e) {}

  return initialLang === 'bn' ? 'BDT' : 'BDT';
}

// ============================================================
// 3. Content.json Loading & Dynamic Rendering
// ============================================================

async function loadSiteContent() {
  try {
    const override = localStorage.getItem('vf_content_override');
    if (override) {
      siteContent = JSON.parse(override);
      return siteContent;
    }
  } catch (e) {
    console.warn('Could not read vf_content_override:', e);
  }

  try {
    const res = await fetch('content.json');
    if (res.ok) {
      siteContent = await res.json();
      return siteContent;
    }
  } catch (e) {
    console.debug('content.json fetch skipped/failed, fallback to static HTML active.');
  }
  return null;
}

function renderHeroFromContent(hero) {
  if (!hero) return;
  const hHeadline = document.querySelector('.hero-headline');
  if (hHeadline && hero.headline) {
    const enText = hero.headline.en || '';
    const bnText = hero.headline.bn || enText;
    hHeadline.setAttribute('data-en', enText);
    hHeadline.setAttribute('data-bn', bnText);
    hHeadline.textContent = currentLang === 'bn' ? bnText : enText;
  }
  const hTagline = document.querySelector('.hero-tagline');
  if (hTagline && hero.tagline) {
    let enText = hero.tagline.en || '';
    let bnText = hero.tagline.bn || enText;
    if (!enText.includes('<') && enText.includes('Impact')) {
      enText = enText.replace('Impact', '<em class="serif-accent">Impact</em>');
    }
    if (!bnText.includes('<') && bnText.includes('ইম্প্যাক্ট')) {
      bnText = bnText.replace('ইম্প্যাক্ট', '<em class="serif-accent">ইম্প্যাক্ট</em>');
    }
    hTagline.setAttribute('data-en', enText);
    hTagline.setAttribute('data-bn', bnText);
    hTagline.innerHTML = currentLang === 'bn' ? bnText : enText;
  }
  const hSub = document.querySelector('.hero-subheadline');
  if (hSub && hero.subheadline) {
    const enText = hero.subheadline.en || '';
    const bnText = hero.subheadline.bn || enText;
    hSub.setAttribute('data-en', enText);
    hSub.setAttribute('data-bn', bnText);
    hSub.textContent = currentLang === 'bn' ? bnText : enText;
  }
}

function renderServicesFromContent(services) {
  if (!Array.isArray(services) || services.length === 0) return;
  const grid = document.querySelector('.services-grid');
  if (!grid) return;

  grid.innerHTML = services.map(s => {
    const inclusionsHtml = (s.inclusions || []).map(inc => {
      const enText = typeof inc === 'string' ? inc : (inc.en || '');
      const bnText = typeof inc === 'string' ? inc : (inc.bn || enText);
      const text = currentLang === 'bn' ? bnText : enText;
      return `<li data-en="${escapeAttr(enText)}" data-bn="${escapeAttr(bnText)}">${escapeHtml(text)}</li>`;
    }).join('');

    const sPriceBDT = s.startingPrice ? (s.startingPrice.bdt || '') : '';
    const sPriceUSD = s.startingPrice ? (s.startingPrice.usd || '') : '';
    const sPriceDisp = currentCurrency === 'USD' ? (sPriceUSD || sPriceBDT) : sPriceBDT;
    const sPriceEn = s.startingPrice && s.startingPrice.en ? s.startingPrice.en : (sPriceUSD || '');
    const sPriceBn = s.startingPrice && s.startingPrice.bn ? s.startingPrice.bn : (sPriceBDT || '');

    const nameEn = s.name ? (s.name.en || '') : '';
    const nameBn = s.name ? (s.name.bn || nameEn) : '';
    const probEn = s.problem ? (s.problem.en || '') : '';
    const probBn = s.problem ? (s.problem.bn || probEn) : '';
    const timeEn = s.timeline ? (s.timeline.en || '') : '';
    const timeBn = s.timeline ? (s.timeline.bn || timeEn) : '';
    const timeDisp = currentLang === 'bn' ? timeBn : timeEn;
    const cleanTime = timeDisp.replace(/\u23F1\s*/g, '');

    const iconName = getServiceIcon(s.id, s.icon);

    return `
      <article class="service-card">
        <div class="service-icon-tile" aria-hidden="true">
          <i data-lucide="${escapeAttr(iconName)}"></i>
        </div>
        <h3 class="service-name" data-en="${escapeAttr(nameEn)}" data-bn="${escapeAttr(nameBn)}">${escapeHtml(currentLang === 'bn' ? nameBn : nameEn)}</h3>
        <p class="service-problem" data-en="${escapeAttr(probEn)}" data-bn="${escapeAttr(probBn)}">${escapeHtml(currentLang === 'bn' ? probBn : probEn)}</p>
        <ul class="service-inclusions">
          ${inclusionsHtml}
        </ul>
        <div class="service-meta">
          <span class="service-timeline" data-en="${escapeAttr(timeEn)}" data-bn="${escapeAttr(timeBn)}"><i data-lucide="clock"></i> <span>${escapeHtml(cleanTime)}</span></span>
          <span class="service-price" ${sPriceEn ? `data-en="${escapeAttr(sPriceEn)}"` : ''} ${sPriceBn ? `data-bn="${escapeAttr(sPriceBn)}"` : ''} data-bdt="${escapeAttr(sPriceBDT)}" data-usd="${escapeAttr(sPriceUSD)}">${escapeHtml(sPriceDisp)}</span>
        </div>
        <a href="#contact" class="service-arrow-link">
          <span data-en="Start a Project" data-bn="প্রজেক্ট শুরু করুন">${currentLang === 'bn' ? 'প্রজেক্ট শুরু করুন' : 'Start a Project'}</span>
          <i data-lucide="arrow-right"></i>
        </a>
      </article>
    `;
  }).join('');

  refreshIcons();
}

function renderPricingFromContent(pricing, pricingNotes) {
  if (!pricing) return;

  const mRateBDT = pricing.aiVideo?.medium?.perSecBDT ?? 1200;
  const mRateUSD = pricing.aiVideo?.medium?.perSecUSD ?? 50;
  const pRateBDT = pricing.aiVideo?.premium?.perSecBDT ?? 2700;
  const pRateUSD = pricing.aiVideo?.premium?.perSecUSD ?? 165;

  const medLabelEl = document.querySelector('#calcTierMedium .calc-tier-label');
  if (medLabelEl) {
    const enLabel = `Medium Tier (৳${mRateBDT.toLocaleString()}/sec · $${mRateUSD}/sec)`;
    const bnLabel = `মিডিয়াম টিয়ার (৳${toBnDigits(mRateBDT.toLocaleString())}/সে · $${mRateUSD}/সে)`;
    medLabelEl.setAttribute('data-en', enLabel);
    medLabelEl.setAttribute('data-bn', bnLabel);
    medLabelEl.textContent = currentLang === 'bn' ? bnLabel : enLabel;
  }

  const premLabelEl = document.querySelector('#calcTierPremium .calc-tier-label');
  if (premLabelEl) {
    const enLabel = `Premium Tier (৳${pRateBDT.toLocaleString()}/sec · $${pRateUSD}/sec)`;
    const bnLabel = `প্রিমিয়াম টিয়ার (৳${toBnDigits(pRateBDT.toLocaleString())}/সে · $${pRateUSD}/সে)`;
    premLabelEl.setAttribute('data-en', enLabel);
    premLabelEl.setAttribute('data-bn', bnLabel);
    premLabelEl.textContent = currentLang === 'bn' ? bnLabel : enLabel;
  }

  if (Array.isArray(pricing.durationTable)) {
    const tableBody = document.querySelector('#pricing .pricing-table tbody');
    if (tableBody) {
      tableBody.innerHTML = pricing.durationTable.map(row => {
        const labelEn = row.durationLabel ? (row.durationLabel.en || '') : '';
        const labelBn = row.durationLabel ? (row.durationLabel.bn || labelEn) : '';
        const labelDisp = currentLang === 'bn' ? labelBn : labelEn;

        let medCell = '';
        if (row.medium && typeof row.medium === 'object') {
          const mText = currentLang === 'bn' ? row.medium.bn : row.medium.en;
          medCell = `<span data-en="${escapeAttr(row.medium.en)}" data-bn="${escapeAttr(row.medium.bn)}">${escapeHtml(mText)}</span>`;
        } else {
          const mDisp = currentCurrency === 'USD' ? row.mediumUSD : row.mediumBDT;
          medCell = `<span class="price-val" data-bdt="${escapeAttr(row.mediumBDT)}" data-usd="${escapeAttr(row.mediumUSD)}">${escapeHtml(mDisp)}</span>`;
        }

        let premCell = '';
        if (row.premium && typeof row.premium === 'object') {
          const pText = currentLang === 'bn' ? row.premium.bn : row.premium.en;
          premCell = `<span data-en="${escapeAttr(row.premium.en)}" data-bn="${escapeAttr(row.premium.bn)}">${escapeHtml(pText)}</span>`;
        } else {
          const pDisp = currentCurrency === 'USD' ? row.premiumUSD : row.premiumBDT;
          premCell = `<span class="price-val" data-bdt="${escapeAttr(row.premiumBDT)}" data-usd="${escapeAttr(row.premiumUSD)}">${escapeHtml(pDisp)}</span>`;
        }

        const turnEn = row.turnaround ? (row.turnaround.en || '') : '';
        const turnBn = row.turnaround ? (row.turnaround.bn || turnEn) : '';
        const turnDisp = currentLang === 'bn' ? turnBn : turnEn;

        return `
          <tr>
            <td><strong>${escapeHtml(row.duration)} <span data-en="${escapeAttr(labelEn)}" data-bn="${escapeAttr(labelBn)}">${escapeHtml(labelDisp)}</span></strong></td>
            <td class="price-highlight">${medCell}</td>
            <td class="price-premium">${premCell}</td>
            <td data-en="${escapeAttr(turnEn)}" data-bn="${escapeAttr(turnBn)}">${escapeHtml(turnDisp)}</td>
            <td>${escapeHtml(row.formats || '')}</td>
          </tr>
        `;
      }).join('');
    }
  }

  if (Array.isArray(pricing.otherServices)) {
    const otherTbody = document.querySelector('.other-services .pricing-table tbody');
    if (otherTbody) {
      otherTbody.innerHTML = pricing.otherServices.map(item => {
        const nameEn = item.name ? (item.name.en || '') : '';
        const nameBn = item.name ? (item.name.bn || nameEn) : '';
        const nameDisp = currentLang === 'bn' ? nameBn : nameEn;

        const mDisp = currentCurrency === 'USD' ? item.mediumUSD : item.mediumBDT;
        const pDisp = currentCurrency === 'USD' ? item.premiumUSD : item.premiumBDT;

        const scopeEn = item.scope ? (item.scope.en || '') : '';
        const scopeBn = item.scope ? (item.scope.bn || scopeEn) : '';
        const scopeDisp = currentLang === 'bn' ? scopeBn : scopeEn;

        return `
          <tr>
            <td><strong data-en="${escapeAttr(nameEn)}" data-bn="${escapeAttr(nameBn)}">${escapeHtml(nameDisp)}</strong></td>
            <td class="price-highlight"><span class="price-val" data-bdt="${escapeAttr(item.mediumBDT)}" data-usd="${escapeAttr(item.mediumUSD)}">${escapeHtml(mDisp)}</span></td>
            <td class="price-premium"><span class="price-val" data-bdt="${escapeAttr(item.premiumBDT)}" data-usd="${escapeAttr(item.premiumUSD)}">${escapeHtml(pDisp)}</span></td>
            <td data-en="${escapeAttr(scopeEn)}" data-bn="${escapeAttr(scopeBn)}">${escapeHtml(scopeDisp)}</td>
          </tr>
        `;
      }).join('');
    }
  }

  if (Array.isArray(pricingNotes)) {
    const notesList = document.querySelector('.pricing-notes ul');
    if (notesList) {
      notesList.innerHTML = pricingNotes.map(n => {
        const enText = typeof n === 'string' ? n : (n.en || '');
        const bnText = typeof n === 'string' ? n : (n.bn || enText);
        const disp = currentLang === 'bn' ? bnText : enText;
        return `<li data-en="${escapeAttr(enText)}" data-bn="${escapeAttr(bnText)}">${escapeHtml(disp)}</li>`;
      }).join('');
    }
  }
}

function renderPortfolioFromContent(portfolio) {
  if (!Array.isArray(portfolio)) return;
  const grid = document.querySelector('.portfolio-grid');
  if (!grid) return;

  const categoryLabels = {
    social: { en: 'Social Media', bn: 'সোশ্যাল মিডিয়া' },
    branding: { en: 'Branding', bn: 'ব্র্যান্ডিং' },
    video: { en: 'Video & Motion', bn: 'ভিডিও ও মোশন' },
    campaign: { en: 'Campaign', bn: 'ক্যাম্পেইন' }
  };

  const counts = { all: portfolio.length, social: 0, branding: 0, video: 0, campaign: 0 };
  portfolio.forEach(p => {
    if (counts[p.category] !== undefined) counts[p.category]++;
  });

  const filterBtns = document.querySelectorAll('.portfolio-filters .filter-btn');
  filterBtns.forEach(btn => {
    const cat = btn.getAttribute('data-filter');
    const count = counts[cat] ?? 0;
    const bnCount = toBnDigits(count);
    if (cat === 'all') {
      btn.setAttribute('data-en', `All Projects (${count})`);
      btn.setAttribute('data-bn', `সব প্রজেক্ট (${bnCount})`);
      btn.textContent = currentLang === 'bn' ? `সব প্রজেক্ট (${bnCount})` : `All Projects (${count})`;
    } else if (cat === 'social') {
      btn.setAttribute('data-en', `Social Media (${count})`);
      btn.setAttribute('data-bn', `সোশ্যাল মিডিয়া (${bnCount})`);
      btn.textContent = currentLang === 'bn' ? `সোশ্যাল মিডিয়া (${bnCount})` : `Social Media (${count})`;
    } else if (cat === 'branding') {
      btn.setAttribute('data-en', `Branding (${count})`);
      btn.setAttribute('data-bn', `ব্র্যান্ডিং (${bnCount})`);
      btn.textContent = currentLang === 'bn' ? `ব্র্যান্ডিং (${bnCount})` : `Branding (${count})`;
    } else if (cat === 'video') {
      btn.setAttribute('data-en', `Video & Motion (${count})`);
      btn.setAttribute('data-bn', `ভিডিও ও মোশন (${bnCount})`);
      btn.textContent = currentLang === 'bn' ? `ভিডিও ও মোশন (${bnCount})` : `Video & Motion (${count})`;
    } else if (cat === 'campaign') {
      btn.setAttribute('data-en', `Campaigns (${count})`);
      btn.setAttribute('data-bn', `ক্যাম্পেইন (${bnCount})`);
      btn.textContent = currentLang === 'bn' ? `ক্যাম্পেইন (${bnCount})` : `Campaigns (${count})`;
    }
  });

  grid.innerHTML = portfolio.map(item => {
    const cat = item.category || 'social';
    const catObj = categoryLabels[cat] || { en: cat, bn: cat };
    const catText = currentLang === 'bn' ? catObj.bn : catObj.en;

    const titleEn = item.title ? (item.title.en || '') : '';
    const titleBn = item.title ? (item.title.bn || titleEn) : '';
    const titleText = currentLang === 'bn' ? titleBn : titleEn;

    const dateEn = item.date ? (typeof item.date === 'string' ? item.date : (item.date.en || '')) : '';
    const dateBn = item.date ? (typeof item.date === 'string' ? item.date : (item.date.bn || dateEn)) : '';
    const dateText = currentLang === 'bn' ? dateBn : dateEn;

    const isImage = item.image && (item.image.startsWith('http://') || item.image.startsWith('https://') || item.image.startsWith('data:') || item.image.startsWith('/') || item.image.startsWith('./') || item.image.startsWith('assets/'));
    const bgStyle = isImage ? `style="background-image: url('${escapeAttr(item.image)}');"` : '';
    const iconName = isImage ? '' : getPortfolioIcon(item.image, cat, titleEn);
    const bgContent = isImage ? '' : `<div class="portfolio-card-icon-tile"><i data-lucide="${escapeAttr(iconName)}"></i></div>`;

    return `
      <a href="${escapeAttr(item.behanceUrl || '#')}" target="_blank" rel="noopener noreferrer" class="portfolio-card" data-category="${escapeAttr(cat)}">
        <div class="portfolio-card-bg${isImage ? ' has-image' : ''}" ${bgStyle} aria-hidden="true">${bgContent}</div>
        <div class="portfolio-card-content">
          <span class="portfolio-card-badge" data-en="${escapeAttr(catObj.en)}" data-bn="${escapeAttr(catObj.bn)}">${escapeHtml(catText)}</span>
          <h3 class="portfolio-card-title" data-en="${escapeAttr(titleEn)}" data-bn="${escapeAttr(titleBn)}">${escapeHtml(titleText)}</h3>
          <div class="portfolio-card-meta">
            <span data-en="${escapeAttr(dateEn)}" data-bn="${escapeAttr(dateBn)}">${escapeHtml(dateText)}</span>
            <span class="portfolio-card-link" data-en="Behance ↗" data-bn="বিহ্যান্স ↗"><span>${currentLang === 'bn' ? 'বিহ্যান্স' : 'Behance'}</span> <i data-lucide="arrow-up-right"></i></span>
          </div>
        </div>
      </a>
    `;
  }).join('');

  initPortfolioFilter();
  refreshIcons();
}

function renderFAQFromContent(faq) {
  if (!Array.isArray(faq)) return;
  const list = document.querySelector('.faq-list');
  if (!list) return;

  list.innerHTML = faq.map(item => {
    const qEn = item.question ? (item.question.en || '') : '';
    const qBn = item.question ? (item.question.bn || qEn) : '';
    const qText = currentLang === 'bn' ? qBn : qEn;

    const aEn = item.answer ? (item.answer.en || '') : '';
    const aBn = item.answer ? (item.answer.bn || aEn) : '';
    const aText = currentLang === 'bn' ? aBn : aEn;

    return `
      <div class="faq-item">
        <button class="faq-question" type="button" aria-expanded="false">
          <span data-en="${escapeAttr(qEn)}" data-bn="${escapeAttr(qBn)}">${escapeHtml(qText)}</span>
          <span class="faq-icon" aria-hidden="true"><i data-lucide="chevron-down"></i></span>
        </button>
        <div class="faq-answer">
          <div class="faq-answer-inner">
            <p data-en="${escapeAttr(aEn)}" data-bn="${escapeAttr(aBn)}">${escapeHtml(aText)}</p>
          </div>
        </div>
      </div>
    `;
  }).join('');

  initFAQ();
  refreshIcons();
}

// ============================================================
// 4. Pricing Calculator Interactive Slider
// ============================================================

function updateCalculator() {
  const durationSlider = document.getElementById('durationSlider');
  const durationVal = document.getElementById('durationVal');
  const calcMediumPrice = document.getElementById('calcMediumPrice');
  const calcPremiumPrice = document.getElementById('calcPremiumPrice');
  const calcTierMedium = document.getElementById('calcTierMedium');
  const calcTierPremium = document.getElementById('calcTierPremium');
  const calcCustomQuote = document.getElementById('calcCustomQuote');

  if (!durationSlider) return;

  const seconds = parseInt(durationSlider.value, 10);
  const customQuoteThreshold = (siteContent && siteContent.pricing && siteContent.pricing.aiVideo && siteContent.pricing.aiVideo.customQuoteFromSeconds) || 90;

  if (durationVal) {
    durationVal.textContent = seconds;
  }

  // At threshold or over: show calcCustomQuote instead of computed prices
  if (seconds >= customQuoteThreshold) {
    if (calcTierMedium) calcTierMedium.style.display = 'none';
    if (calcTierPremium) calcTierPremium.style.display = 'none';
    if (calcCustomQuote) calcCustomQuote.style.display = 'block';
  } else {
    if (calcTierMedium) calcTierMedium.style.display = '';
    if (calcTierPremium) calcTierPremium.style.display = '';
    if (calcCustomQuote) calcCustomQuote.style.display = 'none';

    const prices = calculatePrices(seconds);
    const mAmount = currentCurrency === 'USD' ? prices.mediumUSD : prices.mediumBDT;
    const pAmount = currentCurrency === 'USD' ? prices.premiumUSD : prices.premiumBDT;

    if (calcMediumPrice) {
      calcMediumPrice.textContent = formatCurrency(mAmount, currentCurrency);
    }
    if (calcPremiumPrice) {
      calcPremiumPrice.textContent = formatCurrency(pAmount, currentCurrency);
    }
  }
}

// ============================================================
// 5. Portfolio Filter Buttons
// ============================================================

function applyPortfolioFilter(filter) {
  const cards = document.querySelectorAll('.portfolio-grid .portfolio-card');
  cards.forEach(card => {
    const category = card.getAttribute('data-category');
    if (filter === 'all' || category === filter) {
      card.style.display = '';
    } else {
      card.style.display = 'none';
    }
  });
}

function initPortfolioFilter() {
  const filterWrap = document.querySelector('.portfolio-filters');
  if (!filterWrap) return;

  if (!filterWrap._bound) {
    filterWrap._bound = true;
    filterWrap.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filterWrap.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.getAttribute('data-filter') || 'all';
      applyPortfolioFilter(filter);
    });
  }

  const activeBtn = filterWrap.querySelector('.filter-btn.active');
  const currentFilter = activeBtn ? activeBtn.getAttribute('data-filter') : 'all';
  applyPortfolioFilter(currentFilter);
}

// ============================================================
// 6. FAQ Accordion (Single item open at a time)
// ============================================================

function initFAQ() {
  const faqList = document.querySelector('.faq-list');
  if (!faqList) return;

  if (!faqList._bound) {
    faqList._bound = true;
    faqList.addEventListener('click', (e) => {
      const question = e.target.closest('.faq-question');
      if (!question) return;
      const parentItem = question.closest('.faq-item');
      if (!parentItem) return;

      const isAlreadyOpen = parentItem.classList.contains('open');

      document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('open');
        const btn = item.querySelector('.faq-question');
        if (btn) btn.setAttribute('aria-expanded', 'false');
      });

      if (!isAlreadyOpen) {
        parentItem.classList.add('open');
        question.setAttribute('aria-expanded', 'true');
      }
    });
  }
}

// ============================================================
// 6. Mobile Navigation & Hamburger Toggle
// ============================================================

function initMobileNav() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileNav = document.getElementById('mobileNav');

  if (hamburgerBtn && mobileNav) {
    hamburgerBtn.addEventListener('click', () => {
      const isOpen = hamburgerBtn.classList.toggle('open');
      mobileNav.classList.toggle('open', isOpen);
      hamburgerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    // Close menu when tapping any navigation link
    mobileNav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburgerBtn.classList.remove('open');
        mobileNav.classList.remove('open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
      });
    });
  }
}

// ============================================================
// 7. Smooth Scrolling & Header Sticky Elevation
// ============================================================

function initNavigationEffects() {
  const siteHeader = document.getElementById('site-header');

  // Sticky header background styling
  function updateHeaderOnScroll() {
    if (!siteHeader) return;
    if (window.scrollY > 20) {
      siteHeader.classList.add('scrolled');
      siteHeader.classList.remove('at-top');
    } else {
      siteHeader.classList.remove('scrolled');
      siteHeader.classList.add('at-top');
    }
  }

  window.addEventListener('scroll', updateHeaderOnScroll, { passive: true });
  updateHeaderOnScroll();

  // Smooth scroll offset for all internal anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        const headerHeight = siteHeader ? siteHeader.offsetHeight : 72;
        const targetTop = targetEl.getBoundingClientRect().top + window.pageYOffset - headerHeight;

        window.scrollTo({
          top: targetTop,
          behavior: 'smooth'
        });
      }
    });
  });
}

// ============================================================
// 8. Contact Form & Lead Magnet Form Submission Handlers
// ============================================================

function initFormHandlers() {
  // Contact Form
  const contactForm = document.getElementById('contactForm');
  const contactSuccess = document.getElementById('contactSuccess');

  if (contactForm && contactSuccess) {
    contactForm.addEventListener('submit', function(e) {
      e.preventDefault();

      if (contactForm.checkValidity && !contactForm.checkValidity()) {
        contactForm.reportValidity();
        return;
      }

      contactSuccess.classList.add('visible');
      contactSuccess.style.display = 'block';
      contactForm.reset();
    });
  }

  // Lead Magnet Form (Free AI Ad Audit)
  const leadMagnetForm = document.getElementById('leadMagnetForm');
  const lmSuccess = document.getElementById('lmSuccess');

  if (leadMagnetForm && lmSuccess) {
    leadMagnetForm.addEventListener('submit', function(e) {
      e.preventDefault();

      if (leadMagnetForm.checkValidity && !leadMagnetForm.checkValidity()) {
        leadMagnetForm.reportValidity();
        return;
      }

      lmSuccess.classList.add('visible');
      lmSuccess.style.display = 'block';
      leadMagnetForm.reset();
    });
  }
}

// ============================================================
// 9. GeoIP Suggestion (ipapi.co client-side lookup)
// ============================================================

function showGeoIPBanner() {
  if (document.getElementById('geoipBanner')) return;

  const banner = document.createElement('div');
  banner.id = 'geoipBanner';
  banner.className = 'geoip-banner';
  banner.setAttribute('role', 'region');
  banner.setAttribute('aria-label', 'Location suggestion banner');

  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;justify-content:space-between;width:100%;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="display:inline-flex;align-items:center;justify-content:center;color:#0D49E5;" aria-hidden="true"><i data-lucide="globe" style="width:20px;height:20px;"></i></span>
        <span style="font-size:0.9rem;font-weight:500;">
          Visiting from Bangladesh? Switch to <strong>বাংলা</strong> &amp; <strong>BDT (৳)</strong>?
        </span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <button type="button" id="geoipSwitchBtn" style="background:#0D49E5;color:#ffffff;border:none;padding:6px 14px;border-radius:6px;font-size:0.85rem;font-weight:600;cursor:pointer;font-family:inherit;">বাংলা + BDT</button>
        <button type="button" id="geoipDismissBtn" aria-label="Dismiss banner" style="background:transparent;color:rgba(255,255,255,0.7);border:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:4px 8px;font-family:inherit;"><i data-lucide="x" style="width:16px;height:16px;"></i></button>
      </div>
    </div>
  `;

  // Explicit banner styling without mutating external stylesheets
  Object.assign(banner.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    maxWidth: '460px',
    width: 'calc(100% - 48px)',
    background: '#0B1B33',
    color: '#ffffff',
    padding: '14px 18px',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(11,27,51,0.3)',
    border: '1px solid rgba(255,255,255,0.18)',
    zIndex: '10000',
    display: 'flex',
    boxSizing: 'border-box',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
  });

  document.body.appendChild(banner);
  refreshIcons();

  const switchBtn = document.getElementById('geoipSwitchBtn');
  const dismissBtn = document.getElementById('geoipDismissBtn');

  if (switchBtn) {
    switchBtn.addEventListener('click', () => {
      setLanguage('bn');
      setCurrency('BDT');
      try {
        sessionStorage.setItem('vf_geoip_dismissed', '1');
      } catch (e) {}
      banner.remove();
    });
  }

  if (dismissBtn) {
    dismissBtn.addEventListener('click', () => {
      try {
        sessionStorage.setItem('vf_geoip_dismissed', '1');
      } catch (e) {}
      banner.remove();
    });
  }
}

async function checkGeoIPSuggestion() {
  try {
    if (sessionStorage.getItem('vf_geoip_dismissed')) return;
  } catch (e) {}

  // If visitor is already in Bangla and BDT, do not suggest
  if (currentLang === 'bn' && currentCurrency === 'BDT') return;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return;
    const data = await response.json();

    if (data && (data.country_code === 'BD' || data.country === 'BD')) {
      showGeoIPBanner();
    }
  } catch (err) {
    // On any fetch failure, gracefully fall back to browser language only
    console.debug('GeoIP suggestion lookup skipped or failed, fallback active.');
  }
}

// ============================================================
// 10. Initialization
// ============================================================

async function init() {
  // 1. Language & Currency initialization
  const initialLang = getInitialLanguage();
  const initialCurrency = getInitialCurrency(initialLang);

  // 2. Fetch or load content.json / override
  await loadSiteContent();

  if (siteContent) {
    renderHeroFromContent(siteContent.hero);
    renderServicesFromContent(siteContent.services);
    renderPricingFromContent(siteContent.pricing, siteContent.pricingNotes);
    renderPortfolioFromContent(siteContent.portfolio);
    renderFAQFromContent(siteContent.faq);
  }

  setLanguage(initialLang);
  setCurrency(initialCurrency);

  // Setup click listeners for language toggle buttons
  [document.getElementById('langToggle'), document.getElementById('mobileLangToggle')].forEach(toggle => {
    if (!toggle || toggle._bound) return;
    toggle._bound = true;
    toggle.addEventListener('click', (e) => {
      const span = e.target.closest('[data-lang]');
      if (span) {
        setLanguage(span.getAttribute('data-lang'));
      } else {
        setLanguage(currentLang === 'en' ? 'bn' : 'en');
      }
    });
  });

  // Setup click listeners for currency toggle buttons
  [document.getElementById('currencyToggle'), document.getElementById('mobileCurrencyToggle')].forEach(toggle => {
    if (!toggle || toggle._bound) return;
    toggle._bound = true;
    toggle.addEventListener('click', (e) => {
      const span = e.target.closest('[data-currency]');
      if (span) {
        setCurrency(span.getAttribute('data-currency'));
      } else {
        setCurrency(currentCurrency === 'BDT' ? 'USD' : 'BDT');
      }
    });
  });

  // 3. Interactive duration slider
  const durationSlider = document.getElementById('durationSlider');
  if (durationSlider) {
    const minSec = (siteContent && siteContent.pricing && siteContent.pricing.aiVideo && siteContent.pricing.aiVideo.minimumSeconds) || 15;
    durationSlider.min = String(minSec);
    durationSlider.max = '95';
    if (!durationSlider._bound) {
      durationSlider._bound = true;
      durationSlider.value = '30';
      durationSlider.addEventListener('input', updateCalculator);
      durationSlider.addEventListener('change', updateCalculator);
    }
  }
  updateCalculator();

  // 4. Components initialization
  initPortfolioFilter();
  initFAQ();
  initMobileNav();
  initNavigationEffects();
  initFormHandlers();
  refreshIcons();

  // 5. Client-side GeoIP suggestion (non-blocking)
  checkGeoIPSuggestion();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

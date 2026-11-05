/**
 * VisualFizz Agency Website — admin.js
 * Client-Side Administration Panel
 *
 * Implements:
 * 1. Passcode Authentication Gate (visualfizz2026, demo-grade client-side notice)
 * 2. Bilingual UI Toggle (English / বাংলা) with localStorage persistence
 * 3. 5-Section Management: Portfolio, Pricing, Services, FAQ, Hero
 * 4. Static-Site Honest Saving Model:
 *    - localStorage override (vf_content_override)
 *    - Download updated content.json
 *    - Copy JSON to clipboard
 *    - Reset to site defaults
 * 5. Input Validation & Safety (URL prefix checks, non-negative numbers, HTML escaping)
 */

'use strict';

// ============================================================
// State & Configuration
// ============================================================

const DEFAULT_PASSCODE = 'visualfizz2026';
let currentAdminLang = 'en';
let adminContent = null;

// ============================================================
// Utilities & Helpers
// ============================================================

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

function isValidBehanceUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.trim().startsWith('https://www.behance.net/');
}

function isValidPriceNumber(val) {
  const n = Number(val);
  return !isNaN(n) && n >= 0;
}

function showToast(message, isError = false) {
  const toast = document.getElementById('adminToast');
  const toastText = document.getElementById('adminToastText');
  if (!toast || !toastText) return;

  toastText.textContent = message;
  toast.style.background = isError ? 'var(--danger-light)' : 'var(--success-light)';
  toast.style.borderColor = isError ? 'rgba(220,38,38,0.3)' : 'rgba(22,163,74,0.3)';
  toast.style.color = isError ? 'var(--danger)' : 'var(--success)';
  toast.classList.add('visible');

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 7000);
}

// ============================================================
// 1. Language Toggle
// ============================================================

function setAdminLanguage(lang) {
  if (lang !== 'en' && lang !== 'bn') return;
  currentAdminLang = lang;

  try {
    localStorage.setItem('vf_lang', lang);
  } catch (e) {}

  document.documentElement.lang = lang;
  document.body.classList.toggle('lang-bn', lang === 'bn');

  // Update header toggle
  const toggle = document.getElementById('adminLangToggle');
  if (toggle) {
    toggle.querySelectorAll('[data-lang]').forEach(span => {
      span.classList.toggle('active', span.getAttribute('data-lang') === lang);
    });
  }

  // Translate static data-en / data-bn elements
  document.querySelectorAll('[data-en][data-bn]').forEach(el => {
    const text = lang === 'bn' ? el.getAttribute('data-bn') : el.getAttribute('data-en');
    if (text !== null) {
      el.textContent = text;
    }
  });

  // Re-render dynamic lists
  if (adminContent) {
    renderPortfolioTable();
    renderDurationTable();
    renderOtherServicesEditor();
    renderServicesEditor();
    renderFaqList();
  }
}

function getInitialAdminLanguage() {
  try {
    const saved = localStorage.getItem('vf_lang');
    if (saved === 'en' || saved === 'bn') return saved;
  } catch (e) {}
  return 'en';
}

// ============================================================
// 2. Authentication Gate
// ============================================================

function checkAuthStatus() {
  const isAuthenticated = sessionStorage.getItem('vf_admin_auth') === 'true';
  const loginView = document.getElementById('loginView');
  const dashboardView = document.getElementById('dashboardView');
  const logoutBtn = document.getElementById('logoutBtn');

  if (isAuthenticated) {
    if (loginView) loginView.style.display = 'none';
    if (dashboardView) {
      dashboardView.style.display = 'block';
      dashboardView.classList.add('visible');
    }
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    initDashboard();
  } else {
    if (loginView) loginView.style.display = 'flex';
    if (dashboardView) {
      dashboardView.style.display = 'none';
      dashboardView.classList.remove('visible');
    }
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

function initAuthHandlers() {
  const loginForm = document.getElementById('loginForm');
  const passcodeEl = document.getElementById('adminPasscode');
  const errorEl = document.getElementById('loginError');
  const logoutBtn = document.getElementById('logoutBtn');

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const entered = (passcodeEl ? passcodeEl.value : '').trim();

      if (entered === DEFAULT_PASSCODE) {
        if (errorEl) errorEl.classList.remove('visible');
        sessionStorage.setItem('vf_admin_auth', 'true');
        checkAuthStatus();
      } else {
        if (errorEl) {
          errorEl.classList.add('visible');
          errorEl.textContent = currentAdminLang === 'bn'
            ? 'ভুল পাসকোড। অনুগ্রহ করে আবার চেষ্টা করুন।'
            : 'Incorrect passcode. Please try again.';
        }
        if (passcodeEl) passcodeEl.focus();
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('vf_admin_auth');
      if (passcodeEl) passcodeEl.value = '';
      checkAuthStatus();
    });
  }
}

// ============================================================
// 3. Content Loading & Saving
// ============================================================

async function loadAdminContent() {
  // Check localStorage override first
  try {
    const override = localStorage.getItem('vf_content_override');
    if (override) {
      adminContent = JSON.parse(override);
      return adminContent;
    }
  } catch (e) {
    console.warn('Failed to parse vf_content_override:', e);
  }

  // Fetch default content.json
  try {
    const res = await fetch('content.json');
    if (res.ok) {
      adminContent = await res.json();
      return adminContent;
    }
  } catch (e) {
    console.warn('Could not fetch content.json:', e);
  }

  return null;
}

function saveAdminContent(showSuccessToast = true) {
  if (!adminContent) return;

  try {
    const jsonStr = JSON.stringify(adminContent, null, 2);
    localStorage.setItem('vf_content_override', jsonStr);

    if (showSuccessToast) {
      const msg = currentAdminLang === 'bn'
        ? '✓ পরিবর্তনসমূহ সংরক্ষিত হয়েছে! মূল সাইট তাৎক্ষণিকভাবে এই পরিবর্তন প্রদর্শন করবে। সকল ভিজিটরের জন্য সার্ভারে content.json ফাইলটি আপডেট করুন।'
        : '✓ Changes saved to localStorage! Main site will reflect changes immediately in this browser. To make changes live for all visitors, replace content.json on your server with the downloaded file.';
      showToast(msg);
    }
  } catch (e) {
    showToast('Failed to save content to localStorage: ' + e.message, true);
  }
}

function downloadContentJson() {
  if (!adminContent) return;
  saveAdminContent(false);

  const jsonStr = JSON.stringify(adminContent, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'content.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(currentAdminLang === 'bn'
    ? 'content.json ডাউনলোড শুরু হয়েছে। আপনার সার্ভারে ফাইলটি প্রতিস্থাপন করুন।'
    : 'content.json download initiated. Replace this file on your server for permanent deployment.');
}

function copyContentJson() {
  if (!adminContent) return;
  const jsonStr = JSON.stringify(adminContent, null, 2);

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(jsonStr).then(() => {
      showToast(currentAdminLang === 'bn' ? '✓ সম্পূর্ণ JSON ক্লিপবোর্ডে কপি হয়েছে।' : '✓ Full JSON copied to clipboard!');
    }).catch(() => {
      fallbackCopy(jsonStr);
    });
  } else {
    fallbackCopy(jsonStr);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    showToast(currentAdminLang === 'bn' ? '✓ সম্পূর্ণ JSON ক্লিপবোর্ডে কপি হয়েছে।' : '✓ Full JSON copied to clipboard!');
  } catch (e) {
    showToast('Could not copy JSON: ' + e.message, true);
  }
  document.body.removeChild(ta);
}

async function resetToDefaults() {
  const confirmMsg = currentAdminLang === 'bn'
    ? 'আপনি কি নিশ্চিত যে সকল পরিবর্তন মুছে সাইট ডিফল্টে রিসেট করতে চান?'
    : 'Reset all changes to site defaults? This will clear any localStorage override and reload default content.json.';
  if (!confirm(confirmMsg)) return;

  try {
    localStorage.removeItem('vf_content_override');
    const res = await fetch('content.json');
    if (res.ok) {
      adminContent = await res.json();
      populateDashboardFields();
      showToast(currentAdminLang === 'bn' ? '✓ সাইট ডিফল্টে রিসেট সফল হয়েছে।' : '✓ Reset to site defaults completed.');
    }
  } catch (e) {
    showToast('Failed to reset defaults: ' + e.message, true);
  }
}

// ============================================================
// 4. Tab Switching
// ============================================================

function initTabNavigation() {
  const tabBtns = document.querySelectorAll('.nav-tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      tabBtns.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      panels.forEach(p => {
        p.classList.remove('active');
      });

      let panelId = `panel${targetTab.charAt(0).toUpperCase() + targetTab.slice(1)}`;
      if (targetTab.toLowerCase() === 'faq') panelId = 'panelFAQ';
      const activePanel = document.getElementById(panelId) || document.getElementById(`panel${targetTab}`);
      if (activePanel) {
        activePanel.classList.add('active');
      }
    });
  });
}

// ============================================================
// 5. Tab 1: Portfolio Management
// ============================================================

function renderPortfolioTable() {
  const tbody = document.getElementById('portfolioTableBody');
  if (!tbody || !adminContent || !Array.isArray(adminContent.portfolio)) return;

  const categoryLabels = {
    social: { en: 'Social Media', bn: 'সোশ্যাল মিডিয়া' },
    branding: { en: 'Branding', bn: 'ব্র্যান্ডিং' },
    video: { en: 'Video & Motion', bn: 'ভিডিও ও মোশন' },
    campaign: { en: 'Campaign', bn: 'ক্যাম্পেইন' }
  };

  tbody.innerHTML = adminContent.portfolio.map((p, index) => {
    const cat = p.category || 'social';
    const catObj = categoryLabels[cat] || { en: cat, bn: cat };
    const catText = currentAdminLang === 'bn' ? catObj.bn : catObj.en;

    const titleEn = p.title ? (p.title.en || '') : '';
    const titleBn = p.title ? (p.title.bn || titleEn) : '';
    const dateEn = p.date ? (typeof p.date === 'string' ? p.date : (p.date.en || '')) : '';
    const dateBn = p.date ? (typeof p.date === 'string' ? p.date : (p.date.bn || dateEn)) : '';

    const isImage = p.image && (p.image.startsWith('http://') || p.image.startsWith('https://') || p.image.startsWith('data:') || p.image.startsWith('/') || p.image.startsWith('assets/'));
    const coverHtml = isImage
      ? `<img src="${escapeAttr(p.image)}" alt="" style="width:36px;height:36px;object-fit:cover;border-radius:6px;">`
      : `<span style="font-size:1.6rem;line-height:1;">${escapeHtml(p.image || '🎨')}</span>`;

    return `
      <tr data-index="${index}">
        <td>${coverHtml}</td>
        <td>
          <div style="font-weight:600;color:var(--navy);">${escapeHtml(titleEn)}</div>
          <div style="font-size:0.8rem;color:var(--text-muted);">${escapeHtml(titleBn)}</div>
        </td>
        <td><span class="badge-cat">${escapeHtml(catText)}</span></td>
        <td style="font-size:0.85rem;white-space:nowrap;">${escapeHtml(currentAdminLang === 'bn' ? dateBn : dateEn)}</td>
        <td>
          <a href="${escapeAttr(p.behanceUrl || '#')}" target="_blank" rel="noopener noreferrer" style="font-size:0.85rem;" title="${escapeAttr(p.behanceUrl || '')}">
            Behance ↗
          </a>
        </td>
        <td style="text-align:right;white-space:nowrap;">
          <button type="button" class="btn-secondary btn-sm edit-project-btn" data-index="${index}" style="margin-right:6px;" data-en="Edit" data-bn="সম্পাদনা">
            ${currentAdminLang === 'bn' ? 'সম্পাদনা' : 'Edit'}
          </button>
          <button type="button" class="btn-danger btn-sm delete-project-btn" data-index="${index}" data-en="Delete" data-bn="মুছুন">
            ${currentAdminLang === 'bn' ? 'মুছুন' : 'Delete'}
          </button>
        </td>
      </tr>
    `;
  }).join('');
}

function initPortfolioHandlers() {
  const addBtn = document.getElementById('addProjectBtn');
  const modal = document.getElementById('projectModal');
  const modalTitle = document.getElementById('projectModalTitle');
  const projectForm = document.getElementById('projectForm');
  const cancelBtn = document.getElementById('cancelProjectBtn');
  const closeBtn = document.getElementById('closeProjectModalBtn');
  const tableBody = document.getElementById('portfolioTableBody');

  function openProjectModal(index = -1) {
    if (!modal) return;
    const isEdit = index >= 0;
    const project = isEdit && adminContent.portfolio[index] ? adminContent.portfolio[index] : null;

    if (modalTitle) {
      modalTitle.textContent = isEdit
        ? (currentAdminLang === 'bn' ? 'প্রজেক্ট সম্পাদনা' : 'Edit Portfolio Project')
        : (currentAdminLang === 'bn' ? 'নতুন প্রজেক্ট যোগ করুন' : 'Add Portfolio Project');
    }

    document.getElementById('projectIndex').value = index;
    document.getElementById('projectTitleEn').value = project ? (project.title.en || '') : '';
    document.getElementById('projectTitleBn').value = project ? (project.title.bn || '') : '';
    document.getElementById('projectCategory').value = project ? (project.category || 'social') : 'social';
    document.getElementById('projectDateEn').value = project ? (typeof project.date === 'string' ? project.date : (project.date.en || '')) : '';
    document.getElementById('projectDateBn').value = project ? (typeof project.date === 'string' ? project.date : (project.date.bn || '')) : '';
    document.getElementById('projectBehanceUrl').value = project ? (project.behanceUrl || '') : '';
    document.getElementById('projectImage').value = project ? (project.image || '') : '📱';

    modal.classList.add('open');
  }

  function closeProjectModal() {
    if (modal) modal.classList.remove('open');
  }

  if (addBtn) addBtn.addEventListener('click', () => openProjectModal(-1));
  if (cancelBtn) cancelBtn.addEventListener('click', closeProjectModal);
  if (closeBtn) closeBtn.addEventListener('click', closeProjectModal);

  // Table Edit/Delete delegation
  if (tableBody) {
    tableBody.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.edit-project-btn');
      if (editBtn) {
        const index = parseInt(editBtn.getAttribute('data-index'), 10);
        openProjectModal(index);
        return;
      }

      const delBtn = e.target.closest('.delete-project-btn');
      if (delBtn) {
        const index = parseInt(delBtn.getAttribute('data-index'), 10);
        const confirmMsg = currentAdminLang === 'bn'
          ? 'আপনি কি নিশ্চিত যে এই প্রজেক্টটি মুছে ফেলতে চান?'
          : 'Are you sure you want to delete this portfolio project?';

        if (confirm(confirmMsg)) {
          adminContent.portfolio.splice(index, 1);
          saveAdminContent(true);
          renderPortfolioTable();
        }
      }
    });
  }

  // Modal form submit
  if (projectForm) {
    projectForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const index = parseInt(document.getElementById('projectIndex').value, 10);
      const titleEn = document.getElementById('projectTitleEn').value.trim();
      const titleBn = document.getElementById('projectTitleBn').value.trim() || titleEn;
      const category = document.getElementById('projectCategory').value;
      const dateEn = document.getElementById('projectDateEn').value.trim();
      const dateBn = document.getElementById('projectDateBn').value.trim() || dateEn;
      const behanceUrl = document.getElementById('projectBehanceUrl').value.trim();
      const image = document.getElementById('projectImage').value.trim() || '📱';

      if (!titleEn) {
        alert(currentAdminLang === 'bn' ? 'অনুগ্রহ করে ইংরেজি শিরোনাম দিন।' : 'Please enter an English title.');
        return;
      }

      if (!isValidBehanceUrl(behanceUrl)) {
        alert(currentAdminLang === 'bn'
          ? 'বিহ্যান্স ইউআরএল অবশ্যই https://www.behance.net/ দিয়ে শুরু হতে হবে।'
          : 'Behance URL must start with https://www.behance.net/');
        return;
      }

      const projectData = {
        id: index >= 0 && adminContent.portfolio[index] ? adminContent.portfolio[index].id : Date.now(),
        title: { en: titleEn, bn: titleBn },
        category: category,
        date: { en: dateEn, bn: dateBn },
        behanceUrl: behanceUrl,
        image: image
      };

      if (index >= 0) {
        adminContent.portfolio[index] = projectData;
      } else {
        adminContent.portfolio.unshift(projectData);
      }

      saveAdminContent(true);
      closeProjectModal();
      renderPortfolioTable();
    });
  }
}

// ============================================================
// 6. Tab 2: Pricing Management
// ============================================================

function populatePricingFields() {
  if (!adminContent || !adminContent.pricing) return;
  const p = adminContent.pricing;

  // AI Video rates
  const mBDT = document.getElementById('mediumPerSecBDT');
  const mUSD = document.getElementById('mediumPerSecUSD');
  const pBDT = document.getElementById('premiumPerSecBDT');
  const pUSD = document.getElementById('premiumPerSecUSD');
  const minSec = document.getElementById('minimumSeconds');
  const customSec = document.getElementById('customQuoteThreshold');

  if (mBDT && p.aiVideo?.medium) mBDT.value = p.aiVideo.medium.perSecBDT;
  if (mUSD && p.aiVideo?.medium) mUSD.value = p.aiVideo.medium.perSecUSD;
  if (pBDT && p.aiVideo?.premium) pBDT.value = p.aiVideo.premium.perSecBDT;
  if (pUSD && p.aiVideo?.premium) pUSD.value = p.aiVideo.premium.perSecUSD;
  if (minSec) minSec.value = p.aiVideo?.minimumSeconds ?? 15;
  if (customSec) customSec.value = p.aiVideo?.customQuoteFromSeconds ?? 90;

  renderDurationTable();
  renderOtherServicesEditor();
}

function renderDurationTable() {
  const tbody = document.getElementById('durationTableBody');
  if (!tbody || !adminContent || !adminContent.pricing || !Array.isArray(adminContent.pricing.durationTable)) return;

  tbody.innerHTML = adminContent.pricing.durationTable.map((row, idx) => {
    const isCustom = row.duration.includes('+');

    const mBDT = row.mediumBDT || (row.medium ? row.medium.en : '');
    const mUSD = row.mediumUSD || (row.medium ? row.medium.en : '');
    const pBDT = row.premiumBDT || (row.premium ? row.premium.en : '');
    const pUSD = row.premiumUSD || (row.premium ? row.premium.en : '');

    const turnEn = row.turnaround ? (row.turnaround.en || '') : '';
    const turnBn = row.turnaround ? (row.turnaround.bn || turnEn) : '';
    const formats = row.formats || '';

    return `
      <tr data-row="${idx}">
        <td><strong>${escapeHtml(row.duration)}</strong></td>
        <td><input type="text" class="form-input dt-m-bdt" value="${escapeAttr(mBDT)}" style="min-width:110px;"></td>
        <td><input type="text" class="form-input dt-m-usd" value="${escapeAttr(mUSD)}" style="min-width:90px;"></td>
        <td><input type="text" class="form-input dt-p-bdt" value="${escapeAttr(pBDT)}" style="min-width:110px;"></td>
        <td><input type="text" class="form-input dt-p-usd" value="${escapeAttr(pUSD)}" style="min-width:90px;"></td>
        <td><input type="text" class="form-input dt-turn-en" value="${escapeAttr(turnEn)}" style="min-width:140px;"></td>
        <td><input type="text" class="form-input dt-turn-bn" value="${escapeAttr(turnBn)}" style="min-width:140px;"></td>
        <td><input type="text" class="form-input dt-formats" value="${escapeAttr(formats)}" style="min-width:130px;"></td>
      </tr>
    `;
  }).join('');
}

function renderOtherServicesEditor() {
  const container = document.getElementById('otherServicesContainer');
  if (!container || !adminContent || !adminContent.pricing || !Array.isArray(adminContent.pricing.otherServices)) return;

  container.innerHTML = adminContent.pricing.otherServices.map((svc, idx) => {
    const nameEn = svc.name ? (svc.name.en || '') : '';
    const nameBn = svc.name ? (svc.name.bn || nameEn) : '';
    const scopeEn = svc.scope ? (svc.scope.en || '') : '';
    const scopeBn = svc.scope ? (svc.scope.bn || scopeEn) : '';

    return `
      <div class="service-editor-item" data-other-idx="${idx}">
        <div class="service-editor-header">
          <strong>${idx + 1}. ${escapeHtml(nameEn)} (${escapeHtml(nameBn)})</strong>
        </div>
        <div class="grid-4 mb-md">
          <div class="form-group">
            <label class="form-label" data-en="Medium (BDT)" data-bn="মিডিয়াম (টাকা)">Medium (BDT)</label>
            <input type="text" class="form-input os-m-bdt" value="${escapeAttr(svc.mediumBDT || '')}">
          </div>
          <div class="form-group">
            <label class="form-label" data-en="Medium (USD)" data-bn="মিডিয়াম (ডলার)">Medium (USD)</label>
            <input type="text" class="form-input os-m-usd" value="${escapeAttr(svc.mediumUSD || '')}">
          </div>
          <div class="form-group">
            <label class="form-label" data-en="Premium (BDT)" data-bn="প্রিমিয়াম (টাকা)">Premium (BDT)</label>
            <input type="text" class="form-input os-p-bdt" value="${escapeAttr(svc.premiumBDT || '')}">
          </div>
          <div class="form-group">
            <label class="form-label" data-en="Premium (USD)" data-bn="প্রিমিয়াম (ডলার)">Premium (USD)</label>
            <input type="text" class="form-input os-p-usd" value="${escapeAttr(svc.premiumUSD || '')}">
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label" data-en="Scope Summary (EN)" data-bn="কাজের পরিধি (ইংরেজি)">Scope Summary (EN)</label>
            <textarea class="form-textarea os-scope-en" rows="2">${escapeHtml(scopeEn)}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" data-en="Scope Summary (BN)" data-bn="কাজের পরিধি (বাংলা)">Scope Summary (BN)</label>
            <textarea class="form-textarea os-scope-bn" rows="2">${escapeHtml(scopeBn)}</textarea>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function initPricingHandlers() {
  const saveBtn = document.getElementById('savePricingBtn');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', () => {
    if (!adminContent || !adminContent.pricing) return;

    // Rates
    const mBDT = Number(document.getElementById('mediumPerSecBDT').value);
    const mUSD = Number(document.getElementById('mediumPerSecUSD').value);
    const pBDT = Number(document.getElementById('premiumPerSecBDT').value);
    const pUSD = Number(document.getElementById('premiumPerSecUSD').value);
    const minSec = Number(document.getElementById('minimumSeconds').value);
    const customSec = Number(document.getElementById('customQuoteThreshold').value);

    if (!isValidPriceNumber(mBDT) || !isValidPriceNumber(mUSD) || !isValidPriceNumber(pBDT) || !isValidPriceNumber(pUSD)) {
      alert(currentAdminLang === 'bn' ? 'সকল রেট অবশ্যই ০ বা তার বেশি বৈধ সংখ্যা হতে হবে।' : 'All rates must be valid numbers ≥ 0.');
      return;
    }

    adminContent.pricing.aiVideo = {
      medium: { perSecBDT: mBDT, perSecUSD: mUSD },
      premium: { perSecBDT: pBDT, perSecUSD: pUSD },
      minimumSeconds: minSec,
      customQuoteFromSeconds: customSec
    };

    // Duration table rows
    const dtRows = document.querySelectorAll('#durationTableBody tr');
    dtRows.forEach((tr, idx) => {
      if (adminContent.pricing.durationTable[idx]) {
        const mBDTVal = tr.querySelector('.dt-m-bdt').value.trim();
        const mUSDVal = tr.querySelector('.dt-m-usd').value.trim();
        const pBDTVal = tr.querySelector('.dt-p-bdt').value.trim();
        const pUSDVal = tr.querySelector('.dt-p-usd').value.trim();
        const turnEnVal = tr.querySelector('.dt-turn-en').value.trim();
        const turnBnVal = tr.querySelector('.dt-turn-bn').value.trim();
        const formatsVal = tr.querySelector('.dt-formats').value.trim();

        adminContent.pricing.durationTable[idx].mediumBDT = mBDTVal;
        adminContent.pricing.durationTable[idx].mediumUSD = mUSDVal;
        adminContent.pricing.durationTable[idx].premiumBDT = pBDTVal;
        adminContent.pricing.durationTable[idx].premiumUSD = pUSDVal;
        adminContent.pricing.durationTable[idx].turnaround = { en: turnEnVal, bn: turnBnVal };
        adminContent.pricing.durationTable[idx].formats = formatsVal;
      }
    });

    // Other services rows
    const osItems = document.querySelectorAll('#otherServicesContainer .service-editor-item');
    osItems.forEach((item, idx) => {
      if (adminContent.pricing.otherServices[idx]) {
        adminContent.pricing.otherServices[idx].mediumBDT = item.querySelector('.os-m-bdt').value.trim();
        adminContent.pricing.otherServices[idx].mediumUSD = item.querySelector('.os-m-usd').value.trim();
        adminContent.pricing.otherServices[idx].premiumBDT = item.querySelector('.os-p-bdt').value.trim();
        adminContent.pricing.otherServices[idx].premiumUSD = item.querySelector('.os-p-usd').value.trim();
        adminContent.pricing.otherServices[idx].scope = {
          en: item.querySelector('.os-scope-en').value.trim(),
          bn: item.querySelector('.os-scope-bn').value.trim()
        };
      }
    });

    saveAdminContent(true);
  });
}

// ============================================================
// 7. Tab 3: Services Management
// ============================================================

function renderServicesEditor() {
  const container = document.getElementById('servicesEditorContainer');
  if (!container || !adminContent || !Array.isArray(adminContent.services)) return;

  container.innerHTML = adminContent.services.map((s, idx) => {
    const nameEn = s.name ? (s.name.en || '') : '';
    const nameBn = s.name ? (s.name.bn || nameEn) : '';
    const probEn = s.problem ? (s.problem.en || '') : '';
    const probBn = s.problem ? (s.problem.bn || probEn) : '';
    const timeEn = s.timeline ? (s.timeline.en || '') : '';
    const timeBn = s.timeline ? (s.timeline.bn || timeEn) : '';

    const priceBDT = s.startingPrice ? (s.startingPrice.bdt || '') : '';
    const priceUSD = s.startingPrice ? (s.startingPrice.usd || '') : '';

    const inclusionsTextEn = (s.inclusions || []).map(inc => typeof inc === 'string' ? inc : (inc.en || '')).join('\n');
    const inclusionsTextBn = (s.inclusions || []).map(inc => typeof inc === 'string' ? inc : (inc.bn || inc.en || '')).join('\n');

    return `
      <div class="service-editor-item" data-svc-idx="${idx}">
        <div class="service-editor-header">
          <input type="text" class="form-input svc-icon" value="${escapeAttr(s.icon || '🎬')}" style="width:50px;text-align:center;">
          <strong>Service ${idx + 1}: ${escapeHtml(nameEn)} (${escapeHtml(nameBn)})</strong>
        </div>

        <div class="grid-2 mb-md">
          <div class="form-group">
            <label class="form-label" data-en="Service Name (EN)" data-bn="সার্ভিসের নাম (ইংরেজি)">Service Name (EN)</label>
            <input type="text" class="form-input svc-name-en" value="${escapeAttr(nameEn)}">
          </div>
          <div class="form-group">
            <label class="form-label" data-en="Service Name (BN)" data-bn="সার্ভিসের নাম (বাংলা)">Service Name (BN)</label>
            <input type="text" class="form-input svc-name-bn" value="${escapeAttr(nameBn)}">
          </div>
        </div>

        <div class="grid-2 mb-md">
          <div class="form-group">
            <label class="form-label" data-en="Buyer Problem Statement (EN)" data-bn="গ্রাহকের সমস্যা ও সমাধান (ইংরেজি)">Buyer Problem Statement (EN)</label>
            <textarea class="form-textarea svc-prob-en" rows="3">${escapeHtml(probEn)}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" data-en="Buyer Problem Statement (BN)" data-bn="গ্রাহকের সমস্যা ও সমাধান (বাংলা)">Buyer Problem Statement (BN)</label>
            <textarea class="form-textarea svc-prob-bn" rows="3">${escapeHtml(probBn)}</textarea>
          </div>
        </div>

        <div class="grid-2 mb-md">
          <div class="form-group">
            <label class="form-label" data-en="Inclusions List (1 per line, EN)" data-bn="ইনক্লুশন তালিকা (প্রতি লাইনে ১টি, ইংরেজি)">Inclusions List (1 per line, EN)</label>
            <textarea class="form-textarea svc-inc-en" rows="5">${escapeHtml(inclusionsTextEn)}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label" data-en="Inclusions List (1 per line, BN)" data-bn="ইনক্লুশন তালিকা (প্রতি লাইনে ১টি, বাংলা)">Inclusions List (1 per line, BN)</label>
            <textarea class="form-textarea svc-inc-bn" rows="5">${escapeHtml(inclusionsTextBn)}</textarea>
          </div>
        </div>

        <div class="grid-4">
          <div class="form-group">
            <label class="form-label" data-en="Timeline (EN)" data-bn="ডেলিভারি সময় (ইংরেজি)">Timeline (EN)</label>
            <input type="text" class="form-input svc-time-en" value="${escapeAttr(timeEn)}">
          </div>
          <div class="form-group">
            <label class="form-label" data-en="Timeline (BN)" data-bn="ডেলিভারি সময় (বাংলা)">Timeline (BN)</label>
            <input type="text" class="form-input svc-time-bn" value="${escapeAttr(timeBn)}">
          </div>
          <div class="form-group">
            <label class="form-label" data-en="Starting Price (BDT)" data-bn="প্রারম্ভিক মূল্য (টাকা)">Starting Price (BDT)</label>
            <input type="text" class="form-input svc-price-bdt" value="${escapeAttr(priceBDT)}">
          </div>
          <div class="form-group">
            <label class="form-label" data-en="Starting Price (USD)" data-bn="প্রারম্ভিক মূল্য (ডলার)">Starting Price (USD)</label>
            <input type="text" class="form-input svc-price-usd" value="${escapeAttr(priceUSD)}">
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function initServicesHandlers() {
  const saveBtn = document.getElementById('saveServicesBtn');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', () => {
    if (!adminContent || !Array.isArray(adminContent.services)) return;

    const items = document.querySelectorAll('#servicesEditorContainer .service-editor-item');
    items.forEach((item, idx) => {
      if (adminContent.services[idx]) {
        const icon = item.querySelector('.svc-icon').value.trim() || '🎬';
        const nameEn = item.querySelector('.svc-name-en').value.trim();
        const nameBn = item.querySelector('.svc-name-bn').value.trim() || nameEn;
        const probEn = item.querySelector('.svc-prob-en').value.trim();
        const probBn = item.querySelector('.svc-prob-bn').value.trim() || probEn;
        const timeEn = item.querySelector('.svc-time-en').value.trim();
        const timeBn = item.querySelector('.svc-time-bn').value.trim() || timeEn;
        const priceBDT = item.querySelector('.svc-price-bdt').value.trim();
        const priceUSD = item.querySelector('.svc-price-usd').value.trim();

        const incLinesEn = item.querySelector('.svc-inc-en').value.split('\n').map(l => l.trim()).filter(Boolean);
        const incLinesBn = item.querySelector('.svc-inc-bn').value.split('\n').map(l => l.trim()).filter(Boolean);

        const inclusions = incLinesEn.map((enText, lIdx) => ({
          en: enText,
          bn: incLinesBn[lIdx] || enText
        }));

        adminContent.services[idx].icon = icon;
        adminContent.services[idx].name = { en: nameEn, bn: nameBn };
        adminContent.services[idx].problem = { en: probEn, bn: probBn };
        adminContent.services[idx].timeline = { en: timeEn, bn: timeBn };
        adminContent.services[idx].startingPrice = {
          bdt: priceBDT,
          usd: priceUSD,
          en: priceUSD,
          bn: priceBDT
        };
        adminContent.services[idx].inclusions = inclusions;
      }
    });

    saveAdminContent(true);
  });
}

// ============================================================
// 8. Tab 4: FAQ Management
// ============================================================

function renderFaqList() {
  const container = document.getElementById('faqListContainer');
  if (!container || !adminContent || !Array.isArray(adminContent.faq)) return;

  container.innerHTML = adminContent.faq.map((item, idx) => {
    const qEn = item.question ? (item.question.en || '') : '';
    const qBn = item.question ? (item.question.bn || qEn) : '';
    const aEn = item.answer ? (item.answer.en || '') : '';
    const aBn = item.answer ? (item.answer.bn || aEn) : '';

    return `
      <div class="service-editor-item" data-faq-idx="${idx}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:8px;">
          <div>
            <div style="font-weight:700;color:var(--navy);font-size:1.02rem;">
              Q${idx + 1}: ${escapeHtml(currentAdminLang === 'bn' ? qBn : qEn)}
            </div>
            <div style="font-size:0.85rem;color:var(--text-muted);margin-top:2px;">
              ${escapeHtml(currentAdminLang === 'bn' ? qEn : qBn)}
            </div>
          </div>
          <div style="white-space:nowrap;">
            <button type="button" class="btn-secondary btn-sm edit-faq-btn" data-index="${idx}" style="margin-right:6px;" data-en="Edit" data-bn="সম্পাদনা">
              ${currentAdminLang === 'bn' ? 'সম্পাদনা' : 'Edit'}
            </button>
            <button type="button" class="btn-danger btn-sm delete-faq-btn" data-index="${idx}" data-en="Delete" data-bn="মুছুন">
              ${currentAdminLang === 'bn' ? 'মুছুন' : 'Delete'}
            </button>
          </div>
        </div>
        <p style="font-size:0.9rem;color:var(--gray-700);line-height:1.5;">
          ${escapeHtml(currentAdminLang === 'bn' ? aBn : aEn)}
        </p>
      </div>
    `;
  }).join('');
}

function initFaqHandlers() {
  const addBtn = document.getElementById('addFaqBtn');
  const saveBtn = document.getElementById('saveFaqBtn');
  const modal = document.getElementById('faqModal');
  const modalTitle = document.getElementById('faqModalTitle');
  const faqForm = document.getElementById('faqForm');
  const cancelBtn = document.getElementById('cancelFaqBtn');
  const closeBtn = document.getElementById('closeFaqModalBtn');
  const listContainer = document.getElementById('faqListContainer');

  function openFaqModal(index = -1) {
    if (!modal) return;
    const isEdit = index >= 0;
    const item = isEdit && adminContent.faq[index] ? adminContent.faq[index] : null;

    if (modalTitle) {
      modalTitle.textContent = isEdit
        ? (currentAdminLang === 'bn' ? 'FAQ আইটেম সম্পাদনা' : 'Edit FAQ Item')
        : (currentAdminLang === 'bn' ? 'নতুন FAQ যোগ করুন' : 'Add FAQ Item');
    }

    document.getElementById('faqIndex').value = index;
    document.getElementById('faqQuestionEn').value = item ? (item.question.en || '') : '';
    document.getElementById('faqQuestionBn').value = item ? (item.question.bn || '') : '';
    document.getElementById('faqAnswerEn').value = item ? (item.answer.en || '') : '';
    document.getElementById('faqAnswerBn').value = item ? (item.answer.bn || '') : '';

    modal.classList.add('open');
  }

  function closeFaqModal() {
    if (modal) modal.classList.remove('open');
  }

  if (addBtn) addBtn.addEventListener('click', () => openFaqModal(-1));
  if (cancelBtn) cancelBtn.addEventListener('click', closeFaqModal);
  if (closeBtn) closeBtn.addEventListener('click', closeFaqModal);

  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveAdminContent(true);
    });
  }

  // Edit / Delete delegation
  if (listContainer) {
    listContainer.addEventListener('click', (e) => {
      const editBtn = e.target.closest('.edit-faq-btn');
      if (editBtn) {
        const index = parseInt(editBtn.getAttribute('data-index'), 10);
        openFaqModal(index);
        return;
      }

      const delBtn = e.target.closest('.delete-faq-btn');
      if (delBtn) {
        const index = parseInt(delBtn.getAttribute('data-index'), 10);
        const confirmMsg = currentAdminLang === 'bn'
          ? 'আপনি কি নিশ্চিত যে এই প্রশ্নটি মুছে ফেলতে চান?'
          : 'Are you sure you want to delete this FAQ item?';

        if (confirm(confirmMsg)) {
          adminContent.faq.splice(index, 1);
          saveAdminContent(true);
          renderFaqList();
        }
      }
    });
  }

  if (faqForm) {
    faqForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const index = parseInt(document.getElementById('faqIndex').value, 10);
      const qEn = document.getElementById('faqQuestionEn').value.trim();
      const qBn = document.getElementById('faqQuestionBn').value.trim() || qEn;
      const aEn = document.getElementById('faqAnswerEn').value.trim();
      const aBn = document.getElementById('faqAnswerBn').value.trim() || aEn;

      if (!qEn || !aEn) {
        alert(currentAdminLang === 'bn' ? 'অনুগ্রহ করে প্রশ্ন ও উত্তর দিন।' : 'Please enter question and answer.');
        return;
      }

      const faqItem = {
        id: index >= 0 && adminContent.faq[index] ? adminContent.faq[index].id : Date.now(),
        question: { en: qEn, bn: qBn },
        answer: { en: aEn, bn: aBn }
      };

      if (index >= 0) {
        adminContent.faq[index] = faqItem;
      } else {
        adminContent.faq.push(faqItem);
      }

      saveAdminContent(true);
      closeFaqModal();
      renderFaqList();
    });
  }
}

// ============================================================
// 9. Tab 5: Hero Management
// ============================================================

function populateHeroFields() {
  if (!adminContent || !adminContent.hero) return;
  const h = adminContent.hero;

  const hlEn = document.getElementById('heroHeadlineEn');
  const hlBn = document.getElementById('heroHeadlineBn');
  const tagEn = document.getElementById('heroTaglineEn');
  const tagBn = document.getElementById('heroTaglineBn');
  const subEn = document.getElementById('heroSubheadlineEn');
  const subBn = document.getElementById('heroSubheadlineBn');

  if (hlEn) hlEn.value = h.headline?.en || '';
  if (hlBn) hlBn.value = h.headline?.bn || '';
  if (tagEn) tagEn.value = h.tagline?.en || '';
  if (tagBn) tagBn.value = h.tagline?.bn || '';
  if (subEn) subEn.value = h.subheadline?.en || '';
  if (subBn) subBn.value = h.subheadline?.bn || '';
}

function initHeroHandlers() {
  const saveBtn = document.getElementById('saveHeroBtn');
  if (!saveBtn) return;

  saveBtn.addEventListener('click', () => {
    if (!adminContent) return;

    adminContent.hero = {
      headline: {
        en: document.getElementById('heroHeadlineEn').value.trim() || 'VisualFizz',
        bn: document.getElementById('heroHeadlineBn').value.trim() || 'ভিজ্যুয়ালফিজ'
      },
      tagline: {
        en: document.getElementById('heroTaglineEn').value.trim() || 'Ideas Into Impact',
        bn: document.getElementById('heroTaglineBn').value.trim() || 'আইডিয়া থেকে ইম্প্যাক্ট'
      },
      subheadline: {
        en: document.getElementById('heroSubheadlineEn').value.trim(),
        bn: document.getElementById('heroSubheadlineBn').value.trim()
      }
    };

    saveAdminContent(true);
  });
}

// ============================================================
// 10. Dashboard Initialization
// ============================================================

function populateDashboardFields() {
  if (!adminContent) return;
  renderPortfolioTable();
  populatePricingFields();
  renderServicesEditor();
  renderFaqList();
  populateHeroFields();
}

async function initDashboard() {
  if (!adminContent) {
    await loadAdminContent();
  }
  populateDashboardFields();
}

function initGlobalActions() {
  const saveAllBtn = document.getElementById('saveAllBtn');
  const downloadBtn = document.getElementById('downloadJsonBtn');
  const copyBtn = document.getElementById('copyJsonBtn');
  const resetBtn = document.getElementById('resetDefaultsBtn');

  if (saveAllBtn) {
    saveAllBtn.addEventListener('click', () => {
      // Trigger per-section state captures
      const pricingSave = document.getElementById('savePricingBtn');
      const servicesSave = document.getElementById('saveServicesBtn');
      const heroSave = document.getElementById('saveHeroBtn');

      if (pricingSave) pricingSave.click();
      if (servicesSave) servicesSave.click();
      if (heroSave) heroSave.click();

      saveAdminContent(true);
    });
  }

  if (downloadBtn) downloadBtn.addEventListener('click', downloadContentJson);
  if (copyBtn) copyBtn.addEventListener('click', copyContentJson);
  if (resetBtn) resetBtn.addEventListener('click', resetToDefaults);

  // Setup language selector in admin header
  const langToggle = document.getElementById('adminLangToggle');
  if (langToggle) {
    langToggle.addEventListener('click', (e) => {
      const span = e.target.closest('[data-lang]');
      if (span) {
        setAdminLanguage(span.getAttribute('data-lang'));
      } else {
        setAdminLanguage(currentAdminLang === 'en' ? 'bn' : 'en');
      }
    });
  }
}

// ============================================================
// 11. App Bootstrap
// ============================================================

function initAdmin() {
  const initialLang = getInitialAdminLanguage();
  setAdminLanguage(initialLang);

  initAuthHandlers();
  initTabNavigation();
  initPortfolioHandlers();
  initPricingHandlers();
  initServicesHandlers();
  initFaqHandlers();
  initHeroHandlers();
  initGlobalActions();

  checkAuthStatus();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdmin);
} else {
  initAdmin();
}

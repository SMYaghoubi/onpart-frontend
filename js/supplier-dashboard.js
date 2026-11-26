(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SupplierDashboard = api;
})(typeof window === 'undefined' ? this : window, function () {
  const views = { dashboard:'پیشخوان', products:'محصولات من', orders:'سفارش‌های من', bulk:'ثبت گروهی محصولات', requests:'درخواست‌ها و وضعیت تأیید', brands:'برندهای من', account:'اطلاعات حساب کاربری' };
  const fa = value => String(value).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let config, error = '', returnFocus, mobile;
  const node = id => document.getElementById(id);

  // The existing endpoint returns the account's permitted active catalog, not
  // a new seller/ownership model. Keep this basis explicit in the UI.
  function statistics(snapshot) {
    const products = snapshot.products || [], drafts = snapshot.drafts || [], batches = snapshot.batches || [];
    const available = products.filter(p => !(p.quantity != null && Number(p.quantity) === 0) && Boolean(Number(p.available))).length;
    return {
      approved:products.length, available, unavailable:products.length - available,
      drafts:drafts.length, pending:batches.filter(b => b.status === 'pending').length,
      limitedHistory:batches.length >= 100
    };
  }

  function update() {
    if (!config) return;
    const state = config.snapshot(), stats = statistics(state), ready = state.loaded;
    for (const [id, key] of [['statApproved','approved'],['statAvailable','available'],['statUnavailable','unavailable'],['statPending','pending']]) node(id).textContent = ready ? fa(stats[key]) : '—';
    node('statDrafts').textContent = fa(stats.drafts);
    node('topDraftCount').textContent = fa(stats.drafts);
    node('pendingScope').textContent = stats.limitedHistory ? 'در ۱۰۰ درخواست اخیر' : 'ارسال‌شده برای مدیریت';
    node('navPending').textContent = fa(stats.pending);
    node('navPending').hidden = !ready || !stats.pending;
    document.querySelectorAll('[data-product-filter]').forEach(button => { button.disabled = !ready && button.dataset.productFilter !== 'draft'; });
    document.querySelectorAll('[data-draft-action]').forEach(button => { button.disabled = !stats.drafts || state.busy; });
    node('dashboardDataNote').textContent = error
      ? 'دریافت آخرین اطلاعات انجام نشد: ' + error
      : ready ? 'آمار موجودی از فهرست مجاز حساب شماست؛ تغییرات پیش‌نویس پس از تأیید مدیریت اعمال می‌شوند.' : 'در حال دریافت اطلاعات حساب…';
    node('dashboardDataNote').classList.toggle('has-error', Boolean(error));
    const tags = ready ? (state.brands || []).map(brand => '<span>' + esc(brand) + '</span>').join('') || '<span>برندی برای این حساب ثبت نشده است.</span>' : (error ? 'دریافت برندها انجام نشد.' : 'در حال دریافت…');
    node('dashboardBrands').innerHTML = tags;
    node('accountBrands').innerHTML = tags;
    const labels = { pending:'در انتظار بررسی', approved:'تأییدشده', rejected:'ردشده' };
    node('recentRequests').innerHTML = ready ? (state.batches || []).slice(0, 3).map(batch => {
      const status = Object.hasOwn(labels,batch.status) ? batch.status : 'pending';
      const id = Number(batch.id);
      const date = API.formatDate(batch.submitted_at, {withTime:false});
      return '<div class="recent-request"><div><b>درخواست ' + fa(id) + '</b><small>' + esc(date) + ' · ' + fa(Number(batch.item_count) || 0) + ' کالا</small></div><div class="request-result"><span class="badge ' + status + '">' + labels[status] + '</span><button type="button" class="text-button" data-request-id="' + id + '">جزئیات</button></div></div>';
    }).join('') || '<div class="empty-state"><svg class="icon"><use href="#i-file"/></svg><p>هنوز درخواستی ارسال نکرده‌اید.</p><small>پس از ثبت و ارسال کالا، نتیجه بررسی اینجا نمایش داده می‌شود.</small></div>' : '<p class="empty">' + (error ? 'دریافت درخواست‌ها انجام نشد.' : 'در حال دریافت درخواست‌ها…') + '</p>';
  }

  function setError(message) { error = message || ''; update(); }

  function closeMenu(restore = true) {
    const wasOpen = document.body.classList.contains('menu-open');
    document.body.classList.remove('menu-open');
    node('menuBackdrop').hidden = true;
    node('panelMain').inert = false;
    node('supplierSidebar').inert = Boolean(mobile?.matches);
    node('openMenu').setAttribute('aria-expanded','false');
    if (wasOpen && restore) returnFocus?.focus();
  }

  function openMenu() {
    returnFocus = document.activeElement;
    document.body.classList.add('menu-open');
    node('supplierSidebar').inert = false;
    node('panelMain').inert = true;
    node('menuBackdrop').hidden = false;
    node('openMenu').setAttribute('aria-expanded','true');
    node('closeMenu').focus();
  }

  function go(view, focus = true) {
    if (!Object.hasOwn(views,view)) view = 'dashboard';
    document.querySelectorAll('[data-panel]').forEach(panel => { panel.hidden = panel.dataset.panel !== view; });
    document.querySelectorAll('.sidebar-nav [data-view]').forEach(button => {
      const active = button.dataset.view === view;
      button.classList.toggle('active',active);
      if (active) button.setAttribute('aria-current','page'); else button.removeAttribute('aria-current');
    });
    node('viewName').textContent = views[view];
    document.title = views[view] + ' | پنل تأمین‌کننده آن‌پارت';
    if (location.hash !== '#' + view) history.replaceState(null,'','#' + view);
    closeMenu(false);
    if (focus) node('view-' + view).querySelector('h1')?.focus({preventScroll:true});
    window.scrollTo({top:0,behavior:'instant'});
    if (view === 'orders') window.SupplierOrders?.load();
    if (view === 'brands') window.SupplierBrandRequests?.load();
  }

  function renderAccount(account, fresh) {
    const company = account.company || config.supplier.company || 'تأمین‌کننده گرامی';
    node('company').textContent = company;
    node('sidebarCompany').textContent = company;
    node('accountSellerCode').textContent = fresh && /^OP-[1-9][0-9]{5}$/.test(account.seller_code || '') ? account.seller_code : '—';
    node('accountCompany').textContent = account.company || '—';
    node('accountName').textContent = account.name || '—';
    node('accountMobile').textContent = account.mobile ? fa(account.mobile) : '—';
    node('accountApproval').textContent = fresh ? (account.status === 'approved' ? 'تأییدشده' : 'تأییدنشده') : '—';
    node('accountStatus').textContent = fresh ? 'اطلاعات ثبت‌شده حساب شما؛ این بخش فقط برای مشاهده است.' : 'اطلاعات آخرین ورود؛ در حال دریافت اطلاعات حساب…';
  }

  function init(options) {
    config = options;
    window.SupplierOrders?.init({request:config.request});
    window.SupplierBrandRequests?.init({request:config.request,onApprovedCatalogRefresh:config.reloadCatalog});
    mobile = window.matchMedia('(max-width: 1080px)');
    document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click',() => go(button.dataset.view)));
    document.querySelectorAll('[data-entry-action]').forEach(button => button.addEventListener('click',() => {closeMenu(false);config.openEntry();}));
    document.querySelectorAll('[data-draft-action]').forEach(button => button.addEventListener('click',() => config.openDraft()));
    document.querySelectorAll('[data-product-filter]').forEach(button => button.addEventListener('click',() => {config.filterProducts(button.dataset.productFilter);go('products');}));
    node('recentRequests').addEventListener('click',event => {
      const button = event.target.closest('[data-request-id]');
      if (button) config.showHistory(Number(button.dataset.requestId));
    });
    node('openMenu').addEventListener('click',openMenu);
    node('closeMenu').addEventListener('click',() => closeMenu());
    node('menuBackdrop').addEventListener('click',() => closeMenu());
    document.addEventListener('keydown',event => {
      if (!document.body.classList.contains('menu-open')) return;
      if (event.key === 'Escape') {event.preventDefault();closeMenu();}
      if (event.key === 'Tab') {
        const controls = [...node('supplierSidebar').querySelectorAll('button:not([disabled]),a[href]')].filter(el => el.getClientRects().length);
        const first = controls[0], last = controls[controls.length-1];
        if (event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
        else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
      }
    });
    mobile.addEventListener('change',() => closeMenu());
    window.addEventListener('hashchange',() => {const target=location.hash.slice(1);if(Object.hasOwn(views,target))go(target,false);});
    renderAccount(config.supplier,false);
    config.request('/me').then(account => renderAccount(account,true)).catch(() => {
      node('accountStatus').textContent = 'دریافت اطلاعات تازه انجام نشد؛ اطلاعات آخرین ورود نمایش داده می‌شود.';
    });
    go(location.hash.slice(1),false);
    update();
  }

  return { init, update, setError, go, statistics };
});


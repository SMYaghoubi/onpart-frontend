// Admin Sidebar & Shared Components
const API_BASE = 'https://onpartpadmin.liara.run';

const Admin = {
  _adminNotificationAudio: null,
  _adminNotificationSoundReady: false,
  _adminNotificationStream: null,

  // All pages with permission keys
  pages: [
    { id:'dashboard', label:'داشبورد',       icon:'ti-layout-dashboard', href:'/admin/',    perm:null },
    { id:'orders',    label:'سفارشات',        icon:'ti-shopping-bag',     href:'/admin/orders',   perm:'orders',   badge:'orders' },
    { id:'products',  label:'محصولات',        icon:'ti-packages',         href:'/admin/products', perm:'products' },
    { id:'invoices',  label:'فاکتورها',        icon:'ti-receipt',          href:'/admin/invoices', perm:'invoices' },
    { id:'payments',  label:'پرداخت‌ها',       icon:'ti-credit-card',      href:'/admin/payments', perm:'payments', badge:'payments' },
    { id:'users',     label:'کاربران',         icon:'ti-users',            href:'/admin/users',    perm:'users' },
    { id:'partners',  label:'تامین‌کنندگان',   icon:'ti-building-store',   href:'/admin/partners', perm:'partners' },
    { id:'supplier_updates', label:'تغییرات تأمین‌کنندگان', icon:'ti-file-check', href:'/admin/supplier-updates', perm:'partners', badge:'supplier_updates' },
    { id:'admins',    label:'مدیران',          icon:'ti-shield-lock',      href:'/admin/admins',   perm:'admins' },
    { id:'credit',    label:'اعتبارات',        icon:'ti-id-badge',         href:'/admin/credit',   perm:'credit' },
    { id:'shipping',  label:'حمل و نقل',        icon:'ti-truck',            href:'/admin/shipping', perm:'orders' },
    { id:'sms',       label:'پیامک',           icon:'ti-message-2',        href:'/admin/sms',      perm:'sms' },
    { id:'announcements', label:'اعلان‌ها',    icon:'ti-speakerphone',     href:'/admin/announcements', perm:null },
    { id:'reports',   label:'گزارشات',         icon:'ti-chart-bar',        href:'/admin/reports',  perm:'reports' },
    { id:'settings',  label:'تنظیمات',         icon:'ti-settings',         href:'/admin/settings', perm:'settings' },
  ],

  sections: [
    { label:'داشبورد',    items:['dashboard'] },
    { label:'فروش',       items:['orders','products','payments','shipping'] },
    { label:'کاربران',    items:['users','partners','supplier_updates','admins','credit'] },
    { label:'ارتباطات',   items:['sms','announcements','reports'] },
    { label:'تنظیمات',    items:['settings'] },
  ],

  getUser() {
    try { return JSON.parse(OnPartSession.getUserRaw('admin') || '{}'); }
    catch (_) { return {}; }
  },

  escape(value) {
    return (typeof API !== 'undefined' && API.escapeHtml)
      ? API.escapeHtml(value)
      : String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  },

  safeLink(value) {
    const link = String(value || '').trim();
    if (!link) return '';
    try {
      const url = new URL(link, window.location.href);
      if (url.origin !== window.location.origin) return '';
      return url.href;
    } catch (_) { return ''; }
  },

  getPerms() {
    const user = this.getUser();
    // Super admin has all perms
    if (user.role === 'admin' && !user.permissions) return null;
    return user.permissions || null;
  },

  hasPerm(perm) {
    if (!perm) return true;
    const perms = this.getPerms();
    if (!perms) return true; // super admin
    return Array.isArray(perms) && perms.includes(perm);
  },

  renderSidebar(active = '') {
    // Security check: only admin/partner roles can access the admin panel
    const activePage = this.pages.find(page => page.id === active);
    if (!this.protect(activePage ? activePage.perm : null)) return;

    const user = this.getUser();
    let html = `
    <div class="sidebar" role="navigation" aria-label="منوی مدیریت">
      <button type="button" class="sb-mobile-close" onclick="Admin.closeSidebar()" aria-label="بستن منو"><i class="ti ti-x"></i></button>
      <div class="sb-logo" style="justify-content:center;padding:22px 16px">
        <img src="../images/logo.png" alt="لوگوی آن‌پارت" style="height:54px;object-fit:contain"/>
      </div>`;

    this.sections.forEach(sec => {
      const visibleItems = sec.items.filter(id => {
        const p = this.pages.find(x => x.id === id);
        return p && this.hasPerm(p.perm);
      });

      if (!visibleItems.length) return;

      html += `<div class="sb-section"><div class="sb-lbl">${sec.label}</div>`;
      visibleItems.forEach(id => {
        const p = this.pages.find(x => x.id === id);
        if (!p) return;
        const isActive = active === id;
        if(p.disabled){
          html += `<div class="sb-item" style="opacity:.5;cursor:not-allowed;position:relative">
            <i class="ti ${p.icon}"></i>
            <span>${p.label}</span>
            <span style="margin-right:auto;background:#f59e0b;color:#fff;border-radius:10px;padding:1px 7px;font-size:9px;font-weight:700">به‌زودی</span>
          </div>`;
        } else {
          html += `<a class="sb-item${isActive?' active':''}" href="${p.href}">
            <i class="ti ${p.icon}"></i>
            <span>${p.label}</span>
            ${p.badge ? `<div class="sb-badge-dot" id="sb_badge_${p.badge}" style="display:none;margin-right:auto;background:#ef4444;color:#fff;border-radius:10px;padding:1px 6px;font-size:10px;font-weight:700">۰</div>` : ''}
          </a>`;
        }
      });
      html += `</div>`;
    });

    html += `
      <div class="sb-user">
        <div class="sb-av"><i class="ti ti-user"></i></div>
        <div>
          <div class="sb-un">${this.escape(user.name || 'مدیر سیستم')}</div>
          <div class="sb-ur">${user.role === 'admin' ? 'Super Admin' : 'بازاریاب'}</div>
        </div>
        <i class="ti ti-logout sb-logout" onclick="Admin.logout()" title="خروج"></i>
      </div>
    </div>`;

    document.getElementById('sidebar-placeholder').innerHTML = html;

    // Load once after render, then refresh at a controlled interval.
    this.initAdminNotifications();
    setTimeout(() => { this.loadNotifs(false); this.loadBadges(); }, 500);
    if(!this._notifInterval) {
      this._notifInterval = setInterval(() => { this.loadNotifs(true); this.loadBadges(); }, 20000);
    }

    // Create overlay only (the blue hamburger button is in topbar)
    if(!document.getElementById('sidebarOverlay')){
      const overlay = document.createElement('div');
      overlay.className = 'sidebar-overlay';
      overlay.id = 'sidebarOverlay';
      document.body.appendChild(overlay);
      overlay.onclick = () => this.closeSidebar();
    }
  },

  async loadBadges() {
    try {
      const token = OnPartSession.getToken('admin');
      const h = {'Authorization':'Bearer '+token};
      const BASE = 'https://onpartpadmin.liara.run';
      const setBadge = (id, n) => {
        const el = document.getElementById('sb_badge_'+id);
        if(el){ if(n>0){el.textContent=this.fa(n);el.style.display='block';}else el.style.display='none'; }
      };
      const [oRes,pRes] = await Promise.all([
        fetch(BASE+'/api/orders?limit=200&admin=1',{headers:h}).catch(()=>null),
        fetch(BASE+'/api/payments',{headers:h}).catch(()=>null),
      ]);
      if(oRes&&oRes.ok){ const d=await oRes.json(); setBadge('orders',d.filter(o=>o.status==='pending_expert').length); }
      if(pRes&&pRes.ok){ const d=await pRes.json(); setBadge('payments',d.filter(p=>p.status==='pending').length); }
    } catch(e){}
  },

  renderTopbar(title = '', icon = 'ti-layout-dashboard') {
    document.getElementById('topbar-placeholder').innerHTML = `
    <div class="topbar">
      <div class="topbar-title"><i class="ti ${this.escape(icon)}"></i>${this.escape(title)}</div>
      <div class="topbar-right">
        <a href="/shop" onclick="sessionStorage.setItem('allow_shop','1')" style="display:flex;align-items:center;gap:5px;background:#f0fdf4;color:#16a34a;border:1.5px solid #bbf7d0;border-radius:8px;padding:6px 12px;text-decoration:none;font-size:12px;font-weight:600;font-family:Vazirmatn,sans-serif" title="مشاهده فروشگاه"><i class="ti ti-external-link" style="font-size:14px"></i>فروشگاه</a>
        <button type="button" class="sb-burger" id="adminMenuButton" onclick="Admin.toggleSidebar()" aria-label="باز کردن منو" aria-controls="sidebar-placeholder" aria-expanded="false"><i class="ti ti-menu-2"></i></button>
        <div class="search-box">
          <i class="ti ti-search" style="color:#aaa;font-size:16px"></i>
          <input placeholder="جستجو..."/>
        </div>
        <div class="notif-btn" onclick="Admin.toggleNotifPanel()" id="notifBtnTop" style="position:relative">
          <i class="ti ti-bell" style="font-size:18px;color:#555"></i>
          <div class="notif-dot" id="notifDot" style="display:none"></div>
          <span id="notifCount" style="position:absolute;top:-4px;left:-4px;background:#ef4444;color:#fff;font-size:9px;font-weight:700;border-radius:50%;width:16px;height:16px;display:none;align-items:center;justify-content:center;font-family:Vazirmatn,sans-serif"></span>
        </div>
        <div id="notifPanel" style="display:none;position:absolute;top:calc(100% + 8px);left:0;width:340px;background:#fff;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.15);border:1px solid #f0f0f0;z-index:1000;overflow:hidden">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #f5f5f5">
            <span style="font-size:13px;font-weight:700;color:#111">اعلان‌ها</span>
            <div style="display:flex;gap:8px">
              <button onclick="Admin.readAllNotifs()" style="font-size:11px;color:#1d4ed8;background:none;border:none;cursor:pointer;font-family:Vazirmatn,sans-serif">همه خوانده</button>
              <button onclick="Admin.clearNotifs()" style="font-size:11px;color:#dc2626;background:none;border:none;cursor:pointer;font-family:Vazirmatn,sans-serif">پاک‌کردن خوانده‌شده‌ها</button>
            </div>
          </div>
          <div id="notifList" style="max-height:360px;overflow-y:auto"></div>
        </div>
      </div>
    </div>`;
    // Close notif panel when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function(e) {
        const panel = document.getElementById('notifPanel');
        const btn = document.getElementById('notifBtnTop');
        if (panel && btn && !panel.contains(e.target) && !btn.contains(e.target)) {
          panel.style.display = 'none';
        }
      });
    }, 100);
  },

  toast(msg, type = 'success') {
    const colors = { success: '#4ade80', error: '#f87171', info: '#60a5fa' };
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
      background:#0f172a;color:#fff;border-radius:12px;padding:12px 24px;
      font-size:14px;font-weight:600;display:flex;align-items:center;gap:10px;
      z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.3);white-space:nowrap;`;
    const icon = document.createElement('i');
    icon.className = `ti ti-${type==='success'?'check':'x'}`;
    icon.style.cssText = `color:${colors[type]||colors.success};font-size:18px`;
    t.appendChild(icon);
    t.appendChild(document.createTextNode(String(msg ?? '')));
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  },

  fa(n) { return n.toString().replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]); },
  fmt(n) { return this.fa(Number(n).toLocaleString()); },

  logout() {
    if (confirm('آیا می‌خواهید از سیستم خارج شوید؟')) {
      OnPartSession.clear('admin');

      window.location.href = '/admin/login';
    }
  },

  protect(requiredPerm = null) {
    const token = OnPartSession.getToken('admin');
    const user = this.getUser();
    if (!token) { window.location.replace('/admin/login'); return false; }

    // Block regular shop users (role 'user') from accessing admin panel entirely
    if (user.role !== 'admin' && user.role !== 'partner') {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Vazirmatn,sans-serif;direction:rtl"><div style="text-align:center"><div style="font-size:48px;color:#dc2626">⛔</div><div style="font-size:20px;font-weight:700;margin-top:16px">دسترسی غیرمجاز</div><div style="color:#aaa;margin-top:8px">شما اجازه ورود به پنل مدیریت را ندارید</div><a href="/shop" style="margin-top:20px;display:inline-block;background:#1d4ed8;color:#fff;border-radius:9px;padding:10px 24px;text-decoration:none;font-weight:700">بازگشت به فروشگاه</a></div></div>';
      return false;
    }

    if (requiredPerm && !this.hasPerm(requiredPerm)) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:Vazirmatn,sans-serif;direction:rtl"><div style="text-align:center"><div style="font-size:48px;color:#dc2626">⛔</div><div style="font-size:20px;font-weight:700;margin-top:16px">دسترسی غیرمجاز</div><div style="color:#aaa;margin-top:8px">شما به این بخش دسترسی ندارید</div><a href="/admin/" style="margin-top:20px;display:inline-block;background:#1d4ed8;color:#fff;border-radius:9px;padding:10px 24px;text-decoration:none;font-weight:700">بازگشت</a></div></div>';
      return false;
    }
    return true;
  },

  initAdminNotifications() {
    if (this._adminNotificationAudio) return;
    const audio = new Audio('/audio/onpart-notification.mp3');
    audio.preload = 'auto';
    this._adminNotificationAudio = audio;
    const unlock = () => {
      if (this._adminNotificationSoundReady) return;
      audio.muted = true;
      audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        this._adminNotificationSoundReady = true;
      }).catch(() => { audio.muted = false; });
    };
    ['pointerdown','touchstart','click','keydown'].forEach(event =>
      document.addEventListener(event, unlock, { passive: true })
    );
    if (window.EventSource) {
      this._adminNotificationStream = new EventSource(API_BASE + '/api/announcements/stream');
      this._adminNotificationStream.addEventListener('admin-notification', () => this.loadNotifs(true));
      this._adminNotificationStream.addEventListener('user-data-changed', event => {
        let detail={};try{detail=JSON.parse(event.data||'{}')}catch(_){}
        window.dispatchEvent(new CustomEvent('onpart:user-data-changed',{detail}));
      });
    }
  },

  playAdminNotificationSound() {
    if (!this._adminNotificationSoundReady || !this._adminNotificationAudio) return;
    this._adminNotificationAudio.currentTime = 0;
    this._adminNotificationAudio.play().catch(() => { this._adminNotificationSoundReady = false; });
  },

  async loadNotifs(notify = false) {
    const token = OnPartSession.getToken('admin');
    if (!token) return;
    try {
      const API_URL = (typeof API !== 'undefined') ? API.BASE_URL : 'https://onpartpadmin.liara.run';
      const res = await fetch(`${API_URL}/api/notifications`, {headers: {'Authorization': 'Bearer ' + token}});
      if (!res.ok) return;
      const data = await res.json();
      const notifs = data.notifications || [];
      const newestId = notifs.reduce((max, n) => Math.max(max, Number(n.id) || 0), 0);
      const storedId = sessionStorage.getItem('op_last_admin_notification_id');
      const previousId = Number(storedId || 0);
      if (storedId === null) sessionStorage.setItem('op_last_admin_notification_id', String(newestId));
      else if (newestId > previousId) {
        sessionStorage.setItem('op_last_admin_notification_id', String(newestId));
        if (notify) {
          this.playAdminNotificationSound();
          window.dispatchEvent(new CustomEvent('onpart:admin-notification'));
        }
      }
      const count = data.unreadCount || 0;
      const dot = document.getElementById('notifDot');
      const badge = document.getElementById('notifCount');
      if (dot) dot.style.display = count > 0 ? 'block' : 'none';
      if (badge) {
        badge.style.display = count > 0 ? 'flex' : 'none';
        badge.textContent = count > 9 ? '9+' : String(count);
      }
      const list = document.getElementById('notifList');
      if (!list) return;
      const typeIcon = {order: 'ti-shopping-bag', payment: 'ti-cash', user: 'ti-user-plus', credit: 'ti-credit-card'};
      const typeColor = {order: '#1d4ed8', payment: '#16a34a', user: '#9333ea', credit: '#d97706'};
      if (!notifs.length) {
        list.innerHTML = '<div style="text-align:center;padding:32px;color:#aaa;font-size:13px">هیچ اعلانی وجود ندارد</div>';
        return;
      }
      list.innerHTML = notifs.map(n => {
        const type = Object.prototype.hasOwnProperty.call(typeIcon, n.type) ? n.type : 'default';
        const id = Number.isInteger(Number(n.id)) ? Number(n.id) : 0;
        const link = encodeURIComponent(this.safeLink(n.link));
        return `
        <div onclick="Admin.goNotif(${id},decodeURIComponent('${link}'))" style="display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-bottom:1px solid #f7f7f7;cursor:pointer;background:${n.is_read?'#fff':'#f0f7ff'};transition:background .15s">
          <div style="width:34px;height:34px;border-radius:50%;background:${typeColor[n.type]||'#888'}22;display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <i class="ti ${typeIcon[type]||'ti-bell'}" style="color:${typeColor[type]||'#888'};font-size:15px"></i>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12.5px;font-weight:${n.is_read?600:700};color:#111">${this.escape(n.title||'اعلان')}</div>
            <div style="font-size:11.5px;color:#888;margin-top:2px">${this.escape(n.body||'')}</div>
            <div style="font-size:10.5px;color:#bbb;margin-top:3px">${new Date(n.created_at).toLocaleString('fa-IR')}</div>
          </div>
          ${!n.is_read ? '<div style="width:7px;height:7px;background:#1d4ed8;border-radius:50%;margin-top:5px;flex-shrink:0"></div>' : ''}
        </div>`;
      }).join('');
    } catch(e) {}
  },

  closeSidebar(restoreFocus = true) {
    const sb=document.querySelector('.sidebar'),overlay=document.getElementById('sidebarOverlay'),button=document.getElementById('adminMenuButton');
    if(sb)sb.classList.remove('open');if(overlay)overlay.classList.remove('show');
    document.body.classList.remove('admin-menu-open');if(button){button.setAttribute('aria-expanded','false');if(restoreFocus)button.focus()}
  },
  toggleSidebar() {
    const sb=document.querySelector('.sidebar'),button=document.getElementById('adminMenuButton');if(!sb)return;
    const opening=!sb.classList.contains('open');
    if(opening){sb.classList.add('open');document.getElementById('sidebarOverlay')?.classList.add('show');document.body.classList.add('admin-menu-open');button?.setAttribute('aria-expanded','true');sb.querySelector('a,button,[tabindex]')?.focus()}
    else this.closeSidebar();
  },

  toggleNotifPanel() {
    const panel = document.getElementById('notifPanel');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none';
    panel.style.display = isOpen ? 'none' : 'block';
    if (!isOpen) this.loadNotifs();
  },

  async goNotif(id, link) {
    const token = OnPartSession.getToken('admin');
    const API_URL = (typeof API !== 'undefined') ? API.BASE_URL : 'https://onpartpadmin.liara.run';
    await fetch(`${API_URL}/api/notifications/${id}/read`, {method:'PATCH', headers:{'Authorization':'Bearer '+token}});
    const safeLink = this.safeLink(link);
    if (safeLink) window.location.href = safeLink;
    else document.getElementById('notifPanel').style.display = 'none';
    this.loadNotifs();
  },

  async readAllNotifs() {
    const token = OnPartSession.getToken('admin');
    const API_URL = (typeof API !== 'undefined') ? API.BASE_URL : 'https://onpartpadmin.liara.run';
    await fetch(`${API_URL}/api/notifications/read-all`, {method:'PATCH', headers:{'Authorization':'Bearer '+token}});
    this.loadNotifs();
  },

  async clearNotifs() {
    if (!confirm('همه اعلان‌ها پاک شوند؟')) return;
    const token = OnPartSession.getToken('admin');
    const API_URL = (typeof API !== 'undefined') ? API.BASE_URL : 'https://onpartpadmin.liara.run';
    await fetch(`${API_URL}/api/notifications`, {method:'DELETE', headers:{'Authorization':'Bearer '+token}});
    this.loadNotifs();
  }
};


function toJalali(dateStr){
  if(!dateStr) return '—';
  try{
    const d = new Date(dateStr);
    if(isNaN(d)) return dateStr;
    const gy=d.getFullYear(),gm=d.getMonth()+1,gd=d.getDate();
    let jy=gy-1600,jm=0,jd=0,g_d_no,j_d_no,j_np,i;
    const g_d_m=[31,28,31,30,31,30,31,31,30,31,30,31];
    const j_d_m=[31,31,31,31,31,31,30,30,30,30,30,29];
    let gy2=gy-1600;
    g_d_no=365*gy2+Math.floor((gy2+3)/4)-Math.floor((gy2+99)/100)+Math.floor((gy2+399)/400);
    for(i=0;i<gm-1;i++) g_d_no+=g_d_m[i];
    if(gm>2&&((gy2%4===0&&gy2%100!==0)||(gy2%400===0))) g_d_no++;
    g_d_no+=gd;
    j_d_no=g_d_no-79;
    j_np=Math.floor(j_d_no/12053); j_d_no%=12053;
    jy=979+33*j_np+4*Math.floor(j_d_no/1461); j_d_no%=1461;
    if(j_d_no>=366){jy+=Math.floor((j_d_no-1)/365);j_d_no=(j_d_no-1)%365;}
    for(i=0;i<11&&j_d_no>=j_d_m[i];i++) j_d_no-=j_d_m[i];
    jm=i+1; jd=j_d_no+1;
    const fa=n=>String(n).replace(/\d/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]);
    return `${fa(jy)}/${fa(String(jm).padStart(2,'0'))}/${fa(String(jd).padStart(2,'0'))}`;
  }catch(e){return dateStr||'—';}
}

// Inject styles
const adminStyle = document.createElement('style');
adminStyle.textContent = `
  .layout{display:flex;min-height:100vh;background:#f1f5f9;}
  .sidebar{width:220px;background:#0f172a;display:flex;flex-direction:column;position:fixed;top:0;right:0;bottom:0;z-index:100;overflow-y:auto;}
  .sb-logo{padding:18px 16px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:10px;}
  .sb-logo-box{width:34px;height:34px;background:#1d4ed8;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;color:#fff;flex-shrink:0;}
  .sb-logo-text{font-size:15px;font-weight:800;color:#fff;}
  .sb-logo-text span{color:#60a5fa;}
  .sb-logo-sub{font-size:10px;color:rgba(255,255,255,.4);}
  .sb-section{padding:12px 10px 2px;}
  .sb-lbl{font-size:10px;font-weight:700;color:rgba(255,255,255,.3);letter-spacing:1px;padding:0 8px;margin-bottom:4px;}
  .sb-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px;cursor:pointer;transition:all .15s;margin-bottom:2px;text-decoration:none;}
  .sb-item:hover{background:rgba(255,255,255,.06);}
  .sb-item.active{background:#1d4ed8;}
  .sb-item i{font-size:17px;color:rgba(255,255,255,.45);flex-shrink:0;}
  .sb-item.active i,.sb-item.active span{color:#fff;}
  .sb-item span{font-size:12.5px;color:rgba(255,255,255,.55);font-weight:500;}
  .sb-user{margin-top:auto;padding:12px 10px;border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;gap:9px;}
  .sb-av{width:32px;height:32px;background:#1d4ed8;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff;flex-shrink:0;}
  .sb-un{font-size:12px;color:#fff;font-weight:600;}
  .sb-ur{font-size:10.5px;color:rgba(255,255,255,.4);}
  .sb-logout{margin-right:auto;color:rgba(255,255,255,.3);cursor:pointer;font-size:18px;}
  .sb-logout:hover{color:#ef4444;}
  .main{margin-right:220px;flex:1;}
  .topbar{background:#fff;border-bottom:1px solid #e5e7eb;padding:0 24px;height:54px;display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50;}
  .topbar-title{font-size:16px;font-weight:800;color:#111;display:flex;align-items:center;gap:8px;}
  .topbar-title i{color:#1d4ed8;}
  .topbar-right{display:flex;align-items:center;gap:12px;}
  .search-box{display:flex;align-items:center;gap:8px;background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:9px;padding:7px 14px;}
  .search-box input{border:none;background:transparent;font-family:'Vazirmatn',sans-serif;font-size:13px;outline:none;width:160px;}
  .notif-btn{position:relative;width:34px;height:34px;background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer;}
  .notif-dot{position:absolute;top:5px;left:5px;width:7px;height:7px;background:#ef4444;border-radius:50%;border:2px solid #fff;}
  .content{padding:20px 24px;}
  .sidebar-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:99;}
  .sidebar-overlay.show{display:block;}
  @media(max-width:768px){
    .sidebar{transform:translateX(100%);transition:transform .3s ease;}
    .sidebar.open{transform:translateX(0);}
    .main{margin-right:0!important;}
    .topbar{padding:0 14px;}
    .search-box{display:none!important;}
    .content{padding:12px 10px;}
    .sb-burger{display:flex!important;}

    /* Stats cards - 2 per row, compact */
    .stats{grid-template-columns:1fr 1fr!important;gap:8px!important;}
    .sc{padding:12px 14px!important;}
    .sc-val{font-size:14px!important;word-break:break-word;}
    .sc-lbl{font-size:10.5px!important;}
    .sc-icon{width:34px!important;height:34px!important;font-size:16px!important;}

    /* Table to card layout */
    .table-card{border-radius:10px!important;}
    .tc-head{padding:12px 14px!important;}
    .tbl{display:block;}
    .tbl thead{display:none;}
    .tbl tbody{display:block;}
    .tbl tbody tr{display:block;padding:12px 14px;border-bottom:1px solid #f0f0f0;background:#fff;}
    .tbl tbody tr td{display:flex;align-items:center;justify-content:space-between;padding:6px 0;border:none;text-align:left;font-size:12px;}
    .tbl tbody tr td:empty{display:none;}
    .tbl tbody tr td::before{content:attr(data-label);font-weight:600;color:#888;font-size:11px;flex-shrink:0;margin-left:10px;}
    .tbl tbody tr td:first-child{font-weight:700;}

    /* Toolbar */
    .toolbar{flex-direction:column;align-items:stretch!important;}
    .toolbar > *{width:100%!important;}
    .fi-input{min-width:0!important;}

    /* Forms */
    .fg-grid{grid-template-columns:1fr!important;}
    .info-grid{grid-template-columns:1fr!important;}

    /* Modal */
    .modal{max-width:100%!important;margin:0;border-radius:16px 16px 0 0!important;}
    .modal-overlay{align-items:flex-end!important;padding:0!important;}

    /* Settings tabs */
    .settings-tabs{flex-wrap:wrap!important;}
  }
  .sb-mobile-close{display:none;position:absolute;top:10px;left:10px;width:44px;height:44px;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,.16);border-radius:10px;background:rgba(255,255,255,.08);color:#fff;font-size:20px;cursor:pointer}
  .sb-burger{display:none;align-items:center;justify-content:center;width:36px;height:36px;background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:20px;color:#333;}
  html,body{max-width:100%;overflow-x:hidden}
  .layout,.main,.content,.card,.table-card,.table-wrap{min-width:0;max-width:100%}
  .admin-menu-open{overflow:hidden!important}
  @media(max-width:768px){
    .layout{display:block!important;width:100%!important;max-width:100vw!important;overflow-x:clip!important}
    #sidebar-placeholder{width:0!important;min-width:0!important}
    html body .layout .sidebar{position:fixed!important;inset-block:0!important;right:0!important;left:auto!important;width:min(86vw,300px)!important;margin:0!important;transform:translate3d(calc(100% + 32px),0,0)!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;transition:transform .22s ease,opacity .18s ease,visibility .22s!important;padding-bottom:env(safe-area-inset-bottom)}
    html body .layout .sidebar.open{transform:translate3d(0,0,0)!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important}
    .sidebar.open .sb-mobile-close{display:flex}
    .sidebar-overlay{display:block!important;opacity:0!important;visibility:hidden!important;pointer-events:none!important;z-index:999!important;transition:opacity .18s ease,visibility .18s!important}
    .sidebar-overlay.show{opacity:1!important;visibility:visible!important;pointer-events:auto!important}
    .sidebar{z-index:1000!important}
    .main{display:block!important;flex:none!important;width:100%!important;max-width:100vw!important;min-width:0!important;margin:0!important;overflow-x:clip!important}
    .topbar{box-sizing:border-box;width:100%;min-height:54px;height:auto;gap:8px;padding:5px 10px!important;overflow:visible}
    .topbar-title{flex:1 1 auto;font-size:13px!important;min-width:0;white-space:normal;line-height:1.5;overflow-wrap:anywhere}
    .topbar-right{flex:0 0 auto;gap:6px!important;min-width:0;flex-wrap:nowrap}.topbar-right>a{padding:6px 8px!important;font-size:0!important}.topbar-right>a i{font-size:16px!important}
    .sb-burger,.notif-btn{min-width:44px!important;width:44px!important;height:44px!important}
    #notifPanel{position:fixed!important;top:58px!important;left:8px!important;right:8px!important;width:auto!important;max-height:calc(100vh - 70px)}
    .content{box-sizing:border-box;width:100%!important;max-width:100vw!important;padding:10px 8px!important;overflow-x:clip!important}
    .stats{grid-template-columns:1fr!important}.grid2,.grid3,.qa-grid{grid-template-columns:1fr!important}
    .stat,.card{min-width:0!important}.card-body{padding:12px!important;overflow-x:auto}
    .chart{box-sizing:border-box;width:100%!important;max-width:100%!important;min-width:0!important;overflow:hidden}.bar-wrap{min-width:0!important}
    .table-wrap,.table-card{width:100%!important;max-width:100%!important;overflow-x:auto!important;-webkit-overflow-scrolling:touch}.mtbl{min-width:620px}
    .modal{width:100%!important;max-height:92dvh!important;overflow:auto}
  }
  @media(prefers-reduced-motion:reduce){.sidebar{transition:none!important}}
`;
document.head.appendChild(adminStyle);
document.addEventListener('keydown',event=>{
  const sidebar=document.querySelector('.sidebar.open');if(!sidebar)return;
  if(event.key==='Escape'){Admin.closeSidebar();return}
  if(event.key==='Tab'){
    const items=[...sidebar.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el=>el.offsetParent!==null);
    if(!items.length)return;const first=items[0],last=items[items.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
  }
});

// Auto-add data-label to table cells for mobile card view
function addTableLabels(){
  document.querySelectorAll('.tbl').forEach(tbl => {
    const headers = [...tbl.querySelectorAll('thead th')].map(th => th.textContent.trim());
    tbl.querySelectorAll('tbody tr').forEach(tr => {
      [...tr.children].forEach((td, i) => {
        if(headers[i] && !td.dataset.label) td.dataset.label = headers[i];
      });
    });
  });
}
// Debounced observer to avoid performance issues with frequently re-rendering tables
let _tableLabelTimeout;
function debouncedAddLabels(){
  clearTimeout(_tableLabelTimeout);
  _tableLabelTimeout = setTimeout(addTableLabels, 150);
}
const tableObserver = new MutationObserver(debouncedAddLabels);
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.table-card, .table-wrap').forEach(el => {
    tableObserver.observe(el, { childList: true, subtree: false });
  });
  addTableLabels();
});

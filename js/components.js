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

// OnPart Shared Components
const OnPart = {

  API_BASE: 'https://onpartpadmin.liara.run',
  CART_API: 'https://onpartpadmin.liara.run/api/cart',
  _notificationStarted: false,
  _notificationStream: null,
  _notificationPoll: null,
  _notificationSoundReady: false,
  _notificationSoundUnlocking: false,
  _pendingNotificationSound: null,
  _notificationAudio: null,
  _notificationSoundFiles: null,

  renderNavbar(activePage) {
    activePage = activePage || '';
    var token = OnPartSession.getToken('user');
    var user = {};
    try { user = JSON.parse(OnPartSession.getUserRaw('user') || '{}'); } catch(e){}
    var isLoggedIn = !!(token && user.id);

    // Block admin/partner from shop pages (unless they explicitly set allow flag)
    if(isLoggedIn && (user.role === 'admin' || user.role === 'partner')) {
      if(!sessionStorage.getItem('allow_shop')) {
        window.location.replace('/admin/');
        return;
      }
    }

    var userName = user.name || '';
    var userPhone = user.phone || '';
    var userAv = userName ? userName[0] : '?';

    var nav = '<nav class="op-nav">';
    nav += '<div class="op-nav-logo"><a href="/" aria-label="صفحه اصلی آن‌پارت"><img src="/images/logo.png" alt="آن‌پارت" style="height:38px;object-fit:contain"/></a></div>';
    nav += '<div class="op-nav-links">';
    nav += '<a href="/shop" class="op-nav-link' + (activePage==='shop'?' active':'') + '">صفحه اصلی</a>';
    nav += '<a href="/profile" class="op-nav-link' + (activePage==='profile'?' active':'') + '">پروفایل من</a>';
    nav += '<a href="/orders" class="op-nav-link' + (activePage==='orders'?' active':'') + '">سفارشات من</a>';
    nav += '<a href="/payment" class="op-nav-link' + (activePage==='payment'?' active':'') + '">ثبت فیش واریزی</a>';
    nav += '</div>';
    nav += '<div class="op-nav-right">';
    nav += '<div class="op-nav-phone op-hide-mobile"><i class="ti ti-phone"></i>02165280448</div>';
    nav += '<div class="op-cart-wrap" role="button" tabindex="0" aria-label="بازکردن سبد خرید" onclick="OnPart.openCart()" onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();OnPart.openCart()}"><i class="ti ti-shopping-cart"></i><div class="op-cart-badge" id="cartCount">\u06f0</div></div>';
    nav += '<div id="navUserArea" class="op-hide-mobile"></div>';
    nav += '<button class="op-burger" id="opMenuButton" onclick="OnPart.toggleMenu()" aria-label="باز کردن منو" aria-controls="mobileMenu" aria-expanded="false"><i class="ti ti-menu-2"></i></button>';
    nav += '</div></nav>';

    // Mobile overlay
    nav += '<div class="op-mobile-overlay" id="mobileOverlay" onclick="OnPart.closeMenu()"></div>';
    nav += '<div class="op-mobile-menu" id="mobileMenu" role="dialog" aria-modal="true" aria-label="منوی کاربری" aria-hidden="true" tabindex="-1">';
    nav += '<div class="op-mob-header"><img src="/images/logo.png" alt="آن‌پارت" style="height:36px;object-fit:contain"/>';
    nav += '<button onclick="OnPart.closeMenu()" aria-label="بستن منو" style="background:none;border:none;cursor:pointer;font-size:22px;color:#555"><i class="ti ti-x"></i></button></div>';

    if(isLoggedIn) {
      nav += '<div class="op-mob-user">';
      nav += '<div class="op-mob-av">' + userAv + '</div>';
      nav += '<div><div class="op-mob-name">' + userName + '</div><div class="op-mob-phone">' + userPhone + '</div></div>';
      nav += '</div>';
    }

    nav += '<div class="op-mob-links">';
    nav += '<a href="/shop" class="op-mob-link' + (activePage==='shop'?' active':'') + '"><i class="ti ti-home"></i>\u0635\u0641\u062d\u0647 \u0627\u0635\u0644\u06cc</a>';
    nav += '<a href="/profile" class="op-mob-link' + (activePage==='profile'?' active':'') + '"><i class="ti ti-user"></i>\u067e\u0631\u0648\u0641\u0627\u06cc\u0644 \u0645\u0646</a>';
    nav += '<a href="/orders" class="op-mob-link' + (activePage==='orders'?' active':'') + '"><i class="ti ti-package"></i>سفارشات من</a>';
    nav += '<a href="/payment" class="op-mob-link' + (activePage==='payment'?' active':'') + '"><i class="ti ti-file-invoice"></i>ثبت فیش واریزی</a>';

    nav += '</div>';

    nav += '<div class="op-mob-footer">';
    nav += '<div style="font-size:13px;color:#888;margin-bottom:12px;display:flex;align-items:center;gap:6px"><i class="ti ti-phone" style="color:#1d4ed8"></i>02165280448</div>';
    if(isLoggedIn) {
      nav += '<button onclick="OnPart.logout()" class="op-mob-logout"><i class="ti ti-logout"></i>\u062e\u0631\u0648\u062c \u0627\u0632 \u062d\u0633\u0627\u0628</button>';
    } else {
      nav += '<a href="/login" class="op-mob-login"><i class="ti ti-login"></i>\u0648\u0631\u0648\u062f \u0628\u0647 \u062d\u0633\u0627\u0628</a>';
    }
    nav += '</div></div>';

    document.getElementById('navbar-placeholder').innerHTML = nav;

    // Desktop user area
    var area = document.getElementById('navUserArea');
    if(area) {
      if(isLoggedIn) {
        area.innerHTML = '<div style="display:flex;align-items:center;gap:8px">'
          + '<span style="font-size:12px;color:#555;max-width:80px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + userName + '</span>'
          + '<button onclick="OnPart.logout()" style="background:#fee2e2;color:#dc2626;border:none;border-radius:7px;padding:6px 12px;font-family:Vazirmatn,sans-serif;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:4px"><i class="ti ti-logout" style="font-size:14px"></i>\u062e\u0631\u0648\u062c</button>'
          + '</div>';
      } else {
        area.innerHTML = '<a href="/login" style="background:#1d4ed8;color:#fff;border-radius:7px;padding:7px 14px;font-size:12.5px;font-weight:700;text-decoration:none;display:flex;align-items:center;gap:5px"><i class="ti ti-login" style="font-size:14px"></i>\u0648\u0631\u0648\u062f</a>';
      }
    }

    OnPart.updateCartCount();
    OnPart.initUserNotifications();

    // Load site settings (phone number) dynamically
    fetch('https://onpartpadmin.liara.run/api/settings').then(function(r){return r.json();}).then(function(s){
      if(s.site_phone){
        var formatted = s.site_phone.replace(/(\d{4})(\d{3})(\d{4})/, '$1-$2-$3');
        var phoneEls = document.querySelectorAll('.op-nav-phone, .op-mob-footer div');
        phoneEls.forEach(function(el){
          if(el.querySelector('i.ti-phone')){
            el.innerHTML = '<i class="ti ti-phone"' + (el.classList.contains('op-nav-phone')?'':' style="color:#1d4ed8"') + '></i><span style="direction:ltr">' + formatted + '</span>';
          }
        });
      }
    }).catch(function(){});
  },

  toggleMenu: function() {
    var m = document.getElementById('mobileMenu');
    var o = document.getElementById('mobileOverlay');
    if(!m||!o) return;
    m.classList.toggle('open');
    o.classList.toggle('show');
    var open=m.classList.contains('open');document.body.classList.toggle('op-menu-open',open);m.setAttribute('aria-hidden',open?'false':'true');document.getElementById('opMenuButton')?.setAttribute('aria-expanded',open?'true':'false');if(open)m.querySelector('button,a')?.focus();
  },

  closeMenu: function() {
    var m=document.getElementById('mobileMenu'),o=document.getElementById('mobileOverlay'),wasOpen=!!m?.classList.contains('open');
    if(m){m.classList.remove('open');m.setAttribute('aria-hidden','true')}
    if(o)o.classList.remove('show');
    document.body.classList.remove('op-menu-open');
    var b=document.getElementById('opMenuButton');b?.setAttribute('aria-expanded','false');if(wasOpen)b?.focus();
  },

  openCart: function() {
    // If cart panel exists on page, open it
    var panel = document.getElementById('cartPanel');
    if(panel) {
      // Trigger the shop page openCart function
      if(typeof openCart === 'function') openCart();
    } else {
      window.location.href = '/shop';
    }
  },

  // ── Server-backed cart ──
  // getCart now returns a Promise resolving to an array of
  // {product_id, quantity, description, code, price, stock, car, brand}
  getCart: async function() {
    var token = OnPartSession.getToken('user');
    if(!token) return [];
    try {
      var res = await fetch(this.CART_API, { headers: { 'Authorization': 'Bearer ' + token } });
      if(!res.ok) return [];
      var rows = await res.json();
      // Normalize to also expose qty/code for backward compatibility
      return rows.map(function(r){
        return {
          product_id: r.product_id,
          qty: Number(r.quantity) || 0,
          code: r.code,
          desc: r.description,
          price: Number(r.price) || 0,
          stock: r.stock,
          car: r.car,
          brand: r.brand
        };
      });
    } catch(e){ return []; }
  },

  // Update (or remove, if qty<=0) a single item's quantity on the server
  setCartItem: async function(productId, qty, options) {
    var token = OnPartSession.getToken('user');
    if(!token) return false;
    try {
      var res = await fetch(this.CART_API + '/item', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ product_id: productId, quantity: qty })
      });
      if(!options || options.refreshCount !== false) this.updateCartCount();
      return res.ok;
    } catch(e){ return false; }
  },

  addToCart: async function(product, qty) {
    qty = qty || 1;
    var token = OnPartSession.getToken('user');
    if(!token) { this.toast('لطفاً ابتدا وارد حساب کاربری شوید', 'error'); return false; }
    var cart = await this.getCart();
    var existing = cart.find(function(c){ return c.product_id === product.id; });
    var newQty = (existing ? existing.qty : 0) + qty;
    return this.setCartItem(product.id, newQty);
  },

  clearCart: async function() {
    var token = OnPartSession.getToken('user');
    if(!token) return;
    try {
      await fetch(this.CART_API, { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + token } });
    } catch(e){}
    this.updateCartCount();
  },

  updateCartCount: async function() {
    var el = document.getElementById('cartCount');
    if(!el) return;
    var token = OnPartSession.getToken('user');
    if(!token) { el.textContent = this.fa(0); return; }
    var cart = await this.getCart();
    var total = cart.filter(function(i){ return Number(i.qty) > 0; }).length;
    el.textContent = this.fa(total);
  },

  toast: function(msg, type) {
    type = type || 'success';
    var colors = { success: '#16a34a', error: '#dc2626', info: '#1d4ed8' };
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;border-radius:12px;padding:12px 24px;font-size:14px;font-weight:600;display:flex;align-items:center;gap:10px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.2);';
    t.innerHTML = '<i class="ti ti-' + (type==='error'?'x':'check') + '" style="color:' + (colors[type]||colors.success) + ';font-size:18px"></i>' + msg;
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 3000);
  },

  fa: function(n) { return n.toString().replace(/\d/g, function(d){ return '\u06f0\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6\u06f7\u06f8\u06f9'[d]; }); },
  fmt: function(n) { return this.fa(Number(n).toLocaleString()); },

  initUserNotifications: function() {
    var token = OnPartSession.getToken('user');
    if(!token || this._notificationStarted) return;
    this._notificationStarted = true;

    var self = this;
    this._notificationSoundFiles = {
      default: '/audio/onpart-notification.mp3',
      order_submitted: '/audio/order-status/order-submitted.mp3',
      pending_customer: '/audio/order-status/pending-customer.mp3',
      pending_payment: '/audio/order-status/pending-payment.mp3',
      preparing: '/audio/order-status/preparing.mp3',
      payment_approved: '/audio/order-status/payment-approved.mp3',
      payment_submitted: '/audio/order-status/payment-submitted.mp3',
      payment_rejected: '/audio/order-status/payment-rejected.mp3',
      shipping: '/audio/order-status/shipping.mp3'
    };
    this._notificationAudio = new Audio(this._notificationSoundFiles.default);
    this._notificationAudio.preload = 'auto';

    function unlockSounds(){
      if(self._notificationSoundReady || self._notificationSoundUnlocking) return;
      self._notificationSoundUnlocking = true;
      var audio = self._notificationAudio;
      audio.muted = true;
      audio.play().then(function(){
        audio.pause();
        audio.currentTime = 0;
        audio.muted = false;
        self._notificationSoundReady = true;
      }).catch(function(){
        audio.muted = false;
      }).finally(function(){
        self._notificationSoundUnlocking = false;
        if(self._notificationSoundReady && self._pendingNotificationSound){
          var pending = self._pendingNotificationSound;
          self._pendingNotificationSound = null;
          self.playUserNotificationSound(pending);
        }
      });
    }
    document.addEventListener('pointerdown', unlockSounds, { passive:true });
    document.addEventListener('touchstart', unlockSounds, { passive:true });
    document.addEventListener('click', unlockSounds, { passive:true });
    document.addEventListener('keydown', unlockSounds, { passive:true });

    var refreshInFlight = false;
    async function refreshNotifications(notify, forceRefresh){
      if(refreshInFlight) return;
      refreshInFlight = true;
      try {
        var response = await fetch(self.API_BASE + '/api/user-notifications', {
          headers: { 'Authorization': 'Bearer ' + OnPartSession.getToken('user') },
          cache: 'no-store'
        });
        if(!response.ok) return;
        var data = await response.json();
        var rows = data.notifications || [];
        var newestId = rows.reduce(function(max,row){ return Math.max(max, Number(row.id)||0); }, 0);
        var storedId = sessionStorage.getItem('op_last_user_notification_id');
        var previousId = Number(storedId || 0);
        if(storedId === null){
          sessionStorage.setItem('op_last_user_notification_id', String(newestId));
          return;
        }
        var newRows = rows.filter(function(row){ return Number(row.id) > previousId; }).sort(function(a,b){ return Number(a.id)-Number(b.id); });
        if(newestId > previousId) sessionStorage.setItem('op_last_user_notification_id', String(newestId));
        if(notify && newRows.length){
          newRows.forEach(function(row){
            self.playUserNotificationSound(row.sound_key || 'default');
            self.toast(row.title || 'وضعیت سفارش به‌روزرسانی شد', row.type === 'warning' ? 'error' : 'info');
            window.dispatchEvent(new CustomEvent('onpart:user-notification', { detail: row }));
          });
        } else if(notify && forceRefresh) {
          window.dispatchEvent(new CustomEvent('onpart:user-notification', { detail: { deleted:true } }));
        }
      } catch(e) {
      } finally {
        refreshInFlight = false;
      }
    }

    refreshNotifications(false).then(function(){
      if(window.EventSource){
        self._notificationStream = new EventSource(self.API_BASE + '/api/announcements/stream');
        self._notificationStream.addEventListener('user-notification', function(event){
          var payload={};try{payload=JSON.parse(event.data||'{}')}catch(e){}
          refreshNotifications(true, payload.deleted === true);
        });
        self._notificationStream.addEventListener('user-data-changed', function(event){
          var payload={};try{payload=JSON.parse(event.data||'{}')}catch(e){}
          window.dispatchEvent(new CustomEvent('onpart:user-data-changed', { detail: payload }));
        });
        self._notificationStream.addEventListener('announcement', function(event){
          var payload={};try{payload=JSON.parse(event.data||'{}')}catch(e){}
          window.dispatchEvent(new CustomEvent('onpart:announcement', { detail: payload }));
        });
      }
      self._notificationPoll = setInterval(function(){
        refreshNotifications(true);
        window.dispatchEvent(new CustomEvent('onpart:user-data-changed', { detail: { poll:true } }));
      }, 5000);
    });
    document.addEventListener('visibilitychange', function(){
      if(!document.hidden){
        refreshNotifications(true);
        window.dispatchEvent(new CustomEvent('onpart:user-data-changed', { detail: { visible:true } }));
      }
    });
  },

  playUserNotificationSound: function(soundKey) {
    var key = this._notificationSoundFiles && this._notificationSoundFiles[soundKey] ? soundKey : 'default';
    if(!this._notificationSoundReady){ this._pendingNotificationSound = key; return; }
    try {
      var audio = this._notificationAudio;
      var nextSrc = new URL(this._notificationSoundFiles[key], window.location.origin).href;
      audio.pause();
      if(audio.src !== nextSrc){
        audio.src = this._notificationSoundFiles[key];
        audio.load();
      }
      audio.currentTime = 0;
      var self = this;
      audio.play().catch(function(){
        self._notificationSoundReady = false;
        self._pendingNotificationSound = key;
      });
    } catch(e) {}
  },

  logout: function() {
    OnPartSession.clear('user');

    sessionStorage.removeItem('op_last_user_notification_id');
    window.location.href = '/login';
  },

  checkAuth: function() {
    const token = OnPartSession.getToken('user');
    if(!token) { window.location.href = '/login'; return false; }
    try {
      const user = JSON.parse(OnPartSession.getUserRaw('user') || '{}');
      if(user.role === 'admin' || user.role === 'partner') {
        window.location.href = '/admin/';
        return false;
      }
    } catch(e) {}
    return true;
  }
};

// Inject styles
var navStyle = document.createElement('style');
navStyle.textContent = '.op-nav{background:#fff;border-bottom:1px solid #e5e7eb;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;position:sticky;top:0;z-index:100;box-shadow:0 1px 3px rgba(0,0,0,.06)}.op-nav-logo{display:flex;align-items:center}.op-nav-links{display:flex;align-items:center;gap:4px}.op-nav-link{font-size:13.5px;font-weight:600;color:#444;text-decoration:none;padding:6px 12px;border-radius:7px;transition:all .15s}.op-nav-link:hover,.op-nav-link.active{background:#eff6ff;color:#1d4ed8}.op-nav-right{display:flex;align-items:center;gap:12px}.op-nav-phone{font-size:12.5px;color:#666;display:flex;align-items:center;gap:5px;direction:ltr}.op-cart-wrap{position:relative;width:36px;height:36px;background:#f8fafc;border:1.5px solid #e5e7eb;border-radius:9px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:18px;color:#555}.op-cart-wrap:hover{background:#eff6ff;color:#1d4ed8;border-color:#1d4ed8}.op-cart-badge{position:absolute;top:-6px;left:-6px;background:#1d4ed8;color:#fff;border-radius:10px;padding:1px 5px;font-size:10px;font-weight:700;min-width:16px;text-align:center}.op-burger{display:none;background:none;border:none;cursor:pointer;font-size:22px;color:#333;padding:4px}.op-mobile-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:998}.op-mobile-overlay.show{display:block}.op-mobile-menu{position:fixed;top:0;right:-100%;bottom:0;width:280px;background:#fff;z-index:999;transition:right .3s ease;display:flex;flex-direction:column;box-shadow:-4px 0 20px rgba(0,0,0,.15)}.op-mobile-menu.open{right:0}.op-mob-header{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid #f0f0f0}.op-mob-user{display:flex;align-items:center;gap:12px;padding:16px 20px;background:#f8fafc;border-bottom:1px solid #f0f0f0}.op-mob-av{width:40px;height:40px;background:#1d4ed8;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;font-weight:700;flex-shrink:0}.op-mob-name{font-size:14px;font-weight:700;color:#111}.op-mob-phone{font-size:12px;color:#aaa;direction:ltr}.op-mob-links{flex:1;padding:12px 0;overflow-y:auto}.op-mob-link{display:flex;align-items:center;gap:12px;padding:14px 20px;font-size:14px;font-weight:600;color:#444;text-decoration:none;transition:background .15s;border-bottom:1px solid #f8f8f8}.op-mob-link i{font-size:18px;color:#1d4ed8;width:22px}.op-mob-link:hover,.op-mob-link.active{background:#eff6ff;color:#1d4ed8}.op-mob-footer{padding:20px;border-top:1px solid #f0f0f0}.op-mob-logout{width:100%;background:#fee2e2;color:#dc2626;border:none;border-radius:10px;padding:12px;font-family:Vazirmatn,sans-serif;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px}.op-mob-login{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;background:#1d4ed8;color:#fff;border-radius:10px;padding:12px;font-size:14px;font-weight:700;text-decoration:none}@media (max-width:768px){.op-nav{padding:0 16px}.op-nav-links{display:none}.op-hide-mobile{display:none!important}.op-burger{display:flex}}';
navStyle.textContent += '.op-menu-open{overflow:hidden!important}.op-burger,.op-mob-header button,.op-mob-link,.op-mob-logout,.op-mob-login{min-height:44px}.op-mobile-menu{right:0;transform:translateX(105%);width:min(86vw,320px);padding-bottom:env(safe-area-inset-bottom)}.op-mobile-menu.open{transform:translateX(0)}@media(max-width:430px){.op-nav{padding:0 10px!important}.op-nav-right{gap:7px}.op-cart-wrap,.op-burger{width:44px;height:44px}.op-mobile-menu{width:min(90vw,320px)}}@media(prefers-reduced-motion:reduce){.op-mobile-menu{transition:none!important}}';
document.head.appendChild(navStyle);
document.addEventListener('keydown',function(e){
  var menu=document.getElementById('mobileMenu');if(!menu?.classList.contains('open'))return;
  if(e.key==='Escape'){OnPart.closeMenu();return}
  if(e.key==='Tab'){
    var items=[].slice.call(menu.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')).filter(function(el){return el.offsetParent!==null});
    if(!items.length)return;var first=items[0],last=items[items.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}
  }
});

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

  renderNavbar(activePage) {
    activePage = activePage || '';
    var token = sessionStorage.getItem('op_token');
    var user = {};
    try { user = JSON.parse(sessionStorage.getItem('op_user') || '{}'); } catch(e){}
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
    nav += '<div class="op-nav-logo"><a href="/"><img src="/images/logo.png" style="height:38px;object-fit:contain"/></a></div>';
    nav += '<div class="op-nav-links">';
    nav += '<a href="/shop" class="op-nav-link' + (activePage==='shop'?' active':'') + '">صفحه اصلی</a>';
    nav += '<a href="/profile" class="op-nav-link' + (activePage==='profile'?' active':'') + '">پروفایل من</a>';
    nav += '<a href="/orders" class="op-nav-link' + (activePage==='orders'?' active':'') + '">سفارشات من</a>';
    nav += '<a href="/payment" class="op-nav-link' + (activePage==='payment'?' active':'') + '">ثبت فیش واریزی</a>';
    nav += '</div>';
    nav += '<div class="op-nav-right">';
    nav += '<div class="op-nav-phone op-hide-mobile"><i class="ti ti-phone"></i>02165280448</div>';
    nav += '<div class="op-cart-wrap" onclick="OnPart.openCart()"><i class="ti ti-shopping-cart"></i><div class="op-cart-badge" id="cartCount">\u06f0</div></div>';
    nav += '<div id="navUserArea" class="op-hide-mobile"></div>';
    nav += '<button class="op-burger" onclick="OnPart.toggleMenu()"><i class="ti ti-menu-2"></i></button>';
    nav += '</div></nav>';

    // Mobile overlay
    nav += '<div class="op-mobile-overlay" id="mobileOverlay" onclick="OnPart.closeMenu()"></div>';
    nav += '<div class="op-mobile-menu" id="mobileMenu">';
    nav += '<div class="op-mob-header"><img src="/images/logo.png" style="height:36px;object-fit:contain"/>';
    nav += '<button onclick="OnPart.closeMenu()" style="background:none;border:none;cursor:pointer;font-size:22px;color:#555"><i class="ti ti-x"></i></button></div>';

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
    document.body.style.overflow = m.classList.contains('open') ? 'hidden' : '';
  },

  closeMenu: function() {
    var m = document.getElementById('mobileMenu');
    var o = document.getElementById('mobileOverlay');
    if(m) m.classList.remove('open');
    if(o) o.classList.remove('show');
    document.body.style.overflow = '';
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

  getCart: function() {
    try { return JSON.parse(localStorage.getItem('op_cart') || '[]'); } catch(e){ return []; }
  },

  saveCart: function(cart) {
    localStorage.setItem('op_cart', JSON.stringify(cart));
    this.updateCartCount();
  },

  updateCartCount: function() {
    var cart = this.getCart();
    var total = cart.reduce(function(s,i){ return s+(i.qty||0); }, 0);
    var el = document.getElementById('cartCount');
    if(el) el.textContent = this.fa(total);
  },

  addToCart: function(product, qty) {
    qty = qty || 1;
    var cart = this.getCart();
    var idx = -1;
    for(var i=0;i<cart.length;i++) { if(cart[i].code===product.code){idx=i;break;} }
    if(idx >= 0) cart[idx].qty += qty;
    else { var p = {}; for(var k in product) p[k]=product[k]; p.qty=qty; cart.push(p); }
    this.saveCart(cart);
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

  logout: function() {
    sessionStorage.removeItem('op_token');
    sessionStorage.removeItem('op_user');
    window.location.href = '/login';
  },

  checkAuth: function() {
    const token = sessionStorage.getItem('op_token');
    if(!token) { window.location.href = '/login'; return false; }
    try {
      const user = JSON.parse(sessionStorage.getItem('op_user') || '{}');
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
document.head.appendChild(navStyle);

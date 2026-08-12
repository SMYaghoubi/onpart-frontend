(function initCleanUrls(){
  function cleanInternalUrl(value){
    if(typeof value!=='string'||!value||/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(value)) return value;
    const match=value.match(/^([^?#]*)([?#].*)?$/);if(!match)return value;
    let pathname=match[1],suffix=match[2]||'';
    if(/\/index\.html$/i.test(pathname)) pathname=pathname.replace(/index\.html$/i,'');
    else if(/\.html$/i.test(pathname)) pathname=pathname.slice(0,-5);
    return pathname+suffix;
  }
  window.OnPartCleanUrl=cleanInternalUrl;
  const cleanPath=cleanInternalUrl(window.location.pathname);
  if(cleanPath!==window.location.pathname&&window.history&&history.replaceState){history.replaceState(history.state,'',cleanPath+window.location.search+window.location.hash)}
  const robots=document.querySelector('meta[name="robots"]');
  if(!robots||!/noindex/i.test(robots.content||'')){
    let canonical=document.querySelector('link[rel="canonical"]');
    if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.appendChild(canonical)}
    canonical.href=window.location.origin+cleanPath;
  }
})();
(function initOnPartAudio(){
  if(window.OnPartAudio) return;
  const DEFAULT_SOUND='/audio/onpart-notification.mp3';
  let audio=null, context=null, priming=false;
  const getAudio=()=>{if(!audio){audio=new Audio(DEFAULT_SOUND);audio.preload='auto'}return audio};
  function primeFromGesture(){
    if(priming) return;priming=true;
    try{const AC=window.AudioContext||window.webkitAudioContext;if(AC){context=context||new AC();context.resume().catch(()=>{})}}catch(_){}
    const el=getAudio();el.muted=true;
    const attempt=el.play();
    if(attempt&&attempt.then)attempt.then(()=>{el.pause();el.currentTime=0}).catch(()=>{}).finally(()=>{el.muted=false;priming=false});
    else{el.muted=false;priming=false}
  }
  async function play(src,options={}){
    const onceKey=options.onceKey?'op_audio_once_'+options.onceKey:'';if(onceKey&&sessionStorage.getItem(onceKey))return false;
    const el=getAudio();el.pause();el.src=src||DEFAULT_SOUND;el.muted=false;el.currentTime=0;
    try{await el.play();if(onceKey)sessionStorage.setItem(onceKey,'1');return true}catch(error){return false}
  }
  window.OnPartAudio={primeFromGesture,play,get element(){return getAudio()}};
})();
(function initOnPartSession(){
  if(window.OnPartSession) return;
  const definitions={
    user:{token:'op_user_token',data:'op_user_data',roles:['user']},
    admin:{token:'op_admin_token',data:'op_admin_data',roles:['admin','partner']},
    supplier:{token:'op_supplier_token',data:'op_supplier',roles:['supplier']}
  };
  function decodeToken(token){
    try{
      const part=String(token||'').split('.')[1];if(!part)return null;
      const value=part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'=');
      return JSON.parse(decodeURIComponent(Array.from(atob(value),char=>'%'+char.charCodeAt(0).toString(16).padStart(2,'0')).join('')));
    }catch(_){return null}
  }
  function contextFor(requestPath=''){
    const path=String(requestPath||'');
    const pagePath=String(location.pathname||'');
    // Page ownership wins over endpoint naming. Admin management endpoints live
    // under /supplier-portal too, but must never receive the supplier session.
    if(pagePath.startsWith('/admin/')||path.startsWith('/api/supplier-portal/admin/'))return 'admin';
    if(pagePath.startsWith('/supplier/')||path.startsWith('/api/supplier-portal'))return 'supplier';
    return 'user';
  }
  function getUserRaw(context){return sessionStorage.getItem(definitions[context]?.data)||''}
  function getUser(context){try{return JSON.parse(getUserRaw(context)||'{}')}catch(_){return {}}}
  function valid(context,token,user){
    const def=definitions[context],claims=decodeToken(token),now=Math.floor(Date.now()/1000);
    if(!def||!claims||!claims.exp||claims.exp<=now)return false;
    const role=claims.role||(user&&user.role);
    return def.roles.includes(role)&&(!user||!user.role||user.role===role);
  }
  function notify(context,action){try{localStorage.setItem('op_session_signal',JSON.stringify({context,action,at:Date.now()}));localStorage.removeItem('op_session_signal')}catch(_){}}
  function clear(context,{signal=true}={}){
    const def=definitions[context];if(!def)return;
    sessionStorage.removeItem(def.token);sessionStorage.removeItem(def.data);
    if(signal)notify(context,'logout');
  }
  function getToken(context){
    const def=definitions[context],token=def&&sessionStorage.getItem(def.token),user=getUser(context);
    if(!token)return null;
    if(!valid(context,token,user)){clear(context);return null}
    return token;
  }
  function setSession(context,token,user){
    const def=definitions[context];
    if(!def||!valid(context,token,user))throw new Error('نشست با نقش انتخاب‌شده سازگار نیست');
    sessionStorage.setItem(def.token,token);sessionStorage.setItem(def.data,JSON.stringify(user||{}));
    notify(context,'login');return true;
  }
  function migrateLegacy(){
    const token=sessionStorage.getItem('op_token');if(!token)return;
    let user={};try{user=JSON.parse(sessionStorage.getItem('op_user')||'{}')}catch(_){}
    const claims=decodeToken(token),role=claims&&(claims.role||user.role);
    const context=role==='admin'||role==='partner'?'admin':role==='supplier'?'supplier':role==='user'?'user':null;
    try{if(context&&valid(context,token,user))setSession(context,token,user)}catch(_){}
    sessionStorage.removeItem('op_token');sessionStorage.removeItem('op_user');
  }
  addEventListener('storage',event=>{
    if(event.key!=='op_session_signal'||!event.newValue)return;
    try{const signal=JSON.parse(event.newValue);if(signal.action==='logout'&&definitions[signal.context])clear(signal.context,{signal:false})}catch(_){}
  });
  window.OnPartSession={definitions,decodeToken,contextFor,getToken,getUser,getUserRaw,setSession,clear,valid,migrateLegacy};
  migrateLegacy();
})();
// OnPart API Helper
// All backend API calls centralized here
// Change BASE_URL to your domain

const API = {
  BASE_URL: 'https://onpartpadmin.liara.run',
  TIMEOUT_MS: 15000,

  async request(path, options = {}) {
    const authContext = options.authContext || OnPartSession.contextFor(path);
    const requestOptions = { ...options };
    delete requestOptions.authContext;
    if(String(requestOptions.method || 'GET').toUpperCase() === 'GET' && requestOptions.cache == null) requestOptions.cache = 'no-store';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || this.TIMEOUT_MS);
    const isForm = options.body instanceof FormData;
    const headers = {
      ...this.headers(authContext),
      ...(options.headers || {})
    };
    if(isForm) delete headers['Content-Type'];

    try {
      const res = await fetch(this.BASE_URL + path, {
        ...requestOptions,
        headers,
        signal: controller.signal
      });
      const type = res.headers.get('content-type') || '';
      const data = type.includes('application/json') ? await res.json() : await res.text();
      if(!res.ok) {
        const error = new Error((data && data.message) || 'خطا در ارتباط با سرور');
        error.status = res.status;
        error.data = data;
        throw error;
      }
      return data;
    } catch(error) {
      if(error.name === 'AbortError') throw new Error('زمان پاسخ‌گویی سرور بیش از حد طول کشید');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  },

  normalizeProductCode(value) {
    const digits={'۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9','٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9'};
    return String(value ?? '').normalize('NFKC').replace(/[۰-۹٠-٩]/g,digit=>digits[digit]).replace(/[\s\u200c\u200d\u200e\u200f\u2060\-‐‑‒–—―]+/g,'').toLowerCase();
  },
  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[char]);
  },

  safeUrl(value) {
    try {
      const raw = String(value || '').trim();
      const base = raw.startsWith('/uploads/') ? this.BASE_URL : window.location.origin;
      const url = new URL(raw, base);
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (_) {
      return '';
    }
  },

  installFetchTimeout() {
    if(window.__onpartFetchTimeoutInstalled) return;
    window.__onpartFetchTimeoutInstalled = true;
    const nativeFetch = window.fetch.bind(window);
    window.fetch = (input, options = {}) => {
      if(options.signal) return nativeFetch(input, options);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_MS);
      return nativeFetch(input, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timeout));
    };
  },

  // ── HEADERS ──
  headers(context) {
    const token = OnPartSession.getToken(context||OnPartSession.contextFor());
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  },

  // ── AUTH ──
  async sendOTP(phone) {
    const res = await fetch(`${this.BASE_URL}/api/auth/send-otp`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ phone })
    });
    return res.json();
  },

  async verifyOTP(phone, code) {
    const res = await fetch(`${this.BASE_URL}/api/auth/verify-otp`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ phone, code })
    });
    const data = await res.json();
    if (data.token) {
      OnPartSession.setSession('user', data.token, data.user);
    }
    return data;
  },

  async login(username, password) {
    const res = await fetch(`${this.BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.token) {
      OnPartSession.setSession('admin', data.token, data.user);
    }
    return data;
  },

  // ── PRODUCTS ──
  async getProducts(params = {}) {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${this.BASE_URL}/api/products?${q}`, { headers: this.headers() });
    return res.json();
  },

  async getProduct(id) {
    const res = await fetch(`${this.BASE_URL}/api/products/${id}`, { headers: this.headers() });
    return res.json();
  },

  async createProduct(data) {
    const res = await fetch(`${this.BASE_URL}/api/products`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateProduct(id, data) {
    const res = await fetch(`${this.BASE_URL}/api/products/${id}`, {
      method: 'PUT', headers: this.headers(), body: JSON.stringify(data)
    });
    return res.json();
  },

  async deleteProduct(id) {
    const res = await fetch(`${this.BASE_URL}/api/products/${id}`, {
      method: 'DELETE', headers: this.headers()
    });
    return res.json();
  },

  // ── ORDERS ──
  async getOrders(params = {}) {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${this.BASE_URL}/api/orders?${q}`, { headers: this.headers() });
    return res.json();
  },

  async getOrder(id) {
    const res = await fetch(`${this.BASE_URL}/api/orders/${id}`, { headers: this.headers() });
    return res.json();
  },

  async createOrder(items) {
    const res = await fetch(`${this.BASE_URL}/api/orders`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify({ items })
    });
    return res.json();
  },

  async updateOrderStatus(id, status) {
    const res = await fetch(`${this.BASE_URL}/api/orders/${id}/status`, {
      method: 'PATCH', headers: this.headers(), body: JSON.stringify({ status })
    });
    return res.json();
  },

  // ── USERS ──
  async getUsers(params = {}) {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${this.BASE_URL}/api/users?${q}`, { headers: this.headers() });
    return res.json();
  },

  async getUser(id) {
    const res = await fetch(`${this.BASE_URL}/api/users/${id}`, { headers: this.headers() });
    return res.json();
  },

  async createUser(data) {
    const res = await fetch(`${this.BASE_URL}/api/users`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify(data)
    });
    return res.json();
  },

  async updateUser(id, data) {
    const res = await fetch(`${this.BASE_URL}/api/users/${id}`, {
      method: 'PUT', headers: this.headers(), body: JSON.stringify(data)
    });
    return res.json();
  },

  // ── PAYMENTS ──
  async getPayments(params = {}) {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${this.BASE_URL}/api/payments?${q}`, { headers: this.headers() });
    return res.json();
  },

  async uploadReceipt(formData) {
    const token = OnPartSession.getToken('user');
    const res = await fetch(`${this.BASE_URL}/api/payments/receipt`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData // FormData for file upload
    });
    return res.json();
  },

  async approvePayment(id) {
    const res = await fetch(`${this.BASE_URL}/api/payments/${id}/approve`, {
      method: 'PATCH', headers: this.headers()
    });
    return res.json();
  },

  async rejectPayment(id, reason) {
    const res = await fetch(`${this.BASE_URL}/api/payments/${id}/reject`, {
      method: 'PATCH', headers: this.headers(), body: JSON.stringify({ reason })
    });
    return res.json();
  },

  // ── SMS ──
  async sendSMS(data) {
    const res = await fetch(`${this.BASE_URL}/api/sms/send`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify(data)
    });
    return res.json();
  },

  // ── INVOICES ──
  async getInvoices(params = {}) {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${this.BASE_URL}/api/invoices?${q}`, { headers: this.headers() });
    return res.json();
  },

  async getInvoice(id) {
    const res = await fetch(`${this.BASE_URL}/api/invoices/${id}`, { headers: this.headers() });
    return res.json();
  },

  // ── CREDIT ──
  async applyCreditRequest(data) {
    const res = await fetch(`${this.BASE_URL}/api/credit/apply`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify(data)
    });
    return res.json();
  },

  async getCreditRequests(params = {}) {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${this.BASE_URL}/api/credit?${q}`, { headers: this.headers() });
    return res.json();
  },

  // ── PARTNERS ──
  async applyPartnership(data) {
    const res = await fetch(`${this.BASE_URL}/api/partners/apply`, {
      method: 'POST', headers: this.headers(), body: JSON.stringify(data)
    });
    return res.json();
  },

  // ── REPORTS ──
  async getSalesReport(params = {}) {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${this.BASE_URL}/api/reports/sales?${q}`, { headers: this.headers() });
    return res.json();
  },

  async getFinanceReport(params = {}) {
    const q = new URLSearchParams(params).toString();
    const res = await fetch(`${this.BASE_URL}/api/reports/finance?${q}`, { headers: this.headers() });
    return res.json();
  },

  // ── SETTINGS ──
  async getSettings() {
    const res = await fetch(`${this.BASE_URL}/api/settings`, { headers: this.headers() });
    return res.json();
  },

  async updateSettings(data) {
    const res = await fetch(`${this.BASE_URL}/api/settings`, {
      method: 'PUT', headers: this.headers(), body: JSON.stringify(data)
    });
    return res.json();
  }
};

API.installFetchTimeout();
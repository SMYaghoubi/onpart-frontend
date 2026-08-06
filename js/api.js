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
  function blockedHint(){
    if(document.getElementById('onpartAudioHint')) return;
    const hint=document.createElement('button');hint.id='onpartAudioHint';hint.type='button';
    hint.textContent='صدا آماده نیست — برای فعال‌سازی لمس کنید';
    hint.style.cssText='position:fixed;left:16px;bottom:16px;z-index:100000;border:0;border-radius:12px;padding:10px 14px;background:#172554;color:#fff;font:600 12px Vazirmatn,sans-serif;box-shadow:0 10px 30px #0f172a38;cursor:pointer';
    hint.onclick=()=>{window.OnPartAudio.primeFromGesture();hint.remove()};document.body.appendChild(hint);
  }
  function primeFromGesture(){
    if(priming) return;priming=true;
    try{const AC=window.AudioContext||window.webkitAudioContext;if(AC){context=context||new AC();context.resume().catch(()=>{})}}catch(_){}
    const el=getAudio();el.muted=true;
    const attempt=el.play();
    if(attempt&&attempt.then)attempt.then(()=>{el.pause();el.currentTime=0;sessionStorage.setItem('op_audio_primed','1')}).catch(()=>{}).finally(()=>{el.muted=false;priming=false});
    else{el.muted=false;priming=false}
  }
  async function play(src,options={}){
    const onceKey=options.onceKey?'op_audio_once_'+options.onceKey:'';if(onceKey&&sessionStorage.getItem(onceKey))return false;
    const el=getAudio();el.pause();el.src=src||DEFAULT_SOUND;el.muted=false;el.currentTime=0;
    try{await el.play();if(onceKey)sessionStorage.setItem(onceKey,'1');return true}catch(error){if(error&&error.name==='NotAllowedError')blockedHint();return false}
  }
  window.OnPartAudio={primeFromGesture,play,showBlockedHint:blockedHint,get element(){return getAudio()}};
})();
// OnPart API Helper
// All backend API calls centralized here
// Change BASE_URL to your domain

const API = {
  BASE_URL: 'https://onpartpadmin.liara.run',
  TIMEOUT_MS: 15000,

  async request(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeout || this.TIMEOUT_MS);
    const isForm = options.body instanceof FormData;
    const headers = {
      ...this.headers(),
      ...(options.headers || {})
    };
    if(isForm) delete headers['Content-Type'];

    try {
      const res = await fetch(this.BASE_URL + path, {
        ...options,
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
  headers() {
    const token = sessionStorage.getItem('op_token');
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
      sessionStorage.setItem('op_token', data.token);
      sessionStorage.setItem('op_user', JSON.stringify(data.user));
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
      sessionStorage.setItem('op_token', data.token);
      sessionStorage.setItem('op_user', JSON.stringify(data.user));
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
    const token = sessionStorage.getItem('op_token');
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

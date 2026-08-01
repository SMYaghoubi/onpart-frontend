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

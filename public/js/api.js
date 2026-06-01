const API = '/api';

async function apiFetch(url, options = {}) {
  const res = await fetch(`${API}${url}`, options);
  const contentType = res.headers.get('content-type') || '';
  if (!res.ok) {
    if (contentType.includes('application/json')) {
      const err = await res.json();
      throw new Error(err.error || 'Request failed');
    }
    throw new Error('Request failed');
  }
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res;
}

const Api = {
  getMenu(activeOnly = false) {
    return apiFetch(`/menu${activeOnly ? '?active=1' : ''}`);
  },
  getMenuItem(id) {
    return apiFetch(`/menu/${id}`);
  },
  createMenuItem(formData) {
    return apiFetch('/menu', { method: 'POST', body: formData });
  },
  updateMenuItem(id, formData) {
    return apiFetch(`/menu/${id}`, { method: 'PUT', body: formData });
  },
  deleteMenuItem(id) {
    return apiFetch(`/menu/${id}`, { method: 'DELETE' });
  },
  createOrder(payload) {
    return apiFetch('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
  getQr(amount) {
    return apiFetch('/orders/qr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
    });
  },
  getSettings() {
    return apiFetch('/settings');
  },
  updateSettings(data) {
    return apiFetch('/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },
  getSalesReport(params) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/reports/sales?${qs}`);
  },
  getSalesPdfUrl(params) {
    const qs = new URLSearchParams(params).toString();
    return `${API}/reports/sales.pdf?${qs}`;
  },
  getTodayOrderCount() {
    return apiFetch('/orders/count/today');
  },
  getOrder(id) {
    return apiFetch(`/orders/${id}`);
  },
  getOrders(params) {
    const qs = new URLSearchParams(params).toString();
    return apiFetch(`/orders${qs ? '?' + qs : ''}`);
  },
  updateOrder(id, payload) {
    return apiFetch(`/orders/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  },
  deleteOrder(id) {
    return apiFetch(`/orders/${id}`, { method: 'DELETE' });
  },
};

function formatINR(amount) {
  return `₹${Number(amount).toFixed(2)}`;
}

function showToast(message, type = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `toast toast-${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

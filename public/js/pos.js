let settings = {};
let lastOrder = null;
let allMenuItems = [];

async function loadSettings() {
  settings = await Api.getSettings();
}

async function loadOrderCount() {
  try {
    const result = await Api.getTodayOrderCount();
    document.getElementById('order-count').textContent = result.count;
  } catch (err) {
    console.error('Failed to load order count:', err);
  }
}

async function loadMenu() {
  const grid = document.getElementById('menu-grid');
  try {
    const items = await Api.getMenu(true);
    allMenuItems = items;
    renderMenu(items);
  } catch (err) {
    grid.innerHTML = `<p class="cart-empty">${err.message}</p>`;
  }
}

function renderMenu(items) {
  const grid = document.getElementById('menu-grid');
  if (items.length === 0) {
    grid.innerHTML = '<p class="cart-empty">No menu items found.</p>';
    return;
  }
  grid.innerHTML = items
    .map(
      (item) => `
    <div class="menu-card" data-id="${item.id}" role="button" tabindex="0">
      <img src="${item.image_url || '/images/idly.jpg'}" alt="${item.name}" loading="lazy" onerror="this.onerror=null;this.src='/images/${escapeHtml(item.name.toLowerCase())}.jpg'">
      <div class="menu-card-body">
        <h3>${escapeHtml(item.name)}</h3>
        <span class="price">${formatINR(item.price)}</span>
      </div>
    </div>`
    )
    .join('');

  grid.querySelectorAll('.menu-card').forEach((card) => {
    const id = parseInt(card.dataset.id, 10);
    const item = allMenuItems.find((i) => i.id === id);
    card.addEventListener('click', () => {
      Cart.add(item);
      showToast(`Added ${item.name}`, 'success');
    });
  });
}

function filterMenu(searchTerm) {
  const term = searchTerm.toLowerCase().trim();
  if (!term) {
    renderMenu(allMenuItems);
    return;
  }
  const filtered = allMenuItems.filter(item => 
    item.name.toLowerCase().includes(term)
  );
  renderMenu(filtered);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderCart(snapshot) {
  const { lines, total, count } = snapshot;
  document.getElementById('cart-count').textContent = count;
  document.getElementById('cart-total').textContent = formatINR(total);

  const container = document.getElementById('cart-items');
  const empty = lines.length === 0;

  document.getElementById('btn-pay').disabled = empty;
  document.getElementById('btn-cash').disabled = empty;
  document.getElementById('btn-print').disabled = empty && !lastOrder;
  document.getElementById('btn-clear').disabled = empty;

  if (empty) {
    container.innerHTML = '<p class="cart-empty">Tap a menu item to add</p>';
    if (!lastOrder) renderPrintPreview({ lines: [], total: 0 });
    return;
  }

  container.innerHTML = lines
    .map(
      (line) => `
    <div class="cart-line" data-id="${line.menuItemId}">
      <div class="cart-line-info">
        <div class="name">${escapeHtml(line.name)}</div>
        <div class="unit-price">${formatINR(line.price)} each</div>
      </div>
      <div class="qty-controls">
        <button type="button" class="btn-qty-minus" aria-label="Decrease">−</button>
        <span>${line.qty}</span>
        <button type="button" class="btn-qty-plus" aria-label="Increase">+</button>
      </div>
      <div class="cart-line-total">${formatINR(line.lineTotal)}</div>
    </div>`
    )
    .join('');

  container.querySelectorAll('.cart-line').forEach((el) => {
    const id = parseInt(el.dataset.id, 10);
    const line = lines.find((l) => l.menuItemId === id);
    el.querySelector('.btn-qty-minus').addEventListener('click', () => {
      Cart.setQty(id, line.qty - 1);
    });
    el.querySelector('.btn-qty-plus').addEventListener('click', () => {
      Cart.setQty(id, line.qty + 1);
    });
  });

  renderPrintPreview(snapshot);
}

function renderPrintPreview(snapshot, orderMeta = null) {
  const area = document.getElementById('print-area');
  if (!snapshot.lines.length && !orderMeta) {
    area.innerHTML = '';
    return;
  }

  const now = new Date();
  const dateStr = now.toLocaleString('en-IN', {
  timeZone: 'Asia/Kolkata'
});
  const orderLabel = orderMeta
    ? `Order #${orderMeta.orderId}`
    : 'Preview (not paid)';
  const paymentModeLabel = orderMeta && orderMeta.paymentMode
    ? `Paid via: ${orderMeta.paymentMode.toUpperCase()}`
    : '';

  const rows = snapshot.lines
    .map(
      (l) => `
    <tr>
      <td>${escapeHtml(l.name)}</td>
      <td style="text-align:center">${l.qty}</td>
      <td style="text-align:right">${formatINR(l.lineTotal)}</td>
    </tr>`
    )
    .join('');

  area.innerHTML = `
    <div class="receipt">
      <h1>${escapeHtml(settings.restaurant_name || 'Restaurant')}</h1>
      <div class="meta">${dateStr}<br>${orderLabel}</div>
      <table>
        <thead>
          <tr>
            <td><strong>Item</strong></td>
            <td style="text-align:center"><strong>Qty</strong></td>
            <td style="text-align:right"><strong>Amt</strong></td>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total-row">
        <span>Total</span>
        <span>${formatINR(snapshot.total)}</span>
      </div>
      ${paymentModeLabel ? `<div class="payment-mode">${paymentModeLabel}</div>` : ''}
      <p class="thanks">Thank you! Visit again.</p>
    </div>`;
}

function openPayModal(amount, qrDataUrl, upiId) {
  document.getElementById('pay-amount').textContent = formatINR(amount);
  document.getElementById('pay-qr').src = qrDataUrl;
  document.getElementById('pay-upi-hint').textContent = `Pay to: ${upiId}`;
  document.getElementById('pay-modal').classList.add('open');
}

function closePayModal() {
  document.getElementById('pay-modal').classList.remove('open');
}

document.getElementById('btn-pay').addEventListener('click', async () => {
  if (Cart.isEmpty()) return;
  const cartSnap = Cart.getSnapshot();
  try {
    const qr = await Api.getQr(cartSnap.total);
    openPayModal(cartSnap.total, qr.qrDataUrl, qr.upiId);
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('btn-cash').addEventListener('click', async () => {
  if (Cart.isEmpty()) return;
  if (!confirm('Confirm cash payment?')) return;
  try {
    const result = await Api.createOrder({
      items: Cart.toOrderPayload(),
      markPaid: true,
      paymentMode: 'cash',
    });
    lastOrder = result;
    const snapshot = {
      lines: result.items.map((i) => ({
        name: i.name,
        qty: i.qty,
        lineTotal: i.line_total,
      })),
      total: result.order.total,
    };
    renderPrintPreview(snapshot, { orderId: result.order.id, paymentMode: result.order.payment_mode });
    Cart.clear();
    loadOrderCount();
    showToast(`Order #${result.order.id} paid by cash`, 'success');
    // Print directly without delay
    window.print();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('btn-cancel-pay').addEventListener('click', closePayModal);

document.getElementById('btn-mark-paid').addEventListener('click', async () => {
  try {
    const result = await Api.createOrder({
      items: Cart.toOrderPayload(),
      markPaid: true,
      paymentMode: 'upi',
    });
    lastOrder = result;
    const snapshot = {
      lines: result.items.map((i) => ({
        name: i.name,
        qty: i.qty,
        lineTotal: i.line_total,
      })),
      total: result.order.total,
    };
    renderPrintPreview(snapshot, { orderId: result.order.id, paymentMode: result.order.payment_mode });
    Cart.clear();
    closePayModal();
    loadOrderCount();
    showToast(`Order #${result.order.id} paid successfully`, 'success');
    // Print directly without delay
    window.print();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

document.getElementById('btn-print').addEventListener('click', () => {
  const snap = Cart.getSnapshot();
  if (snap.lines.length === 0 && !lastOrder) {
    showToast('Cart is empty', 'error');
    return;
  }
  if (snap.lines.length > 0) {
    renderPrintPreview(snap);
  }
  window.print();
});

document.getElementById('btn-clear').addEventListener('click', () => {
  if (Cart.isEmpty()) return;
  if (confirm('Clear all items from cart?')) {
    Cart.clear();
    showToast('Cart cleared');
  }
});

document.getElementById('menu-search').addEventListener('input', (e) => {
  filterMenu(e.target.value);
});

Cart.subscribe(renderCart);

initNav();
loadSettings();
loadMenu();
loadOrderCount();

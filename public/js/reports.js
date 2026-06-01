let currentParams = null;
let settings = {};

async function loadSettings() {
  settings = await Api.getSettings();
}

function formatINR(amount) {
  return '₹' + parseFloat(amount).toFixed(2);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function renderPrintPreview(snapshot, orderMeta = null) {
  let printArea = document.getElementById('print-area');
  if (!printArea) {
    printArea = document.createElement('div');
    printArea.id = 'print-area';
    document.body.appendChild(printArea);
  }
  
  if (!snapshot.lines.length && !orderMeta) {
    printArea.innerHTML = '';
    return;
  }

  const now = new Date();
  const dateStr = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const orderLabel = orderMeta ? `Order #${orderMeta.orderId}` : 'Preview (not paid)';
  const paymentModeLabel = orderMeta && orderMeta.paymentMode ? `Paid via: ${orderMeta.paymentMode.toUpperCase()}` : '';

  const rows = snapshot.lines.map(l => `
    <tr>
      <td>${escapeHtml(l.name)}</td>
      <td style="text-align:center">${l.qty}</td>
      <td style="text-align:right">${formatINR(l.lineTotal)}</td>
    </tr>`
  ).join('');

  printArea.innerHTML = `
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

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDateInput(d) {
  return d.toISOString().slice(0, 10);
}

function formatDisplayDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(timeStr) {
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

function getThisMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

function getLastMonthRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0);
  return { from: formatDateInput(from), to: formatDateInput(to) };
}

function renderReport(data) {
  document.getElementById('summary-cards').style.display = 'grid';
  document.getElementById('breakdown-card').style.display = 'block';
  document.getElementById('daily-card').style.display = 'block';
  document.getElementById('orders-card').style.display = 'block';

  document.getElementById('stat-orders').textContent = data.summary.totalOrders;
  document.getElementById('stat-sales').textContent = formatINR(data.summary.grossSales);
  document.getElementById('stat-period').textContent = `${data.from} → ${data.to}`;

  const tbody = document.getElementById('breakdown-body');
  if (!data.itemBreakdown.length) {
    tbody.innerHTML = '<tr><td colspan="3">No sales in this period.</td></tr>';
  } else {
    tbody.innerHTML = data.itemBreakdown
      .map(
        (row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${row.qty}</td>
        <td>${formatINR(row.revenue)}</td>
      </tr>`
      )
      .join('');
  }

  const dailyBody = document.getElementById('daily-body');
  if (!data.dailyBreakdown || !data.dailyBreakdown.length) {
    dailyBody.innerHTML = '<tr><td colspan="3">No sales by date in this period.</td></tr>';
  } else {
    dailyBody.innerHTML = data.dailyBreakdown
      .map(
        (row) => `
      <tr>
        <td>${formatDisplayDate(row.date)}</td>
        <td>${row.orderCount}</td>
        <td>${formatINR(row.revenue)}</td>
      </tr>`
      )
      .join('');
  }

  const ordersContainer = document.getElementById('orders-by-date');
  if (!data.ordersList || !data.ordersList.length) {
    ordersContainer.innerHTML = '<p class="report-empty">No orders in this period.</p>';
    return;
  }

  const byDate = {};
  for (const order of data.ordersList) {
    if (!byDate[order.saleDate]) byDate[order.saleDate] = [];
    byDate[order.saleDate].push(order);
  }

  const dates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
  ordersContainer.innerHTML = dates
    .map((date) => {
      const dayOrders = byDate[date];
      const dayTotal = dayOrders.reduce((s, o) => s + o.total, 0);
      const ordersHtml = dayOrders
        .map(
          (o) => `
        <div class="order-row" data-order-id="${o.id}">
          <div class="order-row-head">
            <span class="order-id">#${o.id}</span>
            <span class="order-time">${formatTime(o.time)}</span>
            <span class="order-mode">${(o.paymentMode || 'cash').toUpperCase()}</span>
            <span class="order-total">${formatINR(o.total)}</span>
          </div>
          <ul class="order-items-list">
            ${o.items
              .map(
                (i) =>
                  `<li>${escapeHtml(i.name)} × ${i.qty} — ${formatINR(i.lineTotal)}</li>`
              )
              .join('')}
          </ul>
        </div>`
        )
        .join('');

      return `
      <section class="date-group">
        <header class="date-group-header">
          <h3>${formatDisplayDate(date)}</h3>
          <span>${dayOrders.length} order(s) · ${formatINR(dayTotal)}</span>
        </header>
        <div class="date-group-orders">${ordersHtml}</div>
      </section>`;
    })
    .join('');
}

async function runReport(params) {
  currentParams = params;
  const btn = document.getElementById('btn-run-report');
  btn.disabled = true;
  btn.textContent = 'Loading…';
  try {
    const data = await Api.getSalesReport(params);
    renderReport(data);
    document.getElementById('btn-download-pdf').disabled = false;
    showToast('Report loaded', 'success');
    document.getElementById('daily-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Run report';
  }
}

document.getElementById('btn-this-month').addEventListener('click', () => {
  const range = getThisMonthRange();
  document.getElementById('date-from').value = range.from;
  document.getElementById('date-to').value = range.to;
  runReport({ preset: 'this-month' });
});

document.getElementById('btn-last-month').addEventListener('click', () => {
  const range = getLastMonthRange();
  document.getElementById('date-from').value = range.from;
  document.getElementById('date-to').value = range.to;
  runReport({ preset: 'last-month' });
});

document.getElementById('btn-run-report').addEventListener('click', () => {
  const from = document.getElementById('date-from').value;
  const to = document.getElementById('date-to').value;
  if (!from || !to) {
    showToast('Select from and to dates', 'error');
    return;
  }
  if (from > to) {
    showToast('From date must be before to date', 'error');
    return;
  }
  runReport({ from, to });
});

document.getElementById('btn-download-pdf').addEventListener('click', () => {
  if (!currentParams) return;
  window.open(Api.getSalesPdfUrl(currentParams), '_blank');
});

initNav();
loadSettings();
const defaultRange = getThisMonthRange();
document.getElementById('date-from').value = defaultRange.from;
document.getElementById('date-to').value = defaultRange.to;

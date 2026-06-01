let editingId = null;

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadSettings() {
  const s = await Api.getSettings();
  document.getElementById('setting-name').value = s.restaurant_name;
  document.getElementById('setting-upi').value = s.upi_id;
  document.getElementById('setting-payee').value = s.upi_payee_name;
}

async function loadMenuTable() {
  const tbody = document.getElementById('menu-table-body');
  try {
    const items = await Api.getMenu();
    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">No menu items yet.</td></tr>';
      return;
    }
    tbody.innerHTML = items
      .map(
        (item) => `
      <tr>
        <td><img class="table-thumb" src="${item.image_url || '/images/idly.jpg'}" alt="" onerror="this.onerror=null;this.src='/images/idly.jpg'"></td>
        <td>${escapeHtml(item.name)}</td>
        <td>${formatINR(item.price)}</td>
        <td><span class="badge ${item.is_active ? 'badge-active' : 'badge-inactive'}">${item.is_active ? 'Active' : 'Inactive'}</span></td>
        <td class="table-actions">
          <button class="btn btn-secondary btn-sm btn-edit" data-id="${item.id}">Edit</button>
          <button class="btn btn-danger btn-sm btn-delete" data-id="${item.id}">Delete</button>
        </td>
      </tr>`
      )
      .join('');

    tbody.querySelectorAll('.btn-edit').forEach((btn) => {
      btn.addEventListener('click', () => startEdit(parseInt(btn.dataset.id, 10), items));
    });
    tbody.querySelectorAll('.btn-delete').forEach((btn) => {
      btn.addEventListener('click', () => deleteItem(parseInt(btn.dataset.id, 10)));
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5">${err.message}</td></tr>`;
  }
}

function resetForm() {
  editingId = null;
  document.getElementById('form-title').textContent = 'Add item';
  document.getElementById('menu-form').reset();
  document.getElementById('item-id').value = '';
  document.getElementById('item-active').checked = true;
  document.getElementById('btn-cancel-edit').style.display = 'none';
}

function startEdit(id, items) {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  editingId = id;
  document.getElementById('form-title').textContent = 'Edit item';
  document.getElementById('item-id').value = id;
  document.getElementById('item-name').value = item.name;
  document.getElementById('item-price').value = item.price;
  document.getElementById('item-active').checked = !!item.is_active;
  document.getElementById('btn-cancel-edit').style.display = 'inline-flex';
  document.getElementById('item-name').focus();
}

async function deleteItem(id) {
  if (!confirm('Delete this menu item permanently?')) return;
  try {
    await Api.deleteMenuItem(id);
    showToast('Item deleted', 'success');
    if (editingId === id) resetForm();
    loadMenuTable();
  } catch (err) {
    showToast(err.message, 'error');
  }
}

document.getElementById('menu-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData();
  formData.append('name', document.getElementById('item-name').value.trim());
  formData.append('price', document.getElementById('item-price').value);
  formData.append('is_active', document.getElementById('item-active').checked ? '1' : '0');
  const imageFile = document.getElementById('item-image').files[0];
  if (imageFile) formData.append('image', imageFile);

  try {
    let result;
    if (editingId) {
      result = await Api.updateMenuItem(editingId, formData);
      showToast('Item updated successfully', 'success');
    } else {
      result = await Api.createMenuItem(formData);
      showToast('Item added successfully', 'success');
    }
    resetForm();
    loadMenuTable();
  } catch (err) {
    console.error('Error saving menu item:', err);
    showToast(err.message || 'Failed to save item', 'error');
  }
});

document.getElementById('btn-cancel-edit').addEventListener('click', resetForm);

document.getElementById('settings-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    await Api.updateSettings({
      restaurant_name: document.getElementById('setting-name').value.trim(),
      upi_id: document.getElementById('setting-upi').value.trim(),
      upi_payee_name: document.getElementById('setting-payee').value.trim(),
    });
    showToast('Settings saved', 'success');
    loadSettings();
  } catch (err) {
    showToast(err.message, 'error');
  }
});

initNav();
loadSettings();
loadMenuTable();

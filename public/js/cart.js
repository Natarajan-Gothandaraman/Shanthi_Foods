const Cart = (() => {
  const items = new Map();
  const listeners = new Set();

  function notify() {
    listeners.forEach((fn) => fn(getSnapshot()));
  }

  function getSnapshot() {
    const lines = [];
    let total = 0;
    for (const line of items.values()) {
      const lineTotal = line.price * line.qty;
      total += lineTotal;
      lines.push({ ...line, lineTotal });
    }
    return { lines, total, count: lines.reduce((s, l) => s + l.qty, 0) };
  }

  return {
    subscribe(fn) {
      listeners.add(fn);
      fn(getSnapshot());
      return () => listeners.delete(fn);
    },
    add(menuItem) {
      const existing = items.get(menuItem.id);
      if (existing) {
        existing.qty += 1;
      } else {
        items.set(menuItem.id, {
          menuItemId: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          image_url: menuItem.image_url,
          qty: 1,
        });
      }
      notify();
    },
    setQty(menuItemId, qty) {
      const line = items.get(menuItemId);
      if (!line) return;
      if (qty <= 0) {
        items.delete(menuItemId);
      } else {
        line.qty = qty;
      }
      notify();
    },
    clear() {
      items.clear();
      notify();
    },
    isEmpty() {
      return items.size === 0;
    },
    getSnapshot() {
      return getSnapshot();
    },
    toOrderPayload() {
      return getSnapshot().lines.map((l) => ({
        menuItemId: l.menuItemId,
        qty: l.qty,
      }));
    },
  };
})();

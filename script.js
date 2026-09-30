const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');

toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') === 'true';
  toggle.setAttribute('aria-expanded', String(!open));
  nav.classList.toggle('open', !open);
});

nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  toggle.setAttribute('aria-expanded', 'false');
  nav.classList.remove('open');
}));

document.querySelector('#year').textContent = new Date().getFullYear();

const hero = document.querySelector('.hero');
const image = new Image();
image.onload = () => hero.classList.add('has-image');
image.src = 'assets/hero-tacos.jpg';

const WHATSAPP_NUMBER = '522215802239';
const STORAGE_KEY = 'chinita-cart-v1';
const money = (value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
const catalog = new Map();
const cart = new Map();
const dialog = document.querySelector('#cart-dialog');
const status = document.querySelector('#cart-status');
let statusTimer;

function announce(message) {
  status.textContent = message;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => { status.textContent = ''; }, 3000);
}

function addButton(container, id, name, price, label = 'Agregar') {
  catalog.set(id, { name, price });
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'add-button';
  button.textContent = label;
  button.setAttribute('aria-label', `${label}: ${name}`);
  button.addEventListener('click', () => {
    cart.set(id, Math.min(99, (cart.get(id) || 0) + 1));
    updateCart();
    announce(`${name} agregado al carrito`);
  });
  container.append(button);
}

document.querySelectorAll('.price-list li').forEach((row, index) => {
  const name = row.querySelector('span').textContent.replace(/\s+/g, ' ').trim();
  const price = Number(row.querySelector('strong').textContent.replace('$', ''));
  addButton(row, `menu-${index}`, name, price, '+');
});

document.querySelectorAll('.package-card').forEach((card, index) => {
  const title = card.querySelector('h3').textContent;
  const price = Number(card.querySelector('.package-top strong').textContent.replace('$', ''));
  card.querySelector('a').remove();
  if (index === 2) {
    ['pastor', 'árabe'].forEach((meat) => addButton(card, `package-3-${meat}`, `Paquete 3 · ½ kg de ${meat}`, price, `Agregar de ${meat}`));
  } else {
    addButton(card, `package-${index + 1}`, `Paquete ${index + 1} · ${title}`, price);
  }
});

document.querySelectorAll('.specialties-grid article').forEach((card, index) => {
  const name = card.querySelector('h3').textContent;
  addButton(card, `special-${index}`, `${name} · presentación por confirmar`, null, 'Agregar · precio por confirmar');
  addButton(card, `kilo-${index}`, `1 kg de especialidad ${name} (con complementos y refresco)`, 330, 'Agregar 1 kg · $330');
});

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  if (Array.isArray(saved)) saved.forEach((entry) => {
    if (Array.isArray(entry) && catalog.has(entry[0]) && Number.isInteger(entry[1]) && entry[1] > 0 && entry[1] <= 99) cart.set(entry[0], entry[1]);
  });
} catch { /* El carrito sigue funcionando si el almacenamiento no está disponible. */ }

function subtotal() {
  return [...cart].reduce((sum, [id, quantity]) => sum + (catalog.get(id).price || 0) * quantity, 0);
}

function updateCart() {
  const list = document.querySelector('#cart-items');
  list.replaceChildren();
  for (const [id, quantity] of cart) {
    const item = catalog.get(id);
    const row = document.createElement('li');
    const details = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = item.name;
    const price = document.createElement('small');
    price.textContent = item.price === null ? 'Precio por confirmar' : `${money(item.price)} c/u · ${money(item.price * quantity)}`;
    details.append(title, price);
    const controls = document.createElement('div');
    controls.className = 'quantity-controls';
    for (const [label, description, change] of [['−', 'Restar uno', -1], [String(quantity), '', 0], ['+', 'Sumar uno', 1], ['Quitar', 'Quitar', -quantity]]) {
      const control = document.createElement(change ? 'button' : 'span');
      control.textContent = label;
      if (change) {
        control.type = 'button';
        control.setAttribute('aria-label', `${description}: ${item.name}`);
        control.disabled = change === 1 && quantity === 99;
        control.addEventListener('click', () => {
          const next = quantity + change;
          if (next <= 0) cart.delete(id); else cart.set(id, next);
          const position = [...controls.children].indexOf(control);
          const rowIndex = [...list.children].indexOf(row);
          updateCart();
          const nextRow = list.children[Math.min(rowIndex, list.children.length - 1)];
          (nextRow?.querySelector('.quantity-controls')?.children[position] || document.querySelector('.cart-close')).focus();
        });
      }
      controls.append(control);
    }
    row.append(details, controls);
    list.append(row);
  }
  document.querySelector('#cart-count').textContent = [...cart.values()].reduce((sum, quantity) => sum + quantity, 0);
  document.querySelector('#cart-total').textContent = money(subtotal());
  document.querySelector('#cart-empty').hidden = cart.size > 0;
  document.querySelector('.checkout-button').disabled = cart.size === 0;
  document.querySelector('#clear-cart').disabled = cart.size === 0;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...cart])); } catch { /* Sin persistencia. */ }
}

document.querySelector('.floating-cart').addEventListener('click', () => dialog.showModal());
document.querySelector('.cart-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => document.body.classList.remove('cart-open'));
document.querySelector('.floating-cart').addEventListener('click', () => document.body.classList.add('cart-open'));
document.querySelector('#clear-cart').addEventListener('click', () => { cart.clear(); updateCart(); document.querySelector('.cart-close').focus(); });

document.querySelector('#checkout-form').addEventListener('submit', (event) => {
  event.preventDefault();
  if (!cart.size) return;
  const name = document.querySelector('#customer-name');
  const address = document.querySelector('#customer-address');
  for (const field of [name, address]) {
    field.setCustomValidity(field.value.trim() ? '' : 'Completa este campo para continuar.');
    if (!field.reportValidity()) return;
  }
  const lines = [...cart].map(([id, quantity]) => {
    const item = catalog.get(id);
    return `${quantity} × ${item.name} — ${item.price === null ? 'precio por confirmar' : `${money(item.price)} c/u = ${money(item.price * quantity)}`}`;
  });
  const notes = document.querySelector('#order-notes').value.trim();
  const message = ['¡Hola, Taquería La Chinita! Quiero hacer un pedido a domicilio:', '', ...lines, '', `Subtotal del menú: ${money(subtotal())} MXN`, 'Envío y productos sin precio: por confirmar.', '', `Nombre: ${name.value.trim()}`, `Dirección: ${address.value.trim()}`, ...(notes ? [`Notas: ${notes}`] : []), '', '¿Me confirman disponibilidad, total con envío y tiempo de entrega?'].join('\n');
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
});
document.querySelectorAll('#checkout-form input, #checkout-form textarea').forEach((field) => field.addEventListener('input', () => field.setCustomValidity('')));
updateCart();

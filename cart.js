/* ===================================================================
   CLASSIC — motor de carrinho (cart.js)
   Compartilhado entre index.html, carrinho.html e checkout.html.
   Armazena o carrinho no localStorage do navegador do cliente.
=================================================================== */

(function(window){

  const STORAGE_KEY = 'classic_cart_v1';

  /* ---------- catálogo de order bump (cueca & meia) ----------
     Imagens reais do acervo CLASSIC (Meias & Cuecas). */
  const BUMP_PRODUCTS = [
    {
      id: 'combo-cueca-meia',
      title: 'Combo Cueca + Meia Classic',
      images: [
        'https://classicbr.com/cdn/shop/files/ChatGPT_Image_23_de_jun._de_2026_18_08_08.png?width=400',
        'https://classicbr.com/cdn/shop/files/Sem_nome_1637_x_2048_px_3.png?width=400'
      ],
      price: 64.68,
      oldPrice: 107.80,
      badge: '-40% OFF'
    },
    {
      id: 'kit-cueca-confort',
      title: 'Kit Cueca Confort Classic',
      image: 'https://classicbr.com/cdn/shop/files/verde_9.png?width=400',
      price: 59.90
    },
    {
      id: 'kit-cueca-performance',
      title: 'Kit Cueca Performance Classic',
      image: 'https://classicbr.com/cdn/shop/files/ChatGPT_Image_23_de_jun._de_2026_18_08_08.png?width=400',
      price: 59.90,
      oldPrice: 67.98
    },
    {
      id: 'kit-meia-curta',
      title: 'Kit Meias Poliamida Cano Curto Classic',
      image: 'https://classicbr.com/cdn/shop/files/Sem_nome_1637_x_2048_px_3.png?width=400',
      price: 47.90
    },
    {
      id: 'kit-meia-longa',
      title: 'Kit Meias Cano Longo Classic',
      image: 'https://classicbr.com/cdn/shop/files/Sem_nome_1637_x_2048_px_11.png?width=400',
      price: 42.90
    }
  ];

  /* ---------- utilidades ---------- */
  function parsePrice(v){
    if(typeof v === 'number') return v;
    return parseFloat(String(v).replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',', '.')) || 0;
  }
  function formatBRLSafe(n){
    n = Number(n) || 0;
    const parts = n.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return 'R$ ' + parts.join(',');
  }

  /* ---------- persistência ---------- */
  function getCart(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    }catch(e){ return []; }
  }
  function saveCart(cart){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new CustomEvent('classic-cart-updated', {detail:{cart}}));
  }
  function findIndex(cart, id, size){
    return cart.findIndex(it => it.id === id && it.size === size);
  }

  function addItem({id, title, image, price, size = null, qty = 1}){
    const cart = getCart();
    const idx = findIndex(cart, id, size);
    if(idx > -1){
      cart[idx].qty += qty;
    }else{
      cart.push({id, title, image, price: parsePrice(price), size, qty});
    }
    saveCart(cart);
    return cart;
  }
  function removeItem(index){
    const cart = getCart();
    cart.splice(index,1);
    saveCart(cart);
    return cart;
  }
  function setQty(index, qty){
    const cart = getCart();
    if(!cart[index]) return cart;
    cart[index].qty = Math.max(1, Math.min(10, qty));
    saveCart(cart);
    return cart;
  }
  function clearCart(){ saveCart([]); }

  function count(){ return getCart().reduce((s,it)=>s+it.qty,0); }
  function subtotal(){ return getCart().reduce((s,it)=>s+it.qty*it.price,0); }

  /* ===================================================================
     DRAWER (mini-carrinho) — injetado em qualquer página que inclua este
     arquivo. Abre automaticamente ao adicionar um item e também ao
     clicar no ícone de carrinho do header.
  =================================================================== */

  let drawerBuilt = false;
  let flashTimer = null;

  function buildDrawer(){
    if(drawerBuilt) return;
    drawerBuilt = true;

    const overlay = document.createElement('div');
    overlay.className = 'cd-overlay';
    overlay.id = 'cdOverlay';

    overlay.innerHTML = `
      <aside class="cd-drawer" id="cdDrawer" role="dialog" aria-label="Carrinho de compras">
        <div class="cd-head">
          <span>Seu carrinho (<span id="cdCount">0</span>)</span>
          <button class="cd-close" id="cdClose" aria-label="Fechar carrinho">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        <div class="cd-flash" id="cdFlash">
          <svg class="fp-check" viewBox="0 0 24 24" fill="none" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" stroke-width="1.6"/><path d="M8 12.5l2.5 2.5L16 9.5" stroke-width="1.8"/></svg>
          <span id="cdFlashText">Item adicionado ao carrinho</span>
        </div>
        <div class="cd-body" id="cdBody"></div>
        <div class="cd-footer">
          <div class="cd-subtotal"><span>Subtotal</span><span id="cdSubtotal">R$ 0,00</span></div>
          <p class="cd-note">Frete e formas de pagamento calculados no checkout</p>
          <a href="checkout.html" class="cd-btn-primary">Finalizar compra</a>
          <a href="carrinho.html" class="cd-btn-secondary">Ver carrinho completo</a>
        </div>
      </aside>
    `;
    document.body.appendChild(overlay);

    document.getElementById('cdClose').addEventListener('click', closeDrawer);
    overlay.addEventListener('click', e => { if(e.target === overlay) closeDrawer(); });
    document.addEventListener('keydown', e => { if(e.key === 'Escape') closeDrawer(); });

    renderDrawer();
  }

  function openDrawer(){
    buildDrawer();
    document.getElementById('cdOverlay').classList.add('open');
    document.getElementById('cdDrawer').classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer(){
    const ov = document.getElementById('cdOverlay');
    const dr = document.getElementById('cdDrawer');
    if(ov) ov.classList.remove('open');
    if(dr) dr.classList.remove('open');
    document.body.style.overflow = '';
  }

  function flashMessage(msg){
    buildDrawer();
    const flash = document.getElementById('cdFlash');
    document.getElementById('cdFlashText').textContent = msg;
    flash.classList.remove('show');
    // força reflow para reiniciar a animação do check
    void flash.offsetWidth;
    flash.classList.add('show');
    clearTimeout(flashTimer);
    flashTimer = setTimeout(()=> flash.classList.remove('show'), 2400);
  }

  function renderDrawer(){
    if(!drawerBuilt) return;
    const cart = getCart();
    const body = document.getElementById('cdBody');
    document.getElementById('cdCount').textContent = count();
    document.getElementById('cdSubtotal').textContent = formatBRLSafe(subtotal());

    if(cart.length === 0){
      body.innerHTML = `<div class="cd-empty">Seu carrinho está vazio.<br>Adicione um pack para começar.</div>` + bumpGridHTML(true);
    }else{
      body.innerHTML = cart.map((it, idx) => `
        <div class="cd-item">
          <img src="${it.image}" alt="${it.title}">
          <div class="cd-item-info">
            <div class="t">${it.title}</div>
            <div class="meta">${it.size ? 'Tamanho: ' + it.size : ''}</div>
            <div class="price-row">
              <div class="cd-qty">
                <button data-act="minus" data-idx="${idx}">−</button>
                <span>${it.qty}</span>
                <button data-act="plus" data-idx="${idx}">+</button>
              </div>
              <span class="price">${formatBRLSafe(it.price*it.qty)}</span>
            </div>
          </div>
          <button class="cd-remove" data-act="remove" data-idx="${idx}">remover</button>
        </div>
      `).join('') + bumpGridHTML(false);
    }

    body.querySelectorAll('[data-act]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const idx = parseInt(btn.dataset.idx);
        const act = btn.dataset.act;
        const cart = getCart();
        if(act === 'plus') setQty(idx, cart[idx].qty + 1);
        else if(act === 'minus'){
          if(cart[idx].qty <= 1){ removeItem(idx); } else { setQty(idx, cart[idx].qty - 1); }
        }
        else if(act === 'remove') removeItem(idx);
      });
    });

    body.querySelectorAll('[data-bump-add]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const bp = BUMP_PRODUCTS.find(p => p.id === btn.dataset.bumpAdd);
        if(!bp) return;
        addItem({id:bp.id, title:bp.title, image: bp.image || (bp.images && bp.images[0]), price:bp.price, size:null, qty:1});
        flashMessage(bp.title + ' adicionado');
        btn.textContent = 'Adicionado ✓';
        btn.disabled = true;
        setTimeout(()=>{ btn.textContent = 'Adicionar'; btn.disabled = false; }, 1500);
      });
    });
  }

  function bumpMediaHTML(p){
    if(p.images){
      return `<div style="display:flex;gap:2px;height:70px;margin-bottom:8px;">
        <img src="${p.images[0]}" alt="${p.title}" style="width:50%;height:100%;object-fit:cover;">
        <img src="${p.images[1]}" alt="${p.title}" style="width:50%;height:100%;object-fit:cover;">
      </div>`;
    }
    return `<img src="${p.image}" alt="${p.title}">`;
  }

  function bumpGridHTML(compact){
    const items = compact ? BUMP_PRODUCTS.slice(0,2) : BUMP_PRODUCTS;
    return `
      <div class="cd-bump">
        <h4>Aproveite e leve também</h4>
        <div class="cd-bump-grid">
          ${items.map(p => `
            <div class="cd-bump-item">
              ${bumpMediaHTML(p)}
              <div class="t">${p.badge ? `<span style="color:var(--accent);">${p.badge}</span> ` : ''}${p.title}</div>
              <div class="p">${p.oldPrice ? `<span style="color:var(--gray-400);text-decoration:line-through;font-weight:500;margin-right:4px;">${formatBRLSafe(p.oldPrice)}</span>` : ''}${formatBRLSafe(p.price)}</div>
              <button data-bump-add="${p.id}">Adicionar</button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /* ---------- badge do header ---------- */
  function renderBadge(){
    document.querySelectorAll('.cart-count-badge').forEach(el=>{
      const c = count();
      el.textContent = c;
      el.classList.toggle('show', c > 0);
    });
  }

  function bumpBadgeAnim(){
    document.querySelectorAll('.cart-count-badge').forEach(el=>{
      el.classList.remove('bump');
      void el.offsetWidth;
      el.classList.add('bump');
    });
  }

  /* ---------- API pública de alto nível ---------- */
  function addToCartWithFeedback(item){
    addItem(item);
    bumpBadgeAnim();
    flashMessage('Item adicionado ao carrinho');
    openDrawer();
  }

  window.addEventListener('classic-cart-updated', renderDrawer);
  window.addEventListener('classic-cart-updated', renderBadge);

  document.addEventListener('DOMContentLoaded', ()=>{
    // ativa o(s) ícone(s) de carrinho do header, injetando o badge se ainda não existir
    document.querySelectorAll('.cart-btn').forEach(btn=>{
      btn.classList.remove('icon-btn');
      btn.classList.add('icon-btn','cart-btn');
      btn.removeAttribute('aria-disabled');
      btn.style.pointerEvents = 'auto';
      btn.style.cursor = 'pointer';
      btn.style.color = 'var(--black)';
      if(!btn.querySelector('.cart-count-badge')){
        const b = document.createElement('span');
        b.className = 'cart-count-badge';
        btn.appendChild(b);
      }
      btn.addEventListener('click', openDrawer);
    });
    renderBadge();
  });

  window.ClassicCart = {
    getCart, saveCart, addItem, removeItem, setQty, clearCart,
    count, subtotal, formatBRL: formatBRLSafe, parsePrice,
    openDrawer, closeDrawer, addToCartWithFeedback, flashMessage,
    BUMP_PRODUCTS
  };

})(window);

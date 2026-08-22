/**
 * 3D Card Effects
 */

let cards3D = [];

/**
 * Initialize 3D effects
 */
export function init3DEffects() {
  if (isMobile()) {
    return; // Disable 3D effects on mobile
  }
  
  setupCardEffects();
  setupHeroEffects();
}

/**
 * Setup card 3D effects
 */
function setupCardEffects() {
  const cards = document.querySelectorAll('.product-card, .category-card');
  
  cards.forEach(card => {
    cards3D.push(card);
    
    card.addEventListener('mousemove', (e) => {
      handle3DMove(card, e);
    });
    
    card.addEventListener('mouseleave', () => {
      handle3DLeave(card);
    });
  });
}

/**
 * Handle 3D mouse move
 */
function handle3DMove(card, e) {
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  const percentX = (x - centerX) / centerX;
  const percentY = (y - centerY) / centerY;
  
  const rotateX = percentY * -10;
  const rotateY = percentX * 10;
  
  card.style.transform = `
    perspective(1000px)
    rotateX(${rotateX}deg)
    rotateY(${rotateY}deg)
    scale3d(1.02, 1.02, 1.02)
  `;
  
  // Move product image
  const image = card.querySelector('.product-image');
  if (image) {
    image.style.transform = `
      translate(${percentX * 10}px, ${percentY * 10}px)
      scale(1.1)
    `;
  }
}

/**
 * Handle 3D mouse leave
 */
function handle3DLeave(card) {
  card.style.transform = `
    perspective(1000px)
    rotateX(0deg)
    rotateY(0deg)
    scale3d(1, 1, 1)
  `;
  
  const image = card.querySelector('.product-image');
  if (image) {
    image.style.transform = 'translate(0, 0) scale(1)';
  }
}

/**
 * Setup hero 3D effects
 */
function setupHeroEffects() {
  const heroVisual = document.querySelector('.hero-visual');
  
  if (!heroVisual) return;
  
  document.addEventListener('mousemove', (e) => {
    const x = e.clientX / window.innerWidth;
    const y = e.clientY / window.innerHeight;
    
    const gadgets = heroVisual.querySelectorAll('.floating-gadget');
    
    gadgets.forEach((gadget, index) => {
      const speed = (index + 1) * 0.5;
      const translateX = (x - 0.5) * speed * 20;
      const translateY = (y - 0.5) * speed * 20;
      
      gadget.style.transform = `translate(${translateX}px, ${translateY}px)`;
    });
  });
}

/**
 * Check if mobile device
 */
function isMobile() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         window.innerWidth <= 768;
}

/**
 * Refresh 3D effects (call when new cards are added)
 */
export function refresh3DEffects() {
  cards3D = [];
  setupCardEffects();
}

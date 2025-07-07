document.addEventListener('DOMContentLoaded', () => {
  // Atualizar contador do carrinho
  updateCartCount();
  
  // Inicializar Vue.js na página inicial
  if (document.getElementById('app')) {
    const { createApp } = Vue;
    
    createApp({
      data() {
        return {
          featuredProducts: []
        };
      },
      async mounted() {
        try {
          const response = await fetch('/api/products?limit=3');
          this.featuredProducts = await response.json();
        } catch (error) {
          console.error('Error fetching featured products:', error);
        }
      }
    }).mount('#app');
  }
});

// Função para atualizar contador do carrinho
function updateCartCount() {
  const cartCount = document.getElementById('cart-count');
  if (cartCount) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cartCount.textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  }
}

// Adicionar ao carrinho
window.addToCart = function(product, quantity = 1) {
  let cart = JSON.parse(localStorage.getItem('cart') || '[]');
  
  // Verificar se o produto já está no carrinho
  const existingItem = cart.find(item => item.id === product.id);
  
  if (existingItem) {
    // Atualizar quantidade
    existingItem.quantity += quantity;
  } else {
    // Adicionar novo item
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.images[0],
      quantity: quantity,
      maxQuantity: product.stock
    });
  }
  
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  auth.showToast('Produto adicionado ao carrinho', 'success');
};
document.addEventListener('DOMContentLoaded', () => {
  const { createApp } = Vue;
  
  createApp({
    data() {
      return {
        product: null,
        quantity: 1,
        loading: true
      };
    },
    async mounted() {
      const productId = new URLSearchParams(window.location.search).get('id');
      
      if (!productId) {
        window.location.href = '/products.html';
        return;
      }
      
      try {
        const response = await fetch(`/api/products/${productId}`);
        this.product = await response.json();
        this.loading = false;
      } catch (error) {
        console.error('Error loading product:', error);
        auth.showToast('Erro ao carregar produto', 'danger');
        window.location.href = '/products.html';
      }
    },
    methods: {
      addToCart() {
        if (this.quantity < 1) {
          auth.showToast('Quantidade inválida', 'danger');
          return;
        }
        
        if (this.quantity > this.product.stock) {
          auth.showToast('Quantidade indisponível em estoque', 'danger');
          return;
        }
        
        window.addToCart(this.product, parseInt(this.quantity));
        this.quantity = 1;
      }
    }
  }).mount('#app');
});
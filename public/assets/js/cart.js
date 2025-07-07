document.addEventListener('DOMContentLoaded', () => {
  const { createApp } = Vue;
  
  createApp({
    data() {
      return {
        cartItems: [],
        cep: '',
        shippingCost: null,
        loading: false
      };
    },
    computed: {
      subtotal() {
        return this.cartItems.reduce((sum, item) => {
          const quantity = Number(item.quantity) || 1; // Garante que quantity seja um número
          return sum + (item.price * quantity);
        }, 0);
      },
      total() {
        return this.subtotal + (this.shippingCost || 0);
      }
    },
    mounted() {
      this.loadCart();
    },
    methods: {
      loadCart() {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        // Garante que cada item tenha quantity e use a primeira imagem
        this.cartItems = cart.map(item => ({
          ...item,
          quantity: Number(item.quantity) || 1, // Default para 1 se não existir
          image: item.images?.[0] || 'assets/images/placeholder.png' // Usa a primeira imagem ou placeholder
        }));
      },
      updateCart() {
        // Atualiza localStorage mantendo a estrutura correta
        localStorage.setItem('cart', JSON.stringify(this.cartItems.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          images: item.images
        }))));
        
        if (window.updateCartCount) {
          updateCartCount();
        }
      },
      removeItem(productId) {
        this.cartItems = this.cartItems.filter(item => item.id !== productId);
        this.updateCart();
        if (window.auth && auth.showToast) {
          auth.showToast('Produto removido do carrinho', 'success');
        }
      },
      async calculateShipping() {
        if (!this.cep || this.cep.length < 8) {
          if (window.auth && auth.showToast) {
            auth.showToast('CEP inválido', 'danger');
          }
          return;
        }
        
        this.loading = true;
        
        try {
          const response = await fetch(`/api/shipping/${this.cep}`);
          if (!response.ok) throw new Error('Erro ao calcular frete');
          const data = await response.json();
          this.shippingCost = Number(data.cost) || 0;
        } catch (error) {
          console.error('Error calculating shipping:', error);
          if (window.auth && auth.showToast) {
            auth.showToast('Erro ao calcular frete', 'danger');
          }
          this.shippingCost = 0;
        } finally {
          this.loading = false;
        }
      }
    }
  }).mount('#app');
});
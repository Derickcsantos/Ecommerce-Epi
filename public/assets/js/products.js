document.addEventListener('DOMContentLoaded', () => {
  const { createApp } = Vue;
  
  createApp({
    data() {
      return {
        products: [],
        categories: [],
        filteredProducts: [],
        searchQuery: '',
        selectedCategory: null
      };
    },
    computed: {
      featuredProducts() {
        return this.products.slice(0, 3);
      }
    },
    async mounted() {
      try {
        console.log('Iniciando carregamento de produtos...');
        const productsResponse = await fetch('/api/products');
        if (!productsResponse.ok) {
          throw new Error(`HTTP error! status: ${productsResponse.status}`);
        }
        this.products = await productsResponse.json();
        console.log('Produtos carregados:', this.products);
        
        // Tratar imagens nulas
        this.products = this.products.map(product => ({
          ...product,
          images: product.images || ['assets/images/placeholder.png'] // Imagem padrão se for null
        }));
        
        this.filteredProducts = [...this.products];
        
        console.log('Iniciando carregamento de categorias...');
        const categoriesResponse = await fetch('/api/categories');
        if (!categoriesResponse.ok) {
          throw new Error(`HTTP error! status: ${categoriesResponse.status}`);
        }
        this.categories = await categoriesResponse.json();
        console.log('Categorias carregadas:', this.categories);
      } catch (error) {
        console.error('Error loading data:', error);
        // Verifique se auth.showToast existe, caso contrário use console.error
        if (window.auth && auth.showToast) {
          auth.showToast('Erro ao carregar produtos', 'danger');
        } else {
          console.error('Erro ao carregar produtos:', error);
        }
      }
    },
    methods: {
      filterProducts() {
        this.filteredProducts = this.products.filter(product => {
          const matchesSearch =
            product.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
            product.description.toLowerCase().includes(this.searchQuery.toLowerCase());

          const matchesCategory = this.selectedCategory
            ? product.categories.includes(this.selectedCategory)
            : true;

          return matchesSearch && matchesCategory;
        });
      },
      filterByCategory(categoryId) {
        const category = this.categories.find(c => c.id === categoryId);
        if (category) {
          this.selectedCategory = category.name;
          this.filterProducts();
        }
      },
      clearFilters() {
        this.selectedCategory = null;
        this.searchQuery = '';
        this.filteredProducts = [...this.products];
      },
      addToCart(product) {
        let cart = JSON.parse(localStorage.getItem('cart') || '[]');
        
        // Verifica se o produto já está no carrinho
        const existingItem = cart.find(item => item.id === product.id);
        
        if (existingItem) {
          existingItem.quantity = (existingItem.quantity || 1) + 1;
        } else {
          cart.push({
            ...product,
            quantity: 1 // Inicializa a quantidade
          });
        }
        
        localStorage.setItem('cart', JSON.stringify(cart));
        
        if (window.addToCart) {
          window.addToCart(product);
        } else {
          console.log('Produto adicionado ao carrinho:', product);
          alert(`${product.name} adicionado ao carrinho!`);
        }
        
        if (window.updateCartCount) {
          updateCartCount();
        }
      }
    }
  }).mount('#app');
});
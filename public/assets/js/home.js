// Configuração Vue.js para os produtos em destaque
const { createApp } = Vue;

createApp({
  data() {
    return {
      featuredProducts: [
        {
          id: 1,
          name: "Capacete de Segurança Classe A",
          description: "Capacete para proteção contra impactos na construção civil e indústria. Possui jugular regulável e certificação CA.",
          price: 89.90,
          images: ["https://images.unsplash.com/photo-1581093057307-9c4d07b0bc914?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"]
        },
        {
          id: 2,
          name: "Óculos de Proteção Anti-risco",
          description: "Óculos de proteção com lente incolor e resistente a impactos. Proteção lateral e confortável para uso prolongado.",
          price: 45.50,
          images: ["https://images.unsplash.com/photo-1581093196275-1a1ec493fad7?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"]
        },
        {
          id: 3,
          name: "Luva de Raspa Couro",
          description: "Luva de proteção para trabalhos com materiais abrasivos e cortantes. Palma em raspa de couro e punho elástico.",
          price: 32.75,
          images: ["https://images.unsplash.com/photo-1581093196058-5f20f5a9b5e5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"]
        },
        {
          id: 4,
          name: "Bota de Segurança com Biqueira",
          description: "Bota de segurança com biqueira de aço, solado antiderrapante e resistente a óleos. Confortável e durável.",
          price: 149.90,
          images: ["https://images.unsplash.com/photo-1581093196058-5f20f5a9b5e5?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60"]
        }
      ]
    }
  }
}).mount('#app');

// Animação ao rolar a página
document.addEventListener('DOMContentLoaded', function() {
  const animateOnScroll = function() {
    const elements = document.querySelectorAll('.animate-slide-up');
    
    elements.forEach(element => {
      const elementPosition = element.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;
      
      if (elementPosition < windowHeight - 100) {
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }
    });
  };
  
  // Executa uma vez ao carregar
  animateOnScroll();
  
  // Executa ao rolar a página
  window.addEventListener('scroll', animateOnScroll);
});

// Simulação de carrinho (pode ser substituído por lógica real)
document.addEventListener('DOMContentLoaded', function() {
  const cartCount = localStorage.getItem('cartCount') || 0;
  document.getElementById('cart-count').textContent = cartCount;
});
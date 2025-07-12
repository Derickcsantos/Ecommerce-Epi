document.addEventListener('DOMContentLoaded', async () => {
  // Verificar se há itens no carrinho
  const cart = JSON.parse(localStorage.getItem('cart') || []);
  if (cart.length === 0) {
    window.location.href = '/cart.html';
    return;
  }

  // Verificar autenticação
  const sessionId = auth.getSessionId();
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!sessionId || !isLoggedIn) {
    auth.showToast('Faça login para finalizar a compra', 'warning');
    window.location.href = '/';
    return;
  }

  const { createApp } = Vue;

  createApp({
    data() {
      return {
        cartItems: cart,
        shippingCost: 15.00,
        shippingInfo: {
          firstName: '',
          lastName: '',
          email: '',
          cep: '',
          street: '',
          number: '',
          city: '',
          state: '',
          complement: ''
        },
        stripe: null,
        elements: null,
        paymentElement: null,
        orderId: null,
        loading: false,
        paymentError: null,
        paymentReady: false // Novo estado para controlar se o pagamento está pronto
      };
    },
    computed: {
      subtotal() {
        return this.cartItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
      },
      total() {
        return this.subtotal + this.shippingCost;
      }
    },
    async mounted() {
      try {
        // 1. Inicializar Stripe
        this.stripe = Stripe('pk_live_51QSIrULBmne67LeJ54ysLqdzOYSVQ3Nlpz5AfOjcktFprcayazf86tAcpd1HFlXkjdW6teXRp9CYWlNoAo0Sv6Db00YdhRX5cq');
        
        // 2. Preencher email se usuário logado
        if (auth.currentUser()) {
          this.shippingInfo.email = auth.currentUser().email;
        }

        // 3. Verificar se já temos informações de endereço suficientes
        if (this.shippingInfo.cep && this.shippingInfo.street && this.shippingInfo.number) {
          await this.initializePayment();
        }
      } catch (error) {
        console.error('Initialization error:', error);
        auth.showToast('Erro ao inicializar pagamento', 'danger');
      }
    },
    methods: {
      async initializePayment() {
        try {
          // 1. Obter clientSecret
          const clientSecret = await this.getClientSecret();
          if (!clientSecret) return;

          // 2. Configurar elementos de pagamento
          this.elements = this.stripe.elements({ 
            clientSecret,
            appearance: {
              theme: 'stripe',
              variables: {
                colorPrimary: '#0570de',
                colorBackground: '#ffffff',
                colorText: '#30313d',
                fontFamily: '"Helvetica Neue", Helvetica, sans-serif'
              }
            }
          });

          // 3. Criar e montar o elemento de pagamento
          this.paymentElement = this.elements.create('payment');
          await this.paymentElement.mount('#payment-element');

          // 4. Marcar como pronto para pagamento
          this.paymentReady = true;

        } catch (error) {
          console.error('Payment initialization error:', error);
          this.paymentError = 'Erro ao configurar pagamento';
          auth.showToast('Erro ao configurar pagamento', 'danger');
        }
      },
      async getClientSecret() {
        try {
          // Validação completa do endereço
          const requiredAddressFields = ['cep', 'street', 'number', 'city', 'state'];
          const missingFields = requiredAddressFields.filter(field => !this.shippingInfo[field] || !this.shippingInfo[field].trim());
          
          if (missingFields.length > 0) {
            throw new Error(`Preencha os campos obrigatórios: ${missingFields.join(', ')}`);
          }

          // Verificação de autenticação
          const sessionId = auth.getSessionId();
          if (!sessionId) {
            auth.showToast('Sessão expirada. Faça login novamente.', 'warning');
            window.location.href = '/login';
            throw new Error('Sessão expirada');
          }

          // Preparar dados do pedido
          const orderData = {
            items: this.cartItems.map(item => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity || 1,
              price: item.price
            })),
            address: `${this.shippingInfo.street}, ${this.shippingInfo.number} - ${this.shippingInfo.city}/${this.shippingInfo.state}`,
            cep: this.shippingInfo.cep,
            email: this.shippingInfo.email,
            shippingInfo: {
              firstName: this.shippingInfo.firstName,
              lastName: this.shippingInfo.lastName,
              city: this.shippingInfo.city,
              state: this.shippingInfo.state
            }
          };

          // Adicionar timeout para a requisição
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos

          const response = await fetch('/api/checkout', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionId}`
            },
            body: JSON.stringify(orderData),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          // Verificar resposta
          if (!response.ok) {
            const errorData = await response.json();
            console.error('Erro na resposta da API:', errorData);
            
            if (response.status === 401) {
              auth.showToast('Sessão expirada. Faça login novamente.', 'warning');
              window.location.href = '/login';
            }
            
            throw new Error(errorData.error || 'Erro ao processar seu pedido');
          }

          const data = await response.json();
          
          if (!data.clientSecret) {
            throw new Error('Dados de pagamento inválidos recebidos do servidor');
          }

          this.orderId = data.orderId;
          return data.clientSecret;

        } catch (error) {
          console.error('Erro no checkout:', {
            error: error.message,
            stack: error.stack,
            shippingInfo: this.shippingInfo,
            cartItems: this.cartItems
          });

          if (error.name === 'AbortError') {
            this.paymentError = 'Tempo limite excedido. Verifique sua conexão e tente novamente.';
            auth.showToast(this.paymentError, 'danger');
          } else {
            this.paymentError = error.message;
            auth.showToast(error.message || 'Erro ao processar pagamento', 'danger');
          }
          
          return null;
        }
      },
      checkFormCompletion() {
        const requiredFields = [
          'firstName', 'lastName', 'email', 
          'cep', 'street', 'number', 
          'city', 'state'
        ];
        
        const isComplete = requiredFields.every(field => 
          !!this.shippingInfo[field] && this.shippingInfo[field].trim() !== ''
        );

        if (isComplete && !this.paymentReady) {
          this.initializePayment();
        }
        
        return isComplete;
      },
      async fetchAddress() {
        if (!this.shippingInfo.cep || this.shippingInfo.cep.length < 8) return;
        
        try {
          const response = await fetch(`https://viacep.com.br/ws/${this.shippingInfo.cep}/json/`);
          const data = await response.json();
          
          if (data.erro) throw new Error('CEP não encontrado');
          
          this.shippingInfo.street = data.logradouro;
          this.shippingInfo.city = data.localidade;
          this.shippingInfo.state = data.uf;

          // Verificar se todos os campos obrigatórios estão preenchidos
          this.checkFormCompletion();
        } catch (error) {
          console.error('CEP error:', error);
          auth.showToast('Erro ao buscar endereço', 'warning');
        }
      },
      async submitPayment() {
        if (!this.checkFormCompletion()) {
          this.paymentError = 'Preencha todos os campos obrigatórios primeiro';
          auth.showToast(this.paymentError, 'warning');
          return;
        }

        if (!this.paymentReady) {
          try {
            await this.initializePayment();
          } catch (error) {
            this.paymentError = 'Erro ao preparar pagamento';
            return;
          } 
        }

        this.loading = true;
        this.paymentError = null;
        
        try {
          const { error } = await this.stripe.confirmPayment({
            elements: this.elements,
            confirmParams: {
              return_url: `${window.location.origin}/order-success.html?order_id=${this.orderId}`,
              receipt_email: this.shippingInfo.email
            },
            redirect: 'if_required'
          });

          if (error) {
            throw error;
          }

          // Pagamento bem-sucedido (quando redirect: 'if_required')
          localStorage.removeItem('cart');
          if (window.updateCartCount) updateCartCount();
          
          // Redirecionar para página de sucesso
          window.location.href = `/order-success.html?order_id=${this.orderId}`;

        } catch (error) {
          console.error('Payment error:', error);
          this.paymentError = error.message || 'Erro ao processar pagamento';
          auth.showToast(this.paymentError, 'danger');
        } finally {
          this.loading = false;
        }
      },
      goToHome() {
        window.location.href = '/';
      }
    }
  }).mount('#app');
});
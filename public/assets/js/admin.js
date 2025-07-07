document.addEventListener('DOMContentLoaded', () => {
  // Verificar se é admin
  if (auth.currentUser()?.tipo !== 1) {
    window.location.href = '/index.html';
    return;
  }
  
  // Carregar dados do dashboard
  loadDashboardData();
});

async function loadDashboardData() {
  try {
    const sessionId = auth.getSessionId();
    
    // Contagem de produtos
    const productsResponse = await fetch(`/api/admin/products?sessionId=${sessionId}`);
    const products = await productsResponse.json();
    document.getElementById('products-count').textContent = products.length;
    
    // Pedidos recentes e estatísticas
    const ordersResponse = await fetch(`/api/admin/orders?sessionId=${sessionId}`);
    const orders = await ordersResponse.json();
    
    // Pedidos de hoje
    const today = new Date().toISOString().split('T')[0];
    const todayOrders = orders.filter(order => order.created_at.startsWith(today));
    document.getElementById('orders-today-count').textContent = todayOrders.length;
    
    // Receita total
    const totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total), 0);
    document.getElementById('total-revenue').textContent = `R$ ${totalRevenue.toFixed(2)}`;
    
    // Últimos pedidos
    const recentOrdersTable = document.getElementById('recent-orders');
    if (recentOrdersTable) {
      recentOrdersTable.innerHTML = '';
      
      const recentOrders = orders.slice(0, 5);
      
      recentOrders.forEach(order => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
          <td>${order.id}</td>
          <td>${new Date(order.created_at).toLocaleDateString()}</td>
          <td>Usuário #${order.user_id}</td>
          <td>R$ ${parseFloat(order.total).toFixed(2)}</td>
          <td>
            <a href="orders.html#order-${order.id}" class="btn btn-sm btn-primary">Ver</a>
          </td>
        `;
        
        recentOrdersTable.appendChild(row);
      });
    }
  } catch (error) {
    console.error('Error loading admin data:', error);
    auth.showToast('Erro ao carregar dados do painel', 'danger');
  }
}
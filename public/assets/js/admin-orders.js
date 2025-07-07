document.addEventListener('DOMContentLoaded', () => {
  // Verificar se é admin
  if (auth.currentUser()?.tipo !== 1) {
    window.location.href = '/index.html';
    return;
  }
  
  const sessionId = auth.getSessionId();
  let orders = [];
  
  // Carregar pedidos
  loadOrders();
  
  // Event Listeners
  document.getElementById('apply-filters').addEventListener('click', applyFilters);
  document.getElementById('update-order-btn').addEventListener('click', updateOrderStatus);
  
  // Funções
  async function loadOrders() {
    try {
      const response = await fetch(`/api/admin/orders?sessionId=${sessionId}`);
      orders = await response.json();
      renderOrdersTable();
    } catch (error) {
      console.error('Error loading orders:', error);
      auth.showToast('Erro ao carregar pedidos', 'danger');
    }
  }
  
  function renderOrdersTable(filteredOrders = null) {
    const ordersToRender = filteredOrders || orders;
    const ordersTable = document.getElementById('orders-table');
    
    if (!ordersTable) return;
    
    ordersTable.innerHTML = '';
    
    ordersToRender.forEach(order => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${order.id}</td>
        <td>${new Date(order.created_at).toLocaleDateString()}</td>
        <td>Usuário #${order.user_id}</td>
        <td>R$ ${parseFloat(order.total).toFixed(2)}</td>
        <td>
          <span class="badge bg-${getStatusBadgeColor(order.status)}">
            ${getStatusText(order.status)}
          </span>
        </td>
        <td>
          <button class="btn btn-sm btn-primary view-btn" data-id="${order.id}">
            <i class="bi bi-eye"></i> Ver
          </button>
        </td>
      `;
      
      ordersTable.appendChild(row);
    });
    
    // Adicionar event listeners para os botões de visualização
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', () => openOrderDetails(parseInt(btn.dataset.id)));
    });
  }
  
  function applyFilters() {
    const dateFilter = document.getElementById('filter-date').value;
    const statusFilter = document.getElementById('filter-status').value;
    
    let filteredOrders = [...orders];
    
    if (dateFilter) {
      filteredOrders = filteredOrders.filter(order => 
        order.created_at.startsWith(dateFilter)
      );
    }
    
    if (statusFilter) {
      filteredOrders = filteredOrders.filter(order => 
        order.status === statusFilter
      );
    }
    
    renderOrdersTable(filteredOrders);
  }
  
  function openOrderDetails(orderId) {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    // Preencher modal com detalhes do pedido
    document.getElementById('order-id').textContent = order.id;
    document.getElementById('customer-info').innerHTML = `
      Usuário #${order.user_id}<br>
      Data: ${new Date(order.created_at).toLocaleString()}
    `;
    
    document.getElementById('shipping-address').textContent = order.endereco;
    
    // Itens do pedido
    const itemsTable = document.getElementById('order-items');
    itemsTable.innerHTML = '';
    
    order.items.forEach(item => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${item.name}</td>
        <td>R$ ${item.price.toFixed(2)}</td>
        <td>${item.quantity}</td>
        <td>R$ ${(item.price * item.quantity).toFixed(2)}</td>
      `;
      
      itemsTable.appendChild(row);
    });
    
    // Totais
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = parseFloat(order.total) - subtotal;
    
    document.getElementById('order-subtotal').textContent = `R$ ${subtotal.toFixed(2)}`;
    document.getElementById('order-shipping').textContent = `R$ ${shipping.toFixed(2)}`;
    document.getElementById('order-total').textContent = `R$ ${parseFloat(order.total).toFixed(2)}`;
    
    // Status
    document.getElementById('order-status').value = order.status || 'pending';
    
    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('orderDetailsModal'));
    modal.show();
  }
  
  async function updateOrderStatus() {
    const orderId = parseInt(document.getElementById('order-id').textContent);
    const newStatus = document.getElementById('order-status').value;
    
    try {
      // Em um sistema real, faríamos uma chamada API para atualizar o status
      const order = orders.find(o => o.id === orderId);
      if (order) {
        order.status = newStatus;
      }
      
      // Fechar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('orderDetailsModal'));
      modal.hide();
      
      // Atualizar tabela
      renderOrdersTable();
      
      auth.showToast('Status do pedido atualizado', 'success');
    } catch (error) {
      console.error('Error updating order:', error);
      auth.showToast('Erro ao atualizar status', 'danger');
    }
  }
  
  function getStatusText(status) {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'completed': return 'Completo';
      case 'cancelled': return 'Cancelado';
      default: return 'Pendente';
    }
  }
  
  function getStatusBadgeColor(status) {
    switch (status) {
      case 'pending': return 'warning';
      case 'completed': return 'success';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  }
});
document.addEventListener('DOMContentLoaded', () => {
  // Verificar se é admin
  if (auth.currentUser()?.tipo !== 1) {
    window.location.href = '/index.html';
    return;
  }
  
  const sessionId = auth.getSessionId();
  let products = [];
  let categories = [];
  
  // Elementos
  const productsTable = document.getElementById('products-table');
  const addProductForm = document.getElementById('add-product-form');
  const editProductForm = document.getElementById('edit-product-form');
  const saveProductBtn = document.getElementById('save-product-btn');
  const updateProductBtn = document.getElementById('update-product-btn');
  
  // Carregar produtos e categorias
  loadProducts();
  loadCategories();
  
  // Event Listeners
  if (saveProductBtn) {
    saveProductBtn.addEventListener('click', addProduct);
  }
  
  if (updateProductBtn) {
    updateProductBtn.addEventListener('click', updateProduct);
  }
  
  // Preview de imagens no formulário de adição
  const productImagesInput = document.getElementById('product-images');
  if (productImagesInput) {
    productImagesInput.addEventListener('change', function() {
      const preview = document.getElementById('image-preview');
      preview.innerHTML = '';
      
      for (const file of this.files) {
        if (!file.type.match('image.*')) continue;
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.width = 100;
          img.className = 'img-thumbnail';
          preview.appendChild(img);
        };
        
        reader.readAsDataURL(file);
      }
    });
  }
  
  // Preview de imagens no formulário de edição
  const editProductImagesInput = document.getElementById('edit-product-images');
  if (editProductImagesInput) {
    editProductImagesInput.addEventListener('change', function() {
      const preview = document.getElementById('edit-image-preview');
      preview.innerHTML = '';
      
      for (const file of this.files) {
        if (!file.type.match('image.*')) continue;
        
        const reader = new FileReader();
        
        reader.onload = function(e) {
          const img = document.createElement('img');
          img.src = e.target.result;
          img.width = 100;
          img.className = 'img-thumbnail';
          preview.appendChild(img);
        };
        
        reader.readAsDataURL(file);
      }
    });
  }
  
  // Funções
  async function loadProducts() {
    try {
      const response = await fetch(`/api/admin/products?sessionId=${sessionId}`);
      products = await response.json();
      renderProductsTable();
    } catch (error) {
      console.error('Error loading products:', error);
      auth.showToast('Erro ao carregar produtos', 'danger');
    }
  }
  
  async function loadCategories() {
    try {
      const response = await fetch(`/api/categories?sessionId=${sessionId}`);
      categories = await response.json();
      renderCategorySelects();
    } catch (error) {
      console.error('Error loading categories:', error);
      auth.showToast('Erro ao carregar categorias', 'danger');
    }
  }
  
  function renderProductsTable() {
    if (!productsTable) return;
    
    productsTable.innerHTML = '';
    
    products.forEach(product => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${product.id}</td>
        <td>${product.name}</td>
        <td>R$ ${product.price.toFixed(2)}</td>
        <td>${product.stock}</td>
        <td>
          <button class="btn btn-sm btn-primary me-2 edit-btn" data-id="${product.id}">
            <i class="bi bi-pencil"></i> Editar
          </button>
          <button class="btn btn-sm btn-danger delete-btn" data-id="${product.id}">
            <i class="bi bi-trash"></i> Excluir
          </button>
        </td>
      `;
      
      productsTable.appendChild(row);
    });
    
    // Adicionar event listeners para os botões
    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.id)));
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteProduct(parseInt(btn.dataset.id)));
    });
  }
  
  function renderCategorySelects() {
    const categorySelect = document.getElementById('product-categories');
    const editCategorySelect = document.getElementById('edit-product-categories');
    
    if (categorySelect) {
      categorySelect.innerHTML = categories.map(cat => 
        `<option value="${cat.id}">${cat.name}</option>`
      ).join('');
    }
    
    if (editCategorySelect) {
      editCategorySelect.innerHTML = categories.map(cat => 
        `<option value="${cat.id}">${cat.name}</option>`
      ).join('');
    }
  }
  
  async function addProduct() {
    const name = document.getElementById('product-name').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const stock = parseInt(document.getElementById('product-stock').value);
    const description = document.getElementById('product-description').value;
    const selectedCategories = Array.from(document.getElementById('product-categories').selectedOptions)
      .map(opt => parseInt(opt.value));
    
    const imagesInput = document.getElementById('product-images');
    const images = [];
    
    // Processar imagens (simplificado - em produção, enviar para o servidor)
    for (const file of imagesInput.files) {
      if (!file.type.match('image.*')) continue;
      
      const base64 = await toBase64(file);
      images.push(base64);
    }
    
    if (!name || isNaN(price) || isNaN(stock) || !description) {
      auth.showToast('Preencha todos os campos obrigatórios', 'danger');
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/products?sessionId=${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          price,
          stock,
          description,
          images,
          categories: selectedCategories
        })
      });
      
      const newProduct = await response.json();
      
      products.push(newProduct);
      renderProductsTable();
      
      // Fechar modal e limpar formulário
      const modal = bootstrap.Modal.getInstance(document.getElementById('addProductModal'));
      modal.hide();
      addProductForm.reset();
      document.getElementById('image-preview').innerHTML = '';
      
      auth.showToast('Produto adicionado com sucesso', 'success');
    } catch (error) {
      console.error('Error adding product:', error);
      auth.showToast('Erro ao adicionar produto', 'danger');
    }
  }
  
  function openEditModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    document.getElementById('edit-product-id').value = product.id;
    document.getElementById('edit-product-name').value = product.name;
    document.getElementById('edit-product-price').value = product.price;
    document.getElementById('edit-product-stock').value = product.stock;
    document.getElementById('edit-product-description').value = product.description;
    
    // Mostrar imagens atuais
    const currentImagesContainer = document.getElementById('current-images');
    currentImagesContainer.innerHTML = '';
    
    product.images.forEach(img => {
      const imgElement = document.createElement('img');
      imgElement.src = img;
      imgElement.width = 100;
      imgElement.className = 'img-thumbnail me-2';
      currentImagesContainer.appendChild(imgElement);
    });
    
    // Abrir modal
    const modal = new bootstrap.Modal(document.getElementById('editProductModal'));
    modal.show();
  }
  
  async function updateProduct() {
    const id = parseInt(document.getElementById('edit-product-id').value);
    const name = document.getElementById('edit-product-name').value;
    const price = parseFloat(document.getElementById('edit-product-price').value);
    const stock = parseInt(document.getElementById('edit-product-stock').value);
    const description = document.getElementById('edit-product-description').value;
    const selectedCategories = Array.from(document.getElementById('edit-product-categories').selectedOptions)
      .map(opt => parseInt(opt.value));
    
    const imagesInput = document.getElementById('edit-product-images');
    const newImages = [];
    
    // Processar novas imagens
    for (const file of imagesInput.files) {
      if (!file.type.match('image.*')) continue;
      
      const base64 = await toBase64(file);
      newImages.push(base64);
    }
    
    if (!name || isNaN(price) || isNaN(stock) || !description) {
      auth.showToast('Preencha todos os campos obrigatórios', 'danger');
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/products/${id}?sessionId=${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          price,
          stock,
          description,
          newImages,
          categories: selectedCategories
        })
      });
      
      const updatedProduct = await response.json();
      
      // Atualizar lista de produtos
      const index = products.findIndex(p => p.id === id);
      if (index !== -1) {
        products[index] = updatedProduct;
      }
      
      renderProductsTable();
      
      // Fechar modal e limpar formulário
      const modal = bootstrap.Modal.getInstance(document.getElementById('editProductModal'));
      modal.hide();
      editProductForm.reset();
      document.getElementById('edit-image-preview').innerHTML = '';
      
      auth.showToast('Produto atualizado com sucesso', 'success');
    } catch (error) {
      console.error('Error updating product:', error);
      auth.showToast('Erro ao atualizar produto', 'danger');
    }
  }
  
  async function deleteProduct(productId) {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    try {
      await fetch(`/api/admin/products/${productId}?sessionId=${sessionId}`, {
        method: 'DELETE'
      });
      
      // Remover da lista
      products = products.filter(p => p.id !== productId);
      renderProductsTable();
      
      auth.showToast('Produto excluído com sucesso', 'success');
    } catch (error) {
      console.error('Error deleting product:', error);
      auth.showToast('Erro ao excluir produto', 'danger');
    }
  }
  
  // Helper para converter arquivo para base64
  function toBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }
});
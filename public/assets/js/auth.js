// Gerenciamento de autenticação e sessão
let currentUser = null;

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  
  // Login Form
  const loginForm = document.getElementById('login-form');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('login-username').value;
      const password = document.getElementById('login-password').value;
      
      try {
        const response = await fetch('/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
          localStorage.setItem('sessionId', data.sessionId);
          localStorage.setItem('user', JSON.stringify(data.user));
          currentUser = data.user;
          
          // Fechar modal e atualizar UI
          const loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
          if (loginModal) loginModal.hide();
          
          updateAuthUI();
          showToast('Login realizado com sucesso!', 'success');
        } else {
          showToast('Credenciais inválidas', 'danger');
        }
      } catch (error) {
        console.error('Login error:', error);
        showToast('Erro ao fazer login', 'danger');
      }
    });
  }
  
  // Register Form
  const registerForm = document.getElementById('register-form');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = document.getElementById('register-username').value;
      const email = document.getElementById('register-email').value;
      const password = document.getElementById('register-password').value;
      
      try {
        const response = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, email, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
          // Fechar modal e mostrar mensagem
          const registerModal = bootstrap.Modal.getInstance(document.getElementById('registerModal'));
          if (registerModal) registerModal.hide();
          
          showToast('Registro realizado com sucesso! Faça login para continuar.', 'success');
        } else {
          showToast(data.error || 'Erro ao registrar', 'danger');
        }
      } catch (error) {
        console.error('Register error:', error);
        showToast('Erro ao registrar', 'danger');
      }
    });
  }
  
  // Logout Button
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('sessionId');
      localStorage.removeItem('user');
      currentUser = null;
      updateAuthUI();
      showToast('Logout realizado com sucesso', 'success');
      
      // Redirecionar se estiver na área admin
      if (window.location.pathname.includes('/admin/')) {
        window.location.href = '/index.html';
      }
    });
  }
});

function checkAuth() {
  const sessionId = localStorage.getItem('sessionId');
  const user = JSON.parse(localStorage.getItem('user') || null);
  
  if (sessionId && user) {
    currentUser = user;
    updateAuthUI();
    
    // Verificar se está tentando acessar área admin sem permissão
    if (window.location.pathname.includes('/admin/') && user.tipo !== 1) {
      window.location.href = '/index.html';
    }
  } else if (window.location.pathname.includes('/admin/')) {
    window.location.href = '/index.html';
  }
}

function updateAuthUI() {
  const authButtons = document.getElementById('auth-buttons');
  const userMenu = document.getElementById('user-menu');
  const usernameDisplay = document.getElementById('username-display');
  const adminLink = document.getElementById('admin-link');
  
  if (authButtons && userMenu && usernameDisplay) {
    if (currentUser) {
      authButtons.style.display = 'none';
      userMenu.style.display = 'block';
      usernameDisplay.textContent = currentUser.username;
      
      if (currentUser.tipo === 1 && adminLink) {
        adminLink.style.display = 'block';
      }
    } else {
      authButtons.style.display = 'block';
      userMenu.style.display = 'none';
    }
  }
}

function showToast(message, type = 'info') {
  // Implementação simples de toast/alert
  const toastContainer = document.createElement('div');
  toastContainer.style.position = 'fixed';
  toastContainer.style.top = '20px';
  toastContainer.style.right = '20px';
  toastContainer.style.zIndex = '9999';
  
  const toast = document.createElement('div');
  toast.className = `alert alert-${type} alert-dismissible fade show`;
  toast.role = 'alert';
  toast.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  toastContainer.appendChild(toast);
  document.body.appendChild(toastContainer);
  
  // Remover após 5 segundos
  setTimeout(() => {
    toastContainer.remove();
  }, 5000);
}

// Exportar para uso em outros arquivos
window.auth = {
  currentUser: () => currentUser,
  getSessionId: () => localStorage.getItem('sessionId'),
  showToast
};
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
const PORT = process.env.PORT || 3000;

// Configuração do Supabase com mais opções
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  }
});

app.use(bodyParser.json());
app.use(express.static('public'));

// Simulação de sessão em memória (simplificado)
const sessions = {};

// Rota principal - Página inicial
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Rota de produtos
app.get('/products', (req, res) => {
  res.sendFile(__dirname + '/public/products.html');
});

// Rota de detalhes do produto
app.get('/product/:id', (req, res) => {
  res.sendFile(__dirname + '/public/product-detail.html');
});

// Rota do carrinho
app.get('/cart', (req, res) => {
  res.sendFile(__dirname + '/public/cart.html');
});

// Rota de checkout
app.get('/checkout', (req, res) => {
  res.sendFile(__dirname + '/public/checkout.html');
});

// Rotas da área administrativa
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/public/admin/index.html');
});

app.get('/admin/products', (req, res) => {
  res.sendFile(__dirname + '/public/admin/products.html');
});

app.get('/admin/orders', (req, res) => {
  res.sendFile(__dirname + '/public/admin/orders.html');
});

app.use(async (req, res, next) => {
  try {
    // Testa a conexão com uma query simples
    const { error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) throw error;
    next();
  } catch (err) {
    console.error('Erro na conexão com Supabase:', err);
    res.status(500).json({ error: 'Erro na conexão com o banco de dados' });
  }
});

// Rotas de Autenticação
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .or(`username.eq.${username},email.eq.${username}`)
    .eq('password', password)
    .single();

  if (error || !user) {
    return res.status(401).json({ error: 'Credenciais inválidas' });
  }

  // Criar sessão simples (não seguro para produção)
  const sessionId = Math.random().toString(36).substring(2);
  sessions[sessionId] = user.id;
  
  res.json({ 
    success: true, 
    sessionId,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      tipo: user.tipo
    }
  });
});

app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .or(`username.eq.${username},email.eq.${email}`)
    .single();

  if (existingUser) {
    return res.status(400).json({ error: 'Usuário ou e-mail já existe' });
  }

  const { data: newUser, error } = await supabase
    .from('users')
    .insert([{ username, email, password, tipo: 0 }])
    .single();

  if (error) {
    return res.status(500).json({ error: 'Erro ao criar usuário' });
  }

  res.json({ success: true, userId: newUser.id });
});

app.get('/api/products', async (req, res) => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        product_categories (
          categories (
            id,
            name
          )
        )
      `)
      .order('id', { ascending: true });

    if (error) {
      console.error('Erro ao buscar produtos:', error);
      return res.status(500).json({ error: 'Erro ao buscar produtos', details: error.message });
    }

    if (!products || products.length === 0) {
      return res.status(404).json({ error: 'Nenhum produto encontrado' });
    }

    // Reformatar os produtos para conter um array direto de categorias
    const formattedProducts = products.map(product => ({
      ...product,
      categories: product.product_categories.map(pc => pc.categories.name)
    }));

    res.json(formattedProducts);
  } catch (err) {
    console.error('Erro inesperado:', err);
    res.status(500).json({ error: 'Erro interno no servidor', details: err.message });
  }
});


app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  
  const { data: product, error } = await supabase
    .from('products')
    .select(`
      *,
      product_categories (
        categories ( name )
      )
    `)
    .eq('id', id)
    .single();
  
  if (error || !product) {
    return res.status(404).json({ error: 'Produto não encontrado' });
  }
  
  // Formatando categorias
  product.categories = product.product_categories.map(pc => pc.categories.name);
  delete product.product_categories;
  
  res.json(product);
});

app.get('/api/categories', async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Erro ao buscar categorias:', error);
      return res.status(500).json({ error: 'Erro ao buscar categorias', details: error.message });
    }

    res.json(categories);
  } catch (err) {
    console.error('Erro inesperado:', err);
    res.status(500).json({ error: 'Erro interno no servidor', details: err.message });
  }
});

// Rotas de Carrinho (simulado no frontend)

// Rotas de Checkout
app.post('/api/checkout', async (req, res) => {
  try {
    const { sessionId, items, address, cep } = req.body;
    
    if (!sessionId || !sessions[sessionId]) {
      return res.status(401).json({ error: 'Não autenticado' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Carrinho vazio' });
    }

    const userId = sessions[sessionId];
    
    // Verificar produtos no banco de dados
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, price, stock')
      .in('id', items.map(item => item.id));
    
    if (productsError) throw productsError;

    // Validar estoque e calcular total
    let total = 0;
    for (const item of items) {
      const product = products.find(p => p.id === item.id);
      if (!product) {
        return res.status(400).json({ error: `Produto ${item.id} não encontrado` });
      }
      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Estoque insuficiente para ${item.name}` });
      }
      total += product.price * item.quantity;
    }

    // Criar pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([{
        user_id: userId,
        items,
        total,
        cep,
        endereco: address,
        status: 'pending'
      }])
      .select()
      .single();

    if (orderError) throw orderError;

    // Atualizar estoque
    for (const item of items) {
      const { error } = await supabase
        .from('products')
        .update({ stock: supabase.rpc('decrement_stock', { 
          product_id: item.id, 
          amount: item.quantity 
        })})
        .eq('id', item.id);
      
      if (error) console.error('Erro ao atualizar estoque:', error);
    }

    // Criar Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: 'brl',
      metadata: { order_id: order.id },
      description: `Pedido #${order.id}`,
      shipping: {
        name: req.body.shippingInfo?.firstName + ' ' + req.body.shippingInfo?.lastName,
        address: {
          line1: address,
          postal_code: cep,
          city: req.body.shippingInfo?.city,
          state: req.body.shippingInfo?.state,
          country: 'BR'
        }
      }
    });

    res.json({ 
      success: true, 
      clientSecret: paymentIntent.client_secret,
      orderId: order.id 
    });

  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ 
      error: error.message || 'Erro no processamento do pedido' 
    });
  }
});

// Rotas de Admin
app.get('/api/admin/products', async (req, res) => {
  const { sessionId } = req.query;
  
  if (!sessions[sessionId]) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  
  const { data: user } = await supabase
    .from('users')
    .select('tipo')
    .eq('id', sessions[sessionId])
    .single();
  
  if (user.tipo !== 1) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  const { data: products, error } = await supabase
    .from('products')
    .select('*');
  
  if (error) {
    return res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
  
  res.json(products);
});

app.post('/api/admin/products', async (req, res) => {
  const { sessionId, product } = req.body;
  
  if (!sessions[sessionId]) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  
  const { data: user } = await supabase
    .from('users')
    .select('tipo')
    .eq('id', sessions[sessionId])
    .single();
  
  if (user.tipo !== 1) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  const { data: newProduct, error } = await supabase
    .from('products')
    .insert([product])
    .single();
  
  if (error) {
    return res.status(500).json({ error: 'Erro ao criar produto' });
  }
  
  res.json(newProduct);
});

app.put('/api/admin/products/:id', async (req, res) => {
  const { sessionId, product } = req.body;
  const { id } = req.params;
  
  if (!sessions[sessionId]) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  
  const { data: user } = await supabase
    .from('users')
    .select('tipo')
    .eq('id', sessions[sessionId])
    .single();
  
  if (user.tipo !== 1) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  const { data: updatedProduct, error } = await supabase
    .from('products')
    .update(product)
    .eq('id', id)
    .single();
  
  if (error) {
    return res.status(500).json({ error: 'Erro ao atualizar produto' });
  }
  
  res.json(updatedProduct);
});

app.delete('/api/admin/products/:id', async (req, res) => {
  const { sessionId } = req.body;
  const { id } = req.params;
  
  if (!sessions[sessionId]) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  
  const { data: user } = await supabase
    .from('users')
    .select('tipo')
    .eq('id', sessions[sessionId])
    .single();
  
  if (user.tipo !== 1) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  
  if (error) {
    return res.status(500).json({ error: 'Erro ao deletar produto' });
  }
  
  res.json({ success: true });
});

app.get('/api/admin/orders', async (req, res) => {
  const { sessionId } = req.query;
  
  if (!sessions[sessionId]) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  
  const { data: user } = await supabase
    .from('users')
    .select('tipo')
    .eq('id', sessions[sessionId])
    .single();
  
  if (user.tipo !== 1) {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    return res.status(500).json({ error: 'Erro ao buscar pedidos' });
  }
  
  res.json(orders);
});

// Função para cálculo de frete simplificado
app.get('/api/shipping/:cep', (req, res) => {
  const { cep } = req.params;
  
  // Simulação de cálculo de frete
  const shippingCost = 15.00; // Valor fixo para simplificação
  
  res.json({ cost: shippingCost });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Conectado ao Supabase em ${supabaseUrl}`);
});
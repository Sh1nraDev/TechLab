import http from 'http';
import fetch from 'node-fetch';
import { argv, exit } from 'process';

// ====== VARIABLES GLOBALES ======

const [,, method, resource, ...params] = argv;
const API_BASE_URL = 'https://fakestoreapi.com/products';

// ===== Función genérica para fetch =====
async function fetchAPI(endpoint = '/', options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('❌ Error al conectar con la API:', error.message);
  }
}

// ====== FUNCIONES CLI ======
async function getAllProducts() {
  const products = await fetchAPI('/');
  console.log('📦 Consultando todos los productos...\n', products);
}

async function getProductById(productId) {
  const product = await fetchAPI(`/${productId}`);
  console.log('🔍 Producto encontrado:\n', product);
}

async function createProduct(title, price, category) {
  const priceNumber = parseFloat(price);
  if (isNaN(priceNumber) || priceNumber <= 0) {
    console.error('❌ El precio debe ser válido.');
    exit(1);
  }

  const newProduct = {
    title,
    price: priceNumber,
    category,
    description: `Descripción del producto ${title}`,
    image: 'http://via.placeholder.com/640x480.png'
  };

  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newProduct)
  };

  const created = await fetchAPI('/', options);
  console.log('✅ Producto creado:', created);
}

async function deleteProduct(productId) {
  const options = { method: 'DELETE' };
  const deleted = await fetchAPI(`/${productId}`, options);
  console.log('🗑️ Producto eliminado:', deleted);
}

function showHelp() {
  console.log(`
┌────────────────────────────────────────────
    🛍️  GESTOR DE PRODUCTOS - FAKE STORE API 
└────────────────────────────────────────────┘

🌐 MODO SERVIDOR (GUI):
   npm run start
   → Inicia servidor web en http://localhost:3000

📋 MODO CLI - COMANDOS DISPONIBLES:

📦 Consultar todos los productos:
   → npm run start GET products

🔍 Consultar producto específico:
   → npm run start GET products/<id>

➕ Crear nuevo producto:
   → npm run start POST products <title> <price> <category>

🗑️ Eliminar producto:
   → npm run start DELETE products/<id>

❓ Ver esta ayuda:
   → npm run start "help" o "-h"
└────────────────────────────────────────────┘
  `);
}

// ====== PROCESAR COMANDOS CLI ======

async function processCommand() {
  // 1. Ayuda explícita tiene prioridad
  if (method === 'help' || method === '-h') {
    showHelp();
    exit(0); // Terminar después de mostrar ayuda
  }
  // 2. Sin argumentos: solo iniciar servidor (sin ayuda)
  if (!method || !resource) {
    console.log('🚀 Iniciando servidor web...');
    startServer();
    return;
  }

  const httpMethod = method.toUpperCase();

  switch (httpMethod) {
    case 'GET':
      if (resource.includes('/')) {
        const [, productId] = resource.split('/');
        await getProductById(productId);
      } else if (resource === 'products') {
        await getAllProducts();
      } else {
        console.error('❌ Recurso no válido.');
      }
      break;

    case 'POST':
      if (resource === 'products') {
        const [title, price, category] = params;
        if (!title || !price || !category) {
          console.error('❌ Faltan parámetros.');
          exit(1);
        }
        await createProduct(title, price, category);
      } else console.error('❌ Recurso no válido.');
      break;

    case 'DELETE':
      if (resource.includes('/')) {
        const [, productId] = resource.split('/');
        await deleteProduct(productId);
      } else {
        console.error('❌ Falta ID del producto.');
      }
      break;

    default:
      console.error(`❌ Método no soportado: ${httpMethod}`);
      showHelp(); // Mostrar ayuda cuando hay error
      exit(1); // Salir con código de error
  }
}

// ====== SERVIDOR WEB ======
function startServer() {
  const server = http.createServer(async (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
  
    try {
      // API endpoint para crear producto
      if (req.method === 'POST' && req.url === '/api/products') {
        let body = '';
        req.on('data', chunk => body += chunk.toString());
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            const newProduct = {
              title: data.title,
              price: parseFloat(data.price),
              category: data.category,
              description: data.description || `Descripción del producto ${data.title}`,
              image: data.image || 'https://via.placeholder.com/640x480.png'
            };
            
            const options = {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newProduct)
            };
            
            const created = await fetchAPI('/', options);
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(200);
            res.end(JSON.stringify(created));
          } catch (err) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: err.message }));
          }
        });
        return;
      }

      // API endpoint para eliminar producto
      if (req.method === 'DELETE' && req.url.startsWith('/api/products/')) {
        const id = req.url.split('/')[3];
        const options = { method: 'DELETE' };
        const deleted = await fetchAPI(`/${id}`, options);
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify(deleted));
        return;
      }

      // Página principal
      if (req.url === '/' || req.url === '/products') {
        const products = await fetchAPI('/');
        const html = `
          <html>
            <head>
              <title>FakeStore Products</title>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                * { box-sizing: border-box; }
                body { font-family: Arial, sans-serif; background: #121212; color: #eee; margin: 0; padding-bottom: 50px; }
                
                /* Header */
                header { background: #1e1e1e; padding: 20px; text-align: center; box-shadow: 0 2px 10px rgba(0,0,0,0.5); }
                h1 { margin: 0; }
                
                /* Formulario */
                .form-container { background: #1e1e1e; padding: 20px; margin: 20px auto; max-width: 800px; border-radius: 10px; }
                .form-container h2 { margin-top: 0; color: #00ffff; }
                .form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
                .form-group { display: flex; flex-direction: column; }
                label { margin-bottom: 5px; font-weight: bold; color: #aaa; }
                input, textarea, select { 
                  padding: 10px; 
                  border: 2px solid #333; 
                  background: #2a2a2a; 
                  color: #eee; 
                  border-radius: 5px; 
                  font-size: 14px;
                }
                input:focus, textarea:focus, select:focus { 
                  outline: none; 
                  border-color: #00ffff; 
                }
                textarea { resize: vertical; min-height: 80px; }
                .btn-submit { 
                  background: #00ffff; 
                  color: #000; 
                  padding: 12px 20px; 
                  border: none; 
                  border-radius: 5px; 
                  cursor: pointer; 
                  font-weight: bold; 
                  transition: 0.3s;
                  grid-column: 1 / -1;
                }
                .btn-submit:hover { background: #00bfbf; }
                .btn-submit:active { transform: scale(0.98); }
                
                /* Grid de productos */
                .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; padding: 20px; max-width: 1400px; margin: 0 auto; }
                .card { background: #1e1e1e; border-radius: 10px; padding: 15px; display: flex; flex-direction: column; transition: 0.3s; position: relative; }
                .card:hover { transform: scale(1.03); box-shadow: 0 5px 20px rgba(0,255,255,0.3); }
                
                .image-wrapper { height: 200px; display: flex; justify-content: center; align-items: center; margin-bottom: 10px; }
                img { width: 150px; height: 150px; object-fit: contain; }
                
                h3 { 
                  font-size: 16px; 
                  margin: 10px 0; 
                  min-height: 3em;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  display: -webkit-box;
                  -webkit-line-clamp: 2;
                  -webkit-box-orient: vertical;
                  line-height: 1.5em;
                }
                
                p { margin: 5px 0; }
                .price { font-weight: bold; color: #00ffff; font-size: 18px; }
                .category { color: #888; font-size: 13px; }
                
                .btn-group { display: flex; gap: 10px; margin-top: 10px; }
                .btn { 
                  flex: 1;
                  background: #00ffff; 
                  color: #000; 
                  padding: 8px 10px; 
                  border-radius: 5px; 
                  text-decoration: none; 
                  transition: 0.3s; 
                  text-align: center;
                  border: none;
                  cursor: pointer;
                  font-size: 14px;
                }
                .btn:hover { background: #00bfbf; }
                .btn-delete { background: #ff4444; color: white; }
                .btn-delete:hover { background: #cc0000; }
                
                /* Notificación */
                .notification {
                  position: fixed;
                  top: 20px;
                  right: 20px;
                  background: #00ffff;
                  color: #000;
                  padding: 15px 20px;
                  border-radius: 5px;
                  box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                  display: none;
                  z-index: 1000;
                  font-weight: bold;
                }
                .notification.show { display: block; animation: slideIn 0.3s ease; }
                @keyframes slideIn { from { transform: translateX(400px); } to { transform: translateX(0); } }
              </style>
            </head>
            <body>
              <header>
                <h1>🛍️ Fake Store Products</h1>
              </header>

              <div class="notification" id="notification"></div>

              <!-- Formulario para agregar productos -->
              <div class="form-container">
                <h2>➕ Agregar Nuevo Producto</h2>
                <form id="productForm" class="form-grid">
                  <div class="form-group">
                    <label>Título *</label>
                    <input type="text" id="title" required>
                  </div>
                  <div class="form-group">
                    <label>Precio *</label>
                    <input type="number" id="price" step="0.01" min="0.01" required>
                  </div>
                  <div class="form-group">
                    <label>Categoría *</label>
                    <select id="category" required>
                      <option value="">Seleccionar...</option>
                      <option value="electronics">Electronics</option>
                      <option value="jewelery">Jewelery</option>
                      <option value="men's clothing">Men's Clothing</option>
                      <option value="women's clothing">Women's Clothing</option>
                    </select>
                  </div>
                  <div class="form-group">
                    <label>URL de Imagen</label>
                    <input type="url" id="image" placeholder="https://ejemplo.com/imagen.jpg">
                  </div>
                  <div class="form-group" style="grid-column: 1 / -1;">
                    <label>Descripción</label>
                    <textarea id="description" placeholder="Descripción del producto..."></textarea>
                  </div>
                  <button type="submit" class="btn-submit">Crear Producto</button>
                </form>
              </div>

              <!-- Grid de productos -->
              <div class="grid">
                ${products.map(p => `
                  <div class="card" data-id="${p.id}">
                    <div class="image-wrapper">
                      <img src="${p.image}" alt="${p.title}">
                    </div>
                    <h3 title="${p.title}">${p.title}</h3>
                    <p class="category">${p.category}</p>
                    <p class="price">$${p.price}</p>
                    <div class="btn-group">
                      <a class="btn" href="/product/${p.id}">Ver más</a>
                      <button class="btn btn-delete" onclick="deleteProduct(${p.id})">Eliminar</button>
                    </div>
                  </div>
                `).join('')}
              </div>

              <script>
                function showNotification(message, isError = false) {
                  const notif = document.getElementById('notification');
                  notif.textContent = message;
                  notif.style.background = isError ? '#ff4444' : '#00ffff';
                  notif.style.color = isError ? '#fff' : '#000';
                  notif.classList.add('show');
                  setTimeout(() => notif.classList.remove('show'), 3000);
                }

                // Crear producto
                document.getElementById('productForm').addEventListener('submit', async (e) => {
                  e.preventDefault();
                  
                  const data = {
                    title: document.getElementById('title').value,
                    price: document.getElementById('price').value,
                    category: document.getElementById('category').value,
                    image: document.getElementById('image').value || 'https://via.placeholder.com/640x480.png',
                    description: document.getElementById('description').value || 'Sin descripción'
                  };

                  try {
                    const response = await fetch('/api/products', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(data)
                    });

                    if (response.ok) {
                      showNotification('✅ Producto creado exitosamente');
                      document.getElementById('productForm').reset();
                      setTimeout(() => location.reload(), 1500);
                    } else {
                      showNotification('❌ Error al crear el producto', true);
                    }
                  } catch (err) {
                    showNotification('❌ Error de conexión', true);
                  }
                });

                // Eliminar producto
                async function deleteProduct(id) {
                  if (!confirm('¿Estás seguro de eliminar este producto?')) return;

                  try {
                    const response = await fetch(\`/api/products/\${id}\`, {
                      method: 'DELETE'
                    });

                    if (response.ok) {
                      showNotification('🗑️ Producto eliminado');
                      document.querySelector(\`[data-id="\${id}"]\`).remove();
                    } else {
                      showNotification('❌ Error al eliminar', true);
                    }
                  } catch (err) {
                    showNotification('❌ Error de conexión', true);
                  }
                }
              </script>
            </body>
          </html>
        `;
        res.writeHead(200);
        res.end(html);

      } else if (req.url.startsWith('/product/')) {
        const id = req.url.split('/')[2];
        const product = await fetchAPI(`/${id}`);
        const html = `
          <html>
            <head>
              <title>${product.title}</title>
              <style>
                body { background: #121212; color: #eee; font-family: Arial; padding: 20px; }
                .container { max-width: 800px; margin: auto; background: #1e1e1e; padding: 30px; border-radius: 10px; }
                img { width: 100%; max-width: 400px; height: 400px; object-fit: contain; border-radius: 10px; display: block; margin: 20px auto; }
                h1 { color: #00ffff; }
                .info { margin: 20px 0; }
                .info p { margin: 10px 0; font-size: 16px; }
                .price { font-size: 28px; color: #00ffff; font-weight: bold; }
                .category { color: #888; text-transform: uppercase; }
                a { color: #00ffff; text-decoration: none; display: inline-block; margin-top: 20px; padding: 10px 20px; background: #2a2a2a; border-radius: 5px; }
                a:hover { background: #333; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>${product.title}</h1>
                <img src="${product.image}" alt="${product.title}" />
                <div class="info">
                  <p class="price">$${product.price}</p>
                  <p class="category">📦 ${product.category}</p>
                  <p>${product.description}</p>
                </div>
                <a href="/products">⬅️ Volver a productos</a>
              </div>
            </body>
          </html>
        `;
        res.writeHead(200);
        res.end(html);
      } else {
        res.writeHead(404);
        res.end('<h1>404 - Página no encontrada</h1>');
      }
    } catch (err) {
      res.writeHead(500);
      res.end(`<h1>Error del servidor:</h1><pre>${err.message}</pre>`);
    }
  });

  const PORT = 3000;
  server.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));
}
// ====== Ejecutar ======
processCommand();
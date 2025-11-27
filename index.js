const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- CONFIGURACIÓN BASE DE DATOS ---
const dbConfig = {
    host: process.env.DB_HOST || 'db',
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'Password123!',
    database: process.env.DB_NAME || 'pc4_db'
};

let db;
function connectWithRetry() {
    db = mysql.createConnection(dbConfig);
    db.connect(err => {
        if (err) {
            console.error('❌ Error BD, reintentando en 5s...', err.code);
            setTimeout(connectWithRetry, 5000);
            return;
        }
        console.log("✅ Conectado a BD:", dbConfig.host);
        
        const sql = `CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            secret VARCHAR(255) NOT NULL,
            fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;
        
        db.query(sql, (err) => {
            if (err) console.error('❌ Error creando tabla:', err);
            else console.log('✅ Tabla usuarios verificada/creada');
        });
    });
}
connectWithRetry();

// --- ESTILOS CSS COMPARTIDOS ---
const commonCSS = `
<style>
    @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600&display=swap');
    body { font-family: 'Poppins', sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; margin: 0; padding: 20px; box-sizing: border-box; }
    .card { background: white; padding: 40px 50px; border-radius: 20px; box-shadow: 0 15px 35px rgba(0,0,0,0.2); width: 100%; max-width: 450px; text-align: center; animation: fadeIn 0.5s ease-in-out; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
    h1 { color: #5B4B8A; margin-bottom: 10px; font-size: 26px; }
    p { color: #777; margin-bottom: 30px; font-size: 14px; }
    .form-group { margin-bottom: 20px; text-align: left; }
    label { display: block; color: #555; margin-bottom: 8px; font-weight: 600; font-size: 14px; }
    input { width: 100%; padding: 15px; border: 2px solid #eee; border-radius: 10px; box-sizing: border-box; transition: 0.3s; font-size: 16px; }
    input:focus { border-color: #667eea; outline: none; box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1); }
    button { width: 100%; padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 10px; font-weight: 600; font-size: 16px; cursor: pointer; transition: 0.3s; margin-top: 10px; }
    button:hover { transform: translateY(-3px); box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3); }
    .link-text { margin-top: 25px; font-size: 14px; color: #888; }
    .link-text a { color: #667eea; text-decoration: none; font-weight: 600; }
    .link-text a:hover { text-decoration: underline; }
    .footer { font-size: 12px; color: #aaa; margin-top: 30px; }
    .error-msg { background: #ffebee; color: #c62828; border-left: 4px solid #f44336; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; text-align: left; }
    .success-msg { background: #e8f5e9; color: #2e7d32; border-left: 4px solid #4CAF50; padding: 15px; border-radius: 8px; margin-bottom: 20px; font-size: 14px; }
    .qr-container img { border: 4px solid #667eea; border-radius: 12px; padding: 10px; background: white; max-width: 100%; }
</style>
`;

// --- RUTA RAÍZ (REDIRECCIÓN) ---
app.get('/', (req, res) => {
    res.redirect('/login');
});

// --- PÁGINA DE LOGIN (GET) ---
app.get('/login', (req, res) => {
    res.send(`
    <html><head><title>Iniciar Sesión</title>${commonCSS}</head><body>
        <div class="card">
            <h1>🚀 Iniciar Sesión</h1>
            <p>Ingresa tus credenciales y código 2FA</p>
            <form action="/login" method="POST">
                <div class="form-group"><label>👤 Usuario</label><input type="text" name="username" placeholder="Tu usuario" required></div>
                <div class="form-group"><label>🔑 Contraseña</label><input type="password" name="password" placeholder="Tu contraseña" required></div>
                <div class="form-group"><label>📱 Código Google Auth</label><input type="text" name="token" placeholder="Código de 6 dígitos" maxlength="6" pattern="[0-9]{6}" required></div>
                <button type="submit">Entrar al Sistema</button>
            </form>
            <div class="link-text">¿No tienes cuenta? <a href="/register">Regístrate aquí</a></div>
            <div class="footer">Desarrollado por Anjeli - PC4</div>
        </div>
    </body></html>`);
});

// --- PÁGINA DE REGISTRO (GET) ---
app.get('/register', (req, res) => {
    res.send(`
    <html><head><title>Crear Cuenta</title>${commonCSS}</head><body>
        <div class="card">
            <h1>📝 Crear Cuenta</h1>
            <p>Configura tu acceso seguro con 2FA</p>
            <form action="/register" method="POST">
                <div class="form-group"><label>👤 Usuario</label><input type="text" name="username" placeholder="Elige un usuario" required></div>
                <div class="form-group"><label>🔑 Contraseña</label><input type="password" name="password" placeholder="Crea una contraseña" required></div>
                <button type="submit" style="background: #4CAF50;">Registrarme</button>
            </form>
            <div class="link-text">¿Ya tienes cuenta? <a href="/login">Inicia sesión aquí</a></div>
            <div class="footer">Desarrollado por Anjeli - PC4</div>
        </div>
    </body></html>`);
});

// --- LÓGICA REGISTRO (POST) ---
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.send(renderError("Por favor completa todos los campos"));
    
    const secret = speakeasy.generateSecret({ name: `PC4-Anjeli-${username}`, length: 32 });
    
    db.query("INSERT INTO usuarios (username, password, secret) VALUES (?, ?, ?)", 
    [username, password, secret.base32], (err) => {
        if (err) {
            if (err.code === 'ER_DUP_ENTRY') return res.send(renderError("⚠️ El usuario ya existe. Intenta con otro."));
            return res.send(renderError("Error BD: " + err.message));
        }
        
        QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
            if (err) return res.send(renderError("Error generando QR"));
            res.send(`
            <html><head><title>Éxito</title>${commonCSS}</head><body>
                <div class="card">
                    <h1 style="color:#4CAF50;">🎉 ¡Registro Exitoso!</h1>
                    <div class="success-msg">Usuario creado en Base de Datos AWS RDS.</div>
                    <p><strong>1. Escanea este código con Google Authenticator:</strong></p>
                    <div class="qr-container"><img src="${data_url}"></div>
                    <br>
                    <p><strong>2. Luego inicia sesión:</strong></p>
                    <a href="/login"><button>Ir a Iniciar Sesión</button></a>
                </div>
            </body></html>`);
        });
    });
});

// --- LÓGICA LOGIN (POST) ---
app.post('/login', (req, res) => {
    const { username, password, token } = req.body;
    if (!username || !password || !token) return res.send(renderError("Faltan datos"));
    
    db.query("SELECT * FROM usuarios WHERE username = ? AND password = ?", [username, password], (err, results) => {
        if (err) return res.send(renderError("Error BD: " + err.message));
        if (results.length === 0) return res.send(renderError("❌ Usuario o contraseña incorrectos"));
        
        const user = results[0];
        const verified = speakeasy.totp.verify({ secret: user.secret, encoding: 'base32', token: token, window: 2 });
        
        if (verified) {
            res.send(successPage(user));
        } else {
            res.send(renderError("❌ Código 2FA incorrecto. Verifica tu celular."));
        }
    });
});

// --- PÁGINA ÉXITO (DASHBOARD) ---
function successPage(user) {
    const now = new Date();
    return `
    <html><head><title>Bienvenido</title>${commonCSS}</head><body>
        <div class="card">
            <h1>🎉 ¡Bienvenido, ${user.username}!</h1>
            <div class="success-msg">Autenticación de 2 Factores Correcta</div>
            
            <div style="background:#f1f1f1; padding:15px; border-radius:10px; text-align:left; margin:20px 0;">
                <p style="margin:5px 0"><strong>🆔 ID Usuario:</strong> #${user.id}</p>
                <p style="margin:5px 0"><strong>📅 Registro:</strong> ${new Date(user.fecha_registro).toLocaleDateString()}</p>
                <p style="margin:5px 0"><strong>⏰ Hora Acceso:</strong> ${now.toLocaleTimeString()}</p>
                <p style="margin:5px 0"><strong>☁️ Fuente:</strong> AWS RDS MySQL</p>
            </div>
            
            <a href="/login"><button style="background:#555;">Cerrar Sesión</button></a>
        </div>
    </body></html>`;
}

// --- PÁGINA ERROR ---
function renderError(msg) {
    return `<html><head><title>Error</title>${commonCSS}</head><body>
        <div class="card">
            <h1 style="color:#f44336;">⚠️ Error</h1>
            <div class="error-msg">${msg}</div>
            <a href="/login"><button>Volver a intentar</button></a>
        </div>
    </body></html>`;
}

app.listen(3000, () => console.log('🚀 Server on port 3000'));
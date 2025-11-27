const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuración flexible (Local o RDS)
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
        console.log("✅ Conectado a BD");
        const sql = `CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255), password VARCHAR(255), secret VARCHAR(255))`;
        db.query(sql);
    });
}
connectWithRetry();

// --- RUTAS HTML (Frontend) ---
app.get('/', (req, res) => {
    res.send(`
    <html><body style="font-family:sans-serif; text-align:center; padding:50px; background:#f0f2f5;">
        <h1>🔐 PC4: Autenticación 2FA</h1>
        <div style="background:white; padding:20px; border-radius:10px; max-width:400px; margin:auto; box-shadow:0 10px 25px rgba(0,0,0,0.1);">
            <h2>Registrarse</h2>
            <form action="/register" method="POST">
                <input type="text" name="username" placeholder="Usuario" required style="padding:10px; width:90%; margin:5px;"><br>
                <input type="password" name="password" placeholder="Contraseña" required style="padding:10px; width:90%; margin:5px;"><br>
                <button type="submit" style="padding:10px 20px; background:#4CAF50; color:white; border:none; cursor:pointer;">Registrar</button>
            </form>
            <hr>
            <h2>Iniciar Sesión</h2>
            <form action="/login" method="POST">
                <input type="text" name="username" placeholder="Usuario" required style="padding:10px; width:90%; margin:5px;"><br>
                <input type="password" name="password" placeholder="Contraseña" required style="padding:10px; width:90%; margin:5px;"><br>
                <input type="text" name="token" placeholder="Código Google Auth (6 dígitos)" required style="padding:10px; width:90%; margin:5px;"><br>
                <button type="submit" style="padding:10px 20px; background:#008CBA; color:white; border:none; cursor:pointer;">Entrar</button>
            </form>
        </div>
    </body></html>`);
});

// --- LÓGICA ---
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const secret = speakeasy.generateSecret({ name: `PC4-Anjeli-${username}` });
    
    db.query("INSERT INTO users (username, password, secret) VALUES (?, ?, ?)", 
    [username, password, secret.base32], (err) => {
        if (err) return res.send("Error: " + err.message);
        QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
            res.send(`
                <div style="text-align:center; font-family:sans-serif;">
                    <h2>✅ Usuario Creado</h2>
                    <p>Escanea este QR con Google Authenticator:</p>
                    <img src="${data_url}"><br>
                    <a href="/">Volver al Inicio</a>
                </div>`);
        });
    });
});

app.post('/login', (req, res) => {
    const { username, password, token } = req.body;
    db.query("SELECT * FROM users WHERE username = ? AND password = ?", [username, password], (err, results) => {
        if (results.length === 0) return res.send("❌ Credenciales incorrectas");
        
        const verified = speakeasy.totp.verify({
            secret: results[0].secret, encoding: 'base32', token: token, window: 2
        });
        
        if (verified) res.send("<h1 style='color:green; text-align:center;'>🎉 LOGIN EXITOSO: 2FA Correcto</h1>");
        else res.send("<h1 style='color:red; text-align:center;'>❌ CÓDIGO 2FA INCORRECTO</h1>");
    });
});

app.listen(3000, () => console.log('🚀 Server on port 3000'));
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
        console.log("✅ Conectado a BD:", dbConfig.host);

        // Crear tabla de usuarios si no existe
        const sql = `CREATE TABLE IF NOT EXISTS usuarios (
            id INT AUTO_INCREMENT PRIMARY KEY,
            username VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            secret VARCHAR(255) NOT NULL,
            fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`;

        db.query(sql, (err) => {
            if (err) {
                console.error('❌ Error creando tabla:', err);
            } else {
                console.log('✅ Tabla usuarios verificada/creada');
            }
        });
    });
}
connectWithRetry();

// --- PÁGINA PRINCIPAL ---
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PC4: Autenticación 2FA - Anjeli</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                min-height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 20px;
            }
            
            .container {
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                max-width: 450px;
                width: 100%;
                overflow: hidden;
            }
            
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 30px;
                text-align: center;
            }
            
            .header h1 {
                font-size: 28px;
                margin-bottom: 10px;
            }
            
            .header .subtitle {
                font-size: 14px;
                opacity: 0.9;
            }
            
            .lock-icon {
                font-size: 50px;
                margin-bottom: 10px;
            }
            
            .content {
                padding: 40px;
            }
            
            .form-section {
                margin-bottom: 40px;
            }
            
            .form-section:last-child {
                margin-bottom: 0;
            }
            
            .form-section h2 {
                color: #333;
                font-size: 22px;
                margin-bottom: 20px;
                text-align: center;
            }
            
            .form-group {
                margin-bottom: 20px;
            }
            
            .form-group label {
                display: block;
                color: #555;
                font-size: 14px;
                margin-bottom: 8px;
                font-weight: 500;
            }
            
            .form-group input {
                width: 100%;
                padding: 12px 15px;
                border: 2px solid #e0e0e0;
                border-radius: 8px;
                font-size: 15px;
                transition: all 0.3s;
            }
            
            .form-group input:focus {
                outline: none;
                border-color: #667eea;
                box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
            }
            
            .btn {
                width: 100%;
                padding: 14px;
                border: none;
                border-radius: 8px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
            }
            
            .btn-register {
                background: #4CAF50;
                color: white;
            }
            
            .btn-register:hover {
                background: #45a049;
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(76, 175, 80, 0.3);
            }
            
            .btn-login {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
            }
            
            .btn-login:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
            }
            
            .divider {
                height: 1px;
                background: linear-gradient(to right, transparent, #e0e0e0, transparent);
                margin: 40px 0;
            }
            
            .info-box {
                background: #f8f9fa;
                border-left: 4px solid #667eea;
                padding: 15px;
                border-radius: 5px;
                margin-bottom: 20px;
                font-size: 13px;
                color: #555;
            }
            
            .footer {
                background: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 12px;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="lock-icon">🔐</div>
                <h1>Autenticación 2FA</h1>
                <div class="subtitle">Sistema Seguro con Google Authenticator - PC4 Anjeli</div>
            </div>
            
            <div class="content">
                <!-- REGISTRO -->
                <div class="form-section">
                    <h2>📝 Crear Cuenta</h2>
                    <div class="info-box">
                        💡 Al registrarte, recibirás un código QR para configurar Google Authenticator
                    </div>
                    <form action="/register" method="POST">
                        <div class="form-group">
                            <label>👤 Usuario</label>
                            <input type="text" name="username" placeholder="Ingresa tu usuario" required>
                        </div>
                        <div class="form-group">
                            <label>🔑 Contraseña</label>
                            <input type="password" name="password" placeholder="Ingresa tu contraseña" required>
                        </div>
                        <button type="submit" class="btn btn-register">Registrar Cuenta</button>
                    </form>
                </div>
                
                <div class="divider"></div>
                
                <!-- LOGIN -->
                <div class="form-section">
                    <h2>🚀 Iniciar Sesión</h2>
                    <div class="info-box">
                        🔒 Ingresa tu usuario, contraseña y el código de 6 dígitos de Google Authenticator
                    </div>
                    <form action="/login" method="POST">
                        <div class="form-group">
                            <label>👤 Usuario</label>
                            <input type="text" name="username" placeholder="Tu usuario" required>
                        </div>
                        <div class="form-group">
                            <label>🔑 Contraseña</label>
                            <input type="password" name="password" placeholder="Tu contraseña" required>
                        </div>
                        <div class="form-group">
                            <label>📱 Código 2FA</label>
                            <input type="text" name="token" placeholder="Código de 6 dígitos" maxlength="6" pattern="[0-9]{6}" required>
                        </div>
                        <button type="submit" class="btn btn-login">Iniciar Sesión</button>
                    </form>
                </div>
            </div>
            
            <div class="footer">
                🛡️ Sistema de Autenticación de Dos Factores<br>
                Desarrollado por Anjeli - PC4
            </div>
        </div>
    </body>
    </html>`);
});

// --- REGISTRO ---
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.send(errorPage("Por favor completa todos los campos"));
    }

    const secret = speakeasy.generateSecret({
        name: `PC4-Anjeli-${username}`,
        length: 32
    });

    // Usar la tabla 'usuarios' en lugar de 'users'
    db.query("INSERT INTO usuarios (username, password, secret) VALUES (?, ?, ?)",
        [username, password, secret.base32], (err) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.send(errorPage("⚠️ Este usuario ya existe. Por favor elige otro nombre."));
                }
                console.error('Error al registrar:', err);
                return res.send(errorPage("Error al crear el usuario: " + err.message));
            }

            QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
                if (err) {
                    return res.send(errorPage("Error generando código QR"));
                }

                res.send(`
                <!DOCTYPE html>
                <html lang="es">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Registro Exitoso</title>
                    <style>
                        body {
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            min-height: 100vh;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            padding: 20px;
                        }
                        .success-container {
                            background: white;
                            border-radius: 20px;
                            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                            max-width: 500px;
                            width: 100%;
                            padding: 40px;
                            text-align: center;
                        }
                        .success-icon {
                            font-size: 60px;
                            margin-bottom: 20px;
                        }
                        h2 {
                            color: #4CAF50;
                            margin-bottom: 20px;
                        }
                        .instructions {
                            background: #f0f8ff;
                            border-left: 4px solid #2196F3;
                            padding: 20px;
                            margin: 20px 0;
                            text-align: left;
                            border-radius: 5px;
                        }
                        .instructions h3 {
                            color: #2196F3;
                            margin-bottom: 15px;
                        }
                        .instructions ol {
                            margin-left: 20px;
                        }
                        .instructions li {
                            margin-bottom: 10px;
                            line-height: 1.6;
                        }
                        .qr-container {
                            margin: 30px 0;
                            padding: 20px;
                            background: #f8f9fa;
                            border-radius: 10px;
                        }
                        .qr-container img {
                            max-width: 250px;
                            border: 3px solid #667eea;
                            border-radius: 10px;
                            padding: 10px;
                            background: white;
                        }
                        .btn-home {
                            display: inline-block;
                            padding: 15px 40px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            text-decoration: none;
                            border-radius: 8px;
                            font-weight: 600;
                            margin-top: 20px;
                            transition: all 0.3s;
                        }
                        .btn-home:hover {
                            transform: translateY(-2px);
                            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
                        }
                        .user-info {
                            background: #e8f5e9;
                            padding: 15px;
                            border-radius: 8px;
                            margin: 20px 0;
                        }
                        .user-info strong {
                            color: #2e7d32;
                        }
                    </style>
                </head>
                <body>
                    <div class="success-container">
                        <div class="success-icon">✅</div>
                        <h2>¡Registro Exitoso!</h2>
                        
                        <div class="user-info">
                            👤 Usuario creado: <strong>${username}</strong>
                        </div>
                        
                        <div class="instructions">
                            <h3>📱 Configura Google Authenticator:</h3>
                            <ol>
                                <li>Descarga <strong>Google Authenticator</strong> en tu móvil</li>
                                <li>Abre la app y toca el botón <strong>"+"</strong></li>
                                <li>Selecciona <strong>"Escanear código QR"</strong></li>
                                <li>Escanea el código QR que aparece abajo</li>
                                <li>¡Listo! Ahora puedes iniciar sesión con 2FA</li>
                            </ol>
                        </div>
                        
                        <div class="qr-container">
                            <p style="margin-bottom: 15px; color: #555;">
                                <strong>Escanea este código QR:</strong>
                            </p>
                            <img src="${data_url}" alt="QR Code">
                        </div>
                        
                        <a href="/" class="btn-home">🏠 Volver al Inicio</a>
                    </div>
                </body>
                </html>
            `);
            });
        });
});

// --- LOGIN ---
app.post('/login', (req, res) => {
    const { username, password, token } = req.body;

    if (!username || !password || !token) {
        return res.send(errorPage("Por favor completa todos los campos"));
    }

    // Usar la tabla 'usuarios' en lugar de 'users'
    db.query("SELECT * FROM usuarios WHERE username = ? AND password = ?",
        [username, password], (err, results) => {
            if (err) {
                console.error('Error en login:', err);
                return res.send(errorPage("Error en la consulta: " + err.message));
            }

            if (results.length === 0) {
                return res.send(errorPage("❌ Usuario o contraseña incorrectos"));
            }

            const user = results[0];
            const verified = speakeasy.totp.verify({
                secret: user.secret,
                encoding: 'base32',
                token: token,
                window: 2
            });

            if (verified) {
                res.send(successPage(user));
            } else {
                res.send(errorPage("❌ Código 2FA incorrecto. Verifica el código en Google Authenticator."));
            }
        });
});

// --- PÁGINAS DE RESPUESTA ---
function successPage(user) {
    const now = new Date();
    return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Login Exitoso</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .success-container {
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    max-width: 600px;
                    width: 100%;
                    padding: 50px;
                    text-align: center;
                    animation: slideIn 0.5s ease-out;
                }
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-30px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .success-icon {
                    font-size: 80px;
                    margin-bottom: 20px;
                    animation: bounce 0.6s ease-in-out;
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-20px); }
                }
                h1 {
                    color: #11998e;
                    margin-bottom: 20px;
                    font-size: 32px;
                }
                .user-card {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    border-radius: 15px;
                    margin: 30px 0;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                }
                .user-card h2 {
                    margin-bottom: 20px;
                    font-size: 24px;
                }
                .info-grid {
                    display: grid;
                    gap: 15px;
                    text-align: left;
                    background: rgba(255,255,255,0.1);
                    padding: 20px;
                    border-radius: 10px;
                }
                .info-item {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 16px;
                }
                .info-item span {
                    font-weight: 600;
                }
                .security-badge {
                    background: #4CAF50;
                    color: white;
                    padding: 15px 30px;
                    border-radius: 50px;
                    display: inline-block;
                    margin: 20px 0;
                    font-weight: 600;
                    font-size: 18px;
                }
                .btn-home {
                    display: inline-block;
                    padding: 15px 40px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    margin-top: 20px;
                    transition: all 0.3s;
                }
                .btn-home:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
                }
                .stats {
                    display: flex;
                    justify-content: space-around;
                    margin-top: 30px;
                    padding-top: 30px;
                    border-top: 2px solid #e0e0e0;
                }
                .stat-item {
                    text-align: center;
                }
                .stat-value {
                    font-size: 32px;
                    font-weight: bold;
                    color: #667eea;
                }
                .stat-label {
                    font-size: 14px;
                    color: #666;
                    margin-top: 5px;
                }
            </style>
        </head>
        <body>
            <div class="success-container">
                <div class="success-icon">🎉</div>
                <h1>¡Autenticación Exitosa!</h1>
                
                <div class="security-badge">
                    🔒 Sesión Segura con 2FA
                </div>
                
                <div class="user-card">
                    <h2>👤 Información del Usuario</h2>
                    <div class="info-grid">
                        <div class="info-item">
                            <span>Usuario:</span> ${user.username}
                        </div>
                        <div class="info-item">
                            <span>ID:</span> #${user.id}
                        </div>
                        <div class="info-item">
                            <span>Fecha de registro:</span> ${new Date(user.fecha_registro).toLocaleDateString('es-PE')}
                        </div>
                        <div class="info-item">
                            <span>Hora de acceso:</span> ${now.toLocaleTimeString('es-PE')}
                        </div>
                        <div class="info-item">
                            <span>Fecha:</span> ${now.toLocaleDateString('es-PE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })}
                        </div>
                    </div>
                </div>
                
                <div class="stats">
                    <div class="stat-item">
                        <div class="stat-value">✓</div>
                        <div class="stat-label">2FA Verificado</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">🔐</div>
                        <div class="stat-label">Conexión Segura</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">✅</div>
                        <div class="stat-label">Acceso Autorizado</div>
                    </div>
                </div>
                
                <a href="/" class="btn-home">🏠 Volver al Inicio</a>
            </div>
        </body>
        </html>
    `;
}

function errorPage(message) {
    return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                    min-height: 100vh;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    padding: 20px;
                }
                .error-container {
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    max-width: 500px;
                    width: 100%;
                    padding: 50px;
                    text-align: center;
                }
                .error-icon {
                    font-size: 80px;
                    margin-bottom: 20px;
                }
                h1 {
                    color: #f5576c;
                    margin-bottom: 20px;
                }
                .error-message {
                    background: #ffebee;
                    border-left: 4px solid #f5576c;
                    padding: 20px;
                    margin: 20px 0;
                    text-align: left;
                    border-radius: 5px;
                    color: #c62828;
                }
                .btn-home {
                    display: inline-block;
                    padding: 15px 40px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: 600;
                    margin-top: 20px;
                    transition: all 0.3s;
                }
                .btn-home:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
                }
            </style>
        </head>
        <body>
            <div class="error-container">
                <div class="error-icon">⚠️</div>
                <h1>Error de Autenticación</h1>
                <div class="error-message">
                    ${message}
                </div>
                <a href="/" class="btn-home">🏠 Intentar de Nuevo</a>
            </div>
        </body>
        </html>
    `;
}

app.listen(3000, () => console.log('🚀 Server on port 3000'));
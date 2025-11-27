# PC4 - Desarrollo de Soluciones en la Nube ☁️

**Estudiante:** Anjeli Sahori Verastigue Tejeda  
**Curso:** Computación en la Nube  
**Sección:** A  
**Fecha:** 26/11/2025

---

## 📋 Descripción del Proyecto
Aplicación web desplegada en la nube de AWS que implementa un sistema seguro de autenticación. El sistema permite el registro y login de usuarios utilizando **Autenticación de Doble Factor (2FA)** mediante Google Authenticator.

La infraestructura cumple con los requisitos de Alta Disponibilidad y desacoplamiento:
* **App:** Contenerizada en Docker corriendo en EC2.
* **Base de Datos:** Separada y gestionada en AWS RDS (MySQL).
* **Infraestructura:** Aprovisionada mediante código (IaC) con AWS CloudFormation.

## 🛠️ Arquitectura y Tecnologías

* **Lenguaje:** Node.js (Express Framework).
* **Base de Datos:** AWS RDS MySQL (Capa Gratuita).
* **Infraestructura:** AWS EC2 (Ubuntu) + CloudFormation.
* **Contenedores:** Docker y Docker Compose.
* **Seguridad:** Librería `speakeasy` (TOTP) y `qrcode`.

---

## 🚀 Pasos de Instalación y Despliegue

### 1. Infraestructura (CloudFormation)
Se utilizó el archivo `ec2-template.yaml` incluido en este repositorio para crear la pila (stack) en AWS, la cual provisiona:
* Instancia EC2 (Ubuntu Server).
* Security Groups (Puertos 22 y 3000 abiertos).
* Instalación automática de Docker y Git (User Data).

### 2. Configuración de Base de Datos (RDS)
La aplicación se conecta a una instancia RDS MySQL en la región `us-east-2` (Ohio).
* **Endpoint:** `pc4-db.cz4kogg2gqn4.us-east-2.rds.amazonaws.com`
* **Puerto:** 3306
* **Tabla:** `usuarios` (Se genera automáticamente al iniciar la app).

### 3. Ejecución de la Aplicación (En EC2)

Para desplegar la aplicación en la instancia EC2, siga estos pasos:

1. **Conectarse vía SSH:**
   ```bash
   ssh -i "tu-llave.pem" ubuntu@TU_IP_PUBLICA
````

2.  **Clonar el repositorio:**

    ```bash
    git clone [https://github.com/Anjelisahori/PC4-NUBE.git](https://github.com/Anjelisahori/PC4-NUBE.git)
    cd PC4-NUBE
    ```

3.  **Levantar los contenedores con Docker Compose:**
    La aplicación ya tiene configurada la conexión a RDS internamente. Solo es necesario construir y levantar el servicio:

    ```bash
    # Construir sin caché para asegurar la última versión
    sudo docker-compose build --no-cache

    # Levantar en segundo plano
    sudo docker-compose up -d
    ```

4.  **Verificar despliegue:**

    ```bash
    sudo docker ps
    ```

-----

## 🌐 Uso de la Aplicación

Una vez desplegada, la aplicación es accesible desde el navegador:

**URL:** `http://TU_IP_PUBLICA_EC2:3000`

1.  **Registro (`/register`):** Ingrese usuario y contraseña. Escanee el código QR generado con la app **Google Authenticator** en su celular.
2.  **Login (`/login`):** Ingrese sus credenciales y el código de 6 dígitos que genera su celular.
3.  **Dashboard:** Si el código es correcto, verá una pantalla de éxito mostrando los datos recuperados directamente desde **AWS RDS**.

-----

## 📂 Estructura de Archivos

  * `index.js`: Lógica del servidor, conexión a RDS y manejo de rutas/vistas.
  * `Dockerfile`: Instrucciones para crear la imagen de la aplicación (Node.js Alpine).
  * `docker-compose.yml`: Orquestación del servicio para facilitar el despliegue.
  * `ec2-template.yaml`: Plantilla de CloudFormation para la infraestructura.
  * `package.json`: Dependencias del proyecto.

-----

```

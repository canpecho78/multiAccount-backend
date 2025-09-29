# Sistema de Gestión de Contraseñas

## 📋 Resumen

Sistema completo de gestión de contraseñas con 4 funcionalidades principales:
1. **Forgot Password** - Usuario solicita reseteo
2. **Reset Password** - Usuario resetea con token
3. **Admin Reset Password** - Admin resetea a password por defecto
4. **Change Password** - Usuario cambia su propia password

---

## 🔐 Endpoints

### 1. Forgot Password (Solicitar Reseteo)

**Endpoint:** `POST /api/auth/forgot-password`

**Descripción:** Usuario solicita resetear su contraseña. Genera un token válido por 1 hora.

**Request:**
```json
{
  "email": "usuario@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Si el email existe, recibirás instrucciones para resetear tu contraseña",
  "resetToken": "abc123..." // SOLO en desarrollo
}
```

**Características:**
- ✅ No revela si el email existe (seguridad)
- ✅ Token válido por 1 hora
- ✅ Token hasheado en base de datos
- ✅ En desarrollo, devuelve el token en la respuesta
- ✅ En producción, se enviaría por email (TODO)

---

### 2. Reset Password (Resetear con Token)

**Endpoint:** `POST /api/auth/reset-password`

**Descripción:** Usuario resetea su contraseña usando el token recibido.

**Request:**
```json
{
  "token": "abc123...",
  "newPassword": "NuevaPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contraseña actualizada correctamente"
}
```

**Validaciones:**
- ✅ Token debe ser válido
- ✅ Token no debe estar expirado
- ✅ Nueva contraseña mínimo 6 caracteres
- ✅ Token se elimina después de usar

---

### 3. Admin Reset Password (Admin Resetea)

**Endpoint:** `POST /api/auth/admin/reset-password/:userId`

**Descripción:** Admin resetea la contraseña de un usuario a una por defecto.

**Autenticación:** Requiere JWT con rol `administrator`

**Request:**
```json
{
  "defaultPassword": "TempPassword123!" // Opcional, por defecto usa este
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contraseña reseteada correctamente",
  "data": {
    "userId": "507f1f77bcf86cd799439011",
    "email": "usuario@example.com",
    "defaultPassword": "TempPassword123!"
  }
}
```

**Características:**
- ✅ Solo admin puede ejecutar
- ✅ Devuelve la contraseña temporal
- ✅ Usuario debe cambiarla después
- ✅ Limpia tokens de reseteo previos

**Uso típico:**
1. Admin resetea password de usuario
2. Admin comunica password temporal al usuario
3. Usuario inicia sesión con password temporal
4. Usuario cambia su password usando `/change-password`

---

### 4. Change Password (Cambiar Propia Password)

**Endpoint:** `POST /api/auth/change-password`

**Descripción:** Usuario autenticado cambia su propia contraseña.

**Autenticación:** Requiere JWT (cualquier usuario autenticado)

**Request:**
```json
{
  "currentPassword": "PasswordActual123!",
  "newPassword": "NuevaPassword456!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Contraseña actualizada correctamente"
}
```

**Validaciones:**
- ✅ Usuario debe estar autenticado
- ✅ Contraseña actual debe ser correcta
- ✅ Nueva contraseña mínimo 6 caracteres
- ✅ Nueva contraseña debe ser diferente

---

## 🗄 Modelo de Datos

### User Model (Actualizado)

```typescript
{
  name: string;
  email: string;
  passwordHash: string;
  role: ObjectId;
  active: boolean;
  
  // Nuevos campos para reseteo
  resetPasswordToken?: string;      // Token hasheado
  resetPasswordExpiry?: Date;       // Fecha de expiración
  
  createdAt: Date;
  updatedAt: Date;
}
```

---

## 🔄 Flujos de Trabajo

### Flujo 1: Usuario Olvidó su Contraseña

```
1. Usuario → POST /api/auth/forgot-password
   Body: { email: "user@example.com" }
   
2. Sistema:
   - Genera token aleatorio
   - Hashea el token
   - Guarda hash en DB con expiración (1 hora)
   - [TODO] Envía email con token
   - En dev: Devuelve token en respuesta
   
3. Usuario recibe token (por email o respuesta)

4. Usuario → POST /api/auth/reset-password
   Body: { token: "abc123...", newPassword: "Nueva123!" }
   
5. Sistema:
   - Valida token
   - Verifica que no esté expirado
   - Actualiza contraseña
   - Limpia token de DB
   
6. Usuario puede iniciar sesión con nueva contraseña
```

### Flujo 2: Admin Resetea Contraseña

```
1. Admin → POST /api/auth/admin/reset-password/USER_ID
   Headers: Authorization: Bearer ADMIN_TOKEN
   Body: { defaultPassword: "Temp123!" } // Opcional
   
2. Sistema:
   - Verifica que usuario sea admin
   - Resetea contraseña del usuario
   - Devuelve contraseña temporal
   
3. Admin comunica contraseña temporal al usuario

4. Usuario inicia sesión con contraseña temporal

5. Usuario → POST /api/auth/change-password
   Headers: Authorization: Bearer USER_TOKEN
   Body: {
     currentPassword: "Temp123!",
     newPassword: "MiNuevaPassword456!"
   }
   
6. Sistema actualiza contraseña
```

### Flujo 3: Usuario Cambia su Contraseña

```
1. Usuario autenticado → POST /api/auth/change-password
   Headers: Authorization: Bearer USER_TOKEN
   Body: {
     currentPassword: "Actual123!",
     newPassword: "Nueva456!"
   }
   
2. Sistema:
   - Verifica JWT
   - Valida contraseña actual
   - Actualiza a nueva contraseña
   
3. Usuario continúa con su sesión actual
```

---

## 🔒 Seguridad

### Buenas Prácticas Implementadas

1. **Tokens Hasheados**
   - Los tokens de reseteo se hashean antes de guardar en DB
   - Usa bcrypt para hashing

2. **Expiración de Tokens**
   - Tokens válidos por 1 hora solamente
   - Se verifican antes de usar

3. **No Revelar Información**
   - `/forgot-password` no revela si el email existe
   - Siempre devuelve el mismo mensaje

4. **Validación de Contraseñas**
   - Mínimo 6 caracteres
   - Se valida contraseña actual antes de cambiar

5. **Limpieza de Tokens**
   - Tokens se eliminan después de usar
   - Tokens se eliminan al resetear por admin

6. **Roles y Permisos**
   - Admin reset solo para administradores
   - Change password solo para usuarios autenticados

---

## 📝 Ejemplos de Uso

### Ejemplo 1: Usuario Olvidó Contraseña (cURL)

```bash
# 1. Solicitar reseteo
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@example.com"}'

# Respuesta (desarrollo):
# {
#   "success": true,
#   "message": "Si el email existe...",
#   "resetToken": "abc123def456..."
# }

# 2. Resetear con token
curl -X POST http://localhost:5000/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token":"abc123def456...",
    "newPassword":"NuevaPassword123!"
  }'
```

### Ejemplo 2: Admin Resetea Usuario

```bash
# Admin resetea contraseña
curl -X POST http://localhost:5000/api/auth/admin/reset-password/USER_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{"defaultPassword":"Temporal123!"}'

# Respuesta:
# {
#   "success": true,
#   "message": "Contraseña reseteada correctamente",
#   "data": {
#     "userId": "...",
#     "email": "usuario@example.com",
#     "defaultPassword": "Temporal123!"
#   }
# }
```

### Ejemplo 3: Usuario Cambia Contraseña

```bash
curl -X POST http://localhost:5000/api/auth/change-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_JWT_TOKEN" \
  -d '{
    "currentPassword":"Temporal123!",
    "newPassword":"MiNuevaPassword456!"
  }'
```

---

## 🚀 TODO / Mejoras Futuras

### Integración de Email

```typescript
// En forgotPassword()
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

await transporter.sendMail({
  from: "noreply@tuapp.com",
  to: user.email,
  subject: "Resetear Contraseña",
  html: `
    <p>Haz clic en el siguiente enlace para resetear tu contraseña:</p>
    <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">
      Resetear Contraseña
    </a>
    <p>Este enlace expira en 1 hora.</p>
  `
});
```

### Mejoras Adicionales

- [ ] Rate limiting en `/forgot-password` (prevenir spam)
- [ ] Historial de cambios de contraseña
- [ ] Política de contraseñas más estricta
- [ ] Notificación por email al cambiar contraseña
- [ ] 2FA (autenticación de dos factores)
- [ ] Bloqueo de cuenta después de X intentos fallidos
- [ ] Contraseñas temporales con expiración forzada

---

## 🧪 Testing

### Casos de Prueba

1. **Forgot Password**
   - ✅ Email válido genera token
   - ✅ Email inválido no revela que no existe
   - ✅ Token se guarda hasheado en DB
   - ✅ Token expira después de 1 hora

2. **Reset Password**
   - ✅ Token válido permite resetear
   - ✅ Token expirado es rechazado
   - ✅ Token inválido es rechazado
   - ✅ Contraseña muy corta es rechazada
   - ✅ Token se elimina después de usar

3. **Admin Reset**
   - ✅ Solo admin puede ejecutar
   - ✅ Usuario no admin es rechazado
   - ✅ Devuelve contraseña temporal
   - ✅ Limpia tokens previos

4. **Change Password**
   - ✅ Requiere autenticación
   - ✅ Contraseña actual incorrecta es rechazada
   - ✅ Nueva contraseña muy corta es rechazada
   - ✅ Contraseña se actualiza correctamente

---

## 📊 Métricas

Considerar trackear:
- Número de solicitudes de reseteo por día
- Tasa de éxito de reseteos
- Tiempo promedio entre solicitud y reseteo
- Número de reseteos por admin
- Frecuencia de cambios de contraseña por usuario

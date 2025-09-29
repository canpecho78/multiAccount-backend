# Configuración SMTP para Envío de Emails

## 📧 Resumen

El sistema utiliza **nodemailer** para enviar emails de:
- 🔑 Reseteo de contraseña (forgot password)
- ✅ Confirmación de cambio de contraseña
- 🔐 Contraseña temporal (admin reset)

---

## 🔧 Configuración

### Variables de Entorno

Agrega estas variables a tu archivo `.env`:

```bash
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
SMTP_FROM_EMAIL=noreply@tudominio.com
SMTP_FROM_NAME=WhatsApp Multi-Sesiones

# Frontend URL (para enlaces en emails)
FRONTEND_URL=http://localhost:3000
```

---

## 📮 Proveedores SMTP Populares

### 1. Gmail

**Configuración:**
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
```

**Pasos para obtener App Password:**

1. Ve a tu cuenta de Google: https://myaccount.google.com/
2. Seguridad → Verificación en 2 pasos (debe estar activada)
3. Contraseñas de aplicaciones
4. Selecciona "Correo" y "Otro dispositivo"
5. Copia la contraseña de 16 caracteres
6. Usa esa contraseña en `SMTP_PASS`

**Nota:** No uses tu contraseña normal de Gmail, usa una App Password.

---

### 2. Outlook / Hotmail

**Configuración:**
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@outlook.com
SMTP_PASS=tu-password
```

**Notas:**
- Usa tu contraseña normal de Outlook
- Si tienes 2FA activado, necesitas una contraseña de aplicación

---

### 3. SendGrid (Recomendado para Producción)

**Configuración:**
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=TU_SENDGRID_API_KEY
```

**Pasos:**

1. Crea cuenta en https://sendgrid.com/
2. Ve a Settings → API Keys
3. Crea una nueva API Key con permisos de "Mail Send"
4. Usa `apikey` como usuario y la API Key como contraseña

**Ventajas:**
- ✅ 100 emails gratis por día
- ✅ Mejor deliverability
- ✅ Analytics incluidos
- ✅ No requiere dominio propio

---

### 4. Mailgun

**Configuración:**
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=postmaster@tu-dominio.mailgun.org
SMTP_PASS=tu-mailgun-password
```

**Ventajas:**
- ✅ 5,000 emails gratis por mes (primeros 3 meses)
- ✅ Excelente para desarrollo

---

### 5. Mailtrap (Solo Desarrollo)

**Configuración:**
```bash
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=tu-mailtrap-user
SMTP_PASS=tu-mailtrap-pass
```

**Ventajas:**
- ✅ Perfecto para testing
- ✅ No envía emails reales
- ✅ Interfaz web para ver emails
- ✅ Gratis

---

## 🎨 Templates de Email

El sistema incluye 3 templates HTML profesionales:

### 1. Password Reset Email
- Botón de acción destacado
- Enlace de reseteo
- Advertencia de expiración (1 hora)
- Diseño responsive

### 2. Password Changed Email
- Confirmación visual
- Alerta de seguridad
- Diseño simple y claro

### 3. Temporary Password Email
- Contraseña destacada
- Instrucciones claras
- Advertencias de seguridad

---

## 🧪 Testing

### Probar Configuración SMTP

```bash
# 1. Instalar dependencias
pnpm install

# 2. Configurar SMTP en .env

# 3. Iniciar servidor
pnpm dev

# 4. Probar forgot password
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"usuario@example.com"}'

# 5. Verificar email recibido
```

### Modo Desarrollo (Sin SMTP)

Si no configuras SMTP, el sistema:
- ✅ Sigue funcionando normalmente
- ✅ Muestra el token en consola
- ✅ Devuelve el token en la respuesta (solo dev)
- ⚠️ No envía emails reales

```
⚠️ SMTP no configurado. Los emails no se enviarán.
🔑 Token de reseteo para user@example.com: abc123def456...
```

---

## 🔒 Seguridad

### Mejores Prácticas

1. **Nunca commitear credenciales**
   ```bash
   # .gitignore ya incluye .env
   .env
   ```

2. **Usar variables de entorno**
   ```bash
   # Producción
   export SMTP_PASS="password-seguro"
   ```

3. **Rotar credenciales regularmente**
   - Cambia las API keys cada 3-6 meses
   - Usa diferentes credenciales para dev/prod

4. **Monitorear uso**
   - Revisa logs de envío
   - Detecta patrones anormales
   - Implementa rate limiting

---

## 📊 Monitoreo

### Logs del Sistema

El sistema registra:
```
✅ SMTP configurado correctamente
✅ Email de reseteo enviado a user@example.com
⚠️ No se pudo enviar email a user@example.com (SMTP no configurado)
❌ Error enviando email a user@example.com: [error]
```

### Métricas Recomendadas

- Emails enviados por día
- Tasa de entrega
- Tasa de apertura (si el proveedor lo soporta)
- Emails fallidos

---

## 🚨 Troubleshooting

### Error: "Invalid login"

**Causa:** Credenciales incorrectas

**Solución:**
- Verifica usuario y contraseña
- Para Gmail, usa App Password
- Verifica que 2FA esté activado (Gmail)

---

### Error: "Connection timeout"

**Causa:** Puerto o host incorrecto

**Solución:**
```bash
# Verifica puerto
SMTP_PORT=587  # Para TLS
SMTP_PORT=465  # Para SSL (requiere SMTP_SECURE=true)

# Verifica host
SMTP_HOST=smtp.gmail.com  # Correcto
SMTP_HOST=gmail.com       # Incorrecto
```

---

### Error: "Self signed certificate"

**Causa:** Certificado SSL no confiable

**Solución temporal (solo desarrollo):**
```typescript
// En emailService.ts
this.transporter = nodemailer.createTransport({
  // ... otras opciones
  tls: {
    rejectUnauthorized: false // Solo para desarrollo
  }
});
```

---

### Emails van a spam

**Causas comunes:**
- Dominio no verificado
- Sin SPF/DKIM configurado
- Contenido sospechoso

**Soluciones:**
1. Usa un proveedor profesional (SendGrid, Mailgun)
2. Configura SPF y DKIM en tu dominio
3. Verifica tu dominio con el proveedor
4. Evita palabras spam en el asunto

---

## 🎯 Recomendaciones por Entorno

### Desarrollo
```bash
# Opción 1: Mailtrap (recomendado)
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525

# Opción 2: Sin SMTP (usa consola)
# Deja las variables vacías
```

### Staging
```bash
# SendGrid o Mailgun
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.xxx
```

### Producción
```bash
# SendGrid, Mailgun o SES
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.xxx

# Dominio verificado
SMTP_FROM_EMAIL=noreply@tudominio.com
SMTP_FROM_NAME=Tu Aplicación
```

---

## 📚 Recursos Adicionales

- [Nodemailer Docs](https://nodemailer.com/)
- [SendGrid Setup](https://sendgrid.com/docs/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [Mailgun Docs](https://documentation.mailgun.com/)

---

## 🔄 Próximas Mejoras

- [ ] Templates personalizables
- [ ] Soporte para múltiples idiomas
- [ ] Queue de emails (Bull/Redis)
- [ ] Retry automático en fallos
- [ ] Analytics de emails
- [ ] Attachments support
- [ ] HTML/CSS inline automático

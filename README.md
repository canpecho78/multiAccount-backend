# Multi-Account WhatsApp Backend

Este proyecto implementa un backend completo para manejar múltiples sesiones de WhatsApp usando Baileys, con almacenamiento de autenticación en MongoDB, sistema de multimedia integrado, gestión avanzada de usuarios y funcionalidades empresariales.

## 🚀 Características Principales

- ✅ **Múltiples sesiones de WhatsApp simultáneas** (soporta 30+ sesiones)
- ✅ **Almacenamiento de autenticación en MongoDB** (escalable y persistente)
- ✅ **Sistema de multimedia con MongoDB** (imágenes, videos, audios, documentos, stickers)
- ✅ **Sistema de gestión de usuarios avanzado** (roles, permisos, asignaciones)
- ✅ **Sistema de emails SMTP** (recuperación de contraseña, notificaciones)
- ✅ **API RESTful completa** para gestión de sesiones, mensajes y multimedia
- ✅ **WebSockets** para comunicación en tiempo real
- ✅ **Sistema de roles y autenticación JWT** con permisos granulares
- ✅ **Panel de administración web incluido** con dashboard completo
- ✅ **Sistema de asignaciones** para empleados (control de acceso por chat)
- ✅ **Monitoreo avanzado** con métricas en tiempo real
- ✅ **Limpieza automática** de sesiones y recursos

## 🛠 Configuración

### Variables de Entorno

Crea un archivo `.env` basado en `.env.example`:

```bash
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/whatsapp-multi-session

# Server Configuration
PORT=5000

# Auth Storage Configuration
# AUTH_STORAGE can be 'file' or 'mongo'. Default is 'mongo' (recommended for production)
AUTH_STORAGE=mongo

# JWT Configuration
JWT_SECRET=super-secret-change-me

# Seed admin user (used by `pnpm seed`)
ADMIN_NAME=Admin
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123

# SMTP Configuration (para envío de emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=tu-email@gmail.com
SMTP_PASS=tu-app-password
SMTP_FROM_EMAIL=noreply@tudominio.com
SMTP_FROM_NAME=WhatsApp Multi-Sesiones

# Frontend URL (para enlaces en emails)
FRONTEND_URL=http://localhost:3000

# WhatsApp preload options
# Type of chats to preload when a session connects: individual | group | all
PRELOAD_CHATS_TYPE=individual
PRELOAD_CHATS_LIMIT=30
```

### Instalación y Ejecución

```bash
# Instalar dependencias
pnpm install

# Ejecutar en modo desarrollo
pnpm dev

# Construir para producción
pnpm build
pnpm start

# Crear usuario administrador inicial
pnpm seed

# Ejecutar pruebas
pnpm test
```

## 🔧 Características Avanzadas

### Sistema de Gestión de Sesiones con MongoDB

**¡Importante!** El sistema utiliza MongoDB como almacenamiento centralizado para autenticación y gestión completa de sesiones.

**Beneficios del sistema:**
- ✅ **Escalabilidad**: Soporta 30+ sesiones simultáneas sin problemas
- ✅ **Persistencia**: Los datos sobreviven reinicios del servidor
- ✅ **Centralización**: Todos los datos en un solo lugar
- ✅ **Monitoreo**: Métricas en tiempo real de cada sesión
- ✅ **Limpieza automática**: Gestión inteligente de sesiones inactivas
- ✅ **Control completo**: Tracking de estado, errores y uso de recursos

### Sistema de Multimedia con MongoDB

**¡Revolucionario!** Todo el contenido multimedia se almacena directamente en MongoDB, sin necesidad de filesystem.

**Características:**
- ✅ **Imágenes, videos, audios, documentos, stickers** almacenados en MongoDB
- ✅ **Fotos de perfil** con cache inteligente (24 horas)
- ✅ **API completa** para gestión de archivos multimedia
- ✅ **Metadata rica** (dimensiones, duración, tipo MIME, etc.)
- ✅ **Escalabilidad total** - fácil replicación y sharding
- ✅ **Sin límites de filesystem** ni problemas de permisos

### Sistema de Gestión de Usuarios y Roles

**Sistema empresarial completo:**
- ✅ **Múltiples roles**: Admin, Supervisor, Empleado
- ✅ **Permisos granulares** por endpoint y acción
- ✅ **Sistema de asignaciones** - empleados ven solo chats asignados
- ✅ **Control de acceso avanzado** con middleware personalizado
- ✅ **Auditoría completa** de acciones de usuarios

### Sistema de Emails SMTP

**Comunicación completa con usuarios:**
- ✅ **Recuperación de contraseña** por email
- ✅ **Confirmación de cambios** de contraseña
- ✅ **Notificaciones de administrador** para reset de contraseñas
- ✅ **Templates HTML profesionales** y responsivos
- ✅ **Configuración flexible** (Gmail, Outlook, SendGrid, Mailgun, etc.)

## 🗄 Modelos de Base de Datos

### Autenticación y Usuarios
- **`User`**: Información de usuarios del sistema
- **`Role`**: Roles y permisos del sistema
- **`AuthState`**: Credenciales principales de cada sesión
- **`AuthKey`**: Claves de cifrado y señales de WhatsApp

### Gestión de Sesiones
- **`Session`**: Información completa de cada sesión incluyendo:
  - Estado de conexión y actividad
  - Métricas de mensajes enviados/recibidos
  - Conteo de chats y uso de recursos
  - Intentos de conexión y errores
  - Health checks y monitoreo
  - Metadata del dispositivo conectado

### Mensajería y Multimedia
- **`Message`**: Historial completo de mensajes con soporte multimedia
- **`Chat`**: Información de conversaciones con fotos de perfil
- **`Media`**: Almacenamiento de archivos multimedia en MongoDB
- **`Assignment`**: Sistema de asignación de chats a empleados

## 📡 API Endpoints Completos

### Autenticación
- `POST /api/auth/login` - Iniciar sesión
- `POST /api/auth/logout` - Cerrar sesión
- `POST /api/auth/forgot-password` - Solicitar recuperación de contraseña
- `POST /api/auth/reset-password` - Resetear contraseña con token
- `POST /api/auth/change-password` - Cambiar contraseña (autenticado)

### Gestión de Usuarios y Roles
- `GET /api/users` - Listar usuarios
- `POST /api/users` - Crear usuario
- `PUT /api/users/:id` - Actualizar usuario
- `DELETE /api/users/:id` - Eliminar usuario
- `GET /api/roles` - Listar roles
- `POST /api/roles` - Crear rol
- `PUT /api/roles/:id` - Actualizar rol

### Sesiones
- `POST /api/sessions` - Crear nueva sesión
- `GET /api/sessions` - Listar sesiones
- `DELETE /api/sessions/:sessionId` - Eliminar sesión
- `GET /api/sessions/:sessionId/qr` - Obtener código QR

### Estadísticas y Monitoreo
- `GET /api/sessions/stats` - Estadísticas generales del sistema
- `GET /api/sessions/active` - Sesiones activas
- `GET /api/sessions/connected` - Sesiones conectadas
- `GET /api/sessions/:sessionId/details` - Detalles de una sesión
- `GET /api/sessions/problematic` - Sesiones con problemas
- `POST /api/sessions/:sessionId/reset-attempts` - Resetear intentos
- `DELETE /api/sessions/:sessionId/cleanup` - Limpiar sesión
- `POST /api/sessions/cleanup-inactive` - Limpiar sesiones inactivas

### Mensajes y Chats
- `POST /api/sessions/:sessionId/messages` - Enviar mensaje (texto o multimedia)
- `GET /api/sessions/:sessionId/chats` - Obtener chats (con filtros por tipo y permisos)
- `GET /api/sessions/:sessionId/messages` - Obtener mensajes de un chat

### Sistema de Asignaciones
- `POST /api/sessions/:sessionId/assignments` - Asignar chats a empleados
- `GET /api/sessions/:sessionId/assignments` - Ver asignaciones
- `PUT /api/sessions/:sessionId/assignments/:assignmentId` - Actualizar asignación
- `DELETE /api/sessions/:sessionId/assignments/:assignmentId` - Eliminar asignación

### Gestión de Multimedia
- `GET /api/media/:fileId` - Obtener archivo multimedia
- `GET /api/media/:fileId/download` - Descargar archivo
- `GET /api/media/:fileId/info` - Información del archivo
- `GET /api/media/session/:sessionId` - Listar archivos de sesión
- `DELETE /api/media/:fileId` - Eliminar archivo

### Administración
- `GET /api/admin/dashboard` - Dashboard administrativo
- `POST /api/admin/users/:userId/reset-password` - Resetear contraseña de usuario
- `GET /api/admin/system/health` - Health check del sistema

## 🔐 Sistema de Autenticación

El sistema usa JWT para autenticación. Incluye el token en el header:

```
Authorization: Bearer <token>
```

**Características de seguridad:**
- ✅ **Middleware de autenticación** en todos los endpoints
- ✅ **Control de acceso por roles** y permisos específicos
- ✅ **Sistema de asignaciones** para acceso granular
- ✅ **Auditoría de acciones** de usuarios
- ✅ **Recuperación segura** de contraseñas por email

## 🌐 WebSockets

Los eventos en tiempo real se emiten a través de Socket.IO:

- `qr`: Código QR para autenticación
- `connected`: Estado de conexión de sesión
- `message`: Nuevo mensaje recibido (con datos multimedia)
- `message-sent`: Confirmación de mensaje enviado
- `user-status`: Estado de usuarios conectados

## 📧 Sistema de Emails

**Configuración SMTP completa:**
- ✅ **Gmail** (con App Password)
- ✅ **Outlook/Hotmail** (con contraseña normal)
- ✅ **SendGrid** (recomendado para producción)
- ✅ **Mailgun** (5,000 emails gratis/mes)
- ✅ **Mailtrap** (para desarrollo/testing)

**Tipos de emails:**
- 🔑 **Recuperación de contraseña** con enlace seguro
- ✅ **Confirmación de cambio** de contraseña
- 🔐 **Contraseña temporal** (reset por admin)
- 📧 **Notificaciones administrativas**

## 🏗 Arquitectura del Sistema

- **Backend**: Node.js + Express + TypeScript
- **Base de datos**: MongoDB con Mongoose ODM
- **WhatsApp**: Baileys library (última versión)
- **Autenticación**: JWT con sistema de roles avanzado
- **WebSockets**: Socket.IO para tiempo real
- **Emails**: Nodemailer con templates HTML
- **Multimedia**: Almacenamiento directo en MongoDB
- **Frontend**: React con dashboard administrativo completo

## 🎯 Servicios del Sistema

### SessionManager
Servicio centralizado para gestión completa de sesiones:
- Crear/actualizar sesiones con métricas completas
- Tracking de estado, conexión y actividad
- Gestión de errores, reintentos y reconexión automática
- Health checks periódicos y monitoreo de recursos
- Limpieza automática de sesiones inactivas

### WhatsAppService
Servicio principal de WhatsApp mejorado:
- Gestión avanzada de sockets de Baileys
- Manejo robusto de eventos de conexión
- Procesamiento completo de mensajes con multimedia
- Sistema de descarga y almacenamiento de archivos en MongoDB
- Gestión de fotos de perfil con cache inteligente

### EmailService
Servicio completo de envío de emails:
- Configuración flexible de proveedores SMTP
- Templates HTML profesionales y responsivos
- Manejo de errores y reintentos automáticos
- Soporte para múltiples tipos de notificaciones
- Modo desarrollo (sin SMTP) para testing

### CleanupService
Servicio automático de mantenimiento:
- Limpieza periódica de sesiones inactivas (cada 6 horas)
- Health checks automáticos (cada 5 minutos)
- Reportes de salud del sistema
- Gestión inteligente de recursos
- Reseteo automático de sesiones problemáticas

## 📚 Documentación Completa

El proyecto incluye documentación detallada:

- 📖 **[README.md](README.md)** - Documentación general
- 📧 **[SMTP_SETUP.md](docs/SMTP_SETUP.md)** - Configuración completa de emails
- 💾 **[MULTIMEDIA_MONGODB.md](docs/MULTIMEDIA_MONGODB.md)** - Sistema de multimedia
- 🔧 **[CHAT_STORAGE_FIX.md](docs/CHAT_STORAGE_FIX.md)** - Solución de problemas de chats
- 🛠 **[API.md](docs/API.md)** - Documentación completa de la API

## 🔄 Características Avanzadas

- ✅ **Gestión MongoDB**: Almacenamiento centralizado y escalable
- ✅ **Monitoreo en tiempo real**: Métricas y estadísticas de cada sesión
- ✅ **Limpieza automática**: Gestión inteligente de recursos y sesiones
- ✅ **Control de errores avanzado**: Tracking de intentos fallidos y recuperación
- ✅ **Health checks**: Verificación periódica del estado del sistema
- ✅ **Sistema de multimedia completo**: Todo en MongoDB sin filesystem
- ✅ **Sistema de emails profesional**: SMTP con templates HTML
- ✅ **Control de acceso empresarial**: Roles, permisos y asignaciones
- ✅ **API RESTful completa**: Más de 30 endpoints para gestión total
- ✅ **WebSockets avanzados**: Comunicación bidireccional en tiempo real
- ✅ **Dashboard administrativo**: Interfaz web completa incluida

## 🚀 Próximas Mejoras

- [ ] **Webhooks** para integración con sistemas externos
- [ ] **API de métricas** para integración con herramientas de monitoreo
- [ ] **Sistema de colas** (Redis/Bull) para procesamiento asíncrono
- [ ] **Compresión automática** de imágenes y videos
- [ ] **Soporte para múltiples idiomas** en emails y UI
- [ ] **Sistema de backup automático** de sesiones críticas
- [ ] **Integración con WhatsApp Business API** para funcionalidades avanzadas

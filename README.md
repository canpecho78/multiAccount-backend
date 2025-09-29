# Multi-Account WhatsApp Backend

Este proyecto implementa un backend para manejar múltiples sesiones de WhatsApp usando Baileys, con almacenamiento de autenticación en MongoDB para mayor escalabilidad.

## 🚀 Características Principales

- ✅ Múltiples sesiones de WhatsApp simultáneas
- ✅ Almacenamiento de autenticación en MongoDB (escalable)
- ✅ API RESTful para gestión de sesiones
- ✅ WebSockets para comunicación en tiempo real
- ✅ Sistema de roles y autenticación JWT
- ✅ Interfaz de administración web incluida

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

# WhatsApp preload options
# IMPORTANTE: Se recomienda 'individual' para no saturar el servidor con grupos
PRELOAD_CHATS_TYPE=individual
PRELOAD_CHATS_LIMIT=30
```

### Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Ejecutar en modo desarrollo
npm run dev

# Construir para producción
npm run build
npm start

# Crear usuario administrador inicial
npm run seed
```

## 🔧 Sistema de Gestión de Sesiones con MongoDB

**¡Importante!** El sistema utiliza MongoDB como almacenamiento centralizado para autenticación y gestión completa de sesiones.

### Beneficios del sistema:

- ✅ **Escalabilidad**: Soporta 30+ sesiones simultáneas sin problemas
- ✅ **Persistencia**: Los datos sobreviven reinicios del servidor
- ✅ **Centralización**: Todos los datos en un solo lugar
- ✅ **Monitoreo**: Métricas en tiempo real de cada sesión
- ✅ **Limpieza automática**: Gestión inteligente de sesiones inactivas
- ✅ **Control completo**: Tracking de estado, errores y uso de recursos

### Modelos de Base de Datos

El sistema utiliza los siguientes modelos:

**Autenticación:**
- **`AuthState`**: Credenciales principales de cada sesión
- **`AuthKey`**: Claves de cifrado y señales de WhatsApp

**Gestión de Sesiones:**
- **`Session`**: Información completa de cada sesión incluyendo:
  - Estado de conexión y actividad
  - Métricas de mensajes enviados/recibidos
  - Conteo de chats
  - Intentos de conexión y errores
  - Uso de memoria y health checks
  - Metadata del dispositivo

**Mensajería:**
- **`Message`**: Historial de mensajes
- **`Chat`**: Información de conversaciones

## 📡 API Endpoints

### Sesiones

- `POST /api/sessions` - Crear nueva sesión
- `GET /api/sessions` - Listar sesiones
- `DELETE /api/sessions/:sessionId` - Eliminar sesión

### Estadísticas y Monitoreo

- `GET /api/sessions/stats` - Estadísticas generales del sistema
- `GET /api/sessions/active` - Sesiones activas
- `GET /api/sessions/connected` - Sesiones conectadas
- `GET /api/sessions/:sessionId/details` - Detalles de una sesión
- `GET /api/sessions/problematic` - Sesiones con problemas
- `POST /api/sessions/:sessionId/reset-attempts` - Resetear intentos de conexión
- `POST /api/sessions/:sessionId/health-check` - Actualizar health check
- `DELETE /api/sessions/:sessionId/cleanup` - Eliminar sesión completamente
- `POST /api/sessions/cleanup-inactive` - Limpiar sesiones inactivas

### Mensajes

- `POST /api/sessions/:sessionId/messages` - Enviar mensaje
- `GET /api/sessions/:sessionId/chats` - Obtener chats
- `GET /api/sessions/:sessionId/messages` - Obtener mensajes

## 🔐 Autenticación

El sistema usa JWT para autenticación. Incluye el token en el header:

```
Authorization: Bearer <token>
```

## 🌐 WebSockets

Los eventos en tiempo real se emiten a través de Socket.IO:

- `qr`: Código QR para autenticación
- `connected`: Estado de conexión de sesión
- `message`: Nuevo mensaje recibido
- `message-sent`: Confirmación de mensaje enviado

## 🏗 Arquitectura

- **Backend**: Node.js + Express + TypeScript
- **Base de datos**: MongoDB con Mongoose
- **WhatsApp**: Baileys library
- **Autenticación**: JWT
- **WebSockets**: Socket.IO
- **Frontend**: React (incluido)

## 📝 Notas de Desarrollo

- El sistema está diseñado para manejar múltiples sesiones simultáneamente
- La autenticación se realiza mediante escaneo de código QR
- Los mensajes se almacenan en MongoDB para persistencia
- El sistema incluye un dashboard web para administración

## 🎯 Servicios del Sistema

### SessionManager
Servicio centralizado para gestión de sesiones:
- Crear/actualizar sesiones
- Tracking de estado y conexión
- Métricas de mensajes y chats
- Gestión de errores y reintentos
- Health checks y uso de recursos

### CleanupService
Servicio automático de limpieza y mantenimiento:
- Limpieza de sesiones inactivas (cada 6 horas)
- Health checks periódicos (cada 5 minutos)
- Reportes de salud del sistema
- Reseteo de sesiones problemáticas

### WhatsAppService
Servicio principal de WhatsApp:
- Gestión de sockets de Baileys
- Manejo de eventos de conexión
- Procesamiento de mensajes
- Integración con SessionManager

## 🔄 Características Principales

- ✅ **Gestión MongoDB**: Almacenamiento centralizado y escalable
- ✅ **Monitoreo en tiempo real**: Métricas y estadísticas de cada sesión
- ✅ **Limpieza automática**: Gestión inteligente de recursos
- ✅ **Control de errores**: Tracking de intentos fallidos y reconexión
- ✅ **Health checks**: Verificación periódica del estado del sistema
- ✅ **API completa**: Endpoints para gestión y monitoreo

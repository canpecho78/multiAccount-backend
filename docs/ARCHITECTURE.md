# Arquitectura del Sistema de Gestión de Sesiones WhatsApp

## 📋 Resumen

Sistema escalable para gestión de múltiples sesiones de WhatsApp con almacenamiento centralizado en MongoDB, monitoreo en tiempo real y limpieza automática de recursos.

## 🏗 Componentes Principales

### 1. Modelos de Datos (MongoDB)

#### AuthState
```typescript
{
  sessionId: string;
  creds: any; // Credenciales de Baileys
  updatedAt: Date;
}
```
Almacena las credenciales principales de autenticación de WhatsApp.

#### AuthKey
```typescript
{
  sessionId: string;
  type: string; // pre-key, session, sender-key, etc.
  id: string;
  value: any;
  updatedAt: Date;
}
```
Almacena las claves de cifrado y señales de WhatsApp.

#### Session (Mejorado)
```typescript
{
  sessionId: string;
  name: string;
  phone: string | null;
  isConnected: boolean;
  lastActivity: Date;
  qrCode: string | null;
  
  // Metadata de control
  status: "pending" | "qr_ready" | "connected" | "disconnected" | "error" | "inactive";
  connectionAttempts: number;
  lastConnectionAttempt: Date | null;
  lastDisconnectReason: string | null;
  
  // Métricas de uso
  messagesSent: number;
  messagesReceived: number;
  totalChats: number;
  
  // Control de recursos
  memoryUsage: number; // en MB
  lastHealthCheck: Date;
  isActive: boolean;
  
  // Metadata adicional
  userAgent: string | null;
  platform: string | null;
  version: string | null;
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Servicios

#### SessionManager (`src/services/sessionManager.ts`)
Servicio centralizado para gestión de sesiones en MongoDB.

**Responsabilidades:**
- ✅ Crear/actualizar sesiones
- ✅ Tracking de estado de conexión
- ✅ Registro de intentos de conexión
- ✅ Actualización de códigos QR
- ✅ Contadores de mensajes (enviados/recibidos)
- ✅ Conteo de chats
- ✅ Health checks y uso de memoria
- ✅ Marcar sesiones como inactivas
- ✅ Eliminación completa de sesiones
- ✅ Limpieza de sesiones inactivas
- ✅ Estadísticas del sistema
- ✅ Detección de sesiones problemáticas

**Métodos principales:**
```typescript
createOrUpdateSession(sessionId, data)
getSession(sessionId)
getActiveSessions()
getConnectedSessions()
updateConnectionStatus(sessionId, isConnected, status, metadata)
recordConnectionAttempt(sessionId, success, reason)
updateQRCode(sessionId, qrCode)
incrementMessageCount(sessionId, type)
updateChatCount(sessionId)
updateHealthCheck(sessionId, memoryMB)
markAsInactive(sessionId, reason)
deleteSession(sessionId)
cleanupInactiveSessions(daysInactive)
getStatistics()
getProblematicSessions(minAttempts)
resetConnectionAttempts(sessionId)
```

#### CleanupService (`src/services/cleanupService.ts`)
Servicio automático de limpieza y mantenimiento.

**Responsabilidades:**
- ✅ Limpieza automática de sesiones inactivas (cada 6 horas)
- ✅ Health checks periódicos (cada 5 minutos)
- ✅ Monitoreo de uso de memoria
- ✅ Detección de sesiones desconectadas
- ✅ Reportes de salud del sistema
- ✅ Reseteo de sesiones problemáticas

**Métodos principales:**
```typescript
start() // Iniciar servicio automático
stop() // Detener servicio
runManualCleanup(daysInactive)
getHealthReport()
resetProblematicSessions(minAttempts)
```

#### WhatsAppService (`src/services/whatsappService.ts`)
Servicio principal de WhatsApp con integración a SessionManager.

**Responsabilidades:**
- ✅ Gestión de sockets de Baileys
- ✅ Creación de sesiones con MongoDB
- ✅ Manejo de eventos de conexión
- ✅ Procesamiento de mensajes
- ✅ Actualización automática de métricas
- ✅ Integración con SessionManager

**Flujo de creación de sesión:**
1. Registrar sesión en MongoDB (status: "pending")
2. Cargar auth state desde MongoDB
3. Crear socket de Baileys
4. Escuchar eventos:
   - **QR generado**: Actualizar en MongoDB (status: "qr_ready")
   - **Conexión abierta**: Actualizar status "connected", obtener info del dispositivo
   - **Conexión cerrada**: Registrar intento fallido, actualizar status
5. Escuchar mensajes: Incrementar contadores automáticamente

### 3. API Endpoints

#### Sesiones Básicas
- `POST /api/sessions` - Crear nueva sesión
- `GET /api/sessions` - Listar sesiones
- `DELETE /api/sessions/:sessionId` - Eliminar sesión

#### Estadísticas y Monitoreo (`src/routes/sessionStats.ts`)
- `GET /api/sessions/stats` - Estadísticas generales
- `GET /api/sessions/active` - Sesiones activas
- `GET /api/sessions/connected` - Sesiones conectadas
- `GET /api/sessions/:sessionId/details` - Detalles de sesión
- `GET /api/sessions/problematic` - Sesiones con problemas
- `POST /api/sessions/:sessionId/reset-attempts` - Resetear intentos
- `POST /api/sessions/:sessionId/health-check` - Actualizar health check
- `DELETE /api/sessions/:sessionId/cleanup` - Eliminar completamente
- `POST /api/sessions/cleanup-inactive` - Limpiar inactivas

## 🔄 Flujos de Trabajo

### Flujo de Creación de Sesión
```
1. Usuario solicita crear sesión
   ↓
2. WhatsAppService.createSession()
   ↓
3. SessionManager.createOrUpdateSession() → MongoDB
   ↓
4. useMongoAuthState() → Cargar/crear credenciales
   ↓
5. makeWASocket() → Crear socket de Baileys
   ↓
6. Eventos de conexión:
   - QR → SessionManager.updateQRCode()
   - Connected → SessionManager.updateConnectionStatus()
   - Closed → SessionManager.recordConnectionAttempt()
```

### Flujo de Mensaje Recibido
```
1. Baileys emite evento "messages.upsert"
   ↓
2. WhatsAppService.handleIncomingMessage()
   ↓
3. Guardar mensaje en MongoDB
   ↓
4. SessionManager.incrementMessageCount("received")
   ↓
5. Actualizar/crear chat en MongoDB
   ↓
6. Emitir evento Socket.IO al cliente
```

### Flujo de Limpieza Automática
```
CleanupService.start()
   ↓
Cada 6 horas:
   → SessionManager.cleanupInactiveSessions(30 días)
   → Eliminar sesiones + auth state + mensajes + chats
   
Cada 5 minutos:
   → Calcular uso de memoria por sesión
   → SessionManager.updateHealthCheck()
   → Detectar sesiones desconectadas > 5 min
```

## 📊 Métricas y Monitoreo

### Métricas por Sesión
- Estado de conexión (connected/disconnected)
- Mensajes enviados/recibidos
- Total de chats
- Intentos de conexión fallidos
- Última actividad
- Uso de memoria
- Último health check

### Métricas del Sistema
- Total de sesiones
- Sesiones activas
- Sesiones conectadas
- Sesiones desconectadas
- Sesiones pendientes
- Total de mensajes
- Total de chats

## 🎯 Escalabilidad

### Ventajas del Diseño
1. **Almacenamiento centralizado**: MongoDB maneja todas las sesiones
2. **Sin archivos locales**: No hay límites de filesystem
3. **Limpieza automática**: Recursos liberados automáticamente
4. **Métricas en tiempo real**: Monitoreo constante del sistema
5. **Detección de problemas**: Identificación automática de sesiones problemáticas
6. **Health checks**: Verificación periódica del estado

### Capacidad
- ✅ Soporta 30+ sesiones simultáneas
- ✅ Limpieza automática de sesiones inactivas
- ✅ Monitoreo de uso de memoria
- ✅ Reconexión automática en caso de fallo
- ✅ Tracking completo de errores

## 🔐 Seguridad

- Credenciales almacenadas en MongoDB (cifradas por Baileys)
- JWT para autenticación de API
- CORS configurado
- Limpieza automática de datos antiguos
- Tracking de intentos fallidos

## 🚀 Inicialización del Sistema

```typescript
// src/server.ts
1. Conectar a MongoDB
2. Crear servidor HTTP
3. Inicializar Socket.IO
4. Registrar handlers de Socket.IO
5. Iniciar servidor
6. Inicializar sesiones existentes (2 segundos después)
7. Iniciar CleanupService (5 segundos después)
8. Configurar manejo de cierre graceful (SIGINT/SIGTERM)
```

## 📝 Notas de Implementación

### Índices MongoDB
```javascript
// Session
{ isConnected: 1, isActive: 1 }
{ status: 1 }
{ lastActivity: 1 }

// AuthKey
{ sessionId: 1, type: 1, id: 1 } // unique
```

### Variables de Entorno
```bash
MONGODB_URI=mongodb://...
AUTH_STORAGE=mongo  # Forzado a MongoDB
PORT=5000
JWT_SECRET=...
PRELOAD_CHATS_TYPE=all
PRELOAD_CHATS_LIMIT=50
```

## 🔧 Mantenimiento

### Tareas Automáticas
- Limpieza de sesiones inactivas: Cada 6 horas
- Health checks: Cada 5 minutos

### Tareas Manuales
- Resetear sesiones problemáticas: `POST /api/sessions/:id/reset-attempts`
- Limpieza forzada: `POST /api/sessions/cleanup-inactive`
- Eliminar sesión específica: `DELETE /api/sessions/:id/cleanup`

## 📈 Próximas Mejoras

- [ ] Dashboard web para visualización de métricas
- [ ] Alertas automáticas para sesiones problemáticas
- [ ] Backup automático de credenciales
- [ ] Clustering para múltiples instancias
- [ ] Rate limiting por sesión
- [ ] Logs estructurados con Winston

# Sistema de Gestión Empresarial - Arquitectura Completa

## 📋 Tabla de Contenidos

1. [Resumen Ejecutivo](#-resumen-ejecutivo)
2. [Arquitectura de Roles](#-arquitectura-de-roles)
3. [Controladores del Sistema](#-controladores-del-sistema)
4. [Modelos de Datos](#-modelos-de-datos)
5. [Sistema de Asignaciones](#-sistema-de-asignaciones)
6. [Flujos de Trabajo](#-flujos-de-trabajo)
7. [API Endpoints](#-api-endpoints)
8. [Métricas y Reportes](#-métricas-y-reportes)
9. [Seguridad](#-seguridad)
10. [Casos de Uso](#-casos-de-uso)

---

## 🎯 Resumen Ejecutivo

Sistema empresarial completo para WhatsApp Multi-Sesiones con control granular de acceso, asignaciones inteligentes de chats, monitoreo avanzado de empleados y gestión completa de permisos por roles jerárquicos.

### Características Principales

- **🏗 Arquitectura Multi-Rol**: Admin → Supervisor → Empleado → Guest
- **📱 Gestión Multi-Sesión**: Múltiples números de WhatsApp simultáneos
- **🎯 Asignaciones Inteligentes**: Control granular de acceso a chats específicos
- **📊 Métricas Avanzadas**: Seguimiento de rendimiento y productividad
- **🔐 Seguridad Robusta**: JWT, auditoría completa, permisos granulares
- **📡 API RESTful**: Más de 50 endpoints documentados con Swagger
- **💾 Base de Datos MongoDB**: Almacenamiento eficiente y escalable

---

## 🏗 Arquitectura de Roles

```
👑 Administrador (Control Total)
   ↓
🔧 Supervisor (Gestión de Equipos y Sesiones)
   ↓
👤 Empleado (Gestión de Chats Asignados)
   ↓
👥 Invitado (Consulta Limitada)
```

### 👑 **Administrador (Admin)**
**Permisos Totales:**
- ✅ Gestión completa de usuarios y roles
- ✅ Control total de sesiones WhatsApp
- ✅ Acceso a todas las conversaciones
- ✅ Gestión de todas las asignaciones
- ✅ Configuración del sistema
- ✅ Auditoría completa
- ✅ Métricas globales del sistema

### 🔧 **Supervisor**
**Permisos de Gestión:**
- ✅ Crear sesiones adicionales de WhatsApp
- ✅ Gestionar empleados bajo su supervisión
- ✅ Asignar chats específicos a empleados
- ✅ Monitorear progreso y métricas de empleados
- ✅ Gestionar estados de asignaciones
- ✅ Ver métricas de sesiones administradas

### 👤 **Empleado**
**Permisos Específicos:**
- ✅ Acceso solo a chats asignados
- ✅ Gestionar estados de asignaciones propias
- ✅ Ver historial de mensajes asignados
- ✅ Acceder a multimedia de chats asignados
- ✅ Ver métricas personales de rendimiento

### 👥 **Invitado (Guest)**
**Permisos Limitados:**
- ✅ Consulta básica de sesiones públicas
- ❌ Sin permisos de gestión

---

## 🎮 Controladores del Sistema

### 1. **authController.ts** - Autenticación y Autorización
**Funciones principales:**
- 🔐 `login()` - Autenticación de usuarios
- 📝 `register()` - Registro de nuevos usuarios
- 🔑 `forgotPassword()` - Recuperación de contraseña
- 🔄 `resetPassword()` - Reseteo de contraseña con token
- 🔒 `adminResetPassword()` - Admin resetea contraseña de usuario
- 🔄 `changePassword()` - Usuario cambia su propia contraseña

**Características:**
- Sistema de tokens JWT con expiración
- Recuperación segura de contraseñas vía email
- Hashing bcrypt para contraseñas
- Integración con servicio de email SMTP

### 2. **userController.ts** - Gestión de Usuarios
**Funciones principales:**
- 👥 `listUsers()` - Listar usuarios con filtros
- 👤 `getUser()` - Obtener usuario específico
- ➕ `createUser()` - Crear nuevo usuario
- ✏️ `updateUser()` - Actualizar información de usuario
- 🗑️ `deleteUser()` - Eliminar usuario
- 🔄 `changeUserRole()` - Cambiar rol de usuario
- ✅ `activateUser()` / `deactivateUser()` - Activar/desactivar usuario

**Características:**
- Gestión completa del ciclo de vida de usuarios
- Información empresarial (departamento, posición, supervisor)
- Métricas de rendimiento automáticas
- Configuración de notificaciones personalizada

### 3. **roleController.ts** - Gestión de Roles
**Funciones principales:**
- 📋 `listRoles()` - Listar roles disponibles
- 👤 `getRole()` - Obtener rol específico
- ➕ `createRole()` - Crear nuevo rol
- ✏️ `updateRole()` - Actualizar rol
- 🗑️ `deleteRole()` - Eliminar rol

**Características:**
- Sistema de permisos basado en roles
- Roles personalizables
- Herencia de permisos

### 4. **sessionController.ts** - Gestión de Sesiones WhatsApp
**Funciones principales:**
- 📱 `getSessions()` - Listar sesiones activas
- ➕ `createSession()` - Crear nueva sesión WhatsApp
- ❌ `disconnectSession()` - Desconectar sesión

**Características:**
- Gestión de múltiples sesiones simultáneas
- Integración con servicio WhatsApp Web
- Estado en tiempo real de conexiones

### 5. **chatController.ts** - Gestión de Chats
**Funciones principales:**
- 💬 `getChatsBySession()` - Obtener chats de sesión

**Características:**
- Control de acceso basado en asignaciones
- Filtrado por tipo (individual/grupo)
- Paginación eficiente
- ACL (Access Control List) integrado

### 6. **messageController.ts** - Gestión de Mensajes
**Funciones principales:**
- 💬 `getMessagesByChat()` - Obtener mensajes de chat
- ➕ `sendMessage()` - Enviar mensaje
- 📎 `sendMediaMessage()` - Enviar mensaje con multimedia

**Características:**
- Historial completo de conversaciones
- Soporte multimedia completo
- Sistema de archivos MongoDB GridFS

### 7. **assignmentController.ts** - Sistema de Asignaciones
**Funciones principales:**
- 🎯 `assignChat()` - Asignar chat a usuario
- ❌ `unassignChat()` - Desasignar chat
- 📋 `listAssignments()` - Listar asignaciones
- 👤 `listUserAssignedChats()` - Chats asignados a usuario
- 👤 `listMyAssignedChats()` - Mis chats asignados (empleado)

**Características:**
- Asignaciones granulares (chat específico a empleado específico)
- Estados múltiples: active, completed, pending, rejected
- Sistema de prioridades
- Notas y comentarios

### 8. **adminController.ts** - Panel Administrativo
**Funciones principales:**
- 📊 `getDashboard()` - Dashboard completo del sistema
- 🏥 `getSystemHealth()` - Estado de salud del sistema
- 👥 `getEmployeeMetrics()` - Métricas de empleados
- 📈 `getAssignmentStats()` - Estadísticas de asignaciones
- 📋 `getAuditLogs()` - Logs de auditoría
- ⚙️ `getSecuritySettings()` - Configuración de seguridad

**Características:**
- Métricas en tiempo real
- Análisis de rendimiento del sistema
- Auditoría completa de acciones
- Configuración de seguridad avanzada

### 9. **employeeController.ts** - Panel de Empleados
**Funciones principales:**
- 👤 `getMyAssignments()` - Ver mis asignaciones
- ✏️ `updateAssignmentStatus()` - Actualizar estado de asignación
- 💬 `getMyChats()` - Ver chats asignados
- 📊 `getAssignmentStats()` - Mis métricas personales

**Características:**
- Vista personalizada del empleado
- Gestión autónoma de estados
- Métricas personales de rendimiento

---

## 💾 Modelos de Datos

### 1. **User (Usuario)**
```typescript
{
  _id: ObjectId,
  name: string,
  email: string,
  passwordHash: string,
  role: ObjectId (ref: Role),

  // Información empresarial
  department: string,
  position: string,
  supervisor: ObjectId (ref: User),

  // Métricas de rendimiento
  performance: {
    overallScore: number,
    currentStreak: number,
    totalChatsHandled: number,
    averageRating: number
  },

  // Configuración
  notifications: {...},
  limits: {...},
  active: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 2. **Assignment (Asignación)**
```typescript
{
  _id: ObjectId,
  sessionId: string,
  chatId: string,
  user: ObjectId (ref: User),
  assignedBy: ObjectId (ref: User),

  // Estado y prioridad
  status: "active" | "completed" | "pending" | "rejected",
  priority: "low" | "medium" | "high",

  // Timestamps
  assignedAt: Date,
  completedAt?: Date,
  unassignedAt?: Date,

  // Metadatos y métricas
  metadata: {...},
  metrics: {...},
  active: boolean
}
```

### 3. **AssignmentMetrics (Métricas de Asignación)**
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  sessionId: string,

  // Período de métricas
  period: {
    startDate: Date,
    endDate: Date
  },

  // Métricas principales
  totalAssigned: number,
  totalCompleted: number,
  averageResolutionTime: number,
  completionRate: number,

  // Métricas por prioridad
  byPriority: {
    high: {...},
    medium: {...},
    low: {...}
  }
}
```

### 4. **Session (Sesión WhatsApp)**
```typescript
{
  _id: ObjectId,
  sessionId: string,
  name: string,
  phone: string,
  isConnected: boolean,
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### 5. **Chat (Chat WhatsApp)**
```typescript
{
  _id: ObjectId,
  sessionId: string,
  chatId: string,
  name: string,
  isGroup: boolean,
  unreadCount: number,
  lastMessage: string,
  lastMessageTime: Date,
  createdAt: Date
}
```

### 6. **Message (Mensaje)**
```typescript
{
  _id: ObjectId,
  sessionId: string,
  chatId: string,
  messageId: string,
  type: "text" | "image" | "video" | "audio" | "document",
  content: string,
  fromMe: boolean,
  timestamp: Date,

  // Para multimedia
  media?: {
    filename: string,
    mimetype: string,
    size: number,
    url: string
  }
}
```

---

## 🎯 Sistema de Asignaciones

### Funcionamiento del Sistema

1. **Creación de Asignación**:
   - Supervisor selecciona chat específico
   - Asigna a empleado disponible
   - Establece prioridad y notas

2. **Control de Acceso**:
   - Empleados ven SOLO chats asignados
   - Middleware verifica permisos automáticamente
   - Sistema bloquea acceso no autorizado

3. **Gestión de Estados**:
   - Empleado actualiza progreso
   - Sistema calcula métricas automáticamente
   - Supervisor monitorea avances

### Estados de Asignación

| Estado | Descripción | Acción del Empleado |
|--------|-------------|-------------------|
| `active` | Asignación activa | Trabajando en el chat |
| `completed` | Trabajo terminado | Caso cerrado exitosamente |
| `pending` | Necesita más tiempo | Requiere análisis adicional |
| `rejected` | No se pudo completar | Razones en notas |

---

## 🔄 Flujos de Trabajo

### Flujo Completo: Supervisor → Empleado

```
1. Supervisor crea sesión WhatsApp
   ↓
2. Sistema genera código QR para escanear
   ↓
3. Supervisor asigna chat específico a empleado
   ↓
4. Empleado recibe notificación de asignación
   ↓
5. Empleado accede SOLO al chat asignado
   ↓
6. Empleado gestiona conversación y actualiza estados
   ↓
7. Sistema calcula métricas automáticamente
   ↓
8. Supervisor monitorea progreso y métricas
```

### Control de Seguridad

- **JWT Authentication**: Todos los endpoints requieren token válido
- **Role-based Access Control**: Permisos según jerarquía de roles
- **Assignment-based Filtering**: Empleados ven solo chats asignados
- **Audit Logging**: Todas las acciones quedan registradas
- **Input Validation**: Sanitización y validación de datos

---

## 📡 API Endpoints

### Autenticación (`/api/auth`)
```
POST /login              - Iniciar sesión
POST /register           - Registrar usuario
POST /forgot-password    - Solicitar reseteo de contraseña
POST /reset-password     - Resetear contraseña con token
PUT  /change-password    - Cambiar contraseña propia
POST /admin-reset-password - Admin resetea contraseña
```

### Gestión de Usuarios (`/api/users`, `/api/admin/users`)
```
GET    /users            - Listar usuarios
GET    /users/:id        - Obtener usuario específico
POST   /users            - Crear usuario
PUT    /users/:id        - Actualizar usuario
DELETE /users/:id        - Eliminar usuario
PATCH  /users/:id/role   - Cambiar rol
POST   /users/:id/activate   - Activar usuario
POST   /users/:id/deactivate - Desactivar usuario
```

### Sesiones WhatsApp (`/api/sessions`)
```
GET  /sessions           - Listar sesiones
POST /sessions           - Crear sesión
DELETE /sessions/:id     - Desconectar sesión
```

### Chats y Mensajes (`/api/sessions/:sessionId`)
```
GET  /chats              - Listar chats (filtrado por asignaciones)
GET  /chats/:chatId/messages - Obtener mensajes del chat
POST /chats/:chatId/messages - Enviar mensaje
```

### Asignaciones (`/api/sessions/:sessionId/assignments`)
```
POST   /assignments      - Asignar chat a empleado
DELETE /assignments/:id  - Desasignar chat
GET    /assignments      - Listar asignaciones
GET    /assignments/me   - Mis asignaciones (empleado)
PUT    /assignments/:id/status - Actualizar estado
```

### Panel Administrativo (`/api/admin`)
```
GET  /dashboard          - Dashboard completo
GET  /employee-metrics   - Métricas de empleados
GET  /assignment-stats   - Estadísticas de asignaciones
GET  /system/health      - Estado de salud del sistema
GET  /audit-logs         - Logs de auditoría
GET  /security-settings  - Configuración de seguridad
PUT  /security-settings  - Actualizar configuración
```

### Panel de Empleados (`/api/employee`)
```
GET  /assignments        - Ver mis asignaciones
PUT  /assignments/:id/status - Actualizar estado de asignación
GET  /chats              - Ver chats asignados
GET  /assignments/stats  - Mis métricas personales
```

---

## 📊 Métricas y Reportes

### Métricas de Empleado
```javascript
{
  empleadoId: "user_123",
  periodo: "2025-01-01 a 2025-01-31",
  metricas: {
    chatsAsignados: 45,
    chatsCompletados: 38,
    tiempoPromedioResolucion: "2.3 horas",
    satisfaccionClientes: "4.8/5",
    productividad: "94%",
    porPrioridad: {
      alta: { asignados: 12, completados: 11, tiempo: "1.8h" },
      media: { asignados: 20, completados: 18, tiempo: "2.1h" },
      baja: { asignados: 13, completados: 9, tiempo: "3.2h" }
    }
  }
}
```

### Dashboard Administrativo
```javascript
{
  totalSesiones: 8,
  sesionesActivas: 6,
  totalUsuarios: 25,
  usuariosActivos: 22,
  totalAsignaciones: 180,
  asignacionesActivas: 45,
  completadasHoy: 23,
  sistemaSalud: "excellent",
  empleadosDestacados: [...],
  sesionesProblematicas: [...],
  actividadReciente: [...]
}
```

---

## 🔐 Seguridad

### Middleware de Seguridad

#### 1. Autenticación JWT
```typescript
// Verificación automática en todos los endpoints
router.use(verifyJWT);
```

#### 2. Control de Roles
```typescript
// Solo administradores pueden acceder
router.use(requireRoles("administrator"));

// Supervisores y administradores
router.use(requireRoles("administrator", "supervisor"));
```

#### 3. Control de Asignaciones
```typescript
// Empleados ven solo chats asignados
const assigned = await Assignment.find({
  sessionId, user: authUser.sub, active: true
});
```

### Auditoría Completa
- ✅ Todas las acciones quedan registradas
- ✅ Información de usuario, timestamp, IP
- ✅ Logs de errores y acciones exitosas
- ✅ Configuración de retención de logs

---

## 🎯 Casos de Uso

### Caso 1: Empresa de Ventas Internacionales
**Escenario:**
- Empresa maneja WhatsApp para diferentes regiones
- Supervisores asignan clientes VIP a vendedores expertos
- Sistema trackea cierre de ventas y métricas

**Flujo:**
1. Admin configura 3 supervisores (España, Latinoamérica, USA)
2. Cada supervisor crea sesiones por región
3. Supervisores asignan clientes a empleados especializados
4. Empleados gestionan conversaciones y marcan ventas cerradas
5. Sistema calcula métricas de ventas y rendimiento por región

### Caso 2: Centro de Soporte Técnico
**Escenario:**
- Centro maneja múltiples líneas de soporte técnico
- Consultas se asignan según especialidad técnica
- Sistema mide tiempos de resolución y satisfacción

**Flujo:**
1. Sistema recibe consultas técnicas por WhatsApp
2. Supervisor clasifica por especialidad (hardware/software/redes)
3. Asigna a técnico especializado disponible
4. Técnico resuelve consulta y documenta solución
5. Sistema calcula métricas de resolución y satisfacción

### Caso 3: Agencia de Marketing Digital
**Escenario:**
- Agencia maneja campañas para múltiples clientes
- Community managers especializados por industria
- Sistema trackea engagement y respuesta a campañas

**Flujo:**
1. Admin configura equipos por industria (tecnología, salud, finanzas)
2. Supervisores asignan campañas específicas a especialistas
3. Community managers gestionan conversaciones de clientes
4. Sistema mide engagement y calidad de respuestas
5. Supervisores evalúan efectividad de campañas

---

## 🚀 Funcionalidades Avanzadas

### Sistema de Notificaciones
- 📧 **Email SMTP**: Notificaciones automáticas
- 📱 **Push Notifications**: Para aplicaciones móviles
- 💬 **Notificaciones internas**: Dentro de la plataforma
- 📊 **Reportes automáticos**: Métricas periódicas

### Métricas Avanzadas
- 📈 **Tiempo de respuesta**: Desde asignación hasta primera respuesta
- ⏱️ **Tiempo de resolución**: Desde asignación hasta completitud
- 📊 **Tasa de completitud**: Porcentaje de casos exitosos
- ⭐ **Satisfacción del cliente**: Rating de calidad de servicio
- 🎯 **Productividad por prioridad**: Rendimiento según nivel de prioridad

### Configuración Empresarial
- 🏢 **Límites por empleado**: Máximo de chats concurrentes
- ⏰ **Horarios de trabajo**: Configuración de disponibilidad
- 📧 **Preferencias de notificación**: Email, SMS, push
- 🔒 **Configuración de seguridad**: Políticas de contraseñas, 2FA

---

## 📋 Próximas Funcionalidades

### Planificadas para Próximas Versiones
- [ ] **Sistema de colas inteligente** para asignación automática
- [ ] **Machine Learning** para predicción de tiempos de resolución
- [ ] **Integración con CRM externos** (HubSpot, Salesforce)
- [ ] **Sistema de tickets avanzado** con prioridades automáticas
- [ ] **Aplicación móvil nativa** para empleados
- [ ] **Webhooks** para integraciones externas
- [ ] **Sistema de encuestas automáticas** de satisfacción
- [ ] **Gamificación** con badges y logros para empleados

---

## 📊 Modelos de Respuesta (Response Models)

A continuación se detallan los modelos de respuesta completos para todos los endpoints del sistema.

### 🔐 **Autenticación (`/api/auth`)**

#### **POST /login**
```typescript
// Request Body
{
  "email": "string",
  "password": "string"
}

// Response 200
{
  "success": true,
  "data": {
    "token": "string (JWT)",
    "user": {
      "id": "string",
      "name": "string",
      "email": "string",
      "role": "string"
    }
  }
}

// Response 401
{
  "success": false,
  "error": "Credenciales inválidas"
}
```

#### **POST /register**
```typescript
// Request Body
{
  "name": "string",
  "email": "string",
  "password": "string",
  "roleName": "string" // opcional, default: "guest"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "string"
  }
}

// Response 409
{
  "success": false,
  "error": "Email ya registrado"
}
```

#### **POST /forgot-password**
```typescript
// Request Body
{
  "email": "string"
}

// Response 200
{
  "success": true,
  "message": "Si el email existe, recibirás instrucciones para resetear tu contraseña",
  "resetToken": "string" // Solo en desarrollo
}
```

#### **POST /reset-password**
```typescript
// Request Body
{
  "token": "string",
  "newPassword": "string"
}

// Response 200
{
  "success": true,
  "message": "Contraseña actualizada correctamente"
}

// Response 400
{
  "success": false,
  "error": "Token inválido o expirado"
}
```

#### **POST /change-password**
```typescript
// Request Body
{
  "currentPassword": "string",
  "newPassword": "string"
}

// Response 200
{
  "success": true,
  "message": "Contraseña actualizada correctamente"
}

// Response 401
{
  "success": false,
  "error": "Contraseña actual incorrecta"
}
```

#### **POST /admin/reset-password/:userId**
```typescript
// Request Body
{
  "defaultPassword": "string" // opcional, default: "TempPassword123!"
}

// Response 200
{
  "success": true,
  "message": "Contraseña reseteada correctamente",
  "data": {
    "userId": "string",
    "email": "string",
    "defaultPassword": "string"
  }
}
```

---

### 👥 **Usuarios (`/api/users`)**

#### **GET /users**
```typescript
// Query Parameters
?page=1&limit=20&active=true

// Response 200
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "name": "string",
      "email": "string",
      "role": {
        "_id": "string",
        "name": "string",
        "active": "boolean"
      },
      "department": "string",
      "position": "string",
      "supervisor": "ObjectId",
      "performance": {
        "overallScore": "number",
        "currentStreak": "number",
        "totalChatsHandled": "number",
        "averageRating": "number"
      },
      "active": "boolean",
      "createdAt": "Date",
      "updatedAt": "Date"
    }
  ],
  "meta": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "totalPages": "number"
  }
}
```

#### **GET /users/:id**
```typescript
// Response 200
{
  "success": true,
  "data": {
    "_id": "string",
    "name": "string",
    "email": "string",
    "role": {
      "_id": "string",
      "name": "string"
    },
    "department": "string",
    "position": "string",
    "supervisor": {
      "_id": "string",
      "name": "string"
    },
    "performance": {
      "overallScore": "number",
      "currentStreak": "number",
      "totalChatsHandled": "number",
      "averageRating": "number"
    },
    "active": "boolean",
    "createdAt": "Date",
    "updatedAt": "Date"
  }
}
```

#### **POST /users**
```typescript
// Request Body
{
  "name": "string",
  "email": "string",
  "password": "string",
  "roleName": "string"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "string",
    "name": "string",
    "email": "string",
    "role": "string"
  }
}
```

---

### 📱 **Sesiones (`/api/sessions`)**

#### **GET /sessions**
```typescript
// Response 200
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "sessionId": "string",
      "name": "string",
      "phone": "string",
      "isConnected": "boolean",
      "isActive": "boolean",
      "lastActivity": "Date",
      "createdAt": "Date",
      "updatedAt": "Date"
    }
  ]
}
```

#### **POST /sessions**
```typescript
// Request Body
{
  "sessionId": "string",
  "name": "string",
  "phone": "string"
}

// Response 200
{
  "success": true,
  "message": "Sesión iniciada"
}
```

---

### 💬 **Chats (`/api/sessions/:sessionId/chats`)**

#### **GET /chats**
```typescript
// Query Parameters
?page=1&limit=20&type=all

// Response 200
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "sessionId": "string",
      "chatId": "string",
      "name": "string",
      "isGroup": "boolean",
      "unreadCount": "number",
      "lastMessage": "string",
      "lastMessageTime": "Date",
      "createdAt": "Date"
    }
  ],
  "meta": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "totalPages": "number"
  }
}
```

---

### 📨 **Mensajes (`/api/sessions/:sessionId/messages`)**

#### **GET /chats/:chatId/messages**
```typescript
// Query Parameters
?page=1&limit=50

// Response 200
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "sessionId": "string",
      "chatId": "string",
      "messageId": "string",
      "type": "text|image|video|audio|document",
      "content": "string",
      "fromMe": "boolean",
      "timestamp": "Date",
      "media": {
        "filename": "string",
        "mimetype": "string",
        "size": "number",
        "url": "string"
      }
    }
  ],
  "meta": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "totalPages": "number"
  }
}
```

#### **POST /messages**
```typescript
// Request Body
{
  "to": "string (chatId)",
  "text": "string"
}

// Response 200
{
  "success": true,
  "message": "Mensaje enviado exitosamente"
}
```

---

### 🎯 **Asignaciones (`/api/sessions/:sessionId/assignments`)**

#### **POST /assignments**
```typescript
// Request Body
{
  "chatId": "string",
  "userId": "string",
  "priority": "high|medium|low",
  "notes": "string"
}

// Response 201
{
  "success": true,
  "data": {
    "_id": "string",
    "sessionId": "string",
    "chatId": "string",
    "user": "ObjectId",
    "assignedBy": "ObjectId",
    "status": "active",
    "priority": "string",
    "notes": "string",
    "assignedAt": "Date"
  }
}
```

#### **GET /assignments**
```typescript
// Query Parameters
?chatId=string&userId=string&active=true

// Response 200
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "sessionId": "string",
      "chatId": "string",
      "user": {
        "_id": "string",
        "name": "string",
        "email": "string"
      },
      "assignedBy": {
        "_id": "string",
        "name": "string"
      },
      "status": "active|completed|pending|rejected",
      "priority": "high|medium|low",
      "notes": "string",
      "assignedAt": "Date",
      "completedAt": "Date",
      "metadata": {
        "chatName": "string",
        "messageCount": "number",
        "lastActivity": "Date"
      },
      "metrics": {
        "messagesExchanged": "number",
        "resolutionTime": "number",
        "satisfaction": "number"
      }
    }
  ]
}
```

---

### 👑 **Panel Administrativo (`/api/admin`)**

#### **GET /dashboard**
```typescript
// Response 200
{
  "success": true,
  "data": {
    "overview": {
      "totalSessions": "number",
      "activeSessions": "number",
      "totalUsers": "number",
      "activeUsers": "number",
      "totalChats": "number",
      "totalMessages": "number",
      "totalAssignments": "number",
      "activeAssignments": "number",
      "completedAssignments": "number",
      "pendingAssignments": "number"
    },
    "systemHealth": {
      "status": "excellent|warning|critical",
      "sessions": {
        "total": "number",
        "connected": "number",
        "errorRate": "number",
        "avgResponseTime": "number"
      },
      "users": {
        "total": "number",
        "active": "number",
        "activeRate": "number",
        "recentActivityRate": "number"
      }
    },
    "problematicSessions": [
      {
        "sessionId": "string",
        "name": "string",
        "connectionAttempts": "number",
        "lastError": "string"
      }
    ],
    "topEmployees": [
      {
        "name": "string",
        "email": "string",
        "completedCount": "number",
        "avgResolutionTime": "number",
        "overallScore": "number"
      }
    ],
    "recentActivity": [
      {
        "userId": {
          "name": "string",
          "email": "string"
        },
        "action": "string",
        "resource": "string",
        "success": "boolean",
        "timestamp": "Date"
      }
    ],
    "roleStats": [
      {
        "_id": "string",
        "count": "number",
        "activeCount": "number"
      }
    ]
  }
}
```

#### **GET /employee-metrics**
```typescript
// Query Parameters
?userId=string&sessionId=string&period=2025-01-01

// Response 200
{
  "success": true,
  "data": {
    "metrics": [
      {
        "_id": "string",
        "userId": {
          "name": "string",
          "email": "string",
          "department": "string",
          "position": "string"
        },
        "sessionId": "string",
        "period": {
          "startDate": "Date",
          "endDate": "Date"
        },
        "totalAssigned": "number",
        "totalCompleted": "number",
        "totalPending": "number",
        "totalRejected": "number",
        "averageResolutionTime": "number",
        "completionRate": "number",
        "messagesHandled": "number",
        "chatsPerDay": "number",
        "byPriority": {
          "high": {
            "assigned": "number",
            "completed": "number",
            "avgResolutionTime": "number"
          },
          "medium": {
            "assigned": "number",
            "completed": "number",
            "avgResolutionTime": "number"
          },
          "low": {
            "assigned": "number",
            "completed": "number",
            "avgResolutionTime": "number"
          }
        },
        "isCurrentPeriod": "boolean",
        "calculatedAt": "Date"
      }
    ],
    "period": {
      "startDate": "string",
      "endDate": "string"
    },
    "summary": {
      "totalEmployees": "number",
      "avgCompletionRate": "number",
      "avgResolutionTime": "number"
    }
  }
}
```

#### **GET /assignment-stats**
```typescript
// Query Parameters
?sessionId=string&status=completed&priority=high&dateRange=2025-01-01,2025-01-31

// Response 200
{
  "success": true,
  "data": {
    "overview": {
      "total": "number",
      "byStatus": ["active", "completed", "pending", "rejected"],
      "byPriority": ["high", "medium", "low"],
      "avgResolutionTime": "number",
      "totalMessages": "number"
    },
    "statusBreakdown": [
      {
        "_id": "string",
        "count": "number",
        "avgTime": "number"
      }
    ],
    "priorityBreakdown": [
      {
        "_id": "string",
        "count": "number",
        "completed": "number"
      }
    ]
  }
}
```

#### **GET /audit-logs**
```typescript
// Query Parameters
?page=1&limit=50&userId=string&action=login&success=true&startDate=2025-01-01&endDate=2025-01-31

// Response 200
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "userId": {
        "name": "string",
        "email": "string"
      },
      "action": "string",
      "resource": "string",
      "resourceId": "string",
      "details": "object",
      "ipAddress": "string",
      "userAgent": "string",
      "success": "boolean",
      "errorMessage": "string",
      "timestamp": "Date"
    }
  ],
  "meta": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "totalPages": "number"
  }
}
```

#### **GET /audit-stats**
```typescript
// Response 200
{
  "success": true,
  "data": {
    "general": {
      "totalLogs": "number",
      "todayLogs": "number",
      "actionStats": [
        {
          "_id": "string",
          "count": "number",
          "successCount": "number",
          "errorCount": "number"
        }
      ],
      "userStats": [
        {
          "name": "string",
          "email": "string",
          "actionCount": "number",
          "lastActivity": "Date"
        }
      ],
      "recentErrors": [
        {
          "userId": {
            "name": "string",
            "email": "string"
          },
          "action": "string",
          "resource": "string",
          "errorMessage": "string",
          "timestamp": "Date"
        }
      ]
    }
  }
}
```

#### **GET /security-settings**
```typescript
// Response 200
{
  "success": true,
  "data": {
    "_id": "string",
    "maxLoginAttempts": "number",
    "lockoutDuration": "number",
    "sessionTimeout": "number",
    "passwordMinLength": "number",
    "requireSpecialChars": "boolean",
    "requireNumbers": "boolean",
    "requireUppercase": "boolean",
    "passwordExpiryDays": "number",
    "enable2FA": "boolean",
    "require2FAForAdmins": "boolean",
    "auditAllActions": "boolean",
    "logRetentionDays": "number",
    "updatedBy": "string",
    "updatedAt": "Date",
    "version": "number"
  }
}
```

---

### 👤 **Panel de Empleados (`/api/employee`)**

#### **GET /assignments**
```typescript
// Query Parameters
?sessionId=string&status=active

// Response 200
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "sessionId": "string",
      "chatId": "string",
      "user": "ObjectId",
      "assignedBy": {
        "_id": "string",
        "name": "string"
      },
      "status": "active|completed|pending|rejected",
      "priority": "high|medium|low",
      "notes": "string",
      "assignedAt": "Date",
      "completedAt": "Date",
      "completionNotes": "string",
      "metadata": {
        "chatName": "string",
        "messageCount": "number",
        "lastActivity": "Date"
      },
      "metrics": {
        "messagesExchanged": "number",
        "resolutionTime": "number",
        "satisfaction": "number"
      }
    }
  ]
}
```

#### **PUT /assignments/:assignmentId/status**
```typescript
// Request Body
{
  "status": "completed|pending|rejected",
  "notes": "string"
}

// Response 200
{
  "success": true,
  "data": {
    "_id": "string",
    "sessionId": "string",
    "chatId": "string",
    "status": "string",
    "priority": "string",
    "notes": "string",
    "assignedAt": "Date",
    "completedAt": "Date",
    "completionNotes": "string"
  },
  "message": "Asignación marcada como completed"
}
```

#### **GET /assignments/stats**
```typescript
// Query Parameters
?period=2025-01-01

// Response 200
{
  "success": true,
  "data": {
    "metrics": {
      "_id": "string",
      "userId": "string",
      "sessionId": "string",
      "period": {
        "startDate": "Date",
        "endDate": "Date"
      },
      "totalAssigned": "number",
      "totalCompleted": "number",
      "totalPending": "number",
      "totalRejected": "number",
      "averageResolutionTime": "number",
      "completionRate": "number",
      "messagesHandled": "number",
      "chatsPerDay": "number",
      "byPriority": {
        "high": {
          "assigned": "number",
          "completed": "number",
          "avgResolutionTime": "number"
        },
        "medium": {
          "assigned": "number",
          "completed": "number",
          "avgResolutionTime": "number"
        },
        "low": {
          "assigned": "number",
          "completed": "number",
          "avgResolutionTime": "number"
        }
      },
      "isCurrentPeriod": "boolean",
      "calculatedAt": "Date"
    },
    "period": {
      "startDate": "string",
      "endDate": "string"
    }
  }
}
```

#### **GET /chats**
```typescript
// Query Parameters
?sessionId=string&type=individual&page=1&limit=20

// Response 200
{
  "success": true,
  "data": [
    {
      "_id": "string",
      "sessionId": "string",
      "chatId": "string",
      "name": "string",
      "isGroup": "boolean",
      "unreadCount": "number",
      "lastMessage": "string",
      "lastMessageTime": "Date",
      "createdAt": "Date"
    }
  ],
  "meta": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "totalPages": "number"
  }
}
```

---

### 📎 **Multimedia (`/api/media`)**

#### **GET /:fileId**
```typescript
// Response 200 - Archivo binario con headers
Content-Type: "image/jpeg|video/mp4|audio/mp3|application/pdf"
Content-Length: "number"
Content-Disposition: "inline; filename=\"archivo.jpg\""
```

#### **GET /:fileId/info**
```typescript
// Response 200
{
  "success": true,
  "data": {
    "fileId": "string",
    "messageId": "string",
    "sessionId": "string",
    "chatId": "string",
    "mediaType": "image|video|audio|document|sticker|voice|profile-pic",
    "filename": "string",
    "originalFilename": "string",
    "mimetype": "string",
    "size": "number",
    "width": "number",
    "height": "number",
    "duration": "number",
    "caption": "string",
    "isVoiceNote": "boolean",
    "isAnimated": "boolean",
    "createdAt": "Date"
  }
}
```

#### **GET /session/:sessionId**
```typescript
// Query Parameters
?mediaType=image&page=1&limit=20

// Response 200
{
  "success": true,
  "data": [
    {
      "fileId": "string",
      "messageId": "string",
      "sessionId": "string",
      "chatId": "string",
      "mediaType": "string",
      "filename": "string",
      "originalFilename": "string",
      "mimetype": "string",
      "size": "number",
      "createdAt": "Date"
    }
  ],
  "meta": {
    "page": "number",
    "limit": "number",
    "total": "number",
    "totalPages": "number"
  }
}
```

---

### 📊 **Estadísticas de Sesiones (`/api/sessions/...`)**

#### **GET /stats**
```typescript
// Response 200
{
  "success": true,
  "data": {
    "totalSessions": "number",
    "activeSessions": "number",
    "connectedSessions": "number",
    "totalMessages": "number",
    "messagesPerHour": "number",
    "uptime": "number",
    "errorRate": "number"
  }
}
```

#### **GET /active**
```typescript
// Response 200
{
  "success": true,
  "data": [
    {
      "sessionId": "string",
      "name": "string",
      "isConnected": "boolean",
      "lastSeen": "Date",
      "messageCount": "number"
    }
  ]
}
```

#### **GET /connected**
```typescript
// Response 200
{
  "success": true,
  "data": [
    {
      "sessionId": "string",
      "name": "string",
      "connectedAt": "Date",
      "uptime": "number"
    }
  ]
}
```

---

## 📋 **Códigos de Estado HTTP Utilizados**

| Código | Descripción | Uso típico |
|--------|-------------|------------|
| `200` | OK | Operación exitosa |
| `201` | Created | Recurso creado exitosamente |
| `400` | Bad Request | Datos de entrada inválidos |
| `401` | Unauthorized | Token inválido o expirado |
| `403` | Forbidden | Permisos insuficientes |
| `404` | Not Found | Recurso no encontrado |
| `409` | Conflict | Conflicto (ej: email duplicado) |
| `500` | Internal Server Error | Error interno del servidor |

---

## 🔒 **Estructura de Errores Consistente**

Todos los errores siguen el mismo formato:

```typescript
{
  "success": false,
  "error": "Mensaje descriptivo del error",
  // Opcional: detalles adicionales
  "details": {
    "field": "campo específico con error",
    "code": "código de error específico"
  }
}
```

**Ejemplos:**
```typescript
// Error de validación
{
  "success": false,
  "error": "Datos de entrada inválidos",
  "details": {
    "email": "Email requerido",
    "password": "Debe tener al menos 6 caracteres"
  }
}

// Error de permisos
{
  "success": false,
  "error": "No tienes permisos para acceder a este chat",
  "details": {
    "requiredRole": "administrator",
    "userRole": "empleado"
  }
}

// Error de recurso no encontrado
{
  "success": false,
  "error": "Usuario no encontrado",
  "details": {
    "resourceId": "user_123",
    "resourceType": "User"
  }
}
```

---

Este catálogo completo de modelos de respuesta proporciona toda la información necesaria para integrar con la API del sistema empresarial. 🚀

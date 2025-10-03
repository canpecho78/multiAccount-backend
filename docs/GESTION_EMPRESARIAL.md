# Sistema de Gestión Empresarial - Flujos y Endpoints Completos

## 📋 Resumen Ejecutivo

Sistema completo de gestión empresarial para WhatsApp Multi-Sesiones con control granular de acceso, asignaciones de chats, monitoreo de empleados y gestión avanzada de permisos por roles.

## 🎯 Jerarquía de Roles

```
👑 Admin (Control Total)
   ↓
🔧 Supervisor (Gestión de Empleados y Sesiones)
   ↓
👤 Empleado (Gestión de Chats Asignados)
   ↓
👥 Guest (Solo Consulta Básica)
```

---

## 🔐 Sistema de Permisos por Roles

### 👑 **Administrador (Admin)**
**Permisos Totales:**
- ✅ Crear, editar, eliminar usuarios de cualquier rol
- ✅ Crear, editar, eliminar sesiones de WhatsApp
- ✅ Ver todas las sesiones y métricas del sistema
- ✅ Acceso completo a todos los chats y mensajes
- ✅ Gestionar asignaciones de cualquier usuario
- ✅ Resetear contraseñas de usuarios
- ✅ Ver estadísticas completas del sistema
- ✅ Configurar parámetros del sistema

### 🔧 **Supervisor**
**Permisos de Gestión:**
- ✅ Crear nuevas sesiones de WhatsApp (adicionales)
- ✅ Ver sesiones creadas por él mismo
- ✅ Asignar chats a empleados bajo su supervisión
- ✅ Monitorear el progreso de empleados asignados
- ✅ Ver métricas de sesiones que administra
- ✅ Gestionar estados de chats asignados (completado, pendiente, rechazado)
- ❌ No puede eliminar sesiones de otros supervisores
- ❌ No puede gestionar usuarios de nivel superior

### 👤 **Empleado**
**Permisos Específicos:**
- ✅ Ver solo chats asignados por supervisores
- ✅ Gestionar estados de sus chats asignados
- ✅ Marcar chats como: completado, pendiente, rechazado
- ✅ Ver historial de mensajes de chats asignados
- ✅ Acceder a multimedia de chats asignados
- ❌ No puede ver chats de otros empleados
- ❌ No puede crear sesiones nuevas
- ❌ No puede asignar chats

### 👥 **Guest (Invitado)**
**Permisos Limitados:**
- ✅ Consulta básica de sesiones públicas
- ❌ No puede gestionar nada
- ❌ Solo lectura muy limitada

---

## 🏗 Arquitectura de Asignaciones

### Modelo de Asignaciones

```typescript
{
  _id: ObjectId,
  sessionId: "session_123",           // Sesión de WhatsApp
  chatId: "1234567890@s.whatsapp.net", // Chat específico asignado
  userId: "user_456",                 // Empleado asignado
  assignedBy: "supervisor_789",        // Supervisor que asignó
  status: "active" | "completed" | "pending" | "rejected",
  priority: "low" | "medium" | "high",
  notes: "Comentarios del supervisor",
  assignedAt: Date,
  completedAt?: Date,
  metadata: {
    chatName: "Cliente Importante",
    messageCount: 25,
    lastActivity: Date
  }
}
```

---

## 📡 Endpoints del Sistema de Asignaciones

### Para Supervisores

#### 1. Crear Sesión Nueva (Solo Supervisores)
```http
POST /api/sessions
Authorization: Bearer <token_supervisor>

{
  "name": "Sesión Ventas Internacionales",
  "description": "WhatsApp para clientes extranjeros"
}
```

#### 2. Asignar Chat a Empleado
```http
POST /api/sessions/:sessionId/assignments
Authorization: Bearer <token_supervisor>

{
  "chatId": "1234567890@s.whatsapp.net",
  "userId": "empleado_123",
  "priority": "high",
  "notes": "Cliente VIP - requiere atención inmediata"
}
```

#### 3. Ver Asignaciones de Empleados Bajo Supervisión
```http
GET /api/sessions/:sessionId/assignments?userId=empleado_123
Authorization: Bearer <token_supervisor>

Response:
{
  "success": true,
  "data": [
    {
      "_id": "assignment_123",
      "sessionId": "session_123",
      "chatId": "1234567890@s.whatsapp.net",
      "userId": "empleado_123",
      "assignedBy": "supervisor_789",
      "status": "active",
      "priority": "high",
      "notes": "Cliente VIP",
      "assignedAt": "2025-01-15T10:30:00Z",
      "metadata": {
        "chatName": "María González",
        "messageCount": 15,
        "lastActivity": "2025-01-15T14:20:00Z"
      }
    }
  ]
}
```

#### 4. Monitorear Progreso de Empleado
```http
GET /api/sessions/:sessionId/assignments/stats?userId=empleado_123
Authorization: Bearer <token_supervisor>

Response:
{
  "success": true,
  "data": {
    "totalAssigned": 25,
    "completed": 18,
    "pending": 5,
    "rejected": 2,
    "avgResolutionTime": "2.5 horas",
    "performance": "94%"
  }
}
```

### Para Empleados

#### 1. Ver Chats Asignados
```http
GET /api/sessions/:sessionId/chats?assigned=true
Authorization: Bearer <token_empleado>

Response:
{
  "success": true,
  "data": [
    {
      "chatId": "1234567890@s.whatsapp.net",
      "name": "María González",
      "phone": "1234567890",
      "lastMessage": "¿Podría confirmar el pedido?",
      "lastMessageTime": "2025-01-15T14:20:00Z",
      "unreadCount": 2,
      "assignment": {
        "status": "active",
        "priority": "high",
        "assignedAt": "2025-01-15T10:30:00Z",
        "notes": "Cliente VIP - requiere atención inmediata"
      }
    }
  ]
}
```

#### 2. Actualizar Estado de Chat Asignado
```http
PUT /api/sessions/:sessionId/assignments/:assignmentId/status
Authorization: Bearer <token_empleado>

{
  "status": "completed",
  "notes": "Cliente confirmó pedido - total $1,250"
}
```

**Estados disponibles para empleados:**
- `completed` - Trabajo terminado exitosamente
- `pending` - Necesita más tiempo/análisis
- `rejected` - No se pudo completar (razones en notes)

#### 3. Ver Mensajes Solo de Chats Asignados
```http
GET /api/sessions/:sessionId/messages?chatId=1234567890@s.whatsapp.net
Authorization: Bearer <token_empleado>
```

### Para Administradores

#### 1. Vista Completa del Sistema
```http
GET /api/admin/dashboard
Authorization: Bearer <token_admin>

Response:
{
  "success": true,
  "data": {
    "totalSessions": 8,
    "activeSessions": 6,
    "totalUsers": 25,
    "totalAssignments": 45,
    "systemHealth": "excellent",
    "recentActivity": [...],
    "performanceMetrics": {...}
  }
}
```

#### 2. Gestionar Todas las Asignaciones
```http
GET /api/sessions/:sessionId/assignments?status=pending&page=1&limit=20
Authorization: Bearer <token_admin>
```

#### 3. Resetear Contraseña de Usuario
```http
POST /api/admin/users/:userId/reset-password
Authorization: Bearer <token_admin>

{
  "temporaryPassword": "TempPass123!",
  "notifyUser": true
}
```

---

## 🔄 Flujos de Trabajo Completos

### Flujo 1: Supervisor Crea Nueva Sesión

```
1. Supervisor → POST /api/sessions
   - Crea nueva sesión WhatsApp
   - Sistema genera código QR
   - Supervisor escanea con WhatsApp

2. Sistema:
   - Crea sesión en MongoDB
   - Asocia sesión al supervisor creador
   - Emite evento Socket.IO: "new_session"

3. Supervisor puede:
   - Ver solo sesiones creadas por él
   - Asignar chats de estas sesiones
   - Monitorear empleados asignados
```

### Flujo 2: Asignación de Chat a Empleado

```
1. Supervisor → POST /api/sessions/:sessionId/assignments
   - Selecciona chat específico
   - Asigna a empleado disponible
   - Agrega prioridad y notas

2. Sistema:
   - Crea registro en tabla "assignments"
   - Relaciona: sesión → chat → empleado → supervisor
   - Envía notificación al empleado

3. Empleado recibe:
   - Notificación de nuevo chat asignado
   - Acceso solo a ese chat específico
   - Puede gestionar estados del chat
```

### Flujo 3: Empleado Gestiona Chat Asignado

```
1. Empleado → GET /api/sessions/:sessionId/chats?assigned=true
   - Ve solo chats asignados a él
   - Información completa del chat

2. Empleado trabaja con el chat:
   - Lee mensajes históricos
   - Responde mensajes
   - Gestiona negociación/conversación

3. Empleado actualiza estado:
   - PUT /api/sessions/:sessionId/assignments/:id/status
   - Estados: completed, pending, rejected
   - Agrega notas de cierre
```

### Flujo 4: Supervisor Monitorea Empleados

```
1. Supervisor → GET /api/sessions/:sessionId/assignments/stats?userId=X
   - Ve métricas de empleado específico
   - Total asignados, completados, pendientes

2. Supervisor puede:
   - Reasignar chats si empleado no responde
   - Ver detalles de conversaciones
   - Evaluar rendimiento del empleado

3. Sistema proporciona:
   - Tiempo promedio de resolución
   - Tasa de éxito/completitud
   - Métricas de productividad
```

### Flujo 5: Control Administrativo Total

```
1. Admin → GET /api/admin/dashboard
   - Vista completa del sistema
   - Todas las sesiones, usuarios, asignaciones

2. Admin puede:
   - Crear usuarios de cualquier rol
   - Gestionar todas las sesiones
   - Ver métricas globales
   - Resetear contraseñas
   - Configurar permisos del sistema

3. Sistema permite:
   - Auditoría completa de acciones
   - Reportes detallados de uso
   - Gestión centralizada de recursos
```

---

## 📊 Métricas y Reportes

### Métricas por Empleado
```javascript
{
  empleadoId: "user_123",
  periodo: "2025-01-01 to 2025-01-31",
  metricas: {
    chatsAsignados: 45,
    chatsCompletados: 38,
    chatsPendientes: 5,
    chatsRechazados: 2,
    tiempoPromedioResolucion: "2.3 horas",
    satisfaccionClientes: "4.8/5",
    productividad: "94%"
  }
}
```

### Métricas por Supervisor
```javascript
{
  supervisorId: "supervisor_456",
  sesionesAdministradas: 3,
  empleadosSupervisados: 8,
  metricasGlobales: {
    totalChatsProcesados: 180,
    tiempoPromedioEquipo: "2.1 horas",
    indiceSatisfaccion: "4.7/5",
    productividadEquipo: "92%"
  }
}
```

---

## 🔐 Seguridad y Control de Acceso

### Middleware de Seguridad

#### 1. Verificación de JWT
```typescript
// Todos los endpoints requieren autenticación
router.use(verifyJWT);
```

#### 2. Control de Roles
```typescript
// Solo admins pueden acceder
router.get("/admin/*", verifyRole(["admin"]));

// Supervisores y admins
router.post("/sessions", verifyRole(["admin", "supervisor"]));

// Empleados pueden ver solo sus asignaciones
router.get("/chats", verifyChatAssignment);
```

#### 3. Verificación de Asignaciones
```typescript
// Middleware personalizado para chats
const verifyChatAssignment = async (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  const { sessionId, chatId } = req.query;

  if (user.role === "admin") return next(); // Admin ve todo

  const assignment = await Assignment.findOne({
    sessionId,
    chatId,
    userId: user.sub,
    status: "active"
  });

  if (!assignment) {
    return res.status(403).json({
      success: false,
      error: "No tienes acceso a este chat"
    });
  }

  next();
};
```

---

## 🎯 Casos de Uso Específicos

### Caso 1: Empresa de Ventas con WhatsApp

**Escenario:**
- Empresa maneja múltiples números de WhatsApp para diferentes regiones
- Supervisores asignan clientes a vendedores específicos
- Vendedores gestionan conversaciones asignadas
- Supervisores monitorean cierre de ventas

**Flujo:**
1. Admin crea usuarios: 2 supervisores, 5 empleados
2. Supervisor crea 3 sesiones (Ventas España, Ventas Latinoamérica, Ventas USA)
3. Supervisor asigna chats de clientes a empleados según especialidad
4. Empleados gestionan conversaciones y marcan como completadas/ventas cerradas
5. Supervisores ven métricas de ventas y rendimiento de empleados

### Caso 2: Centro de Atención al Cliente

**Escenario:**
- Centro de soporte técnico con múltiples líneas
- Supervisores distribuyen consultas entre técnicos
- Técnicos resuelven problemas asignados
- Sistema trackea tiempos de resolución y satisfacción

**Flujo:**
1. Sistema recibe consultas por WhatsApp
2. Supervisor clasifica y asigna según especialidad técnica
3. Técnico recibe asignación y resuelve consulta
4. Técnico marca como completado con notas técnicas
5. Supervisor evalúa calidad de resolución y tiempos

### Caso 3: Agencia de Marketing Digital

**Escenario:**
- Agencia maneja campañas para múltiples clientes
- Supervisores coordinan equipos de community managers
- Cada community manager maneja clientes específicos
- Sistema trackea engagement y respuesta a campañas

---

## 🚀 Endpoints Específicos por Caso de Uso

### Para Empresa de Ventas
```http
# Crear sesión por región
POST /api/sessions {"name": "Ventas España"}

# Asignar cliente VIP a mejor vendedor
POST /api/sessions/:sessionId/assignments {
  "chatId": "cliente_vip@s.whatsapp.net",
  "userId": "mejor_vendedor_id",
  "priority": "high",
  "notes": "Cliente con presupuesto > $10K"
}

# Vendedor actualiza estado de venta
PUT /api/sessions/:sessionId/assignments/:id/status {
  "status": "completed",
  "notes": "Venta cerrada - $12,500 + servicios"
}

# Supervisor ve métricas de vendedor
GET /api/sessions/:sessionId/assignments/stats?userId=vendedor_id
```

### Para Centro de Soporte
```http
# Asignar consulta técnica
POST /api/sessions/:sessionId/assignments {
  "chatId": "usuario_problema@s.whatsapp.net",
  "userId": "tecnico_especialista_id",
  "priority": "medium",
  "notes": "Problema de configuración de software"
}

# Técnico documenta solución
PUT /api/sessions/:sessionId/assignments/:id/status {
  "status": "completed",
  "notes": "Resuelto: Actualizar drivers versión 2.1.4"
}

# Métricas de resolución técnica
GET /api/sessions/:sessionId/assignments?status=completed&dateRange=2025-01-01,2025-01-31
```

---

## 📈 Métricas Avanzadas

### Dashboard de Supervisor
```javascript
{
  sesionesActivas: 3,
  empleadosActivos: 8,
  asignacionesPendientes: 12,
  completadasHoy: 25,
  tiempoPromedioResolucion: "2.1 horas",
  productividadEquipo: "94%",
  metricasPorEmpleado: [
    {
      empleadoId: "emp_1",
      chatsActivos: 5,
      completados: 8,
      tiempoPromedio: "1.8 horas",
      satisfaccion: "4.9/5"
    }
  ]
}
```

### Reportes de Rendimiento
```javascript
// Generar reporte mensual
GET /api/admin/reports?type=monthly&date=2025-01

Response: {
  totalSesiones: 12,
  totalUsuarios: 45,
  totalAsignaciones: 320,
  promedioCompletitud: "91%",
  tiempoPromedioResolucion: "2.3 horas",
  topEmpleados: [...],
  areasMejora: [...]
}
```

---

## 🔧 Configuración del Sistema

### Variables de Entorno para Empresas
```bash
# Configuración empresarial
MAX_SESIONES_POR_SUPERVISOR=5
MAX_ASIGNACIONES_POR_EMPLEADO=20
TIEMPO_MAXIMO_INACTIVIDAD=30  # minutos
AUTO_ASIGNACION_INTELLIGENTE=true

# Notificaciones
NOTIFICAR_ASIGNACIONES=true
NOTIFICAR_COMPLETITUD=true
NOTIFICAR_INACTIVIDAD=true

# Métricas
TRACK_TIEMPOS_RESOLUCION=true
TRACK_SATISFACCION_CLIENTE=true
GENERAR_REPORTES_AUTOMATICOS=true
```

---

## 🎯 Beneficios del Sistema

### Para Administradores
- ✅ **Control total** del sistema y usuarios
- ✅ **Visibilidad completa** de operaciones
- ✅ **Métricas globales** para toma de decisiones
- ✅ **Gestión centralizada** de recursos

### Para Supervisores
- ✅ **Gestión eficiente** de equipos de trabajo
- ✅ **Monitoreo en tiempo real** del progreso
- ✅ **Métricas detalladas** de rendimiento individual
- ✅ **Flexibilidad** para crear sesiones adicionales

### Para Empleados
- ✅ **Enfoque específico** en chats asignados
- ✅ **Claridad de responsabilidades** y prioridades
- ✅ **Feedback directo** de supervisores
- ✅ **Autogestión** de estados de trabajo

### Para la Empresa
- ✅ **Productividad mejorada** con asignaciones específicas
- ✅ **Seguimiento preciso** de operaciones y resultados
- ✅ **Escalabilidad** para múltiples equipos y regiones
- ✅ **ROI medible** con métricas detalladas de rendimiento

---

## 🚀 Próximas Funcionalidades

### Planificadas
- [ ] **Sistema de colas** para asignación automática
- [ ] **Machine Learning** para predicción de tiempos de resolución
- [ ] **Integración con CRM** externos
- [ ] **Sistema de tickets** avanzado
- [ ] **API de reportes** para herramientas de BI
- [ ] **Aplicación móvil** para empleados
- [ ] **Sistema de encuestas** de satisfacción automática
- [ ] **Webhooks** para notificaciones externas

### En Desarrollo
- [ ] **Chat interno** entre supervisor y empleado
- [ ] **Sistema de badges/logros** para empleados
- [ ] **Gamificación** del rendimiento
- [ ] **Análisis predictivo** de carga de trabajo

---

Este sistema proporciona una solución empresarial completa para gestión de comunicaciones WhatsApp con control granular, asignaciones inteligentes y monitoreo avanzado de rendimiento.

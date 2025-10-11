# WebSocket Events - Referencia Rápida

## 📤 Eventos Cliente → Servidor

### Chats

| Evento | Parámetros | Respuesta | Descripción |
|--------|-----------|-----------|-------------|
| `get-chats` | `{ sessionId, page?, limit?, type? }` | `chats-list` | Obtener lista de chats (ordenados por pin) |
| `pin-chat` | `{ sessionId, chatId, isPinned }` | `chat-pin-success` o `chat-error` | Anclar/desanclar chat |
| `archive-chat` | `{ sessionId, chatId, isArchived }` | `chat-archive-success` o `chat-error` | Archivar/desarchivar chat |
| `mark-chat-read` | `{ sessionId, chatId }` | `chat-read-success` o `chat-error` | Marcar chat como leído (unreadCount = 0) |

### Mensajes

| Evento | Parámetros | Respuesta | Descripción |
|--------|-----------|-----------|-------------|
| `get-messages` | `{ sessionId, chatId, page?, limit? }` | `messages-list` | Obtener mensajes de un chat |
| `send-message` | `{ sessionId, to, text }` | `message-sent` o `message-error` | Enviar mensaje de texto |

### Sesiones

| Evento | Parámetros | Respuesta | Descripción |
|--------|-----------|-----------|-------------|
| `create-session` | `{ sessionId, name?, phone? }` | - | Crear/iniciar sesión de WhatsApp |
| `get-sessions` | - | `sessions-list` | Obtener todas las sesiones |
| `disconnect-session` | `sessionId` | - | Desconectar sesión de WhatsApp |

---

## 📥 Eventos Servidor → Cliente

### Eventos de Respuesta

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `chats-list` | `{ sessionId, chats: Chat[], meta: { page, limit, total, totalPages } }` | Lista de chats |
| `messages-list` | `{ sessionId, chatId, messages: Message[], meta }` | Lista de mensajes |
| `sessions-list` | `Session[]` | Lista de sesiones |
| `chat-pin-success` | `{ message, chat }` | Chat anclado/desanclado exitosamente |
| `chat-archive-success` | `{ message, chat }` | Chat archivado/desarchivado exitosamente |
| `chat-read-success` | `{ message, chat }` | Chat marcado como leído |
| `message-sent` | `{ sessionId, to, text, messageId }` | Mensaje enviado exitosamente |

### Eventos de Error

| Evento | Payload | Descripción |
|--------|---------|-------------|
| `chat-error` | `{ error: string }` | Error en operación de chat |
| `message-error` | `{ error: string }` | Error al enviar mensaje |

### Eventos Broadcast (Tiempo Real)

| Evento | Payload | Cuándo se emite |
|--------|---------|-----------------|
| `chat-updated` | `{ sessionId, chatId, action: 'pin'\|'archive'\|'read'\|'new-message', chat }` | Cuando un chat cambia (todos los clientes) |
| `message` | `{ sessionId, from, text, timestamp, messageId, messageType, media? }` | Nuevo mensaje recibido |
| `qr` | `{ sessionId, qr: string }` | QR code generado para escanear |
| `connected` | `{ sessionId, status: boolean }` | Sesión conectada/desconectada |

---

## 🔧 Tipos TypeScript

```typescript
// Chat
interface Chat {
  chatId: string;
  sessionId: string;
  name: string;
  phone: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isArchived: boolean;
  isPinned: boolean;
  profilePicUrl?: string;
  status?: string;
  isGroup?: boolean;
  groupDescription?: string;
  lastSeen?: Date;
}

// Message
interface Message {
  messageId: string;
  chatId: string;
  sessionId: string;
  from: string;
  to: string;
  body: string;
  fromMe: boolean;
  timestamp: Date;
  messageType: string;
  status: 'sent' | 'delivered' | 'read';
  mediaUrl?: string;
  mediaType?: string;
  mediaFilename?: string;
  mediaMimetype?: string;
  mediaSize?: number;
  isVoiceNote?: boolean;
}

// Session
interface Session {
  sessionId: string;
  name: string;
  phone: string;
  isConnected: boolean;
  isActive: boolean;
  status: 'pending' | 'qr_ready' | 'connected' | 'disconnected' | 'error' | 'inactive';
  qrCode?: string;
  lastActivity?: Date;
}

// Media
interface MediaData {
  fileId: string;
  type: string;
  filename: string;
  mimetype?: string;
  size?: number;
  isVoiceNote?: boolean;
}
```

---

## 📋 Parámetros Detallados

### `get-chats`
```typescript
{
  sessionId: string;      // Requerido
  page?: number;          // Default: 1, Min: 1
  limit?: number;         // Default: 20, Min: 1, Max: 100
  type?: 'all' | 'group' | 'individual';  // Default: 'all'
}
```

**Filtros de tipo:**
- `all`: Todos los chats
- `group`: Solo grupos (JID termina en `@g.us`)
- `individual`: Solo chats individuales (JID termina en `@s.whatsapp.net`)

**Ordenamiento:**
1. Chats anclados (`isPinned: true`) primero
2. Luego por `lastMessageTime` descendente

**ACL (Control de Acceso):**
- Usuarios con rol `empleado` solo ven chats asignados
- Otros roles ven todos los chats de la sesión

---

### `get-messages`
```typescript
{
  sessionId: string;      // Requerido
  chatId: string;         // Requerido (JID completo, ej: "123@s.whatsapp.net")
  page?: number;          // Default: 1, Min: 1
  limit?: number;         // Default: 50, Min: 1, Max: 200
}
```

**Ordenamiento:**
- Por `timestamp` descendente (más recientes primero)
- Luego se invierten para mostrar cronológicamente

**ACL:**
- Usuarios con rol `empleado` deben estar asignados al chat

---

### `send-message`
```typescript
{
  sessionId: string;      // Requerido
  to: string;             // Requerido (chatId destino)
  text: string;           // Requerido (contenido del mensaje)
}
```

**Validaciones:**
- Sesión debe estar conectada
- Usuario `empleado` debe estar asignado al chat destino

---

### `pin-chat`
```typescript
{
  sessionId: string;      // Requerido
  chatId: string;         // Requerido
  isPinned: boolean;      // Requerido (true = anclar, false = desanclar)
}
```

**Efectos:**
- Actualiza `isPinned` en BD
- Emite `chat-updated` con `action: 'pin'` a todos los clientes
- Reordena automáticamente en `get-chats`

---

### `archive-chat`
```typescript
{
  sessionId: string;      // Requerido
  chatId: string;         // Requerido
  isArchived: boolean;    // Requerido (true = archivar, false = desarchivar)
}
```

**Efectos:**
- Actualiza `isArchived` en BD
- Emite `chat-updated` con `action: 'archive'` a todos los clientes

---

### `mark-chat-read`
```typescript
{
  sessionId: string;      // Requerido
  chatId: string;         // Requerido
}
```

**Efectos:**
- Resetea `unreadCount` a 0
- Emite `chat-updated` con `action: 'read'` a todos los clientes

---

## 🔄 Flujo de Eventos Típicos

### Flujo 1: Cargar y Actualizar Chats
```
1. Cliente → get-chats
2. Servidor → chats-list (lista inicial)
3. [Tiempo real] Servidor → chat-updated (cuando hay cambios)
4. Cliente actualiza UI automáticamente
```

### Flujo 2: Enviar Mensaje
```
1. Cliente → send-message
2. Servidor guarda en BD
3. Servidor → message-sent (confirmación al emisor)
4. Servidor → message (broadcast a todos)
5. Servidor → chat-updated (actualiza lastMessage del chat)
```

### Flujo 3: Mensaje Entrante
```
1. WhatsApp envía mensaje a Baileys
2. Servidor guarda mensaje en BD
3. Servidor actualiza chat (lastMessage, unreadCount++)
4. Servidor → message (broadcast)
5. Servidor → chat-updated (action: 'new-message')
6. Clientes actualizan UI
```

### Flujo 4: Anclar Chat
```
1. Cliente → pin-chat { isPinned: true }
2. Servidor actualiza BD
3. Servidor → chat-pin-success (al emisor)
4. Servidor → chat-updated (broadcast a todos)
5. Todos los clientes reordenan lista
```

---

## 🎯 Casos de Uso Comunes

### Caso 1: Dashboard de Chats en Tiempo Real
```typescript
// Conectar
socket.emit('get-chats', { sessionId: 'mi_sesion' });

// Escuchar actualizaciones
socket.on('chat-updated', ({ action, chat }) => {
  // Actualizar UI según action
  switch(action) {
    case 'new-message':
      // Mover chat al tope, incrementar badge
      break;
    case 'pin':
      // Reordenar lista
      break;
    case 'read':
      // Quitar badge de no leídos
      break;
  }
});
```

### Caso 2: Vista de Conversación
```typescript
// Cargar mensajes
socket.emit('get-messages', { sessionId, chatId, page: 1 });

// Marcar como leído al abrir
socket.emit('mark-chat-read', { sessionId, chatId });

// Escuchar nuevos mensajes
socket.on('message', ({ from, text }) => {
  if (from === chatId) {
    // Agregar mensaje a la lista
    // Scroll al final
  }
});
```

### Caso 3: Indicador de Conexión
```typescript
socket.on('connected', ({ sessionId, status }) => {
  // Actualizar badge de estado
  setSessionStatus(sessionId, status ? 'online' : 'offline');
});
```

---

## ⚡ Performance Tips

1. **Paginación**: Usa `limit` pequeño (20-50) para carga inicial
2. **Lazy Loading**: Carga más mensajes al hacer scroll
3. **Debounce**: Para eventos de escritura/búsqueda
4. **Cleanup**: Siempre usa `socket.off()` en unmount
5. **Memoización**: Usa `useMemo` para listas grandes

---

## 🔒 Seguridad

- **JWT requerido** en handshake: `auth.token`
- **ACL por rol**: empleados solo ven chats asignados
- **Validación server-side**: todos los eventos validan permisos
- **Rate limiting**: considera implementar en producción

---

**Última actualización**: 2025-10-10

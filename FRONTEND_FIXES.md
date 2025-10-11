# Correcciones para el Frontend

## 🔧 Cambios en `socket-service.ts`

### 1. Cambiar URL del Backend

```typescript
// ANTES (❌ INCORRECTO)
private readonly BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

// DESPUÉS (✅ CORRECTO)
private readonly BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
```

### 2. Agregar listener para `sessions-list`

Agregar en el método `setupEventListeners()`:

```typescript
private setupEventListeners(): void {
  if (!this.socket) return;

  // ... otros listeners existentes ...

  // ✅ AGREGAR ESTE LISTENER
  this.socket.on('sessions-list', (data: SocketSession[]) => {
    console.log('Lista de sesiones recibida:', data.length);
    this.emit('sessions-list', data);
  });
}
```

---

## 🔧 Cambios en `api-service.ts`

### 1. Cambiar URL base

```typescript
// ANTES (❌ INCORRECTO)
private baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// DESPUÉS (✅ CORRECTO)
private baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
```

### 2. Corregir endpoint de disconnect session

```typescript
// ANTES (❌ INCORRECTO)
async disconnectSession(sessionId: string): Promise<ApiResponse<void>> {
  return this.request(`/sessions/${sessionId}/disconnect`, {
    method: 'POST',
  });
}

// DESPUÉS (✅ CORRECTO)
async disconnectSession(sessionId: string): Promise<ApiResponse<void>> {
  return this.request(`/sessions/${sessionId}/disconnect`, {
    method: 'POST',
  });
}
```

### 3. Agregar métodos faltantes para chats

Agregar estos métodos al `ApiService`:

```typescript
// Pin/Unpin chat
async pinChat(
  sessionId: string,
  chatId: string,
  isPinned: boolean
): Promise<ApiResponse<Chat>> {
  return this.request(`/sessions/${sessionId}/chats/${chatId}/pin`, {
    method: 'PATCH',
    body: JSON.stringify({ isPinned }),
  });
}

// Archive/Unarchive chat
async archiveChat(
  sessionId: string,
  chatId: string,
  isArchived: boolean
): Promise<ApiResponse<Chat>> {
  return this.request(`/sessions/${sessionId}/chats/${chatId}/archive`, {
    method: 'PATCH',
    body: JSON.stringify({ isArchived }),
  });
}

// Mark chat as read
async markChatAsRead(
  sessionId: string,
  chatId: string
): Promise<ApiResponse<Chat>> {
  return this.request(`/sessions/${sessionId}/chats/${chatId}/read`, {
    method: 'PATCH',
  });
}
```

---

## 🔧 Archivo `.env.local` (Frontend)

Crea o actualiza tu archivo `.env.local`:

```env
# Backend URL (sin /api al final para WebSocket)
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000

# API URL (con /api para REST)
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

---

## 📝 Código Completo Corregido

### `socket-service.ts` (versión corregida)

```typescript
import { io, Socket } from 'socket.io-client';
import { authService } from './auth-service';

// ... (mantener todas tus interfaces existentes) ...

class SocketService {
  private socket: Socket | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private eventListeners: { [event: string]: Function[] } = {};

  // ✅ CORREGIR URL
  private readonly BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

  connect(): Promise<void> {
    if (this.socket?.connected || this.isConnecting) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      this.isConnecting = true;

      this.socket = io(this.BACKEND_URL, {
        auth: {
          token: `Bearer ${authService.getToken()}`,
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
      });

      this.socket.on('connect', () => {
        console.log('✅ WebSocket conectado:', this.socket?.id);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.setupEventListeners();
        resolve();
      });

      this.socket.on('disconnect', (reason) => {
        console.log('❌ WebSocket desconectado:', reason);
        this.isConnecting = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('❌ Error de conexión:', error.message);
        this.isConnecting = false;
        this.reconnectAttempts++;

        if (error.message === 'Authentication error' || error.message === 'Unauthorized') {
          console.error('🔒 Token inválido o expirado');
          authService.removeToken();
          this.emit('auth-error', { error: 'Token expired' });
          return;
        }

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          reject(new Error('Max reconnection attempts reached'));
        } else {
          setTimeout(() => {
            this.connect().then(resolve).catch(reject);
          }, 1000 * this.reconnectAttempts);
        }
      });
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.eventListeners = {};
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connected', (data: { sessionId: string; status: boolean }) => {
      console.log('Estado de sesión:', data);
      this.emit('connected', data);
    });

    this.socket.on('qr', (data: { sessionId: string; qr: string }) => {
      console.log('QR code generado:', data.sessionId);
      this.emit('qr', data);
    });

    // ✅ AGREGAR ESTE LISTENER
    this.socket.on('sessions-list', (data: SocketSession[]) => {
      console.log('Lista de sesiones recibida:', data.length);
      this.emit('sessions-list', data);
    });

    // Chat events
    this.socket.on('chats-list', (data: ChatsListResponse) => {
      console.log('Lista de chats recibida:', data.sessionId, `${data.chats.length} chats`);
      this.emit('chats-list', data);
    });

    this.socket.on('chat-updated', (data: {
      sessionId: string;
      chatId: string;
      action: 'pin' | 'archive' | 'read' | 'new-message';
      chat: SocketChat;
    }) => {
      console.log('Chat actualizado:', data.chatId, data.action);
      this.emit('chat-updated', data);
    });

    // Message events
    this.socket.on('messages-list', (data: MessagesListResponse) => {
      console.log('Lista de mensajes recibida:', data.chatId, `${data.messages.length} mensajes`);
      this.emit('messages-list', data);
    });

    this.socket.on('message', (data: SocketMessage) => {
      console.log('Nuevo mensaje recibido:', data.from, data.body);
      this.emit('message', data);
    });

    // Response events
    this.socket.on('message-sent', (data: { sessionId: string; to: string; text: string; messageId: string }) => {
      console.log('Mensaje enviado confirmado:', data.messageId);
      this.emit('message-sent', data);
    });

    this.socket.on('chat-pin-success', (data: { message: string; chat: SocketChat }) => {
      console.log('Chat anclado:', data.message);
      this.emit('chat-pin-success', data);
    });

    this.socket.on('chat-archive-success', (data: { message: string; chat: SocketChat }) => {
      console.log('Chat archivado:', data.message);
      this.emit('chat-archive-success', data);
    });

    this.socket.on('chat-read-success', (data: { message: string; chat: SocketChat }) => {
      console.log('Chat marcado como leído:', data.message);
      this.emit('chat-read-success', data);
    });

    // Error events
    this.socket.on('message-error', (data: { error: string }) => {
      console.error('Error enviando mensaje:', data.error);
      this.emit('message-error', data);
    });

    this.socket.on('chat-error', (data: { error: string }) => {
      console.error('Error en operación de chat:', data.error);
      this.emit('chat-error', data);
    });
  }

  // ... (mantener todos los métodos existentes: emit, on, off, getChats, etc.) ...
}

export const socketService = new SocketService();
```

---

## 🧪 Cómo Probar

### 1. Verificar que el backend esté corriendo

```bash
# En la terminal del backend
cd d:\repo\multiAccount-backend
npm run dev

# Deberías ver:
# 🚀 Servidor corriendo en http://localhost:3000
```

### 2. Actualizar variables de entorno del frontend

```env
# .env.local
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### 3. Probar conexión WebSocket

```typescript
// En tu componente de login o dashboard
import { socketService } from '@/lib/socket-service';

// Después del login exitoso
const handleLoginSuccess = async (token: string) => {
  authService.setToken(token);
  
  try {
    await socketService.connect();
    console.log('✅ WebSocket conectado');
    
    // Probar obtener chats
    socketService.getChats({ sessionId: 'MI_SESION' });
  } catch (error) {
    console.error('❌ Error conectando WebSocket:', error);
  }
};
```

### 4. Escuchar eventos

```typescript
// En tu componente de chats
useEffect(() => {
  // Escuchar lista de chats
  socketService.on('chats-list', (data) => {
    console.log('Chats recibidos:', data.chats);
    setChats(data.chats);
  });

  // Escuchar actualizaciones en tiempo real
  socketService.on('chat-updated', ({ chat, action }) => {
    console.log('Chat actualizado:', chat.name, action);
    // Actualizar estado
  });

  return () => {
    socketService.off('chats-list');
    socketService.off('chat-updated');
  };
}, []);
```

---

## ✅ Checklist de Verificación

- [ ] Backend corriendo en puerto 3000
- [ ] Frontend apuntando a `http://localhost:3000`
- [ ] Token JWT válido en sessionStorage
- [ ] WebSocket conectado (ver consola: "✅ WebSocket conectado")
- [ ] Evento `get-chats` emitido
- [ ] Evento `chats-list` recibido con datos de MongoDB
- [ ] Logs en consola mostrando datos

---

## 🐛 Debugging

Si no funciona, verifica en la consola del navegador:

```javascript
// 1. Verificar token
console.log('Token:', sessionStorage.getItem('whatsapp_auth_token'));

// 2. Verificar conexión
console.log('Socket conectado:', socketService.isConnected());

// 3. Verificar ID del socket
console.log('Socket ID:', socketService.getSocketId());

// 4. Emitir evento manualmente
socketService.getChats({ sessionId: 'tu_session_id' });
```

En la consola del backend deberías ver:
```
📡 Cliente conectado: SOCKET_ID user: USER_ID
```

---

## 📞 Próximos Pasos

1. Aplicar estos cambios
2. Reiniciar frontend y backend
3. Hacer login
4. Verificar que WebSocket conecta
5. Probar `getChats()` y ver datos en consola

¿Necesitas ayuda con algún paso específico?

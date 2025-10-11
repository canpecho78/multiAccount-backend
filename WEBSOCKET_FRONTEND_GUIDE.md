# Guía de Implementación WebSocket - Frontend

Esta guía te ayudará a integrar el sistema de WebSocket para chats y mensajes de WhatsApp en tu aplicación frontend.

## 📋 Tabla de Contenidos

- [Instalación](#instalación)
- [Configuración Inicial](#configuración-inicial)
- [Autenticación](#autenticación)
- [Eventos Disponibles](#eventos-disponibles)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Hooks de React](#hooks-de-react)
- [Manejo de Errores](#manejo-de-errores)
- [Best Practices](#best-practices)

---

## 📦 Instalación

```bash
npm install socket.io-client
# o
yarn add socket.io-client
```

---

## ⚙️ Configuración Inicial

### 1. Crear el cliente Socket.IO

```typescript
// src/services/socket.ts
import { io, Socket } from 'socket.io-client';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

let socket: Socket | null = null;

export const initializeSocket = (token: string): Socket => {
  if (socket?.connected) {
    return socket;
  }

  socket = io(BACKEND_URL, {
    auth: {
      token: `Bearer ${token}`, // JWT token del login
    },
    transports: ['websocket'], // Opcional: fuerza WebSocket
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  // Eventos de conexión
  socket.on('connect', () => {
    console.log('✅ WebSocket conectado:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ WebSocket desconectado:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Error de conexión:', error.message);
  });

  return socket;
};

export const getSocket = (): Socket | null => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

---

## 🔐 Autenticación

### Inicializar socket después del login

```typescript
// src/pages/login.tsx o src/app/login/page.tsx
import { initializeSocket } from '@/services/socket';

const handleLogin = async (email: string, password: string) => {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const { data } = await response.json();
  const { token } = data;

  // Guardar token
  localStorage.setItem('token', token);

  // Inicializar WebSocket
  initializeSocket(token);

  // Redirigir a dashboard
  router.push('/dashboard');
};
```

---

## 📡 Eventos Disponibles

### Eventos del Cliente → Servidor

#### 1. **Obtener Chats**
```typescript
socket.emit('get-chats', {
  sessionId: string,
  page?: number,        // Default: 1
  limit?: number,       // Default: 20, Max: 100
  type?: 'all' | 'group' | 'individual'  // Default: 'all'
});

// Respuesta
socket.on('chats-list', (data) => {
  console.log(data);
  // {
  //   sessionId: string,
  //   chats: Chat[],
  //   meta: { page, limit, total, totalPages }
  // }
});
```

#### 2. **Obtener Mensajes**
```typescript
socket.emit('get-messages', {
  sessionId: string,
  chatId: string,
  page?: number,        // Default: 1
  limit?: number        // Default: 50, Max: 200
});

// Respuesta
socket.on('messages-list', (data) => {
  console.log(data);
  // {
  //   sessionId: string,
  //   chatId: string,
  //   messages: Message[],
  //   meta: { page, limit, total, totalPages }
  // }
});
```

#### 3. **Enviar Mensaje**
```typescript
socket.emit('send-message', {
  sessionId: string,
  to: string,           // chatId destino
  text: string
});

// Respuesta
socket.on('message-sent', (data) => {
  console.log('Mensaje enviado:', data);
  // { sessionId, to, text, messageId }
});

// Error
socket.on('message-error', (data) => {
  console.error('Error:', data.error);
});
```

#### 4. **Anclar/Desanclar Chat**
```typescript
socket.emit('pin-chat', {
  sessionId: string,
  chatId: string,
  isPinned: boolean
});

// Respuesta
socket.on('chat-pin-success', (data) => {
  console.log(data.message); // "Chat anclado" o "Chat desanclado"
  console.log(data.chat);    // Chat actualizado
});

socket.on('chat-error', (data) => {
  console.error(data.error);
});
```

#### 5. **Archivar/Desarchivar Chat**
```typescript
socket.emit('archive-chat', {
  sessionId: string,
  chatId: string,
  isArchived: boolean
});

// Respuesta
socket.on('chat-archive-success', (data) => {
  console.log(data.message); // "Chat archivado" o "Chat desarchivado"
  console.log(data.chat);
});
```

#### 6. **Marcar Chat como Leído**
```typescript
socket.emit('mark-chat-read', {
  sessionId: string,
  chatId: string
});

// Respuesta
socket.on('chat-read-success', (data) => {
  console.log(data.message); // "Chat marcado como leído"
  console.log(data.chat);    // unreadCount = 0
});
```

### Eventos del Servidor → Cliente (Broadcast)

#### 1. **Chat Actualizado** (Tiempo Real)
```typescript
socket.on('chat-updated', (data) => {
  console.log('Chat actualizado:', data);
  // {
  //   sessionId: string,
  //   chatId: string,
  //   action: 'pin' | 'archive' | 'read' | 'new-message',
  //   chat: Chat
  // }
  
  // Actualizar UI: refrescar lista, reordenar, etc.
});
```

#### 2. **Mensaje Nuevo Recibido**
```typescript
socket.on('message', (data) => {
  console.log('Nuevo mensaje:', data);
  // {
  //   sessionId: string,
  //   from: string,
  //   text: string,
  //   timestamp: string,
  //   messageId: string,
  //   messageType: string,
  //   media?: { fileId, type, filename, mimetype, size, isVoiceNote }
  // }
});
```

#### 3. **QR Code Generado**
```typescript
socket.on('qr', (data) => {
  console.log('QR generado:', data);
  // { sessionId: string, qr: string } // qr es dataURL
  
  // Mostrar en UI: <img src={data.qr} />
});
```

#### 4. **Conexión/Desconexión de Sesión**
```typescript
socket.on('connected', (data) => {
  console.log('Estado de sesión:', data);
  // { sessionId: string, status: boolean }
});
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Lista de Chats con Actualización en Tiempo Real

```typescript
// src/components/ChatList.tsx
import { useEffect, useState } from 'react';
import { getSocket } from '@/services/socket';

interface Chat {
  chatId: string;
  name: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  profilePicUrl?: string;
}

export const ChatList = ({ sessionId }: { sessionId: string }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const socket = getSocket();

  useEffect(() => {
    if (!socket) return;

    // Solicitar chats
    socket.emit('get-chats', { sessionId, page: 1, limit: 50, type: 'all' });

    // Recibir lista de chats
    socket.on('chats-list', ({ chats: receivedChats }) => {
      setChats(receivedChats);
      setLoading(false);
    });

    // Escuchar actualizaciones en tiempo real
    socket.on('chat-updated', ({ chatId, action, chat }) => {
      setChats((prev) => {
        // Actualizar chat existente
        const updated = prev.map((c) => 
          c.chatId === chatId ? chat : c
        );

        // Si es mensaje nuevo y el chat no existe, agregarlo
        if (action === 'new-message' && !prev.find(c => c.chatId === chatId)) {
          return [chat, ...updated];
        }

        // Reordenar: anclados primero, luego por fecha
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1;
          if (!a.isPinned && b.isPinned) return 1;
          return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
        });
      });
    });

    // Nuevo mensaje recibido
    socket.on('message', ({ from, text, timestamp }) => {
      console.log(`Nuevo mensaje de ${from}: ${text}`);
      // El evento 'chat-updated' ya maneja la actualización
    });

    return () => {
      socket.off('chats-list');
      socket.off('chat-updated');
      socket.off('message');
    };
  }, [sessionId, socket]);

  const handlePinChat = (chatId: string, isPinned: boolean) => {
    socket?.emit('pin-chat', { sessionId, chatId, isPinned: !isPinned });
  };

  const handleMarkAsRead = (chatId: string) => {
    socket?.emit('mark-chat-read', { sessionId, chatId });
  };

  if (loading) return <div>Cargando chats...</div>;

  return (
    <div className="chat-list">
      {chats.map((chat) => (
        <div key={chat.chatId} className="chat-item">
          <img src={chat.profilePicUrl || '/default-avatar.png'} alt={chat.name} />
          <div className="chat-info">
            <h3>{chat.name} {chat.isPinned && '📌'}</h3>
            <p>{chat.lastMessage}</p>
            <small>{new Date(chat.lastMessageTime).toLocaleString()}</small>
          </div>
          {chat.unreadCount > 0 && (
            <span className="unread-badge">{chat.unreadCount}</span>
          )}
          <button onClick={() => handlePinChat(chat.chatId, chat.isPinned)}>
            {chat.isPinned ? 'Desanclar' : 'Anclar'}
          </button>
          <button onClick={() => handleMarkAsRead(chat.chatId)}>
            Marcar leído
          </button>
        </div>
      ))}
    </div>
  );
};
```

### Ejemplo 2: Vista de Mensajes

```typescript
// src/components/ChatMessages.tsx
import { useEffect, useState, useRef } from 'react';
import { getSocket } from '@/services/socket';

interface Message {
  messageId: string;
  body: string;
  fromMe: boolean;
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  mediaUrl?: string;
  mediaType?: string;
}

export const ChatMessages = ({ sessionId, chatId }: { sessionId: string; chatId: string }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socket = getSocket();

  useEffect(() => {
    if (!socket) return;

    // Solicitar mensajes
    socket.emit('get-messages', { sessionId, chatId, page: 1, limit: 50 });

    // Recibir mensajes
    socket.on('messages-list', ({ messages: receivedMessages }) => {
      setMessages(receivedMessages);
      scrollToBottom();
    });

    // Nuevo mensaje recibido
    socket.on('message', ({ from, text, timestamp, messageId, messageType, media }) => {
      if (from === chatId) {
        setMessages((prev) => [...prev, {
          messageId,
          body: text,
          fromMe: false,
          timestamp: new Date(timestamp),
          status: 'delivered',
          mediaUrl: media?.fileId,
          mediaType: media?.type,
        }]);
        scrollToBottom();
      }
    });

    // Mensaje enviado confirmado
    socket.on('message-sent', ({ messageId, text }) => {
      setMessages((prev) => [...prev, {
        messageId,
        body: text,
        fromMe: true,
        timestamp: new Date(),
        status: 'sent',
      }]);
      scrollToBottom();
    });

    return () => {
      socket.off('messages-list');
      socket.off('message');
      socket.off('message-sent');
    };
  }, [sessionId, chatId, socket]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!inputText.trim() || !socket) return;

    socket.emit('send-message', {
      sessionId,
      to: chatId,
      text: inputText,
    });

    setInputText('');
  };

  return (
    <div className="chat-messages">
      <div className="messages-container">
        {messages.map((msg) => (
          <div
            key={msg.messageId}
            className={`message ${msg.fromMe ? 'sent' : 'received'}`}
          >
            <p>{msg.body}</p>
            <small>{new Date(msg.timestamp).toLocaleTimeString()}</small>
            {msg.fromMe && <span className="status">{msg.status}</span>}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="input-container">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Escribe un mensaje..."
        />
        <button onClick={handleSendMessage}>Enviar</button>
      </div>
    </div>
  );
};
```

---

## 🎣 Hooks de React

### Hook personalizado para WebSocket

```typescript
// src/hooks/useSocket.ts
import { useEffect, useState } from 'react';
import { getSocket, initializeSocket } from '@/services/socket';
import { Socket } from 'socket.io-client';

export const useSocket = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const socketInstance = initializeSocket(token);
    setSocket(socketInstance);

    socketInstance.on('connect', () => setConnected(true));
    socketInstance.on('disconnect', () => setConnected(false));

    return () => {
      socketInstance.off('connect');
      socketInstance.off('disconnect');
    };
  }, []);

  return { socket, connected };
};
```

### Hook para chats

```typescript
// src/hooks/useChats.ts
import { useEffect, useState } from 'react';
import { useSocket } from './useSocket';

interface Chat {
  chatId: string;
  name: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
}

export const useChats = (sessionId: string) => {
  const { socket } = useSocket();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!socket || !sessionId) return;

    socket.emit('get-chats', { sessionId, page: 1, limit: 100 });

    socket.on('chats-list', ({ chats: receivedChats }) => {
      setChats(receivedChats);
      setLoading(false);
    });

    socket.on('chat-updated', ({ chatId, chat }) => {
      setChats((prev) => {
        const exists = prev.find((c) => c.chatId === chatId);
        if (exists) {
          return prev.map((c) => (c.chatId === chatId ? chat : c));
        }
        return [chat, ...prev];
      });
    });

    return () => {
      socket.off('chats-list');
      socket.off('chat-updated');
    };
  }, [socket, sessionId]);

  const pinChat = (chatId: string, isPinned: boolean) => {
    socket?.emit('pin-chat', { sessionId, chatId, isPinned });
  };

  const archiveChat = (chatId: string, isArchived: boolean) => {
    socket?.emit('archive-chat', { sessionId, chatId, isArchived });
  };

  const markAsRead = (chatId: string) => {
    socket?.emit('mark-chat-read', { sessionId, chatId });
  };

  return { chats, loading, pinChat, archiveChat, markAsRead };
};
```

---

## ⚠️ Manejo de Errores

```typescript
// src/services/socket.ts
export const setupErrorHandlers = (socket: Socket) => {
  socket.on('chat-error', (data) => {
    console.error('Error en chat:', data.error);
    // Mostrar notificación al usuario
    toast.error(data.error);
  });

  socket.on('message-error', (data) => {
    console.error('Error enviando mensaje:', data.error);
    toast.error(`No se pudo enviar el mensaje: ${data.error}`);
  });

  socket.on('connect_error', (error) => {
    console.error('Error de conexión:', error.message);
    if (error.message === 'Unauthorized') {
      // Token inválido, redirigir a login
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
  });
};
```

---

## ✅ Best Practices

### 1. **Cleanup de listeners**
```typescript
useEffect(() => {
  socket?.on('event', handler);
  
  return () => {
    socket?.off('event', handler);
  };
}, [socket]);
```

### 2. **Reconexión automática**
```typescript
const socket = io(BACKEND_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
});
```

### 3. **Manejo de estado de conexión**
```typescript
const [isConnected, setIsConnected] = useState(false);

socket.on('connect', () => setIsConnected(true));
socket.on('disconnect', () => setIsConnected(false));

// Mostrar indicador en UI
{!isConnected && <div className="offline-banner">Sin conexión</div>}
```

### 4. **Debounce para eventos frecuentes**
```typescript
import { debounce } from 'lodash';

const handleTyping = debounce(() => {
  socket.emit('typing', { chatId });
}, 300);
```

### 5. **Paginación infinita**
```typescript
const loadMoreMessages = () => {
  const nextPage = currentPage + 1;
  socket.emit('get-messages', { sessionId, chatId, page: nextPage, limit: 50 });
};
```

---

## 🔗 Endpoints REST Alternativos

Si prefieres usar REST en lugar de WebSocket para algunas operaciones:

```typescript
// GET /api/sessions/:sessionId/chats
const getChats = async (sessionId: string) => {
  const response = await fetch(`/api/sessions/${sessionId}/chats?page=1&limit=20`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
};

// PATCH /api/sessions/:sessionId/chats/:chatId/pin
const pinChat = async (sessionId: string, chatId: string, isPinned: boolean) => {
  const response = await fetch(`/api/sessions/${sessionId}/chats/${chatId}/pin`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ isPinned })
  });
  return response.json();
};
```

---

## 📚 Recursos Adicionales

- [Socket.IO Client Docs](https://socket.io/docs/v4/client-api/)
- [React + Socket.IO Guide](https://socket.io/how-to/use-with-react)
- [TypeScript Types](https://socket.io/docs/v4/typescript/)

---

## 🐛 Troubleshooting

### Problema: "Unauthorized" al conectar
**Solución**: Verifica que el token JWT sea válido y esté en el formato correcto (`Bearer <token>`)

### Problema: Eventos no se reciben
**Solución**: Asegúrate de que los listeners estén registrados antes de emitir eventos

### Problema: Múltiples conexiones
**Solución**: Usa un singleton para el socket y desconecta en cleanup

### Problema: CORS errors
**Solución**: Verifica la configuración CORS del backend en `server.ts`

---

## 📞 Soporte

Si tienes problemas, revisa:
1. Consola del navegador (errores de WebSocket)
2. Network tab (handshake de Socket.IO)
3. Logs del backend (autenticación JWT)

---

**Última actualización**: 2025-10-10

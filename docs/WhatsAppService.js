// =====================================================
// SERVICIO DE WHATSAPP - IMPLEMENTACIÓN DUAL
// =====================================================

class WhatsAppService {
  constructor() {
    this.socket = null;
    this.baseURL = 'http://localhost:5000';
    this.token = localStorage.getItem('jwt_token');
  }

  // =====================================================
  // CONEXIÓN SOCKET.IO
  // =====================================================

  connectSocket() {
    if (this.socket?.connected) return this.socket;

    this.socket = io('http://localhost:5000', {
      auth: { token: this.token },
      transports: ['websocket', 'polling']
    });

    // Eventos de conexión
    this.socket.on('connect', () => {
      console.log('✅ Socket conectado:', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket desconectado');
    });

    // Eventos de error
    this.socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión socket:', error);
    });

    // Escuchar mensajes entrantes
    this.socket.on('message', (data) => {
      console.log('📨 Mensaje recibido:', data);
      this.onMessageReceived?.(data);
    });

    // Escuchar confirmación de envío
    this.socket.on('message-sent', (data) => {
      console.log('✅ Mensaje enviado:', data);
      this.onMessageSent?.(data);
    });

    return this.socket;
  }

  disconnectSocket() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // =====================================================
  // ENVÍO POR SOCKET.IO
  // =====================================================

  async sendMessageSocket(sessionId, to, text, options = {}) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        this.connectSocket();
        setTimeout(() => this.sendMessageSocket(sessionId, to, text, options)
          .then(resolve).catch(reject), 1000);
        return;
      }

      const messageData = {
        sessionId,
        to,
        text,
        ...options
      };

      // Configurar timeout
      const timeout = setTimeout(() => {
        reject(new Error('Timeout: No se recibió confirmación del mensaje'));
      }, 10000);

      // Escuchar confirmación
      const handleMessageSent = (data) => {
        if (data.sessionId === sessionId && data.to === to) {
          clearTimeout(timeout);
          this.socket.off('message-sent', handleMessageSent);
          this.socket.off('message-error', handleMessageError);
          resolve(data);
        }
      };

      const handleMessageError = (error) => {
        clearTimeout(timeout);
        this.socket.off('message-sent', handleMessageSent);
        this.socket.off('message-error', handleMessageError);
        reject(new Error(error.error || 'Error enviando mensaje'));
      };

      this.socket.on('message-sent', handleMessageSent);
      this.socket.on('message-error', handleMessageError);

      // Enviar mensaje
      this.socket.emit('send-message', messageData);
    });
  }

  // =====================================================
  // ENVÍO POR API REST
  // =====================================================

  async sendMessageREST(sessionId, to, text, options = {}) {
    try {
      const response = await fetch(`${this.baseURL}/api/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to,
          text,
          ...options
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      return result;
    } catch (error) {
      console.error('Error enviando mensaje REST:', error);
      throw error;
    }
  }

  // =====================================================
  // MÉTODOS DE CONVENIENCIA
  // =====================================================

  // Auto-detectar método basado en conexión
  async sendMessage(sessionId, to, text, options = {}) {
    const preferSocket = options.socket !== false;

    if (preferSocket && this.socket?.connected) {
      try {
        return await this.sendMessageSocket(sessionId, to, text, options);
      } catch (error) {
        console.warn('Socket falló, intentando REST:', error);
      }
    }

    return await this.sendMessageREST(sessionId, to, text, options);
  }

  // =====================================================
  // OBTENER CHATS Y SESIONES
  // =====================================================

  async getSessions() {
    if (this.socket?.connected) {
      return new Promise((resolve) => {
        this.socket.emit('get-sessions');
        this.socket.on('sessions-list', (data) => {
          resolve(data);
        });
      });
    } else {
      // Fallback a REST API si hay endpoint disponible
      try {
        const response = await fetch(`${this.baseURL}/api/sessions`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        return await response.json();
      } catch (error) {
        throw new Error('No se pudieron obtener sesiones');
      }
    }
  }

  async getChats(sessionId, options = {}) {
    if (this.socket?.connected) {
      return new Promise((resolve) => {
        this.socket.emit('get-chats', {
          sessionId,
          ...options
        });
        this.socket.on('chats-list', (data) => {
          resolve(data);
        });
      });
    } else {
      // Fallback a REST API
      try {
        const params = new URLSearchParams(options);
        const response = await fetch(`${this.baseURL}/api/sessions/${sessionId}/chats?${params}`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        return await response.json();
      } catch (error) {
        throw new Error('No se pudieron obtener chats');
      }
    }
  }

  async getMessages(sessionId, chatId, options = {}) {
    if (this.socket?.connected) {
      return new Promise((resolve) => {
        this.socket.emit('get-messages', {
          sessionId,
          chatId,
          ...options
        });
        this.socket.on('messages-list', (data) => {
          resolve(data);
        });
      });
    } else {
      // Fallback a REST API
      try {
        const params = new URLSearchParams(options);
        const response = await fetch(`${this.baseURL}/api/sessions/${sessionId}/chats/${chatId}/messages?${params}`, {
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
        return await response.json();
      } catch (error) {
        throw new Error('No se pudieron obtener mensajes');
      }
    }
  }

  // =====================================================
  // CALLBACKS PARA EVENTOS
  // =====================================================

  onMessageReceived = null;
  onMessageSent = null;

  setMessageReceivedCallback(callback) {
    this.onMessageReceived = callback;
  }

  setMessageSentCallback(callback) {
    this.onMessageSent = callback;
  }
}

// =====================================================
// EJEMPLO DE USO
// =====================================================

const whatsApp = new WhatsAppService();

// Configurar callbacks
whatsApp.setMessageReceivedCallback((data) => {
  console.log('Nuevo mensaje recibido:', data);
  // Actualizar UI, mostrar notificación, etc.
});

whatsApp.setMessageSentCallback((data) => {
  console.log('Mensaje enviado confirmado:', data);
  // Actualizar UI, mostrar confirmación, etc.
});

// =====================================================
// FUNCIONES DE CONVENIENCIA
// =====================================================

export const formatPhoneNumber = (phone) => {
  // Convertir número a formato WhatsApp
  const cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length >= 10) {
    return `${cleanPhone}@c.us`;
  }
  throw new Error('Número de teléfono inválido');
};

export const isValidWhatsAppId = (id) => {
  return /^[\d]+@(?:c|g)\.us$/.test(id) || /^[\d]+@g\.us$/.test(id);
};

// =====================================================
// EJEMPLO DE COMPONENTE REACT
// =====================================================

/*
import React, { useState, useEffect } from 'react';
import { whatsApp, formatPhoneNumber } from './WhatsAppService';

const ChatComponent = () => {
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [messageText, setMessageText] = useState('');
  const [recipient, setRecipient] = useState('');

  useEffect(() => {
    // Cargar sesiones
    whatsApp.getSessions().then(setSessions).catch(console.error);

    // Conectar socket si no está conectado
    whatsApp.connectSocket();

    return () => {
      whatsApp.disconnectSocket();
    };
  }, []);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedSession || !recipient) return;

    try {
      let recipientId = recipient;
      if (!isValidWhatsAppId(recipient)) {
        recipientId = formatPhoneNumber(recipient);
      }

      await whatsApp.sendMessage(selectedSession, recipientId, messageText);

      // Limpiar campo
      setMessageText('');

      // Recargar mensajes para mostrar el enviado
      const messagesData = await whatsApp.getMessages(selectedSession, recipientId);
      setMessages(messagesData.messages || []);

    } catch (error) {
      console.error('Error enviando mensaje:', error);
      alert('Error enviando mensaje: ' + error.message);
    }
  };

  return (
    <div className="chat-container">
      <div className="sessions">
        <select
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
        >
          <option value="">Seleccionar sesión...</option>
          {sessions.map(session => (
            <option key={session.sessionId} value={session.sessionId}>
              {session.name} ({session.isConnected ? '🟢' : '🔴'})
            </option>
          ))}
        </select>
      </div>

      <div className="messages">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.fromMe ? 'sent' : 'received'}`}>
            <p>{msg.body}</p>
            <small>{new Date(msg.timestamp).toLocaleString()}</small>
          </div>
        ))}
      </div>

      <div className="message-input">
        <input
          type="text"
          placeholder="Número o ID de chat (ej: 1234567890)"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
        <textarea
          placeholder="Escribir mensaje..."
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
        />
        <button onClick={handleSendMessage}>Enviar</button>
      </div>
    </div>
  );
};

export default ChatComponent;
*/

// =====================================================
// TESTING RÁPIDO EN CONSOLA
// =====================================================

/*
// En la consola del navegador:
const testWhatsApp = async () => {
  try {
    // 1. Obtener sesiones
    const sessions = await whatsApp.getSessions();
    console.log('Sesiones:', sessions);

    if (sessions.length > 0) {
      const sessionId = sessions[0].sessionId;

      // 2. Obtener chats
      const chats = await whatsApp.getChats(sessionId);
      console.log('Chats:', chats);

      if (chats.chats && chats.chats.length > 0) {
        const chatId = chats.chats[0].chatId;

        // 3. Obtener mensajes
        const messages = await whatsApp.getMessages(sessionId, chatId);
        console.log('Mensajes:', messages);

        // 4. Enviar mensaje
        await whatsApp.sendMessage(sessionId, chatId, 'Mensaje de prueba desde consola!');
        console.log('✅ Mensaje enviado!');
      }
    }
  } catch (error) {
    console.error('❌ Error:', error);
  }
};

// Ejecutar test
testWhatsApp();
*/

export default WhatsAppService;

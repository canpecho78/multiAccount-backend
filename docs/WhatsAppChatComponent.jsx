import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// =====================================================
// SERVICIO DUAL PARA WHATSAPP
// =====================================================

class WhatsAppService {
  constructor() {
    this.socket = null;
    this.baseURL = 'http://localhost:5000';
    this.token = localStorage.getItem('jwt_token') || 'TU_JWT_TOKEN_AQUI';
  }

  // Conectar socket
  connectSocket() {
    if (this.socket?.connected) return this.socket;

    this.socket = io('http://localhost:5000', {
      auth: { token: this.token }
    });

    this.socket.on('connect', () => console.log('✅ Socket conectado'));
    this.socket.on('disconnect', () => console.log('❌ Socket desconectado'));
    this.socket.on('message', (data) => console.log('📨 Mensaje recibido:', data));
    this.socket.on('message-sent', (data) => console.log('✅ Mensaje enviado:', data));

    return this.socket;
  }

  // Método 1: Socket.IO (Tiempo Real)
  async sendMessageSocket(sessionId, to, text) {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        this.connectSocket();
        setTimeout(() => this.sendMessageSocket(sessionId, to, text).then(resolve).catch(reject), 1000);
        return;
      }

      const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);

      const handleSent = (data) => {
        if (data.sessionId === sessionId && data.to === to) {
          clearTimeout(timeout);
          this.socket.off('message-sent', handleSent);
          this.socket.off('message-error', handleError);
          resolve(data);
        }
      };

      const handleError = (error) => {
        clearTimeout(timeout);
        this.socket.off('message-sent', handleSent);
        this.socket.off('message-error', handleError);
        reject(new Error(error.error));
      };

      this.socket.on('message-sent', handleSent);
      this.socket.on('message-error', handleError);
      this.socket.emit('send-message', { sessionId, to, text });
    });
  }

  // Método 2: API REST (HTTP)
  async sendMessageREST(sessionId, to, text) {
    const response = await fetch(`${this.baseURL}/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, text })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  }

  // Auto-seleccionar método
  async sendMessage(sessionId, to, text, preferSocket = true) {
    if (preferSocket && this.socket?.connected) {
      try {
        return await this.sendMessageSocket(sessionId, to, text);
      } catch (error) {
        console.warn('Socket falló, usando REST:', error);
      }
    }
    return await this.sendMessageREST(sessionId, to, text);
  }

  async getSessions() {
    if (this.socket?.connected) {
      return new Promise((resolve) => {
        this.socket.emit('get-sessions');
        this.socket.on('sessions-list', resolve);
      });
    } else {
      const response = await fetch(`${this.baseURL}/api/sessions`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      return await response.json();
    }
  }

  async getChats(sessionId) {
    if (this.socket?.connected) {
      return new Promise((resolve) => {
        this.socket.emit('get-chats', sessionId);
        this.socket.on('chats-list', resolve);
      });
    } else {
      const response = await fetch(`${this.baseURL}/api/sessions/${sessionId}/chats`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      return await response.json();
    }
  }

  async getMessages(sessionId, chatId) {
    if (this.socket?.connected) {
      return new Promise((resolve) => {
        this.socket.emit('get-messages', { sessionId, chatId });
        this.socket.on('messages-list', resolve);
      });
    } else {
      const response = await fetch(`${this.baseURL}/api/sessions/${sessionId}/chats/${chatId}/messages`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      return await response.json();
    }
  }
}

// =====================================================
// COMPONENTE REACT DE EJEMPLO
// =====================================================

const WhatsAppChat = () => {
  const [sessions, setSessions] = useState([]);
  const [chats, setChats] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedChat, setSelectedChat] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [sendMethod, setSendMethod] = useState('auto'); // 'socket', 'rest', 'auto'

  const whatsApp = useRef(new WhatsAppService()).current;
  const messagesEndRef = useRef(null);

  // Inicializar
  useEffect(() => {
    loadSessions();
    whatsApp.connectSocket();

    whatsApp.socket?.on('connect', () => setIsConnected(true));
    whatsApp.socket?.on('disconnect', () => setIsConnected(false));

    return () => {
      whatsApp.socket?.disconnect();
    };
  }, []);

  // Auto-scroll a nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadSessions = async () => {
    try {
      const data = await whatsApp.getSessions();
      setSessions(data || []);
    } catch (error) {
      console.error('Error cargando sesiones:', error);
    }
  };

  const loadChats = async (sessionId) => {
    try {
      setSelectedSession(sessionId);
      const data = await whatsApp.getChats(sessionId);
      setChats(data.chats || []);
      setSelectedChat('');
      setMessages([]);
    } catch (error) {
      console.error('Error cargando chats:', error);
    }
  };

  const loadMessages = async (chatId) => {
    try {
      setSelectedChat(chatId);
      const data = await whatsApp.getMessages(selectedSession, chatId);
      setMessages(data.messages || []);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedSession || !selectedChat) return;

    try {
      let method = sendMethod;
      if (sendMethod === 'auto') {
        method = whatsApp.socket?.connected ? 'socket' : 'rest';
      }

      console.log(`Enviando por ${method.toUpperCase()}...`);

      await whatsApp.sendMessage(selectedSession, selectedChat, messageText, {
        socket: method === 'socket'
      });

      setMessageText('');

      // Recargar mensajes después de 1 segundo
      setTimeout(() => {
        loadMessages(selectedChat);
      }, 1000);

    } catch (error) {
      console.error('Error enviando mensaje:', error);
      alert(`Error enviando mensaje: ${error.message}`);
    }
  };

  const formatPhoneNumber = (phone) => {
    const clean = phone.replace(/\D/g, '');
    return clean.length >= 10 ? `${clean}@c.us` : null;
  };

  const handleRecipientChange = (value) => {
    // Si es un número, convertirlo automáticamente
    if (/^\d+$/.test(value) && !value.includes('@')) {
      const formatted = formatPhoneNumber(value);
      if (formatted) {
        setSelectedChat(formatted);
        return;
      }
    }
    setSelectedChat(value);
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '20px',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1>WhatsApp Chat - Dual Implementation</h1>

      {/* Estado de conexión */}
      <div style={{
        padding: '10px',
        marginBottom: '20px',
        backgroundColor: isConnected ? '#d4edda' : '#f8d7da',
        border: `1px solid ${isConnected ? '#c3e6cb' : '#f5c6cb'}`,
        borderRadius: '5px'
      }}>
        Estado: {isConnected ? '🟢 Conectado (Socket)' : '🔴 Desconectado (REST)'}
      </div>

      {/* Selector de método de envío */}
      <div style={{ marginBottom: '20px' }}>
        <label>Método de envío: </label>
        <select
          value={sendMethod}
          onChange={(e) => setSendMethod(e.target.value)}
          style={{ marginLeft: '10px', padding: '5px' }}
        >
          <option value="auto">Auto (Socket si disponible)</option>
          <option value="socket">Socket.IO</option>
          <option value="rest">API REST</option>
        </select>
      </div>

      {/* Sesiones */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Sesiones</h3>
        <select
          value={selectedSession}
          onChange={(e) => loadChats(e.target.value)}
          style={{ width: '100%', padding: '10px' }}
        >
          <option value="">Seleccionar sesión...</option>
          {sessions.map(session => (
            <option key={session.sessionId} value={session.sessionId}>
              {session.name || session.sessionId} - {session.isConnected ? '🟢' : '🔴'}
            </option>
          ))}
        </select>
      </div>

      {/* Chats */}
      <div style={{ marginBottom: '20px' }}>
        <h3>Chats</h3>
        <select
          value={selectedChat}
          onChange={(e) => loadMessages(e.target.value)}
          style={{ width: '100%', padding: '10px' }}
        >
          <option value="">Seleccionar chat...</option>
          {chats.map(chat => (
            <option key={chat.chatId} value={chat.chatId}>
              {chat.name || chat.chatId} - {chat.unreadCount ? `(${chat.unreadCount} sin leer)` : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Mensajes */}
      <div style={{
        border: '1px solid #ddd',
        height: '400px',
        overflowY: 'auto',
        padding: '15px',
        marginBottom: '20px',
        backgroundColor: '#f9f9f9'
      }}>
        {messages.length === 0 ? (
          <p style={{ color: '#666', textAlign: 'center' }}>
            {selectedChat ? 'Cargando mensajes...' : 'Seleccionar un chat para ver mensajes'}
          </p>
        ) : (
          messages.map((msg, index) => (
            <div key={index} style={{
              marginBottom: '15px',
              padding: '10px',
              backgroundColor: msg.fromMe ? '#007bff' : '#e9ecef',
              color: msg.fromMe ? 'white' : 'black',
              borderRadius: '10px',
              maxWidth: '70%',
              alignSelf: msg.fromMe ? 'flex-end' : 'flex-start',
              marginLeft: msg.fromMe ? 'auto' : '0'
            }}>
              <p style={{ margin: '0 0 5px 0' }}>{msg.body}</p>
              <small style={{
                opacity: 0.8,
                fontSize: '12px'
              }}>
                {new Date(msg.timestamp).toLocaleString()}
                {msg.fromMe && ' ✓'}
              </small>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de mensaje */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Destinatario:
          </label>
          <input
            type="text"
            placeholder="Número (1234567890) o ID de chat"
            value={selectedChat}
            onChange={(e) => handleRecipientChange(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px'
            }}
          />
        </div>

        <div style={{ flex: 2 }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>
            Mensaje:
          </label>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Escribir mensaje... (Enter para enviar)"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            style={{
              width: '100%',
              height: '80px',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '5px',
              resize: 'vertical'
            }}
          />
        </div>

        <button
          onClick={sendMessage}
          disabled={!messageText.trim() || !selectedSession || !selectedChat}
          style={{
            padding: '10px 20px',
            backgroundColor: (!messageText.trim() || !selectedSession || !selectedChat) ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: (!messageText.trim() || !selectedSession || !selectedChat) ? 'not-allowed' : 'pointer',
            height: 'fit-content'
          }}
        >
          Enviar
        </button>
      </div>

      {/* Información de debug */}
      <div style={{
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#f8f9fa',
        borderRadius: '5px',
        fontSize: '12px',
        color: '#666'
      }}>
        <p><strong>Debug Info:</strong></p>
        <p>Sesión: {selectedSession || 'Ninguna'}</p>
        <p>Chat: {selectedChat || 'Ninguno'}</p>
        <p>Mensajes: {messages.length}</p>
        <p>Método: {sendMethod}</p>
      </div>
    </div>
  );
};

export default WhatsAppChat;

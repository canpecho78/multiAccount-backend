// =====================================================
// TESTING RÁPIDO - PRUEBA INMEDIATA EN CONSOLA
// =====================================================

// Copia y pega esto en la consola del navegador (F12)

const testWhatsAppDual = async () => {
  console.log('🚀 Iniciando pruebas duales de WhatsApp...');

  // =====================================================
  // 1. CONFIGURACIÓN INICIAL
  // =====================================================

  const socket = io('http://localhost:5000', {
    auth: { token: 'TU_JWT_TOKEN_AQUI' } // Reemplaza con tu token real
  });

  await new Promise(resolve => {
    socket.on('connect', resolve);
    console.log('⏳ Conectando al socket...');
  });

  console.log('✅ Socket conectado:', socket.id);

  // =====================================================
  // 2. OBTENER SESIONES
  // =====================================================

  console.log('\n📋 Obteniendo sesiones...');

  const sessions = await new Promise(resolve => {
    socket.emit('get-sessions');
    socket.on('sessions-list', resolve);
  });

  console.log('Sesiones disponibles:', sessions);

  if (sessions.length === 0) {
    console.log('⚠️  No hay sesiones disponibles. Crea una sesión primero.');
    return;
  }

  const sessionId = sessions[0].sessionId;
  console.log('Usando sesión:', sessionId);

  // =====================================================
  // 3. OBTENER CHATS
  // =====================================================

  console.log('\n💬 Obteniendo chats...');

  const chatsData = await new Promise(resolve => {
    socket.emit('get-chats', sessionId);
    socket.on('chats-list', resolve);
  });

  console.log('Chats disponibles:', chatsData.chats?.length || 0);

  if (!chatsData.chats || chatsData.chats.length === 0) {
    console.log('⚠️  No hay chats disponibles en esta sesión.');
    return;
  }

  const chatId = chatsData.chats[0].chatId;
  console.log('Usando chat:', chatId);

  // =====================================================
  // 4. OBTENER MENSAJES
  // =====================================================

  console.log('\n📨 Obteniendo mensajes...');

  const messagesData = await new Promise(resolve => {
    socket.emit('get-messages', { sessionId, chatId, limit: 10 });
    socket.on('messages-list', resolve);
  });

  console.log('Mensajes recientes:', messagesData.messages?.length || 0);

  // =====================================================
  // 5. ENVIAR MENSAJE POR SOCKET
  // =====================================================

  console.log('\n📤 Enviando mensaje por Socket.IO...');

  try {
    const socketResult = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);

      socket.on('message-sent', (data) => {
        clearTimeout(timeout);
        resolve(data);
      });

      socket.on('message-error', (error) => {
        clearTimeout(timeout);
        reject(new Error(error.error));
      });

      socket.emit('send-message', {
        sessionId,
        to: chatId,
        text: `Mensaje de prueba SOCKET - ${new Date().toLocaleTimeString()}`
      });
    });

    console.log('✅ Mensaje enviado por Socket:', socketResult);
  } catch (error) {
    console.log('❌ Error con Socket:', error.message);
  }

  // =====================================================
  // 6. ENVIAR MENSAJE POR REST API
  // =====================================================

  console.log('\n🌐 Enviando mensaje por REST API...');

  try {
    const restResponse = await fetch(`http://localhost:5000/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer TU_JWT_TOKEN_AQUI`, // Reemplaza con tu token real
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to: chatId,
        text: `Mensaje de prueba REST - ${new Date().toLocaleTimeString()}`
      })
    });

    const restResult = await restResponse.json();

    if (restResponse.ok) {
      console.log('✅ Mensaje enviado por REST:', restResult);
    } else {
      console.log('❌ Error con REST:', restResult);
    }
  } catch (error) {
    console.log('❌ Error de red con REST:', error.message);
  }

  // =====================================================
  // 7. VERIFICAR MENSAJES ENVIADOS
  // =====================================================

  console.log('\n🔍 Verificando mensajes enviados...');

  const updatedMessages = await new Promise(resolve => {
    socket.emit('get-messages', { sessionId, chatId, limit: 20 });
    socket.on('messages-list', resolve);
  });

  console.log('Total mensajes ahora:', updatedMessages.messages?.length || 0);

  // =====================================================
  // 8. LIMPIAR
  // =====================================================

  socket.disconnect();
  console.log('\n🧹 Socket desconectado');
  console.log('✨ Pruebas completadas!');

  return {
    sessions,
    chats: chatsData.chats,
    messages: updatedMessages.messages
  };
};

// =====================================================
// EJECUTAR PRUEBA
// =====================================================

// Descomenta la siguiente línea para ejecutar:
// testWhatsAppDual().then(result => console.log('Resultado final:', result)).catch(console.error);

// =====================================================
// TESTING PASO A PASO (para debugging)
// =====================================================

const testStepByStep = async () => {
  // 1. Conectar socket
  const socket = io('http://localhost:5000', {
    auth: { token: 'TU_JWT_TOKEN_AQUI' }
  });

  await new Promise(resolve => socket.on('connect', resolve));
  console.log('✅ Socket conectado');

  // 2. Probar obtener sesiones
  const sessions = await new Promise(resolve => {
    socket.emit('get-sessions');
    socket.on('sessions-list', resolve);
  });
  console.log('📋 Sesiones:', sessions);

  // 3. Probar envío de mensaje
  if (sessions.length > 0) {
    const sessionId = sessions[0].sessionId;

    // Primero obtener chats
    const chats = await new Promise(resolve => {
      socket.emit('get-chats', sessionId);
      socket.on('chats-list', resolve);
    });

    if (chats.chats && chats.chats.length > 0) {
      const chatId = chats.chats[0].chatId;

      // Enviar mensaje
      socket.emit('send-message', {
        sessionId,
        to: chatId,
        text: 'Mensaje de prueba paso a paso!'
      });

      console.log('📤 Mensaje enviado, esperando confirmación...');

      // Escuchar respuesta
      socket.on('message-sent', (data) => {
        console.log('✅ Confirmación recibida:', data);
      });
    }
  }

  // Mantener conexión abierta para ver respuestas
  // socket.disconnect(); // Descomenta para cerrar
};

// =====================================================
// FUNCIONES DE UTILIDAD
// =====================================================

const formatPhoneNumber = (phone) => {
  const clean = phone.replace(/\D/g, '');
  return clean.length >= 10 ? `${clean}@c.us` : null;
};

const isValidWhatsAppId = (id) => {
  return /^[\d]+@(?:c|g)\.us$/.test(id);
};

// =====================================================
// EJEMPLO DE INTEGRACIÓN EN APP
// =====================================================

/*
// En tu aplicación React/Vue/etc:

import { io } from 'socket.io-client';

class WhatsAppManager {
  constructor() {
    this.socket = null;
    this.baseURL = 'http://localhost:5000';
  }

  // Inicializar
  async init(token) {
    // Conectar socket
    this.socket = io(this.baseURL, {
      auth: { token }
    });

    await new Promise(resolve => this.socket.on('connect', resolve));

    // Configurar listeners
    this.socket.on('message', this.handleIncomingMessage);
    this.socket.on('message-sent', this.handleMessageSent);

    return this.socket;
  }

  // Enviar mensaje (auto-detectar método)
  async sendMessage(sessionId, to, text) {
    // Intentar socket primero
    if (this.socket?.connected) {
      try {
        return await this.sendMessageSocket(sessionId, to, text);
      } catch (error) {
        console.warn('Socket failed, trying REST');
      }
    }

    // Fallback a REST
    return await this.sendMessageREST(sessionId, to, text);
  }

  async sendMessageSocket(sessionId, to, text) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);

      this.socket.on('message-sent', (data) => {
        clearTimeout(timeout);
        resolve(data);
      });

      this.socket.on('message-error', (error) => {
        clearTimeout(timeout);
        reject(new Error(error.error));
      });

      this.socket.emit('send-message', { sessionId, to, text });
    });
  }

  async sendMessageREST(sessionId, to, text) {
    const response = await fetch(`${this.baseURL}/api/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ to, text })
    });

    return await response.json();
  }

  handleIncomingMessage = (data) => {
    console.log('Nuevo mensaje:', data);
    // Actualizar UI
  };

  handleMessageSent = (data) => {
    console.log('Mensaje enviado:', data);
    // Actualizar UI
  };
}

// Uso:
const whatsApp = new WhatsAppManager();
await whatsApp.init('TU_TOKEN');
await whatsApp.sendMessage('session-123', '1234567890@c.us', 'Hola!');
*/

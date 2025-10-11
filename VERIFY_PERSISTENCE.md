# Verificación de Persistencia en MongoDB

## 🔍 Cómo verificar que los datos se guardan correctamente

### 1. Conectar a MongoDB

```bash
# Usando MongoDB Compass (GUI)
# URL: mongodb://localhost:27017
# Database: tu_database_name

# O usando mongo shell
mongosh
use tu_database_name
```

### 2. Verificar Colecciones

```javascript
// Ver todas las colecciones
show collections

// Deberías ver:
// - chats
// - messages
// - sessions
// - media
// - authstates
// - authkeys
// - assignments
// - users
// - roles
```

### 3. Verificar Mensajes

```javascript
// Ver últimos 10 mensajes
db.messages.find().sort({ timestamp: -1 }).limit(10).pretty()

// Contar mensajes por sesión
db.messages.aggregate([
  { $group: { _id: "$sessionId", count: { $sum: 1 } } }
])

// Ver mensajes de un chat específico
db.messages.find({ 
  sessionId: "MI_SESION", 
  chatId: "123@s.whatsapp.net" 
}).sort({ timestamp: -1 })

// Ver mensajes con multimedia
db.messages.find({ mediaUrl: { $ne: null } }).limit(10)
```

### 4. Verificar Chats

```javascript
// Ver todos los chats
db.chats.find().pretty()

// Ver chats de una sesión
db.chats.find({ sessionId: "MI_SESION" }).sort({ lastMessageTime: -1 })

// Ver chats anclados
db.chats.find({ isPinned: true })

// Ver chats con mensajes no leídos
db.chats.find({ unreadCount: { $gt: 0 } })
```

### 5. Verificar Multimedia

```javascript
// Ver archivos multimedia guardados
db.media.find({}, { fileId: 1, mediaType: 1, size: 1, createdAt: 1 })

// Contar por tipo
db.media.aggregate([
  { $group: { _id: "$mediaType", count: { $sum: 1 }, totalSize: { $sum: "$size" } } }
])

// Ver fotos de perfil
db.media.find({ mediaType: "profile-pic" })
```

### 6. Verificar Sesiones

```javascript
// Ver todas las sesiones
db.sessions.find().pretty()

// Ver sesiones activas
db.sessions.find({ isActive: true, isConnected: true })

// Ver estadísticas de sesión
db.sessions.find({}, { 
  sessionId: 1, 
  status: 1, 
  isConnected: 1, 
  totalChats: 1, 
  messagesSent: 1, 
  messagesReceived: 1 
})
```

## 📊 Queries Útiles para Análisis

### Mensajes por día
```javascript
db.messages.aggregate([
  {
    $group: {
      _id: { 
        $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }
      },
      count: { $sum: 1 }
    }
  },
  { $sort: { _id: -1 } }
])
```

### Top 10 chats con más mensajes
```javascript
db.messages.aggregate([
  { $group: { _id: "$chatId", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 10 }
])
```

### Espacio usado por multimedia
```javascript
db.media.aggregate([
  {
    $group: {
      _id: "$mediaType",
      totalSize: { $sum: "$size" },
      count: { $sum: 1 },
      avgSize: { $avg: "$size" }
    }
  }
])
```

### Tasa de respuesta (mensajes enviados vs recibidos)
```javascript
db.messages.aggregate([
  {
    $group: {
      _id: "$fromMe",
      count: { $sum: 1 }
    }
  }
])
```

## 🧪 Test de Persistencia

### Script de prueba (Node.js)

```javascript
// test-persistence.js
const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/tu_database');

async function testPersistence() {
  // Test 1: Verificar que hay mensajes
  const Message = mongoose.model('Message');
  const messageCount = await Message.countDocuments();
  console.log(`✅ Total mensajes: ${messageCount}`);

  // Test 2: Verificar que hay chats
  const Chat = mongoose.model('Chat');
  const chatCount = await Chat.countDocuments();
  console.log(`✅ Total chats: ${chatCount}`);

  // Test 3: Verificar último mensaje
  const lastMessage = await Message.findOne().sort({ timestamp: -1 });
  console.log(`✅ Último mensaje:`, lastMessage?.body);

  // Test 4: Verificar multimedia
  const Media = mongoose.model('Media');
  const mediaCount = await Media.countDocuments();
  console.log(`✅ Total archivos multimedia: ${mediaCount}`);

  mongoose.disconnect();
}

testPersistence();
```

## 🔧 Índices para Performance

Verifica que los índices estén creados:

```javascript
// Ver índices de messages
db.messages.getIndexes()

// Deberías ver:
// - { messageId: 1 } (unique)
// - { sessionId: 1, chatId: 1, timestamp: -1 }
// - { sessionId: 1, timestamp: -1 }

// Ver índices de chats
db.chats.getIndexes()

// Deberías ver:
// - { chatId: 1, sessionId: 1 } (unique)
// - { sessionId: 1, lastMessageTime: -1 }
// - { sessionId: 1, isPinned: -1, lastMessageTime: -1 }
```

## 📈 Monitoreo en Tiempo Real

### Usando MongoDB Compass
1. Conectar a tu base de datos
2. Ir a colección `messages` o `chats`
3. Activar "Auto-refresh" (cada 5 segundos)
4. Enviar un mensaje de prueba
5. Ver cómo aparece en tiempo real

### Usando mongo shell
```javascript
// Watch changes en tiempo real (MongoDB 3.6+)
db.messages.watch()

// En otra terminal, envía un mensaje
// Verás el evento de inserción en tiempo real
```

## ✅ Checklist de Persistencia

- [ ] Mensajes entrantes se guardan en `messages`
- [ ] Mensajes enviados se guardan en `messages`
- [ ] Chats se crean/actualizan en `chats`
- [ ] Multimedia se guarda en `media`
- [ ] `lastMessage` y `lastMessageTime` se actualizan
- [ ] `unreadCount` se incrementa correctamente
- [ ] Fotos de perfil se guardan en `media`
- [ ] Índices están creados correctamente
- [ ] No hay duplicados (unique constraints funcionan)

## 🚨 Problemas Comunes

### Problema: No se guardan mensajes
**Solución**: 
1. Verificar conexión a MongoDB: `mongoose.connection.readyState === 1`
2. Revisar logs del backend: buscar "❌ Error guardando mensaje"
3. Verificar permisos de escritura en MongoDB

### Problema: Mensajes duplicados
**Solución**: 
1. Verificar índice único en `messageId`
2. Revisar que Baileys no esté emitiendo eventos duplicados

### Problema: Chats no se actualizan
**Solución**: 
1. Verificar que `handleIncomingMessage` se ejecuta
2. Revisar logs: buscar "✅ Chat guardado/actualizado"
3. Verificar que `upsert: true` está configurado

## 📞 Comandos de Debugging

```javascript
// Habilitar logs de Mongoose
mongoose.set('debug', true);

// Ver última operación
db.currentOp()

// Ver estadísticas de colección
db.messages.stats()
db.chats.stats()

// Verificar tamaño de base de datos
db.stats()
```

---

**Última actualización**: 2025-10-10

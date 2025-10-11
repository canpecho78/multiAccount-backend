# Fix: Tipos de Mensajes y Multimedia

## 🐛 Problema Identificado

Los mensajes con multimedia se guardaban en MongoDB pero **no se enviaban correctamente** al frontend:

### Síntomas:
```javascript
// ❌ Lo que recibía el frontend
{
  messageType: "text",           // Siempre "text"
  mediaType: undefined,          // Sin tipo de media
  mediaUrl: undefined,           // Sin URL
  isVoiceNote: undefined,        // Sin flag de voz
  // ... otros campos multimedia undefined
}
```

### Causa Raíz:
1. **messageType incorrecto**: Se guardaba el tipo de Baileys (`"imageMessage"`) en lugar del tipo simplificado (`"image"`)
2. **Campos no mapeados**: El WebSocket `get-messages` no enviaba todos los campos de multimedia
3. **Evento en tiempo real incompleto**: El evento `message` no incluía campos multimedia

---

## ✅ Solución Implementada

### 1. Mapeo de Tipos de Mensajes

**Archivo**: `src/services/whatsappService.ts` (líneas 416-426)

```typescript
// Mapear messageType de Baileys a tipo simplificado
let simplifiedMessageType = 'text';
if (messageType === 'imageMessage' || messageType === 'stickerMessage') {
  simplifiedMessageType = 'image';
} else if (messageType === 'videoMessage') {
  simplifiedMessageType = 'video';
} else if (messageType === 'audioMessage') {
  simplifiedMessageType = 'audio';
} else if (messageType === 'documentMessage') {
  simplifiedMessageType = 'document';
}
```

**Tipos soportados:**
| Baileys Type | Simplified Type | Descripción |
|--------------|-----------------|-------------|
| `conversation` | `text` | Mensaje de texto simple |
| `extendedTextMessage` | `text` | Texto con formato/enlaces |
| `imageMessage` | `image` | Imagen |
| `stickerMessage` | `image` | Sticker (tratado como imagen) |
| `videoMessage` | `video` | Video |
| `audioMessage` | `audio` | Audio o nota de voz |
| `documentMessage` | `document` | Documento/archivo |

### 2. Guardar Mensaje con Tipos Correctos

**Archivo**: `src/services/whatsappService.ts` (líneas 430-448)

```typescript
await Message.create({
  messageId,
  chatId: from,
  sessionId,
  from,
  to: sessionId,
  body: messageContent,
  fromMe: false,
  timestamp,
  messageType: simplifiedMessageType,  // ✅ Tipo simplificado
  status: "delivered",
  // Campos de multimedia
  mediaUrl: mediaData?.fileId,         // ✅ ID del archivo en MongoDB
  mediaType: messageType,              // ✅ Tipo original de Baileys
  mediaFilename: mediaData?.filename,  // ✅ Nombre del archivo
  mediaMimetype: mediaData?.mimetype,  // ✅ MIME type
  mediaSize: mediaData?.size,          // ✅ Tamaño en bytes
  isVoiceNote: mediaData?.isVoiceNote || false, // ✅ Flag de nota de voz
});
```

### 3. WebSocket: Mapear Campos en `get-messages`

**Archivo**: `src/sockets/index.ts` (líneas 212-231)

```typescript
// Mapear mensajes con todos los campos de multimedia
const messages = docs.reverse().map((msg) => ({
  messageId: msg.messageId,
  chatId: msg.chatId,
  sessionId: msg.sessionId,
  from: msg.from,
  to: msg.to,
  body: msg.body,
  fromMe: msg.fromMe,
  timestamp: msg.timestamp,
  messageType: msg.messageType || 'text',      // ✅ Tipo simplificado
  status: msg.status || 'delivered',
  // Campos de multimedia
  mediaUrl: msg.mediaUrl || undefined,         // ✅ Incluido
  mediaType: msg.mediaType || undefined,       // ✅ Incluido
  mediaFilename: msg.mediaFilename || undefined, // ✅ Incluido
  mediaMimetype: msg.mediaMimetype || undefined, // ✅ Incluido
  mediaSize: msg.mediaSize || undefined,       // ✅ Incluido
  isVoiceNote: msg.isVoiceNote || false,       // ✅ Incluido
}));
```

### 4. Evento en Tiempo Real Completo

**Archivo**: `src/services/whatsappService.ts` (líneas 510-528)

```typescript
this.io?.emit("message", {
  sessionId,
  from,
  to: sessionId,
  body: messageContent,
  text: messageContent, // Mantener por compatibilidad
  timestamp: timestamp.toISOString(),
  messageId,
  fromMe: false,
  messageType: simplifiedMessageType,    // ✅ Tipo simplificado
  status: "delivered",
  // Campos de multimedia
  mediaUrl: mediaData?.fileId,           // ✅ Incluido
  mediaType: messageType,                // ✅ Tipo original
  mediaFilename: mediaData?.filename,    // ✅ Incluido
  mediaMimetype: mediaData?.mimetype,    // ✅ Incluido
  mediaSize: mediaData?.size,            // ✅ Incluido
  isVoiceNote: mediaData?.isVoiceNote || false, // ✅ Incluido
});
```

---

## 🔧 Migración de Datos Existentes

Si ya tienes mensajes en MongoDB con tipos incorrectos, ejecuta el script de migración:

### Ejecutar Script

```bash
# Desde la raíz del proyecto backend
npx ts-node src/scripts/fix-message-types.ts
```

### Lo que hace el script:

1. Conecta a MongoDB
2. Lee todos los mensajes
3. Convierte tipos de Baileys a tipos simplificados:
   - `imageMessage` → `image`
   - `audioMessage` → `audio`
   - `videoMessage` → `video`
   - `documentMessage` → `document`
   - `stickerMessage` → `image`
4. Actualiza el campo `messageType`
5. Preserva el tipo original en `mediaType`

### Salida esperada:

```
🔌 Conectando a MongoDB...
✅ Conectado a MongoDB
📊 Total de mensajes: 150
✅ Actualizado: ABC123 | imageMessage → image
✅ Actualizado: DEF456 | audioMessage → audio
✅ Actualizado: GHI789 | videoMessage → video

📊 Resumen:
   Total: 150
   Actualizados: 45
   Sin cambios: 105

✅ Script completado
🔌 Desconectado de MongoDB
```

---

## 📊 Estructura de Datos Final

### Mensaje de Texto
```json
{
  "messageId": "ABC123",
  "body": "Hola mundo",
  "messageType": "text",
  "mediaType": null,
  "mediaUrl": null,
  "isVoiceNote": false
}
```

### Mensaje con Imagen
```json
{
  "messageId": "DEF456",
  "body": "[Imagen]",
  "messageType": "image",
  "mediaType": "imageMessage",
  "mediaUrl": "image_1234567890_abc123",
  "mediaFilename": "image_1234567890_abc123.jpg",
  "mediaMimetype": "image/jpeg",
  "mediaSize": 245678,
  "isVoiceNote": false
}
```

### Mensaje con Nota de Voz
```json
{
  "messageId": "GHI789",
  "body": "[Nota de voz]",
  "messageType": "audio",
  "mediaType": "audioMessage",
  "mediaUrl": "voice_1234567890_xyz789",
  "mediaFilename": "voice_1234567890_xyz789.ogg",
  "mediaMimetype": "audio/ogg; codecs=opus",
  "mediaSize": 12345,
  "isVoiceNote": true
}
```

### Mensaje con Video
```json
{
  "messageId": "JKL012",
  "body": "[Video]",
  "messageType": "video",
  "mediaType": "videoMessage",
  "mediaUrl": "video_1234567890_def456",
  "mediaFilename": "video_1234567890_def456.mp4",
  "mediaMimetype": "video/mp4",
  "mediaSize": 1234567,
  "isVoiceNote": false
}
```

---

## 🧪 Cómo Probar

### 1. Verificar en MongoDB

```javascript
// Ver mensajes con multimedia
db.messages.find({ 
  mediaUrl: { $ne: null } 
}).pretty()

// Verificar tipos
db.messages.aggregate([
  { $group: { _id: "$messageType", count: { $sum: 1 } } }
])

// Deberías ver:
// { _id: "text", count: 100 }
// { _id: "image", count: 20 }
// { _id: "audio", count: 15 }
// { _id: "video", count: 5 }
```

### 2. Verificar en Frontend

```typescript
socketService.on('messages-list', ({ messages }) => {
  messages.forEach(msg => {
    console.log({
      id: msg.messageId,
      type: msg.messageType,        // ✅ Debe ser: text, image, audio, video, document
      hasMedia: !!msg.mediaUrl,     // ✅ true si tiene multimedia
      isVoice: msg.isVoiceNote,     // ✅ true si es nota de voz
      filename: msg.mediaFilename,  // ✅ Nombre del archivo
    });
  });
});
```

### 3. Logs Esperados

```
📨 Mensaje recibido de 123@s.whatsapp.net en sesión MI_SESION
✅ Mensaje guardado: ABC123 (tipo: image)
✅ Chat guardado/actualizado: 123@s.whatsapp.net (Juan)
```

---

## ✅ Checklist de Verificación

- [ ] Mensajes nuevos se guardan con `messageType` simplificado
- [ ] Campos `mediaUrl`, `mediaType`, `mediaFilename` se guardan correctamente
- [ ] `isVoiceNote` es `true` para notas de voz
- [ ] WebSocket `get-messages` envía todos los campos
- [ ] Evento `message` en tiempo real incluye multimedia
- [ ] Frontend recibe `messageType` correcto (image, audio, video)
- [ ] Script de migración ejecutado para datos existentes
- [ ] Logs muestran tipo correcto: `(tipo: image)`, `(tipo: audio)`

---

## 🎯 Resultado Final

### Antes (❌)
```javascript
{
  messageType: "text",
  mediaType: undefined,
  mediaUrl: undefined,
  isVoiceNote: undefined
}
```

### Después (✅)
```javascript
{
  messageType: "audio",
  mediaType: "audioMessage",
  mediaUrl: "voice_1234567890_abc123",
  mediaFilename: "voice_1234567890_abc123.ogg",
  mediaMimetype: "audio/ogg; codecs=opus",
  mediaSize: 12345,
  isVoiceNote: true
}
```

---

## 📞 Próximos Pasos

1. **Reiniciar el backend** para aplicar los cambios
2. **Ejecutar script de migración** si tienes datos existentes
3. **Probar en frontend** con mensajes nuevos
4. **Verificar logs** para confirmar tipos correctos
5. **Implementar UI** para mostrar multimedia según tipo

---

**Última actualización**: 2025-10-10

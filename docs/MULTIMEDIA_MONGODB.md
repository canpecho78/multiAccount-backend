# Sistema de Multimedia con MongoDB

## 📋 Resumen

Sistema completo para almacenar y gestionar archivos multimedia (imágenes, videos, audios, documentos, stickers, fotos de perfil) directamente en **MongoDB** en lugar del filesystem.

## 🎯 Ventajas sobre Filesystem

### ❌ Problemas del Filesystem
- Difícil de escalar horizontalmente
- Backups complicados
- Sincronización entre servidores
- Permisos y seguridad
- Límites de inodos
- Difícil de migrar

### ✅ Ventajas de MongoDB
- **Escalabilidad**: Fácil replicación y sharding
- **Backups**: Incluidos en backup de MongoDB
- **Consistencia**: Transacciones ACID
- **Búsqueda**: Índices y queries potentes
- **Metadata**: Almacenada junto al archivo
- **Seguridad**: Control de acceso centralizado
- **CDN Ready**: Fácil integración con CDN

---

## 🗄 Modelo de Datos

### Media Model

```typescript
{
  // Identificación
  fileId: string;              // ID único del archivo
  messageId: string;           // ID del mensaje asociado
  sessionId: string;           // Sesión de WhatsApp
  chatId: string;              // Chat asociado
  
  // Tipo
  mediaType: "image" | "video" | "audio" | "document" | "sticker" | "voice" | "profile-pic";
  
  // Archivo
  filename: string;            // Nombre generado
  originalFilename?: string;   // Nombre original (documentos)
  mimetype: string;            // image/jpeg, video/mp4, etc.
  size: number;                // Tamaño en bytes
  data: Buffer;                // Datos binarios del archivo
  
  // Metadata
  width?: number;              // Para imágenes/videos
  height?: number;             // Para imágenes/videos
  duration?: number;           // Para audios/videos (segundos)
  caption?: string;            // Caption del mensaje
  thumbnail?: Buffer;          // Miniatura (opcional)
  thumbnailMimetype?: string;  // Tipo de miniatura
  
  // Flags
  isVoiceNote: boolean;        // Si es nota de voz
  isAnimated: boolean;         // Si es sticker animado
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}
```

### Índices

```javascript
{ fileId: 1 } // unique
{ messageId: 1 }
{ sessionId: 1, chatId: 1, createdAt: -1 }
{ sessionId: 1, mediaType: 1, createdAt: -1 }
```

---

## 🔄 Flujos de Trabajo

### Flujo 1: Recibir Multimedia

```
1. Mensaje con multimedia llega
   ↓
2. downloadMediaMessage() → Descargar de WhatsApp
   ↓
3. Extraer metadata (tipo, tamaño, dimensiones, etc.)
   ↓
4. Generar fileId único
   ↓
5. Guardar en MongoDB (Media.create())
   ↓
6. Guardar mensaje con mediaUrl = fileId
   ↓
7. Emitir evento Socket.IO con fileId
```

### Flujo 2: Enviar Multimedia

```
1. Cliente solicita enviar multimedia
   ↓
2. Cliente sube archivo → POST /api/media/upload (opcional)
   ↓
3. Archivo se guarda en MongoDB con fileId
   ↓
4. sendMessage(sessionId, to, text, { mediaFileId })
   ↓
5. Cargar archivo desde MongoDB (Media.findOne())
   ↓
6. Enviar a WhatsApp con el buffer
   ↓
7. Guardar mensaje con mediaUrl = fileId
```

### Flujo 3: Ver Multimedia

```
1. Cliente solicita archivo
   ↓
2. GET /api/media/:fileId
   ↓
3. Verificar autenticación (JWT)
   ↓
4. Buscar en MongoDB (Media.findOne())
   ↓
5. Establecer headers (Content-Type, Cache-Control)
   ↓
6. Enviar buffer al cliente
```

### Flujo 4: Foto de Perfil

```
1. Nuevo mensaje de contacto
   ↓
2. getProfilePicture(sessionId, jid)
   ↓
3. Verificar cache (< 24 horas)
   ↓
4. Si no existe o expiró:
   - Descargar de WhatsApp
   - Guardar en MongoDB como "profile-pic"
   ↓
5. Retornar fileId
   ↓
6. Guardar en Chat.profilePicUrl
```

---

## 📡 API Endpoints

### 1. Obtener Archivo

```http
GET /api/media/:fileId
Authorization: Bearer <token>

Response:
Content-Type: image/jpeg
Content-Length: 123456
[Binary Data]
```

### 2. Descargar Archivo

```http
GET /api/media/:fileId/download
Authorization: Bearer <token>

Response:
Content-Disposition: attachment; filename="documento.pdf"
[Binary Data]
```

### 3. Información del Archivo

```http
GET /api/media/:fileId/info
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": {
    "fileId": "image_1234567890_abc123",
    "mediaType": "image",
    "filename": "image_1234567890_abc123.jpg",
    "mimetype": "image/jpeg",
    "size": 123456,
    "width": 1920,
    "height": 1080,
    "createdAt": "2025-09-29T14:00:00.000Z"
  }
}
```

### 4. Listar Archivos de Sesión

```http
GET /api/media/session/:sessionId?mediaType=image&page=1&limit=20
Authorization: Bearer <token>

Response:
{
  "success": true,
  "data": [
    {
      "fileId": "image_1234567890_abc123",
      "mediaType": "image",
      "filename": "image_1234567890_abc123.jpg",
      "size": 123456,
      "createdAt": "2025-09-29T14:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### 5. Eliminar Archivo

```http
DELETE /api/media/:fileId
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Media file deleted successfully"
}
```

---

## 💾 Almacenamiento

### Tamaño de Archivos

MongoDB soporta documentos de hasta **16MB** por defecto. Para archivos más grandes, usar **GridFS**.

**Recomendación actual:**
- Imágenes: Comprimidas, generalmente < 5MB
- Videos: Limitar a 16MB o usar GridFS
- Audios: Generalmente < 5MB
- Documentos: Generalmente < 10MB

### GridFS (Para archivos > 16MB)

Si necesitas archivos más grandes, implementar GridFS:

```typescript
import { GridFSBucket } from "mongodb";

const bucket = new GridFSBucket(mongoose.connection.db, {
  bucketName: "media"
});

// Upload
const uploadStream = bucket.openUploadStream(filename);
uploadStream.write(buffer);
uploadStream.end();

// Download
const downloadStream = bucket.openDownloadStreamByName(filename);
downloadStream.pipe(res);
```

---

## 🔒 Seguridad

### Autenticación

Todos los endpoints requieren JWT:
```typescript
router.get("/:fileId", verifyJWT, async (req, res) => {
  // ...
});
```

### Control de Acceso

Verificar que el usuario tenga acceso a la sesión:
```typescript
const user = (req as any).user;
const media = await Media.findOne({ fileId });

// Verificar que el usuario tenga acceso a esta sesión
if (!hasAccessToSession(user, media.sessionId)) {
  return res.status(403).json({ error: "Forbidden" });
}
```

### Rate Limiting

Implementar rate limiting para prevenir abuso:
```typescript
import rateLimit from "express-rate-limit";

const mediaLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // 100 requests por ventana
});

router.get("/:fileId", mediaLimiter, verifyJWT, ...);
```

---

## 🚀 Optimizaciones

### 1. Cache de Fotos de Perfil

```typescript
// Cache por 24 horas
if (existing && (Date.now() - existing.createdAt.getTime()) < 24 * 60 * 60 * 1000) {
  return existing.fileId;
}
```

### 2. Headers de Cache

```typescript
res.set({
  "Cache-Control": "public, max-age=31536000", // 1 año
  "ETag": fileId,
});
```

### 3. Compresión

```typescript
import sharp from "sharp";

// Comprimir imágenes antes de guardar
const compressed = await sharp(buffer)
  .resize(1920, 1080, { fit: "inside" })
  .jpeg({ quality: 80 })
  .toBuffer();
```

### 4. Thumbnails

```typescript
// Generar thumbnail para videos e imágenes
const thumbnail = await sharp(buffer)
  .resize(200, 200, { fit: "cover" })
  .jpeg({ quality: 60 })
  .toBuffer();

await Media.create({
  // ...
  thumbnail,
  thumbnailMimetype: "image/jpeg",
});
```

---

## 📊 Monitoreo

### Métricas Importantes

```javascript
// Total de archivos
db.media.countDocuments()

// Tamaño total
db.media.aggregate([
  { $group: { _id: null, total: { $sum: "$size" } } }
])

// Por tipo
db.media.aggregate([
  { $group: { _id: "$mediaType", count: { $sum: 1 }, size: { $sum: "$size" } } }
])

// Archivos más grandes
db.media.find().sort({ size: -1 }).limit(10)
```

### Limpieza Automática

```typescript
// Eliminar archivos huérfanos (sin mensaje asociado)
const orphaned = await Media.find({
  messageId: { $nin: await Message.distinct("messageId") }
});

// Eliminar archivos antiguos (> 90 días)
const old = await Media.deleteMany({
  createdAt: { $lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
  mediaType: { $ne: "profile-pic" } // Mantener fotos de perfil
});
```

---

## 🧪 Testing

### Probar Upload

```bash
# 1. Enviar mensaje con imagen
curl -X POST http://localhost:5000/api/sessions/SESSION_ID/messages \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5491234567890@s.whatsapp.net",
    "text": "Mira esta imagen",
    "mediaFileId": "image_1234567890_abc123"
  }'
```

### Probar Download

```bash
# 2. Descargar archivo
curl -X GET http://localhost:5000/api/media/image_1234567890_abc123 \
  -H "Authorization: Bearer TOKEN" \
  --output imagen.jpg
```

### Verificar en MongoDB

```javascript
// Ver archivos
db.media.find().limit(5)

// Ver tamaño
db.media.aggregate([
  { $group: { _id: null, totalSize: { $sum: "$size" } } }
])
```

---

## 📈 Escalabilidad

### Replicación

MongoDB replica automáticamente los archivos:
```
Primary → Secondary1
       → Secondary2
       → Secondary3
```

### Sharding

Para millones de archivos, usar sharding:
```javascript
sh.shardCollection("database.media", { sessionId: 1, createdAt: 1 })
```

### CDN Integration

Servir archivos desde CDN:
```typescript
// Generar URL firmada
const signedUrl = generateSignedUrl(fileId, expiresIn);

// Retornar URL en lugar de buffer
res.json({
  fileId,
  url: `https://cdn.tudominio.com/media/${fileId}?signature=${signature}`
});
```

---

## 🎯 Resultado

Ahora todos los archivos multimedia se almacenan en MongoDB:
- ✅ Imágenes
- ✅ Videos
- ✅ Audios / Notas de voz
- ✅ Documentos
- ✅ Stickers
- ✅ Fotos de perfil

**Sin necesidad de filesystem**, todo centralizado y escalable. 🚀

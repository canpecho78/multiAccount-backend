# Gestión de Audio y Notas de Voz - WhatsApp API

Este documento describe la implementación completa de la funcionalidad de audio y notas de voz para el sistema de WhatsApp Multi-sesiones.

## ✅ Funcionalidades Implementadas

### **Manejo Existente Ampliado**
- ✅ **Recepción de audio**: Los mensajes de audio se procesan automáticamente
- ✅ **Storage en MongoDB**: Almacenamiento binario optimizado
- ✅ **Distinción audio/voz**: Detección automática de notas de voz vs audio normal
- ✅ **Metadata de audio**: Duración, tamaño, formato, etc.

### 🆕 **Nuevas Funcionalidades**
- ✅ **Endpoints API REST** para gestión de audio
- ✅ **Stream de audio** directo al cliente
- ✅ **Base64 encoding** para web playback
- ✅ **Envío desde archivo local/URL**
- ✅ **Range requests** para reproducción parcial
- ✅ **Tipado TypeScript completo**
- ✅ **Integración con Baileys**

## Endpoints API

### 1. Obtener Audio como Stream

**GET** `/api/audio/{fileId}`

Reproduce el audio directamente como stream con headers HTTP apropiados.

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/api/audio/audio_1234567890_1640995200000"
```

**Características:**
- Soporte para `Accept-Ranges: bytes`
- Headers de cache apropiados
- Stream eficiente en memoria
- Headers MIME-Type correctos

### 2. Obtener Audio como Base64

**GET** `/api/audio/{fileId}/base64`

Devuelve el audio en formato base64 listo para usar en frontend web.

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/api/audio/audio_1234567890_1640995200000/base64"
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "base64": "data:audio/ogg;base64,T2dnUwACAAAAAAAA...",
    "mimetype": "audio/ogg; codecs=opus",
    "duration": 10.5,
    "isVoiceNote": true,
    "filename": "audio_1234567890.ogg",
    "size": 45632
  }
}
```

### 3. Información del Audio

**GET** `/api/audio/{fileId}/info`

Obtiene metadata del audio sin descargar el archivo.

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "fileId": "audio_1234567890_1640995200000",
    "filename": "audio_1234567890.ogg",
    "mimetype": "audio/ogg; codecs=opus",
    "duration": 10.5,
    "size": 45632,
    "isVoiceNote": true,
    "createdAt": "2022-01-01T12:00:00.000Z",
    "chatId": "1234567890@s.whatsapp.net",
    "caption": null,
    "audioInfo": {
      "duration": 10.5,
      "isVoiceNote": true,
      "sampleRate": 48000,
      "channels": 1
    }
  }
}
```

### 4. Enviar Audio desde MongoDB

**POST** `/api/audio/send`

Envía un audio ya almacenado en MongoDB.

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_001",
    "to": "1234567890@s.whatsapp.net",
    "mediaFileId": "audio_1234567890_1640995200000",
    "caption": "Aquí tienes el audio"
  }' \
  "http://localhost:3000/api/audio/send"
```

### 5. Listar Audios por Sesión

**GET** `/api/audio/session/{sessionId}/by-type`

Lista todos los audios de una sesión, filtrable por tipo.

**Query Parameters:**
- `audioType`: `audio` (normal) | `voice` (notas de voz)
- `page`: Número de página (default: 1)
- `limit`: Elementos por página (default: 20)

```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/api/audio/session/session_001/by-type?audioType=voice&page=1&limit=10"
```

## Servicios WhatsApp

### Métodos Avanzados Disponibles

```typescript
// Descargar audio como stream
const stream = await whatsappService.downloadAudioAsStream(message, sessionId);

// Descargar audio como buffer
const buffer = await whatsappService.downloadAudioAsBuffer(message, sessionId);

// Enviar audio desde archivo local
await whatsappService.sendAudioFromPath(
  'session_001',
  '1234567890@s.whatsapp.net', 
  '/path/to/audio.ogg',
  { isVoiceNote: true, caption: 'Nota de voz' }
);

// Enviar audio desde URL externa
await whatsappService.sendAudioFromUrl(
  'session_001',
  '1234567890@s.whatsapp.net',
  'https://example.com/audio.mp3',
  { mimetype: 'audio/mp4' }
);

// Crear stream con rangos para reproducción parcial
const rangeStream = await whatsappService.createAudioStream(
  message, 
  sessionId, 
  { start: 1000, end: 5000 } // bytes 1000-5000
);

// Obtener metadata del audio
const metadata = whatsappService.getAudioMetadata(message);
```

## Formatos de Audio Soportados

### Notas de Voz (PTT - Push to Talk)
- **Formato**: OGG con codec Opus
- **Sample Rate**: 48kHz
- **Canales**: Mono (1 canal)
- **MIME**: `audio/ogg; codecs=opus`
- **Extensión**: `.ogg`

### Audio Normal
- **Formatos**: MP4, MP3, AAC
- **Sample Rate**: 44.1kHz - 48kHz
- **Canales**: Mono/Estéreo
- **MIME**: `audio/mp4`, `audio/mpeg`, `audio/aac`
- **Extensiones**: `.mp4`, `.mp3`, `.aac`

## Ejemplos de Uso

### React Hook para Reproductor de Audio
```typescript
import { useState, useEffect } from 'react';

export const useAudioPlayer = (fileId: string) => {
  const [audioData, setAudioData] = useState<AudioBase64Response['data']>(null);
  const [loading, setLoading] = useState(false);

  const loadAudio = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/audio/${fileId}/base64`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAudioData(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (fileId) loadAudio();
  }, [fileId]);

  return { audioData, loading };
};

// Uso en componente
const AudioPlayer = ({ fileId }: { fileId: string }) => {
  const { audioData, loading } = useAudioPlayer(fileId);

  if (loading) return <div>Cargando audio...</div>;
  if (!audioData) return <div>Audio no encontrado</div>;

  return (
    <audio controls>
      <source src={audioData.base64} type={audioData.mimetype} />
      Tu navegador no soporta audio HTML5.
    </audio>
  );
};
```

### Envío de Nota de Voz con Grabación
```typescript
// Ejemplo: Enviar nota de voz desde grabación web
const sendVoiceNote = async (
  sessionId: string, 
  to: string, 
  audioBlob: Blob
) => {
  // Convertir Blob a Buffer (simulado)
  const arrayBuffer = await audioBlob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Guardar temporalmente en MongoDB
  const fileId = await saveTemporaryAudio(buffer, 'audio/ogg; codecs=opus');
  
  // Enviar usando el API
  await fetch('/api/audio/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId,
      to,
      mediaFileId: fileId,
      caption: 'Nota de voz'
    })
  });
};
```

### Stream de Audio con Range Requests
```typescript
// Reproducción con soporte para seek/rangos
const AudioStreamPlayer = ({ fileId }: { fileId: string }) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  return (
    <audio 
      controls 
      src={`/api/audio/${fileId}`}
      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
      onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      onSeeked={(e) => {
        // El navegador automáticamente maneja range requests
        console.log(`Seeking to: ${e.currentTarget.currentTime}s`);
      }}
    />
  );
};
```

## Consideraciones Técnicas

### Rendimiento
- **Streaming**: Los archivos grandes se sirven como stream para evitar saturar memoria
- **Cache**: Headers apropiados para cache de cliente (1 año)
- **Range Requests**: Soporte completo para seek/fast-forward

### Seguridad
- **JWT Authentication**: Todos los endpoints requieren autenticación
- **Validación de tipos**: Verificación de que el archivo sea realmente audio/voz
- **Límites de tamaño**: Implementa límites apropiados según tu configuración

### Compatibilidad
- **WhatsApp**: Soporte completo para todos los formatos que acepta WhatsApp
- **Web**: Base64 para reproducción inmediata en navegadores
- **Mobile**: Headers optimizados para aplicaciones móviles

## Troubleshooting

### Audio no reproduce
- Verificar `mimetype` correcto en headers
- Asegurar que el fileId existe en MongoDB
- Comprobar permisos de sesión

### Calidad de audio baja
- Usar formato Opus para notas de voz (`audio/ogg; codecs=opus`)
- Verificar sample rate (48kHz recomendado para voz)
- Configurar 1 canal mono para notas de voz

### Problemas de envío
- Verificar que la sesión esté conectada
- Confirmar formato compatible con WhatsApp
- Check tamaño del archivo (límites de WhatsApp)

## Diferencias con el Código Original

### ✅ **Mejoras Implementadas**
1. **TypeScript**: Tipado completo vs JavaScript plano
2. **Streaming**: Implementación nativa de streams con Node.js
3. **Range Requests**: Soporte para reproducción parcial
4. **Base64**: Encoding automático para web
5. **Metadata**: Información detallada del audio
6. **Servicios**: Métodos avanzados para envío/descarga
7. **Error Handling**: Manejo robusto de errores
8. **Documentación**: Swagger completa

### 🔄 **Cambios de Arquitectura**
- Integración con el sistema de multimedia existente
- Storage unificado en MongoDB
- API RESTfull instead de funciones directas
- Sistema de autenticación integrado

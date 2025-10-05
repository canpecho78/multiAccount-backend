# Conversión Automática de Audio a MP3

## ✅ Problema Solucionado

**Antes:** Los audios de WhatsApp se almacenaban en formato OGG Opus (`audio/ogg; codecs=opus`) y no se convertían a MP3.

**Ahora:** Conversión automática a MP3 con configuración optimizada por tipo de audio.

## 🔧 Implementación

### Servicios Nuevos

#### 1. `audioConversionService.ts`
- Conversión de OGG Opus → MP3 usando FFmpeg
- Configuraciones optimizadas por tipo (nota de voz vs audio normal)
- Detección automática de formatos
- Gestión de errores robusta

#### 2. Modificaciones en `whatsappService.ts`
- Conversión automática durante la recepción de mensajes
- Buffer reconvertido antes de almacenar en MongoDB
- Configuración específica según tipo:

```typescript
// Nota de voz → MP3 mono, alta calidad
quality: 'high',
bitrate: '192k',
sampleRate: 48000,
channels: 1,

// Audio normal → MP3 estéreo, calidad media
quality: 'medium', 
bitrate: '128k',
sampleRate: 44100,
channels: 2,
```

## 🚀 Endpoints Nuevos

### 1. Obtener Audio como MP3
```
GET /api/audio/{fileId}/mp3
```
- Convierte automáticamente si no es MP3
- Stream directo optimizado
- Headers apropiados para reproducción

### 2. Convertir y Guardar MP3
```
POST /api/audio/{fileId}/convert
```

**Body:**
```json
{
  "quality": "high",     // low, medium, high
  "bitrate": "192k",     // 128k, 192k, 256k
  "force": false         // forzar conversión aunque ya sea MP3
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Audio converted to MP3 successfully",
  "data": {
    "originalFileId": "voice_1759572736606_csa7q5b88",
    "mp3FileId": "voice_1759572736607_convert1234",
    "mp3Size": 45123,
    "originalSize": 6275,
    "conversionTimeMs": 1200,
    "quality": "high",
    "bitrate": "192k"
  }
}
```

## 📊 Configuraciones por Tipo

### Notas de Voz (PTT)
- **Formato destino**: MP3 mono
- **Bitrate**: 192 kbps (alta calidad)
- **Sample Rate**: 48 kHz
- **Canales**: 1 (mono)
- **Codec**: libmp3lame

### Audio Normal
- **Formato destino**: MP3 estéreo  
- **Bitrate**: 128 kbps (estándar)
- **Sample Rate**: 44.1 kHz
- **Canales**: 2 (estéreo)
- **Codec**: libmp3lame

## 🔄 Flujo Automático

1. **Recepción de mensaje** con audio
2. **Descarga** del buffer original (OGG Opus)
3. **Detección** del tipo (nota de voz vs audio)
4. **Conversión** automática a MP3 usando FFmpeg
5. **Almacenamiento** del buffer MP3 convertido en MongoDB
6. **Metadata actualizada** con tamaño y mimetype MP3

## 📁 Almacenamiento MongoDB

### Antes (Problema Original)
```json
{
  "fileId": "voice_1759572736606_csa7q5b88",
  "mimetype": "audio/ogg; codecs=opus",
  "filename": "voice_1759572736606_csa7q5b88.ogg",
  "size": 6275,
  "data": "Binary.createFromBase64('T2dnUwACAAAAAAAAAABKAAA...')"
}
```

### Ahora TIONADO)
```json
{
  "fileId": "voice_1759572736606_csa7q5b88", 
  "mimetype": "audio/mpeg",
  "filename": "voice_1759572736606_csa7q5b88.mp3",
  "size": 45123,
  "data": "Binary.createFromBase64('SUQzAQAAAAAA...')" // Datos MP3
}
```

## 🎯 Uso Práctico

### Frontend Web
```typescript
// Obtener nota de voz como MP3
const audioResponse = await fetch('/api/audio/voice_123/mp3', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// Reproducir directamente
const audio = new Audio(audioResponse.url);
audio.play();
```

### Conversión Manejual
```typescript
// Convertir archivo existente a MP3
const convertResponse = await fetch('/api/audio/original_voice_id/convert', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    quality: 'high',
    bitrate: '192k'
  })
});

const result = await convertResponse.json();
console.log('MP3 creado:', result.data.mp3FileId);
```

## 🛠️ Instalación FFmpeg

El sistema requiere FFmpeg instalado:

```bash
# Windows (usando chocolatey)
choco install ffmpeg

# Linux (Ubuntu/Debian)
sudo apt-get install ffmpeg

# macOS (usando brew)
brew install ffmpeg
```

**Dependencias npm instaladas:**
- `fluent-ffmpeg` - Wrapper Node.js para FFmpeg
- `ffmpeg-static` - Binario FFmpeg estático
- `@types/fluent-ffmpeg` - Tipos TypeScript

## ⚠️ Consideraciones

### Rendimiento
- **Conversión en tiempo real**: Puede añadir latencia al procesar mensajes
- **Uso de CPU**: FFmpeg consume recursos durante conversión
- **Memoria**: Buffer duplicado durante conversión

### Calidad vs Tamaño
- **Notas de voz**: Prioridad calidad alta, mono
- **Audio normal**: Balance calidad/tamaño, estéreo
- **Compresión**: MP3 usa compresión con pérdida

### Storage
- **Tamaño aumentado**: MP3 suele ser más grande que OGG Opus
- **Cache limitado**: Considerar limpieza de archivos convertidos antiguos

## 🔧 Troubleshooting

### Error FFmpeg no encontrado
```
Error: Conversion failed: ffmpeg is not installed or not found
```
**Solución**: Instalar FFmpeg en el sistema

### Error de conversión
```
Error: MP3 conversion failed: Cannot process audio stream
```
**Solución**: Verificar que el audio original no esté corrompido

### Tiempo de conversión lento
- Reducir bitrate (192k → 128k)
- Cambiar calidad (high → medium)
- Verificar recursos del servidor

## 📈 Monitoreo

El sistema incluye logging detallado:

```
🎵 Converting voice note to MP3...
FFmpeg MP3 conversion started: ffmpeg -i pipe:0 -f mp3 ...
MP3 conversion: 50% done
✅ Audio converted successfully to MP3 (45123 bytes)
```

**Utilizar estos logs para monitorear:**
- Rendimiento de conversión
- Tamaños de archivos resultantes
- Tiempo de procesamiento
- Errores de conversión

# 🎵 FRONTEND - Cómo Reproducir Audio MP3

## 📝 Instrucciones Simples para el Frontend

### ⚙️ Configuración Básica

```typescript
// Variables de configuración
const API_BASE_URL = 'http://localhost:3000/api';
const YOUR_JWT_TOKEN = 'tu_jwt_token_aqui';

const headers = {
  'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
  'Content-Type': 'application/json'
};
```

### 🎯 Método 1: Reproductor Directo (Recomendado)

```typescript
// Función simple para reproducir cualquier audio como MP3
const playAudio = async (fileId: string) => {
  try {
    // URL del endpoint MP3 (conversión automática)
    const audioUrl = `${API_BASE_URL}/audio/${fileId}/mp3`;
    
    // Obtener audio con autenticación
    const response = await fetch(audioUrl, { headers });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    // Convertir a blob y crear URL temporal
    const audioBlob = await response.blob();
    const blobUrl = URL.createObjectURL(audioBlob);
    
    // Crear elemento audio y reproducir
    const audio = new Audio(blobUrl);
    audio.play();
    
    console.log('🎵 Audio iniciado correctamente');
    return audio;
    
  } catch (error) {
    console.error('❌ Error reproduciendo audio:', error);
  }
};

// Uso: playAudio('voice_1759572736606_csa7q5b88');
```

### 🎯 Método 2: Con Base64 (Fallback CORS)

```typescript
// Si CORS da problemas, usar Base64
const playAudioBase64 = async (fileId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/audio/${fileId}/base64`, { headers });
    const data = await response.json();
    
    if (data.success) {
      const audio = new Audio(data.data.base64);
      audio.play();
      console.log('🎵 Audio iniciado (Base64)');
    }
    
  } catch (error) {
    console.error('❌ Error con Base64:', error);
  }
};
```

### 🎯 Método 3: HTML Audio Element Simple

```typescript
// Para uso directo en HTML
const createAudioElement = (fileId: string) => {
  const audio = document.createElement('audio');
  audio.controls = true;
  audio.preload = 'auto';
  
  // Configurar fuente
  audio.addEventListener('loadstart', async () => {
    try {
      // Obtener blob con auth
      const response = await fetch(`${API_BASE_URL}/audio/${fileId}/mp3`, { 
        headers: { 'Authorization': `Bearer ${YOUR_JWT_TOKEN}` }
      });
      
      const blob = await response.blob();
      audio.src = URL.createObjectURL(blob);
      
    } catch (error) {
      console.error('Error configurando audio:', error);
    }
  });
  
  return audio;
};

// Uso:
// const audioElement = createAudioElement('voice_123');
// document.body.appendChild(audioElement);
```

### 🎯 Método 4: React Hook Completo

```typescript
import { useState, useEffect, useRef } from 'react';

export const useAudioPlayer = (fileId: string, token: string) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!fileId || !token) return;

    const loadAudio = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Obtener MP3 con autenticación
        const response = await fetch(`${API_BASE_URL}/audio/${fileId}/mp3`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        // Configurar audio
        const audio = new Audio(blobUrl);
        
        audio.addEventListener('loadedmetadata', () => {
          setDuration(audio.duration);
          setIsLoading(false);
        });
        
        audio.addEventListener('timeupdate', () => {
          setCurrentTime(audio.currentTime);
        });
        
        audio.addEventListener('play', () => setIsPlaying(true));
        audio.addEventListener('pause', () => setIsPlaying(false));
        audio.addEventListener('ended', () => setIsPlaying(false));
        
        audio.addEventListener('error', (e) => {
          setError('Error reproduciendo audio');
          setIsLoading(false);
        });
        
        audioRef.current = audio;
        
      } catch (err) {
        setError((err as Error).message);
        setIsLoading(false);
      }
    };

    loadAudio();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        const src = audioRef.current.src;
        if (src.startsWith('blob:')) {
          URL.revokeObjectURL(src);
        }
        audioRef.current = null;
      }
    };
  }, [fileId, token]);

  const play = () => audioRef.current?.play();
  const pause = () => audioRef.current?.pause();
  const seek = (time: number) => {
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  return {
    isLoading,
    isPlaying,
    duration,
    currentTime,
    error,
    play,
    pause,
    seek
  };
};

// Componente React de ejemplo
const AudioPlayer = ({ fileId }: { fileId: string }) => {
  const { 
    isLoading, 
    isPlaying, 
    duration, 
    currentTime, 
    error, 
    play, 
    pause, 
    seek 
  } = useAudioPlayer(fileId, YOUR_JWT_TOKEN);

  if (error) return <div>❌ Error: {error}</div>;
  if (isLoading) return <div>🔄 Cargando...</div>;

  return (
    <div style={{ padding: '20px', border: '1px solid #ccc' }}>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={isPlaying ? pause : play}>
          {isPlaying ? '⏸️ Pausar' : '▶️ Reproducir'}
        </button>
        <span style={{ margin: '0 10px' }}>
          {Math.floor(currentTime)}s / {Math.floor(duration)}s
        </span>
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <button onClick={() => seek(0)}>⏮️ Inicio</button>
        <i style={{ display: 'inline-block', width: '200px', height: '4px', backgroundColor: '#ddd' }}>
          <i style={{ 
            width: `${(currentTime / duration) * 100}%`, 
            height: '100%', 
            backgroundColor: '#007bff',
            display: 'block'
          }} />
        </i>
      </div>
      
      <br />
      
      <div style={{ fontSize: '12px', color: '#666' }}>
        Duración: {duration.toFixed(1)}s | FileId: {fileId}
      </div>
    </div>
  );
};

// Uso: <AudioPlayer fileId="voice_123456789" />
```

### 🎯 Método 5: Vue.js Simple

```typescript
import { ref, onMounted, watch } from 'vue';

export function useAudioPlayer(fileId: string, token: string) {
  const isLoading = ref(false);
  const isPlaying = ref(false);
  const duration = ref(0);
  const currentTime = ref(0);
  const error = ref<string | null>(null);
  
  let audioElement: HTMLAudioElement | null = null;

  const loadAudio = async () => {
    isLoading.value = true;
    error.value = null;
    
    try {
      const response = await fetch(`${API_BASE_URL}/audio/${fileId}/mp3`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      audioElement = new Audio(blobUrl);
      
      audioElement.addEventListener('loadedmetadata', () => {
        duration.value = audioElement!.duration;
        isLoading.value = false;
      });
      
      audioElement.addEventListener('timeupdate', () => {
        currentTime.value = audioElement!.currentTime;
      });
      
      audioElement.addEventListener('play', () => isPlaying.value = true);
      audioElement.addEventListener('pause', () => isPlaying.value = false);
      
    } catch (err) {
      error.value = (err as Error).message;
      isLoading.value = false;
    }
  };

  const play = () => audioElement?.play();
  const pause = () => audioElement?.pause();
  const seek = (time: number) => {
    if (audioElement) audioElement.currentTime = time;
  };

  watch(fileId, loadAudio);
  onMounted(loadAudio);

  return {
    isLoading,
    isPlaying,
    duration,
    currentTime,
    error,
    play,
    pause,
    seek
  };
}
```

## 🛠️ Endpoints Disponibles

| Endpoint | Descripción | Uso |
|----------|-------------|-----|
| `GET /api/audio/{fileId}` | Stream directo | `<audio src="..." />` |
| `GET /api/audio/{fileId}/mp3` | Conversión automática | Método recomendado |
| `GET /api/audio/{fileId}/base64` | Base64 JSON | Problemas CORS |
| `POST /api/audio/{fileId}/convert` | Conversión manual | Optimización manual |

## ⚠️ Notes Importantes

### **Autenticación**
- **SIEMPRE** incluir `Authorization: Bearer {token}` en headers
- Sin token válido → Error 401 Unauthorized

### **Formato**
- Todos los endpoints devuelven **MP3 real** (`audio/mpeg`)
- Compatible con todos los navegadores modernos
- Sin conversión adicional necesaria

### **CORS**
- Si problema con CORS → usar `/base64` endpoint
- Para móviles → usar `fetch() + blob` siempre

### **Memoria**
- Limpiar blob URLs con `URL.revokeObjectURL()`
- Pausar audio antes de cambiar de archivo

## 🚀 Código Copy-Paste Rápido

```typescript
// Configuración
const API_URL = 'http://localhost:3000/api';
const TOKEN = 'tu_jwt_token';

// Función simple de reproducir
const playAudio = async (fileId: string) => {
  const response = await fetch(`${API_URL}/audio/${fileId}/mp3`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  });
  
  const audio = new Audio(URL.createObjectURL(await response.blob()));
  audio.play();
};

// Uso: playAudio('voice_123456');
```

¡Listo! Ahora cualquier frontend puede reproducir los audios MP3 convertidos automáticamente.

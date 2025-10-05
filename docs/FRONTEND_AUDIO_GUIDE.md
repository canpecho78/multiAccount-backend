# Guía Frontend - Reproducción de Audio MP3

## 🎯 Instrucciones para el Frontend

### Configuración Base

```typescript
// URL base de tu API
const API_BASE_URL = 'http://localhost:3000/api';

// Headers requeridos (JWT Authentication)
const headers = {
  'Authorization': `Bearer ${yourJwtToken}`,
  'Content-Type': 'application/json'
};
```

## 🔧 Métodos de Reproducción

### 1. **Método Recomendado: Audio Stream Directo**

```typescript
// Para reproducir directamente sin conversión adicional
const playAudioDirect = async (fileId: string) => {
  const audioUrl = `${API_BASE_URL}/audio/${fileId}`;
  
  // Crear elemento audio HTML5
  const audio = new Audio(audioUrl);
  
  // Configurar headers de autenticación
  const originalFetch = window.fetch;
  window.fetch = async (url, options) => {
    if (url === audioUrl) {
      return originalFetch(url, {
        ...options,
        headers: {
          ...options?.headers,
          'Authorization': `Bearer ${yourJwtToken}`
        }
      });
    }
    return originalFetch(url, options);
  };
  
  // Listeners para eventos
  audio.addEventListener('loadeddata', () => {
    console.log(`Audio cargado: ${audio.duration}s`);
    audio.play();
  });
  
  audio.addEventListener('error', (e) => {
    console.error('Error reproduciendo audio:', e);
  });
  
  return audio;
};
```

### 2. **Método: HTML Audio Element con URL Completa**

```typescript
// Función para obtener URL con autenticación
const getAuthenticatedAudioUrl = async (fileId: string) => {
  const response = await fetch(`${API_BASE_URL}/audio/${fileId}/mp3`, {
    headers: { 'Authorization': `Bearer ${yourJwtToken}` }
  });
  
  if (response.ok) {
    // Crear blob URL temporal
    const audioBlob = await response.blob();
    return URL.createObjectURL(audioBlob);
  }
  throw new Error('No se pudo obtener el audio');
};

let audioBlobUrl: string | null = null;

const playAudioBlob = async (fileId: string) => {
  try {
    // Limpiar URL anterior si existe
    if (audioBlobUrl) {
      URL.revokeObjectURL(audioBlobUrl);
    }
    
    audioBlobUrl = await getAuthenticatedAudioUrl(fileId);
    const audio = new Audio(audioBlobUrl);
    
    audio.play().then(() => {
      console.log('Audio iniciado');
    }).catch(console.error);
    
    return audio;
  } catch (error) {
    console.error('Error:', error);
  }
};
```

### 3. **Método: React Hook (Recomendado para React)**

```typescript
import { useState, useEffect, useRef } from 'react';

interface AudioState {
  isLoading: boolean;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  error: string | null;
}

export const useAudioPlayer = (fileId: string | null, token: string) => {
  const [state, setState] = useState<AudioState>({
    isLoading: false,
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    error: null
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!fileId || !token) return;

    const loadAudio = async () => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      try {
        // Opción 1: Stream directo
        const audioUrl = `${API_BASE_URL}/audio/${fileId}/mp3`;
        
        // Crear audio element
        const audio = new Audio(audioUrl);
        
        // Configurar eventos
        audio.addEventListener('loadstart', () => {
          setState(prev => ({ ...prev, isLoading: true }));
        });
        
        audio.addEventListener('loadedmetadata', () => {
          setState(prev => ({ 
            ...prev, 
            duration: audio.duration,
            isLoading: false 
          }));
        });
        
        audio.addEventListener('play', () => {
          setState(prev => ({ ...prev, isPlaying: true }));
        });
        
        audio.addEventListener('pause', () => {
          setState(prev => ({ ...prev, isPlaying: false }));
        });
        
        audio.addEventListener('timeupdate', () => {
          setState(prev => ({ ...prev, currentTime: audio.currentTime }));
        });
        
        audio.addEventListener('error', (e) => {
          console.error('Audio error:', e);
          setState(prev => ({ 
            ...prev, 
            error: 'Error cargando audio',
            isLoading: false 
          }));
        });
        
        // Configurar headers de autenticación
        // Para CORS con cookies/auth headers, usa fetch + blob
        fetch(audioUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(response => response.blob())
        .then(blob => {
          if (audioSrc) URL.revokeObjectURL(audioSrc);
          const newAudioSrc = URL.createObjectURL(blob);
          setAudioSrc(newAudioSrc);
          audio.src = newAudioSrc;
        })
        .catch(error => {
          setState(prev => ({ 
            ...prev, 
            error: error.message,
            isLoading: false 
          }));
        });
        
        audioRef.current = audio;
        
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          error: (error as Error).message,
          isLoading: false 
        }));
      }
    };

    loadAudio();
    
    return () => {
      if (audioSrc) URL.revokeObjectURL(audioSrc);
      if (audioRef.current) {
        audioRef.current.pause();
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
    ...state,
    play,
    pause,
    seek,
    audio: audioRef.current
  };
};

// Uso en componente
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
  } = useAudioPlayer(fileId, userToken);

  if (error) return <        </p></button>
    <button onClick={() => seek(duration * 0.5)}>50%</button>
    <button onClick={() => seek(duration * 0.75)}>75%</button>
  </div>
);
};
```

### 4. **Método: Vue.js (Para proyectos Vue)**

```typescript
import { ref, onMounted, onUnmounted } from 'vue';

export function useAudioPlayer(fileId: string, token: string) {
  const isLoading = ref(false);
  const isPlaying = ref(false);
  const duration = ref(0);
  const currentTime = ref(0);
  const error = ref<string | null>(null);
  const audioSrc = ref<string | null>(null);
  
  let audioElement: HTMLAudioElement | null = null;

  const loadAudio = async () => {
    isLoading.value = true;
    error.value = null;

    try {
      const audioUrl = `${API_BASE_URL}/audio/${fileId}/mp3`;
      
      const response = await fetch(audioUrl, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const blob = await response.blob();
      
      if (audioSrc.value) URL.revokeObjectURL(audioSrc.value);
      audioSrc.value = URL.createObjectURL(blob);
      
      audioElement = new Audio(audioSrc.value);
      
      audioElement.addEventListener('loadedmetadata', () => {
        duration.value = audioElement!.duration;
        isLoading.value = false;
      });
      
      audioElement.addEventListener('play', () => isPlaying.value = true);
      audioElement.addEventListener('pause', () => isPlaying.value = false);
      audioElement.addEventListener('timeupdate', () => {
        currentTime.value = audioElement!.currentTime;
      });
      
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

  onMounted(() => loadAudio());
  onUnmounted(() => {
    if (audioSrc.value) URL.revokeObjectURL(audioSrc.value);
    audioElement?.pause();
    audioElement = null;
  });

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
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
search_replace

# Gestión de Fotos de Perfil - WhatsApp API

Este documento describe la implementación de la funcionalidad de fotos de perfil para el sistema de WhatsApp Multi-sesiones.

## Funcionalidades Implementadas

### ✅ Ya Disponible
- ✅ Obtención de fotos de perfil usando `@whiskeysockets/baileys`
- ✅ Storage en MongoDB con cache de 24 horas
- ✅ Integración con el sistema de multimedia existente
- ✅ Soporte para alta resolución

### 🆕 Nuevo
- ✅ Endpoints API REST para fotos de perfil
- ✅ Soporte para múltiples resoluciones (baja/alta)
- ✅ Bulk requests para múltiples contactos
- ✅ Sistema de refresh/actualización forzada
- ✅ Tipado TypeScript completo

## Endpoints API

### 1. Obtener Foto de Perfil Individual

**GET** `/api/profile-picture/{sessionId}/{jid}`

Obtiene la foto de perfil de un contacto específico.

**Parámetros:**
- `sessionId`: ID de la sesión de WhatsApp
- `jid`: JID del contacto (ej: `1234567890@s.whatsapp.net`)

**Query Parameters:**
- `refresh` (opcional): `true` para forzar actualización (ignorar caché)

**Ejemplo:**
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/api/profile-picture/session_001/1234567890@s.whatsapp.net"
```

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "jid": "1234567890@s.whatsapp.net",
    "fileId": "profile_1234567890_s_whatsapp_net_1640995200000",
    "url": "/api/media/profile_1234567890_s_whatsapp_net_1640995200000",
    "lowRes": "/api/media/profile_1234567890_s_whatsapp_net_1640995200000",
    "highRes": "/api/media/profile_1234567890_s_whatsapp_net_1640995200000",
    "cached": false,
    "createdAt": "2022-01-01T12:00:00.000Z"
  }
}
```

### 2. Obtener Fotos de Múltiples Contactos

**POST** `/api/profile-pictures`

Obtiene fotos de perfil de múltiples contactos en una sola petición.

**Body:**
```json
{
  "sessionId": "session_001",
  "contacts": [
    "1234567890@s.whatsapp.net",
    "0987654321@s.whatsapp.net",
    "1111111111@s.whatsapp.net"
  ],
  "refresh": false
}
```

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "jid": "1234567890@s.whatsapp.net",
      "fileId": "profile_1234567890_s_whatsapp_net_1640995200000",
      "url": "/api/media/profile_1234567890_s_whatsapp_net_1640995200000",
      "lowRes": "/api/media/profile_1234567890_s_whatsapp_net_1640995200000",
      "highRes": "/api/media/profile_1234567890_s_whatsapp_net_1640995200000",
      "cached": false,
      "createdAt": "2022-01-01T12:00:00.000Z"
    },
    {
      "jid": "0987654321@s.whatsapp.net",
      "error": "No se pudo obtener la foto de perfil"
    },
    {
      "jid": "1111111111@s.whatsapp.net",
      "fileId": "profile_1111111111_s_whatsapp_net_1640995200001",
      "url": "/api/media/profile_1111111111_s_whatsapp_net_1640995200001",
      "lowRes": "/api/media/profile_1111111111_s_whatsapp_net_1640995200001",
      "highRes": "/api/media/profile_1111111111_s_whatsapp_net_1640995200001",
      "cached": true,
      "createdAt": "2022-01-01T12:30:00.000Z"
    }
  ],
  "meta": {
    "total": 3,
    "successful": 2,
    "failed": 1,
    "sessionId": "session_001"
  }
}
```

### 3. Forzar Actualización de Foto

**POST** `/api/profile-picture/{sessionId}/{jid}/refresh`

Fuerza la actualización de la foto de perfil eliminando el caché existente.

**Respuesta:**
```json
{
  "success": true,
  "message": "Foto de perfil actualizada exitosamente",
  "data": {
    "jid": "1234567890@s.whatsapp.net",
    "fileId": "profile_1234567890_s_whatsapp_net_1640995200002",
    "url": "/api/media/profile_1234567890_s_whatsapp_net_1640995200002"
  }
}
```

## Ejemplos de Uso en JavaScript/TypeScript

### Axios / Fetch
```typescript
// Obtener foto individual
const getSingleProfilePicture = async (sessionId: string, jid: string) => {
  const response = await fetch(`/api/profile-picture/${sessionId}/${jid}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};

// Obtener múltiples fotos
const getMultipleProfilePictures = async (sessionId: string, contacts: string[]) => {
  const response = await fetch('/api/profile-pictures', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId,
      contacts,
      refresh: false
    })
  });
  return response.json();
};
```

### React Hook
```typescript
import { useState, useEffect } from 'react';

export const useProfilePicture = (sessionId: string, jid: string) => {
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfilePicture = async () => {
    setLoading(true);
    try {
      const response = await getSingleProfilePicture(sessionId, jid);
      if (response.success && response.data) {
        setProfilePicture(response.data.url);
      }
    } catch (error) {
      console.error('Error fetching profile picture:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sessionId && jid) {
      fetchProfilePicture();
    }
  }, [sessionId, jid]);

  return { profilePicture, loading, refetch: fetchProfilePicture };
};
```

## Arquitectura del Sistema

### Almacenamiento
- **MongoDB**: Las fotos se almacenan como `Buffer` en la colección `media`
- **Cache**: 24 horas por defecto
- **Tipo**: `profile-pic` en el campo `mediaType`

### Servicios
- **WhatsApp Service**: Maneja la comunicación con Baileys
- **Media Service**: Gestión de archivos multimedia
- **Cache System**: Validación automática de refrescos

### Seguridad
- **JWT Authentication**: Todos los endpoints requieren autenticación
- **Validation**: Validación de formato de JIDs
- **Error Handling**: Manejo robusto de errores

## Notas de Rendimiento

### Bulk Requests
- Las consultas múltiples usan `Promise.allSettled()` para no fallar si una foto individual falla
- Las fotos se obtienen en paralelo para máximo rendimiento

### Cache
- Cache inteligente de 24 horas reduce llamadas a WhatsApp
- Eliminación automática de archivos antiguos
- Opción de refresh manual disponible

### Límites
- Sin límites específicos en cantidad de contactos por request bulk
- Recomendado máximo 50 contactos por request para evitar timeouts

## Diferencias con el Código Original

### ✅ Mejoras Implementadas
1. **TypeScript**: Tipado completo vs JavaScript plano
2. **Autenticación**: JWT requerido en lugar de acceso libre
3. **Validación**: Validación robusta de parámetros
4. **Error Handling**: Manejo de errores más granular
5. **Documentación**: Swagger/OpenAPI completa
6. **Integración**: Se integra con el sistema existente de media/chats
7. **Cache**: Sistema de cache más sofisticado
8. **Logging**: Logging estructurado para debugging

### 🔄 Cambios de Arquitectura
- En lugar de usar Express App directamente, usa el sistema de rutas modular
- Integración con el sistema de autenticación existente
- Storage en MongoDB en lugar de acceso directo a URLs
- Sistema de sesiones integrado

## Troubleshooting

### Error: "Sesión no conectada"
- Verificar que la sesión esté activa en `/api/sessions`
- Regenerar QR si es necesario

### Error: "Formato de JID inválido"
- Usar formato: `numero@s.whatsapp.net`
- Para números internacionales: `+1234567890@s.whatsapp.net`

### Error: "No se pudo obtener la foto de perfil"
- El contacto podría no tener foto de perfil pública
- Verificar permisos de privacidad del contacto
- Usar endpoint de refresh para forzar nueva descarga

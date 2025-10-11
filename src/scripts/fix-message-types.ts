/**
 * Script para corregir los messageType de mensajes existentes en MongoDB
 * Convierte tipos de Baileys a tipos simplificados
 */

import mongoose from 'mongoose';
import { Message } from '../models/Message';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/whatsapp-multi';

async function fixMessageTypes() {
  try {
    console.log('🔌 Conectando a MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Conectado a MongoDB');

    // Mapeo de tipos
    const typeMapping: { [key: string]: string } = {
      'imageMessage': 'image',
      'stickerMessage': 'image',
      'videoMessage': 'video',
      'audioMessage': 'audio',
      'documentMessage': 'document',
      'conversation': 'text',
      'extendedTextMessage': 'text',
    };

    // Obtener todos los mensajes
    const messages = await Message.find({});
    console.log(`📊 Total de mensajes: ${messages.length}`);

    let updated = 0;
    let skipped = 0;

    for (const msg of messages) {
      const currentType = msg.messageType;
      
      // Si el tipo ya está simplificado, saltar
      if (['text', 'image', 'video', 'audio', 'document'].includes(currentType)) {
        skipped++;
        continue;
      }

      // Mapear al tipo simplificado
      const newType = typeMapping[currentType] || 'text';
      
      if (newType !== currentType) {
        await Message.updateOne(
          { _id: msg._id },
          { 
            $set: { 
              messageType: newType,
              // Si mediaType está vacío, usar el tipo original
              mediaType: msg.mediaType || currentType
            } 
          }
        );
        updated++;
        console.log(`✅ Actualizado: ${msg.messageId} | ${currentType} → ${newType}`);
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   Total: ${messages.length}`);
    console.log(`   Actualizados: ${updated}`);
    console.log(`   Sin cambios: ${skipped}`);
    console.log('\n✅ Script completado');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar script
fixMessageTypes();

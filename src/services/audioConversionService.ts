import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { PassThrough, Readable } from 'stream';

// Configurar FFmpeg path
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

export interface AudioConversionOptions {
  inputFormat?: string;
  outputFormat?: 'mp3' | 'ogg' | 'wav';
  quality?: 'low' | 'medium' | 'high';
  bitrate?: string;
  sampleRate?: number;
  channels?: number;
}

export interface ConversionResult {
  success: boolean;
  buffer?: Buffer;
  mimetype?: string;
  duration?: number;
  size?: number;
  error?: string;
}

class AudioConversionService {
  /**
   * Convertir OGG Opus a MP3
   */
  async convertOggOpusToMP3(
    inputBuffer: Buffer, 
    options: AudioConversionOptions = {}
  ): Promise<ConversionResult> {
    return new Promise((resolve) => {
      try {
        const { 
          quality = 'medium', 
          bitrate = '128k',
          sampleRate = 44100,
          channels = 2
        } = options;

        const outputStream = new PassThrough();
        const chunks: Buffer[] = [];

        outputStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        outputStream.on('end', () => {
          const outputBuffer = Buffer.concat(chunks);
          
          resolve({
            success: true,
            buffer: outputBuffer,
            mimetype: 'audio/mpeg',
            duration: options.sampleRate ? undefined : 0,
            size: outputBuffer.length,
          });
        });

        outputStream.on('error', (error) => {
          resolve({
            success: false,
            error: `Stream error: ${error.message}`,
          });
        });

        // Convertir buffer a readable stream
        const inputStream = new Readable();
        inputStream.push(inputBuffer);
        inputStream.push(null);

        ffmpeg(inputStream)
          .inputFormat('ogg')
          .audioCodec('libmp3lame')
          .audioBitrate(bitrate)
          .audioFrequency(sampleRate)
          .audioChannels(channels)
          .format('mp3')
          .on('start', (commandLine: string) => {
            console.log('FFmpeg process started:', commandLine);
          })
          .on('progress', (progress: any) => {
            console.log(`Processing: ${progress.percent}% done`);
          })
          .on('error', (error: any) => {
            console.error('FFmpeg error:', error);
            resolve({
              success: false,
              error: `Conversion failed: ${error.message}`,
            });
          })
          .on('end', () => {
            console.log('Audio conversion completed');
          })
          .stream(outputStream);
      } catch (error) {
        resolve({
          success: false,
          error: `Conversion error: ${(error as Error).message}`,
        });
      }
    });
  }

  /**
   * Convertir cualquier formato de audio a MP3
   */
  async convertToMP3(
    inputBuffer: Buffer,
    inputFormat: string = 'ogg',
    options: AudioConversionOptions = {}
  ): Promise<ConversionResult> {
    return new Promise((resolve) => {
      try {
        const { 
          quality = 'medium', 
          bitrate = '128k',
          sampleRate = 44100,
          channels = options.outputFormat === 'ogg' ? 1 : 2 // Mono para OGG, estéreo para MP3
        } = options;

        const outputStream = new PassThrough();
        const chunks: Buffer[] = [];

        outputStream.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        outputStream.on('end', () => {
          const outputBuffer = Buffer.concat(chunks);
          
          resolve({
            success: true,
            buffer: outputBuffer,
            mimetype: 'audio/mpeg',
            duration: undefined,
            size: outputBuffer.length,
          });
        });

        outputStream.on('error', (error) => {
          resolve({
            success: false,
            error: `Stream error: ${error.message}`,
          });
        });

        // Convertir buffer a readable stream para la conversión MP3
        const inputStream = new Readable();
        inputStream.push(inputBuffer);
        inputStream.push(null);

        // Configuración específica para conversión según el formato de entrada
        let ffmpegCommand = ffmpeg(inputStream)
          .inputFormat(inputFormat);

        // Optimizaciones según el formato de entrada
        if (inputFormat === 'ogg') {
          // Para OGG Opus de WhatsApp (notas de voz)
          ffmpegCommand = ffmpegCommand
            .audioCodec('libmp3lame')
            .audioBitrate(bitrate)
            .audioFrequency(sampleRate)
            .audioChannels(2) // Convertir a estéreo
            .format('mp3');
        } else {
          // Para otros formatos de audio
          ffmpegCommand = ffmpegCommand
            .audioCodec('libmp3lame')
            .audioBitrate(bitrate)
            .audioFrequency(sampleRate)
            .audioChannels(channels)
            .format('mp3');
        }

        ffmpegCommand
          .on('start', (commandLine: string) => {
            console.log('FFmpeg MP3 conversion started:', commandLine);
          })
          .on('progress', (progress: any) => {
            if (progress.percent) {
              console.log(`MP3 conversion: ${progress.percent}% done`);
            }
          })
          .on('error', (error: any) => {
            console.error('FFmpeg MP3 error:', error);
            resolve({
              success: false,
              error: `MP3 conversion failed: ${error.message}`,
            });
          })
          .on('end', () => {
            console.log('Audio MP3 conversion completed');
          })
          .stream(outputStream);
      } catch (error) {
        resolve({
          success: false,
          error: `MP3 conversion error: ${(error as Error).message}`,
        });
      }
    });
  }

  /**
   * Convertir audio preservando la optimización para notas de voz
   */
  async convertVoiceNoteToOptimizedFormat(
    inputBuffer: Buffer,
    outputFormat: 'mp3' | 'ogg' = 'mp3'
  ): Promise<ConversionResult> {
    try {
      if (outputFormat === 'mp3') {
        // Para notas de voz convertidas a MP3, usar configuración mono de alta calidad
        return await this.convertToMP3(inputBuffer, 'ogg', {
          quality: 'high',
          bitrate: '192k',
          sampleRate: 48000,
          channels: 1, // Mantener mono para notas de voz
        });
      } else {
        // Mantener como OGG pero optimizado
        return await this.convertToMP3(inputBuffer, 'ogg', {
          outputFormat: 'ogg',
          quality: 'high',
          bitrate: '192k',
          sampleRate: 48000,
          channels: 1,
        });
      }
    } catch (error) {
      return {
        success: false,
        error: `Voice note conversion error: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Detectar formato del buffer de audio
   */
  detectAudioFormat(buffer: Buffer): string {
    // Detectar formato basado en magic bytes
    if (buffer.subarray(0, 4).toString('hex') === '4f676753') {
      return 'ogg'; // OGG magic bytes: "OggS"
    }
    if (buffer.subarray(0, 3).toString('hex') === '494433') {
      return 'mp3'; // MP3 magic bytes: "ID3"
    }
    if (buffer.subarray(0, 4).toString('hex') === '52494646') {
      return 'wav'; // WAV magic bytes: "RIFF"
    }
    
    return 'ogg'; // Default para WhatsApp
  }

  /**
   * Validar si el buffer necesita conversión
   */
  needsConversion(buffer: Buffer, targetFormat: string = 'mp3'): boolean {
    const detectedFormat = this.detectAudioFormat(buffer);
    console.log(`Detected format: ${detectedFormat}, target: ${targetFormat}`);
    return detectedFormat !== targetFormat;
  }
}

export const audioConversionService = new AudioConversionService();

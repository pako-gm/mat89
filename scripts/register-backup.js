#!/usr/bin/env node

/**
 * Script para registrar backups automáticos en la base de datos
 * Usado por GitHub Actions después de crear el backup
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Registra el backup en la base de datos
 */
async function registerBackup() {
  try {
    // Buscar el archivo de backup más reciente
    const backupsDir = path.join(__dirname, '..', 'backups');
    const files = fs.readdirSync(backupsDir).filter(f => f.endsWith('.sql'));

    if (files.length === 0) {
      console.error('❌ No se encontró ningún archivo de backup');
      process.exit(1);
    }

    // Ordenar por fecha de modificación (más reciente primero)
    const latestFile = files
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(backupsDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time)[0].name;

    const filePath = path.join(backupsDir, latestFile);
    const stats = fs.statSync(filePath);
    const sizeKB = Math.round(stats.size / 1024);

    // Obtener fecha del nombre del archivo (backup_mat89_2025-12-08_19-30.sql)
    const dateMatch = latestFile.match(/(\d{4}-\d{2}-\d{2}_\d{2}-\d{2})/);
    const backupDate = dateMatch ? dateMatch[1].replace('_', ' ').replace(/-/g, ':') : new Date().toISOString();

    // Preparar metadata del backup
    const metadata = {
      nombre_archivo: latestFile,
      fecha_creacion: new Date(backupDate).toISOString(),
      tamano_kb: sizeKB,
      tablas_incluidas: 8, // Número de tablas en el backup
      registros_totales: null, // No calculamos esto en backups automáticos
      usuario_creador: 'GitHub Actions',
      tipo: 'automatico',
      descripcion: `Backup automático semanal generado por GitHub Actions el ${new Date().toLocaleString('es-ES')}`
    };

    console.log('📝 Registrando backup en la base de datos...');
    console.log('   Archivo:', metadata.nombre_archivo);
    console.log('   Tamaño:', sizeKB, 'KB');
    console.log('   Tipo:', metadata.tipo);

    // Insertar en la base de datos
    const { data, error } = await supabase
      .from('tbl_backups_registro')
      .insert(metadata)
      .select();

    if (error) {
      console.error('❌ Error insertando backup en la base de datos:', error);
      throw error;
    }

    console.log('✅ Backup registrado exitosamente');
    console.log('   ID:', data[0]?.id);
    console.log('   Ahora aparecerá en el historial de la aplicación web');

  } catch (error) {
    console.error('❌ Error al registrar backup:', error);
    process.exit(1);
  }
}

// Ejecutar
registerBackup();

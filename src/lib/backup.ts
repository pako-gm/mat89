import { supabase } from './supabase';

// Tipos para el sistema de backups
export interface BackupMetadata {
  id?: string;
  nombre_archivo: string;
  fecha_creacion: string;
  tamano_kb: number;
  tablas_incluidas: number;
  registros_totales: number;
  usuario_creador: string;
  tipo: 'manual' | 'automatico';
  descripcion?: string;
}

export interface BackupProgress {
  table: string;
  current: number;
  total: number;
  percentage: number;
}

// Tablas a respaldar (orden importante por dependencias)
const TABLES_TO_BACKUP = [
  'tbl_almacenes',
  'tbl_proveedores',
  'tbl_materiales',
  'tbl_pedidos_rep',
  'tbl_ln_pedidos_rep',
  'tbl_recepciones',
  'tbl_historico_cambios',
  'user_profiles'
];

/**
 * Escapa valores para SQL de forma segura
 */
function escapeSQLValue(value: any): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    // PostgreSQL array format
    const escaped = value.map(v => escapeSQLValue(v)).join(',');
    return `ARRAY[${escaped}]`;
  }
  if (typeof value === 'object') {
    // JSONB
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  // String
  return `'${value.toString().replace(/'/g, "''")}'`;
}

/**
 * Obtiene el esquema de una tabla
 * NOTA: Función no utilizada actualmente - reservada para futura implementación
 */
// async function getTableSchema(tableName: string): Promise<string> {
//   try {
//     // Obtener información de columnas desde information_schema
//     const { data: columns, error } = await supabase
//       .rpc('get_table_columns', { table_name: tableName })
//       .single();
//
//     if (error) {
//       // Fallback: obtener primera fila para inferir estructura
//       const { data: sampleRow } = await supabase
//         .from(tableName)
//         .select('*')
//         .limit(1)
//         .single();
//
//       if (!sampleRow) {
//         return `-- No se pudo obtener esquema de ${tableName}\n`;
//       }
//
//       // Generar CREATE TABLE básico
//       const cols = Object.keys(sampleRow)
//         .map(col => `  ${col} TEXT`) // Tipo genérico
//         .join(',\n');
//
//       return `CREATE TABLE IF NOT EXISTS ${tableName} (\n${cols}\n);\n\n`;
//     }
//
//     return columns as string;
//   } catch (err) {
//     console.error(`Error obteniendo esquema de ${tableName}:`, err);
//     return `-- Error obteniendo esquema de ${tableName}\n`;
//   }
// }

/**
 * Genera backup completo de la base de datos
 */
export async function generateFullBackup(
  userName: string,
  onProgress?: (progress: BackupProgress) => void
): Promise<{ sql: string; metadata: BackupMetadata }> {
  const startTime = Date.now();
  let sqlContent = '';
  let totalRecords = 0;

  // Header del archivo SQL
  const timestamp = new Date().toISOString();
  const filename = `backup_mat89_${new Date().toISOString().split('T')[0]}_${Date.now()}.sql`;

  sqlContent += `-- =============================================\n`;
  sqlContent += `-- Backup de Base de Datos - MAT89\n`;
  sqlContent += `-- Fecha: ${timestamp}\n`;
  sqlContent += `-- Usuario: ${userName}\n`;
  sqlContent += `-- =============================================\n\n`;

  // Extensiones necesarias
  sqlContent += `-- Extensiones requeridas\n`;
  sqlContent += `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`;
  sqlContent += `CREATE EXTENSION IF NOT EXISTS "pgcrypto";\n\n`;

  // Procesar cada tabla
  for (let i = 0; i < TABLES_TO_BACKUP.length; i++) {
    const tableName = TABLES_TO_BACKUP[i];

    try {
      // Obtener todos los datos de la tabla
      const { data: rows, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) {
        console.error(`Error leyendo tabla ${tableName}:`, error);
        sqlContent += `-- Error leyendo tabla ${tableName}: ${error.message}\n\n`;
        continue;
      }

      const rowCount = rows?.length || 0;
      totalRecords += rowCount;

      // Reportar progreso
      if (onProgress) {
        onProgress({
          table: tableName,
          current: i + 1,
          total: TABLES_TO_BACKUP.length,
          percentage: Math.round(((i + 1) / TABLES_TO_BACKUP.length) * 100)
        });
      }

      // Agregar comentario de tabla
      sqlContent += `-- =============================================\n`;
      sqlContent += `-- Tabla: ${tableName} (${rowCount} registros)\n`;
      sqlContent += `-- =============================================\n\n`;

      // Generar INSERTs si hay datos
      if (rows && rows.length > 0) {
        // Obtener nombres de columnas
        const columns = Object.keys(rows[0]);

        // Generar INSERT statements (en lotes de 100)
        const batchSize = 100;
        for (let j = 0; j < rows.length; j += batchSize) {
          const batch = rows.slice(j, j + batchSize);

          batch.forEach(row => {
            const values = columns.map(col => escapeSQLValue(row[col])).join(', ');
            sqlContent += `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});\n`;
          });
        }

        sqlContent += `\n`;
      } else {
        sqlContent += `-- Tabla vacía\n\n`;
      }

    } catch (err) {
      console.error(`Error procesando tabla ${tableName}:`, err);
      sqlContent += `-- Error procesando tabla ${tableName}\n\n`;
    }
  }

  // Footer
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  sqlContent += `-- =============================================\n`;
  sqlContent += `-- Backup completado\n`;
  sqlContent += `-- Tiempo: ${duration}s\n`;
  sqlContent += `-- Total registros: ${totalRecords}\n`;
  sqlContent += `-- =============================================\n`;

  // Calcular tamaño
  const sizeKB = Math.round(new Blob([sqlContent]).size / 1024);

  const metadata: BackupMetadata = {
    nombre_archivo: filename,
    fecha_creacion: timestamp,
    tamano_kb: sizeKB,
    tablas_incluidas: TABLES_TO_BACKUP.length,
    registros_totales: totalRecords,
    usuario_creador: userName,
    tipo: 'manual',
    descripcion: `Backup manual generado desde la interfaz web`
  };

  return { sql: sqlContent, metadata };
}

/**
 * Descarga archivo SQL
 */
export function downloadSQLFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Guarda metadata del backup en la base de datos
 */
export async function saveBackupMetadata(metadata: BackupMetadata): Promise<void> {
  const { error } = await supabase
    .from('tbl_backups_registro')
    .insert(metadata);

  if (error) {
    console.error('Error guardando metadata de backup:', error);
    throw error;
  }
}

/**
 * Lista todos los backups registrados
 */
export async function listBackups(): Promise<BackupMetadata[]> {
  const { data, error } = await supabase
    .from('tbl_backups_registro')
    .select('*')
    .order('fecha_creacion', { ascending: false });

  if (error) {
    console.error('Error listando backups:', error);
    throw error;
  }

  return data || [];
}

/**
 * Elimina registro de backup
 */
export async function deleteBackupMetadata(id: string): Promise<void> {
  const { error } = await supabase
    .from('tbl_backups_registro')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error eliminando metadata de backup:', error);
    throw error;
  }
}

/**
 * Restaura backup desde archivo SQL
 * NOTA: Esta función requiere ejecutar SQL directamente, lo cual tiene limitaciones
 * en Supabase desde el cliente. Se recomienda usar herramientas administrativas.
 */
export async function restoreBackup(_sqlContent: string): Promise<{ success: boolean; message: string }> {
  try {
    // ADVERTENCIA: Supabase no permite ejecutar SQL arbitrario desde el cliente
    // Esta función es más conceptual. La restauración real debería hacerse:
    // 1. Desde el panel de Supabase (SQL Editor)
    // 2. Usando herramientas CLI como psql
    // 3. Con un endpoint backend dedicado

    return {
      success: false,
      message: 'La restauración debe hacerse desde el panel de Supabase o usando psql. Por seguridad, no se permite ejecutar SQL arbitrario desde el cliente.'
    };
  } catch (err) {
    return {
      success: false,
      message: `Error: ${err}`
    };
  }
}

/**
 * Valida que el usuario tenga permisos de administrador
 */
export async function validateAdminPermission(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('user_role')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error('Error validando permisos:', error);
    return false;
  }

  return data.user_role === 'ADMINISTRADOR';
}

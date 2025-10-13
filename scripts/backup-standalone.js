#!/usr/bin/env node

/**
 * BACKUP STANDALONE - Mat89 Database
 * Script ejecutable independiente para backup de base de datos
 *
 * Uso:
 *   node backup-standalone.js
 *   O crear ejecutable con: npm run build:backup
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import readline from 'readline';

// Configuración de rutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar variables de entorno
dotenv.config({ path: join(__dirname, '..', '.env') });

// Colores para consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.blue}${msg}${colors.reset}\n`),
};

// Configuración
const CONFIG = {
  tables: [
    'tbl_almacenes',
    'tbl_proveedores',
    'tbl_materiales',
    'tbl_pedidos_rep',
    'tbl_ln_pedidos_rep',
    'tbl_recepciones',
    'tbl_historico_cambios',
    'user_profiles'
  ],
  backupDir: join(__dirname, '..', 'backups'),
  maxBackups: 10, // Mantener últimos 10 backups
};

// Crear cliente de Supabase
let supabase;

function initSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log.error('Variables de entorno no configuradas');
    log.info('Asegúrate de tener un archivo .env con:');
    log.info('  VITE_SUPABASE_URL=tu-url');
    log.info('  VITE_SUPABASE_ANON_KEY=tu-key');
    process.exit(1);
  }

  supabase = createClient(supabaseUrl, supabaseKey);
  log.success('Conectado a Supabase');
}

// Escapar valores SQL
function escapeSQLValue(value) {
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
    const escapedItems = value.map(item => {
      if (typeof item === 'string') {
        return `"${item.replace(/"/g, '\\"')}"`;
      }
      return item;
    });
    return `ARRAY[${escapedItems.join(', ')}]::text[]`;
  }
  if (typeof value === 'object') {
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  return `'${value.toString().replace(/'/g, "''")}'`;
}

// Generar estructura de tablas
function generateStructure() {
  return `
-- ============================================
-- BACKUP COMPLETO - Mat89 Database
-- Fecha: ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}
-- Generado automáticamente
-- ============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLA: tbl_almacenes
-- ============================================
CREATE TABLE IF NOT EXISTS tbl_almacenes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_alm TEXT NOT NULL UNIQUE,
  nombre_alm TEXT NOT NULL,
  ubicacion TEXT,
  responsable TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tbl_almacenes_codigo ON tbl_almacenes(codigo_alm);
CREATE INDEX IF NOT EXISTS idx_tbl_almacenes_activo ON tbl_almacenes(activo);

-- ============================================
-- TABLA: tbl_proveedores
-- ============================================
CREATE TABLE IF NOT EXISTS tbl_proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  direccion TEXT,
  ciudad TEXT,
  codigo_postal TEXT,
  provincia TEXT,
  telefono TEXT,
  email TEXT,
  persona_contacto TEXT,
  es_externo BOOLEAN DEFAULT false,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tbl_proveedores_nombre ON tbl_proveedores(nombre);
CREATE INDEX IF NOT EXISTS idx_tbl_proveedores_es_externo ON tbl_proveedores(es_externo);

-- ============================================
-- TABLA: tbl_materiales
-- ============================================
CREATE TABLE IF NOT EXISTS tbl_materiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_89 TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  categoria TEXT,
  unidad_medida TEXT,
  precio_referencia NUMERIC(10,2),
  stock_minimo INTEGER,
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tbl_materiales_matricula ON tbl_materiales(matricula_89);
CREATE INDEX IF NOT EXISTS idx_tbl_materiales_activo ON tbl_materiales(activo);

-- ============================================
-- TABLA: tbl_pedidos_rep
-- ============================================
CREATE TABLE IF NOT EXISTS tbl_pedidos_rep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  num_pedido TEXT NOT NULL UNIQUE,
  alm_envia TEXT NOT NULL,
  proveedor_id UUID REFERENCES tbl_proveedores(id) ON DELETE RESTRICT,
  vehiculo TEXT,
  garantia BOOLEAN DEFAULT false,
  informacion_nc TEXT,
  fecha_desmonte DATE,
  fecha_envio DATE,
  averia_declarada TEXT,
  documentacion TEXT[] DEFAULT '{}',
  estado_pedido TEXT DEFAULT 'PENDIENTE',
  cancelado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tbl_pedidos_num_pedido ON tbl_pedidos_rep(num_pedido);
CREATE INDEX IF NOT EXISTS idx_tbl_pedidos_proveedor ON tbl_pedidos_rep(proveedor_id);
CREATE INDEX IF NOT EXISTS idx_tbl_pedidos_fecha_envio ON tbl_pedidos_rep(fecha_envio);
CREATE INDEX IF NOT EXISTS idx_tbl_pedidos_estado ON tbl_pedidos_rep(estado_pedido);

-- ============================================
-- TABLA: tbl_ln_pedidos_rep
-- ============================================
CREATE TABLE IF NOT EXISTS tbl_ln_pedidos_rep (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES tbl_pedidos_rep(id) ON DELETE CASCADE,
  matricula_89 TEXT NOT NULL,
  descripcion TEXT,
  nenv INTEGER DEFAULT 1,
  nsenv TEXT,
  estado_completado BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tbl_ln_pedidos_pedido_id ON tbl_ln_pedidos_rep(pedido_id);
CREATE INDEX IF NOT EXISTS idx_tbl_ln_pedidos_matricula ON tbl_ln_pedidos_rep(matricula_89);

-- ============================================
-- TABLA: tbl_recepciones
-- ============================================
CREATE TABLE IF NOT EXISTS tbl_recepciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES tbl_pedidos_rep(id) ON DELETE CASCADE,
  linea_pedido_id UUID REFERENCES tbl_ln_pedidos_rep(id) ON DELETE CASCADE,
  fecha_recepcion DATE NOT NULL,
  cantidad_recibida INTEGER DEFAULT 1,
  numero_serie TEXT,
  estado_recepcion TEXT DEFAULT 'UTIL',
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tbl_recepciones_pedido ON tbl_recepciones(pedido_id);
CREATE INDEX IF NOT EXISTS idx_tbl_recepciones_linea ON tbl_recepciones(linea_pedido_id);

-- ============================================
-- TABLA: tbl_historico_cambios
-- ============================================
CREATE TABLE IF NOT EXISTS tbl_historico_cambios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES tbl_pedidos_rep(id) ON DELETE CASCADE,
  descripcion_cambio TEXT NOT NULL,
  usuario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tbl_historico_pedido ON tbl_historico_cambios(pedido_id);

-- ============================================
-- TABLA: user_profiles
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT,
  email TEXT NOT NULL,
  user_role TEXT NOT NULL DEFAULT 'CONSULTAS',
  status TEXT NOT NULL DEFAULT 'PENDIENTE',
  ambito_almacenes TEXT[] DEFAULT '{}',
  nombre_usuario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_role ON user_profiles(user_role);
`;
}

// Exportar datos de una tabla
async function exportTableData(tableName, progressBar) {
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: true });

    if (error) {
      if (error.code === '42P01') {
        log.warning(`Tabla ${tableName} no existe, omitiendo...`);
        return `-- Tabla ${tableName} no existe\n`;
      }
      throw error;
    }

    if (!data || data.length === 0) {
      progressBar.update(tableName, 0, 'Sin datos');
      return `-- Sin datos en ${tableName}\n`;
    }

    const statements = [];
    statements.push(`\n-- ============================================`);
    statements.push(`-- DATOS: ${tableName} (${data.length} registros)`);
    statements.push(`-- ============================================\n`);

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const columns = Object.keys(row);
      const values = columns.map(col => escapeSQLValue(row[col]));

      const insertSQL = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
      statements.push(insertSQL);

      // Actualizar progreso cada 10%
      if (i % Math.max(1, Math.floor(data.length / 10)) === 0) {
        progressBar.update(tableName, Math.floor((i / data.length) * 100));
      }
    }

    progressBar.update(tableName, 100, `${data.length} registros`);
    return statements.join('\n');

  } catch (err) {
    log.error(`Error en ${tableName}: ${err.message}`);
    return `-- Error al exportar ${tableName}: ${err.message}\n`;
  }
}

// Barra de progreso simple
class ProgressBar {
  constructor(tables) {
    this.tables = tables;
    this.progress = {};
    tables.forEach(t => this.progress[t] = { percent: 0, status: 'Pendiente' });
  }

  update(table, percent, status = '') {
    this.progress[table] = { percent, status };
    this.render();
  }

  render() {
    // Limpiar consola (solo últimas líneas)
    process.stdout.write('\x1B[' + (CONFIG.tables.length + 2) + 'A');
    process.stdout.write('\x1B[J');

    console.log(`\n${colors.bright}Progreso del Backup:${colors.reset}`);
    CONFIG.tables.forEach(table => {
      const { percent, status } = this.progress[table];
      const barLength = 20;
      const filled = Math.floor((percent / 100) * barLength);
      const empty = barLength - filled;
      const bar = '█'.repeat(filled) + '░'.repeat(empty);

      const statusText = status ? ` - ${status}` : '';
      console.log(`  ${table.padEnd(25)} [${bar}] ${percent}%${statusText}`);
    });
  }
}

// Gestionar backups antiguos
function manageOldBackups() {
  const files = readdirSync(CONFIG.backupDir)
    .filter(f => f.startsWith('backup_mat89_') && f.endsWith('.sql'))
    .map(f => ({
      name: f,
      path: join(CONFIG.backupDir, f),
      mtime: statSync(join(CONFIG.backupDir, f)).mtime
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length > CONFIG.maxBackups) {
    const toDelete = files.slice(CONFIG.maxBackups);
    log.info(`Eliminando ${toDelete.length} backups antiguos...`);
    toDelete.forEach(file => {
      unlinkSync(file.path);
      log.success(`  Eliminado: ${file.name}`);
    });
  }
}

// Función principal
async function main() {
  log.title('═══════════════════════════════════════════════');
  log.title('    BACKUP AUTOMÁTICO - Mat89 Database');
  log.title('═══════════════════════════════════════════════');

  // 1. Inicializar
  log.info('Inicializando...');
  initSupabase();

  // 2. Crear directorio de backups
  if (!existsSync(CONFIG.backupDir)) {
    mkdirSync(CONFIG.backupDir, { recursive: true });
    log.success('Directorio de backups creado');
  }

  // 3. Generar estructura
  log.info('Generando estructura de tablas...');
  const structure = generateStructure();

  // 4. Exportar datos
  log.info('Exportando datos de tablas...\n');
  const progressBar = new ProgressBar(CONFIG.tables);
  progressBar.render();

  const dataExports = [];
  for (const table of CONFIG.tables) {
    const data = await exportTableData(table, progressBar);
    dataExports.push(data);
  }

  // 5. Consolidar backup
  const backupContent = [
    structure,
    '\n-- ============================================',
    '-- DATOS DE TABLAS',
    '-- ============================================',
    ...dataExports,
    '\n-- ============================================',
    '-- FIN DEL BACKUP',
    '-- ============================================\n'
  ].join('\n');

  // 6. Guardar archivo
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `backup_mat89_${timestamp}_${Date.now()}.sql`;
  const filepath = join(CONFIG.backupDir, filename);

  writeFileSync(filepath, backupContent, 'utf-8');

  // 7. Gestionar backups antiguos
  manageOldBackups();

  // 8. Resumen final
  const stats = {
    size: (backupContent.length / 1024).toFixed(2),
    lines: backupContent.split('\n').length,
    tables: CONFIG.tables.length
  };

  console.log('\n');
  log.title('═══════════════════════════════════════════════');
  log.success('Backup completado exitosamente!');
  log.title('═══════════════════════════════════════════════');
  log.info(`📁 Archivo: ${filename}`);
  log.info(`📊 Tamaño: ${stats.size} KB`);
  log.info(`📝 Líneas: ${stats.lines}`);
  log.info(`📦 Tablas: ${stats.tables}`);
  log.info(`📍 Ubicación: ${filepath}`);
  console.log('');
}

// Ejecutar
main()
  .then(() => process.exit(0))
  .catch(err => {
    log.error(`Error fatal: ${err.message}`);
    console.error(err);
    process.exit(1);
  });

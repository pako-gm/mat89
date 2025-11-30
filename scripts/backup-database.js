/**
 * Script para generar backup completo de la base de datos Supabase
 * Incluye estructura (CREATE TABLE) y datos (INSERT INTO)
 *
 * Uso: node scripts/backup-database.js
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuración de Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  console.error('Asegúrate de tener VITE_SUPABASE_URL y VITE_SUPABASE_SERVICE_KEY en tu archivo .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Lista de tablas a respaldar
const TABLES = [
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
 * Escapa valores para SQL
 */
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
    // Para arrays PostgreSQL
    const escapedItems = value.map(item => {
      if (typeof item === 'string') {
        return `"${item.replace(/"/g, '\\"')}"`;
      }
      return item;
    });
    return `ARRAY[${escapedItems.join(', ')}]::text[]`;
  }
  if (typeof value === 'object') {
    // Para JSONB
    return `'${JSON.stringify(value).replace(/'/g, "''")}'::jsonb`;
  }
  // String
  return `'${value.toString().replace(/'/g, "''")}'`;
}

/**
 * Genera CREATE TABLE statements
 */
function generateCreateTableStatements() {
  const statements = [];

  statements.push(`
-- ============================================
-- ESTRUCTURA DE BASE DE DATOS - Mat89
-- Fecha: ${new Date().toISOString()}
-- ============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- TABLA: tbl_almacenes
-- Descripción: Catálogo de almacenes del sistema
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
-- Descripción: Almacena información de proveedores internos y externos
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
-- Descripción: Catálogo de materiales indexado por matrícula 89
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
-- Descripción: Pedidos de reparación de material
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
CREATE INDEX IF NOT EXISTS idx_tbl_pedidos_cancelado ON tbl_pedidos_rep(cancelado);

-- ============================================
-- TABLA: tbl_ln_pedidos_rep
-- Descripción: Líneas de pedido (detalle de materiales enviados)
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
CREATE INDEX IF NOT EXISTS idx_tbl_ln_pedidos_completado ON tbl_ln_pedidos_rep(estado_completado);

-- ============================================
-- TABLA: tbl_recepciones
-- Descripción: Recepciones de material reparado
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
CREATE INDEX IF NOT EXISTS idx_tbl_recepciones_fecha ON tbl_recepciones(fecha_recepcion);
CREATE INDEX IF NOT EXISTS idx_tbl_recepciones_estado ON tbl_recepciones(estado_recepcion);

-- ============================================
-- TABLA: tbl_historico_cambios
-- Descripción: Registro de cambios en pedidos (auditoría)
-- ============================================
CREATE TABLE IF NOT EXISTS tbl_historico_cambios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID REFERENCES tbl_pedidos_rep(id) ON DELETE CASCADE,
  descripcion_cambio TEXT NOT NULL,
  usuario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tbl_historico_pedido ON tbl_historico_cambios(pedido_id);
CREATE INDEX IF NOT EXISTS idx_tbl_historico_fecha ON tbl_historico_cambios(created_at);

-- ============================================
-- TABLA: user_profiles
-- Descripción: Perfiles de usuario con roles y permisos
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
CREATE INDEX IF NOT EXISTS idx_user_profiles_status ON user_profiles(status);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ============================================
-- COMENTARIOS EN TABLAS
-- ============================================
COMMENT ON TABLE tbl_almacenes IS 'Catálogo de almacenes del sistema';
COMMENT ON TABLE tbl_proveedores IS 'Proveedores internos y externos de reparación';
COMMENT ON TABLE tbl_materiales IS 'Catálogo de materiales con matrícula 89';
COMMENT ON TABLE tbl_pedidos_rep IS 'Pedidos de reparación de material';
COMMENT ON TABLE tbl_ln_pedidos_rep IS 'Líneas de detalle de pedidos';
COMMENT ON TABLE tbl_recepciones IS 'Recepciones de material reparado';
COMMENT ON TABLE tbl_historico_cambios IS 'Auditoría de cambios en pedidos';
COMMENT ON TABLE user_profiles IS 'Perfiles de usuario con roles y permisos';
`);

  return statements.join('\n');
}

/**
 * Genera INSERT statements para una tabla
 */
async function generateInsertStatements(tableName) {
  try {
    console.log(`📊 Exportando datos de ${tableName}...`);

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error(`❌ Error en ${tableName}:`, error.message);
      return `-- Error al exportar ${tableName}: ${error.message}\n`;
    }

    if (!data || data.length === 0) {
      return `-- No hay datos en ${tableName}\n`;
    }

    const statements = [];
    statements.push(`\n-- ============================================`);
    statements.push(`-- DATOS: ${tableName} (${data.length} registros)`);
    statements.push(`-- ============================================\n`);

    // Generar INSERTs
    for (const row of data) {
      const columns = Object.keys(row);
      const values = columns.map(col => escapeSQLValue(row[col]));

      const insertSQL = `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`;
      statements.push(insertSQL);
    }

    console.log(`✅ ${tableName}: ${data.length} registros exportados`);
    return statements.join('\n');

  } catch (err) {
    console.error(`❌ Error inesperado en ${tableName}:`, err.message);
    return `-- Error inesperado al exportar ${tableName}: ${err.message}\n`;
  }
}

/**
 * Genera el backup completo
 */
async function generateBackup() {
  console.log('🚀 Iniciando backup de base de datos...\n');

  const backupParts = [];

  // Header
  backupParts.push(`
-- ============================================
-- BACKUP COMPLETO - Mat89 Database
-- Fecha: ${new Date().toLocaleString('es-ES')}
-- Generado automáticamente
-- ============================================
--
-- Este archivo contiene:
-- 1. Estructura completa de la base de datos (CREATE TABLE)
-- 2. Índices y constraints
-- 3. Datos de todas las tablas
--
-- Para restaurar:
-- 1. Crear una nueva base de datos vacía en Supabase
-- 2. Ejecutar este script completo
-- ============================================

`);

  // 1. Estructura
  backupParts.push(generateCreateTableStatements());

  // 2. Datos
  backupParts.push(`\n\n-- ============================================`);
  backupParts.push(`-- DATOS DE TABLAS`);
  backupParts.push(`-- ============================================\n`);

  // Exportar datos de cada tabla
  for (const table of TABLES) {
    const data = await generateInsertStatements(table);
    backupParts.push(data);
  }

  // Footer
  backupParts.push(`\n\n-- ============================================`);
  backupParts.push(`-- FIN DEL BACKUP`);
  backupParts.push(`-- ============================================`);

  // Generar nombre de archivo con timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const filename = `backup_mat89_${timestamp}.sql`;
  const filepath = join(__dirname, '..', 'backups', filename);

  // Guardar archivo
  try {
    const backupContent = backupParts.join('\n');
    writeFileSync(filepath, backupContent, 'utf-8');
    console.log(`\n✅ Backup generado exitosamente:`);
    console.log(`📁 Archivo: ${filepath}`);
    console.log(`📊 Tamaño: ${(backupContent.length / 1024).toFixed(2)} KB`);
  } catch (err) {
    console.error(`❌ Error al guardar archivo:`, err.message);
    process.exit(1);
  }
}

// Ejecutar backup
generateBackup()
  .then(() => {
    console.log('\n🎉 Proceso completado');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ Error fatal:', err);
    process.exit(1);
  });

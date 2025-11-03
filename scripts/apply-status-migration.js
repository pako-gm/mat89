/**
 * Script para aplicar la migración de STATUS a BOOLEAN
 * Ejecuta los pasos manualmente usando la API de Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('🚀 Iniciando migración de STATUS (TEXT → BOOLEAN)...\n');
  console.log('⚠️  NOTA IMPORTANTE:');
  console.log('    Esta migración debe ejecutarse directamente en la base de datos');
  console.log('    usando el SQL Editor de Supabase o psql.\n');
  console.log('    Este script solo verifica el estado actual y prepara los datos.\n');

  try {
    // Paso 1: Verificar el estado actual
    console.log('📊 PASO 1: Verificando estado actual de los usuarios...\n');

    const { data: users, error: fetchError } = await supabase
      .from('user_profiles')
      .select('email, user_role, status');

    if (fetchError) {
      console.error('❌ Error al obtener usuarios:', fetchError.message);
      return;
    }

    console.log(`   Total de usuarios: ${users.length}\n`);

    // Analizar los valores actuales de status
    const statusCounts = {};
    users.forEach(user => {
      const status = user.status;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    console.log('   Distribución actual de status:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   • ${status || 'NULL'}: ${count} usuarios`);
    });

    // Determinar si ya está migrado
    const firstUser = users[0];
    const isMigrated = typeof firstUser?.status === 'boolean';

    console.log('\n─'.repeat(60));

    if (isMigrated) {
      console.log('\n✅ ¡La migración ya está aplicada!');
      console.log('   El campo status ya es de tipo BOOLEAN\n');

      // Mostrar muestra de usuarios
      console.log('📋 Muestra de usuarios:');
      console.log('─'.repeat(80));
      console.log('Email'.padEnd(35), 'Rol'.padEnd(20), 'Status');
      console.log('─'.repeat(80));

      users.slice(0, 10).forEach(user => {
        const statusText = user.status === true ? '✅ ACTIVO' : '❌ INACTIVO';
        console.log(
          user.email.padEnd(35),
          user.user_role.padEnd(20),
          statusText
        );
      });

      console.log('─'.repeat(80));

      // Verificar que todos los admins estén activos
      const inactiveAdmins = users.filter(u => u.user_role === 'ADMINISTRADOR' && u.status !== true);

      if (inactiveAdmins.length > 0) {
        console.log('\n⚠️  ATENCIÓN: Hay administradores INACTIVOS:');
        inactiveAdmins.forEach(admin => {
          console.log(`   • ${admin.email}`);
        });
        console.log('\n   Para activarlos, ejecuta:');
        console.log('   UPDATE user_profiles SET status = true WHERE user_role = \'ADMINISTRADOR\';');
      } else {
        console.log('\n✅ Todos los administradores están activos');
      }

      return;
    }

    // Si no está migrado, mostrar instrucciones
    console.log('\n⚠️  La migración AÚN NO está aplicada');
    console.log('   El campo status es de tipo TEXT\n');

    console.log('📝 Para aplicar la migración, sigue estos pasos:\n');
    console.log('OPCIÓN 1: Usar el SQL Editor de Supabase');
    console.log('─'.repeat(60));
    console.log('1. Ve a: https://supabase.com/dashboard/project/mlisnngduwrlqxyjjibp/editor');
    console.log('2. Abre el SQL Editor');
    console.log('3. Copia y pega el contenido del archivo:');
    console.log('   supabase/migrations/20251101000000_change_status_to_boolean.sql');
    console.log('4. Ejecuta el SQL\n');

    console.log('OPCIÓN 2: Usar Supabase CLI (si está instalado)');
    console.log('─'.repeat(60));
    console.log('   supabase db push\n');

    console.log('OPCIÓN 3: Ejecutar comandos individuales');
    console.log('─'.repeat(60));
    console.log('Copia y ejecuta estos comandos uno por uno en el SQL Editor:\n');

    const sqlCommands = [
      '-- 1. Agregar columna temporal',
      'ALTER TABLE user_profiles ADD COLUMN status_new BOOLEAN;',
      '',
      '-- 2. Migrar datos',
      'UPDATE user_profiles SET status_new = CASE WHEN UPPER(status) = \'ACTIVO\' THEN true ELSE false END;',
      '',
      '-- 3. Configurar constraints',
      'ALTER TABLE user_profiles ALTER COLUMN status_new SET NOT NULL;',
      'ALTER TABLE user_profiles ALTER COLUMN status_new SET DEFAULT false;',
      '',
      '-- 4. Eliminar índice antiguo',
      'DROP INDEX IF EXISTS idx_user_profiles_status;',
      '',
      '-- 5. Eliminar columna antigua',
      'ALTER TABLE user_profiles DROP COLUMN status;',
      '',
      '-- 6. Renombrar columna',
      'ALTER TABLE user_profiles RENAME COLUMN status_new TO status;',
      '',
      '-- 7. Crear nuevo índice',
      'CREATE INDEX idx_user_profiles_status ON user_profiles(status);',
      '',
      '-- 8. Verificar resultado',
      'SELECT email, user_role, status FROM user_profiles LIMIT 5;'
    ];

    sqlCommands.forEach(cmd => console.log(cmd));

    console.log('\n─'.repeat(60));
    console.log('\n💡 Una vez aplicada la migración, ejecuta este script de nuevo');
    console.log('   para verificar que todo funcionó correctamente.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Ejecutar
applyMigration().catch(console.error);

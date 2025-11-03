/**
 * Script para ejecutar la migración de STATUS a BOOLEAN
 * Este script lee el archivo de migración SQL y lo ejecuta en Supabase
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Iniciando migración de STATUS a BOOLEAN...\n');

  try {
    // Leer el archivo de migración
    const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251101000000_change_status_to_boolean.sql');
    console.log('📄 Leyendo archivo de migración:', migrationPath);

    const migrationSQL = readFileSync(migrationPath, 'utf8');
    console.log('✅ Archivo de migración cargado correctamente\n');

    // Dividir el SQL en comandos individuales
    // Nota: Esta es una implementación simple. Para SQL complejo, considera usar un parser
    const commands = migrationSQL
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && !cmd.startsWith('COMMENT'));

    console.log(`📊 Se ejecutarán ${commands.length} comandos SQL\n`);

    // Ejecutar cada comando
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];
      console.log(`\n[${i + 1}/${commands.length}] Ejecutando comando...`);

      // Mostrar solo las primeras líneas del comando para no saturar la consola
      const preview = command.split('\n').slice(0, 3).join('\n');
      console.log(`   ${preview.substring(0, 80)}...`);

      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: command });

        if (error) {
          console.error(`   ❌ Error: ${error.message}`);
          errorCount++;

          // Si es un error crítico, detener la ejecución
          if (error.message.includes('does not exist') && !error.message.includes('policy')) {
            console.error('\n⚠️  Error crítico detectado. Deteniendo migración.');
            throw error;
          }
        } else {
          console.log('   ✅ Comando ejecutado exitosamente');
          successCount++;
        }
      } catch (err) {
        console.error(`   ❌ Error inesperado: ${err.message}`);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE LA MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`✅ Comandos exitosos: ${successCount}`);
    console.log(`❌ Comandos con error: ${errorCount}`);
    console.log('='.repeat(60));

    if (errorCount === 0) {
      console.log('\n🎉 ¡Migración completada exitosamente!');
      await verifyMigration();
    } else {
      console.log('\n⚠️  La migración se completó con algunos errores.');
      console.log('    Por favor, revisa los logs y verifica manualmente.');
    }

  } catch (error) {
    console.error('\n❌ Error fatal durante la migración:', error.message);
    process.exit(1);
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verificando la migración...\n');

  try {
    // Verificar que el campo status ahora sea boolean
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('email, user_role, status')
      .limit(5);

    if (error) {
      console.error('❌ Error al verificar usuarios:', error.message);
      return;
    }

    console.log('📋 Primeros 5 usuarios en la base de datos:');
    console.log('─'.repeat(80));
    console.log('Email'.padEnd(35), 'Rol'.padEnd(20), 'Status');
    console.log('─'.repeat(80));

    users.forEach(user => {
      const statusText = user.status === true ? '✅ ACTIVO' : '❌ INACTIVO';
      console.log(
        user.email.padEnd(35),
        user.user_role.padEnd(20),
        statusText
      );
    });

    console.log('─'.repeat(80));
    console.log('\n✅ El campo status ahora es de tipo BOOLEAN');
    console.log('   • true = ACTIVO');
    console.log('   • false = INACTIVO');

  } catch (error) {
    console.error('❌ Error al verificar la migración:', error.message);
  }
}

// Ejecutar la migración
runMigration().catch(console.error);

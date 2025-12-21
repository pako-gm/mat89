#!/usr/bin/env node

/**
 * Script temporal para ejecutar la migración de RLS de backups
 * Usa service_role key para bypassar RLS y ejecutar comandos DDL
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Faltan variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Crear cliente con service_role (bypassa RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeMigration() {
  console.log('🔧 Ejecutando migración de RLS para tbl_backups_registro...\n');

  // Leer el archivo SQL
  const sqlPath = path.join(__dirname, '..', 'SQL', 'fix-backup-rls-policies.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  // Dividir el SQL en statements individuales (separados por punto y coma)
  const statements = sqlContent
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📝 Encontrados ${statements.length} statements SQL para ejecutar\n`);

  let successCount = 0;
  let errorCount = 0;

  // Ejecutar cada statement
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];

    // Ignorar comentarios y líneas vacías
    if (statement.startsWith('--') || statement.trim().length === 0) {
      continue;
    }

    // Mostrar preview del statement
    const preview = statement.substring(0, 80).replace(/\n/g, ' ');
    console.log(`⚙️  [${i + 1}/${statements.length}] Ejecutando: ${preview}...`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      }).catch(async () => {
        // Si no existe la función exec_sql, intentar con query directo
        // Nota: Supabase REST API no permite ejecutar DDL directamente
        // Necesitamos usar el endpoint de SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceRoleKey,
            'Authorization': `Bearer ${serviceRoleKey}`
          },
          body: JSON.stringify({ query: statement + ';' })
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${await response.text()}`);
        }

        return { data: await response.json(), error: null };
      });

      if (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      } else {
        console.log(`   ✅ Completado`);
        successCount++;
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Statements exitosos: ${successCount}`);
  console.log(`❌ Statements con error: ${errorCount}`);
  console.log('='.repeat(60));

  if (errorCount > 0) {
    console.log('\n⚠️  ATENCIÓN: Algunos statements fallaron.');
    console.log('Por favor, ejecuta el SQL manualmente en Supabase Dashboard:');
    console.log('1. Ir a: https://supabase.com/dashboard/project/mlisnngduwrlqxyjjibp/sql');
    console.log('2. Copiar el contenido de SQL/fix-backup-rls-policies.sql');
    console.log('3. Pegar y ejecutar (Run)');
    process.exit(1);
  } else {
    console.log('\n🎉 ¡Migración completada exitosamente!');
    console.log('Ahora los backups manuales deberían funcionar correctamente.');
  }
}

executeMigration().catch(err => {
  console.error('❌ Error fatal:', err);
  console.log('\n⚠️  No se pudo ejecutar la migración automáticamente.');
  console.log('Por favor, ejecuta el SQL manualmente en Supabase Dashboard:');
  console.log('1. Ir a: https://supabase.com/dashboard/project/mlisnngduwrlqxyjjibp/sql');
  console.log('2. Copiar el contenido de SQL/fix-backup-rls-policies.sql');
  console.log('3. Pegar y ejecutar (Run)');
  process.exit(1);
});

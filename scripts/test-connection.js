/**
 * Script para verificar la conexión con Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🔍 Verificando conexión con Supabase...\n');
console.log('URL:', supabaseUrl);
console.log('Key:', supabaseKey ? '***' + supabaseKey.slice(-10) : 'NO CONFIGURADA');
console.log('');

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    // Verificar usuario autenticado
    console.log('👤 Verificando usuario autenticado...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.log('   ⚠️  No hay usuario autenticado:', authError.message);
    } else if (user) {
      console.log('   ✅ Usuario autenticado:', user.email);
    } else {
      console.log('   ⚠️  No hay usuario autenticado');
    }

    console.log('');

    // Intentar obtener usuarios
    console.log('📊 Intentando obtener usuarios de user_profiles...');
    const { data: users, error: usersError, count } = await supabase
      .from('user_profiles')
      .select('*', { count: 'exact' });

    if (usersError) {
      console.log('   ❌ Error:', usersError.message);
      console.log('   Código:', usersError.code);
      console.log('   Detalles:', usersError.details);
    } else {
      console.log(`   ✅ Consulta exitosa: ${users?.length || 0} usuarios encontrados`);

      if (users && users.length > 0) {
        console.log('\n   Primeros usuarios:');
        users.slice(0, 3).forEach((user, i) => {
          console.log(`   ${i + 1}. ${user.email} - ${user.user_role} - Status: ${user.status}`);
        });
      }
    }

    console.log('');

    // Verificar estructura de la tabla
    console.log('🔧 Verificando estructura de user_profiles...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (tableError) {
      console.log('   ❌ Error:', tableError.message);
    } else if (tableInfo && tableInfo.length > 0) {
      console.log('   ✅ Columnas disponibles:', Object.keys(tableInfo[0]).join(', '));

      // Verificar tipo de status
      const statusValue = tableInfo[0].status;
      const statusType = typeof statusValue;
      console.log(`   📋 Campo 'status': tipo = ${statusType}, valor = ${statusValue}`);

      if (statusType === 'boolean') {
        console.log('   ✅ El campo status ya es BOOLEAN');
      } else {
        console.log('   ⚠️  El campo status es de tipo', statusType.toUpperCase());
        console.log('   📝 La migración debe aplicarse');
      }
    } else {
      console.log('   ⚠️  La tabla está vacía');
    }

  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
  }
}

testConnection().catch(console.error);

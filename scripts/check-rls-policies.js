/**
 * Script para verificar políticas RLS en Supabase
 * Identifica políticas recursivas o problemáticas
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno no configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLSPolicies() {
  console.log('🔍 Verificando políticas RLS en user_profiles...\n');

  try {
    // Intentar consultar la tabla directamente
    console.log('1️⃣ Probando SELECT en user_profiles...');
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error al consultar user_profiles:');
      console.error('   Código:', error.code);
      console.error('   Mensaje:', error.message);
      console.error('   Detalles:', error.details);
      console.error('   Hint:', error.hint);
    } else {
      console.log('✅ Consulta exitosa. Registros encontrados:', data?.length || 0);
    }

    // Verificar permisos de la tabla
    console.log('\n2️⃣ Verificando información de la tabla...');
    const { data: tableInfo, error: tableError } = await supabase
      .rpc('get_table_info', { table_name: 'user_profiles' })
      .maybeSingle();

    if (tableError && tableError.code !== '42883') { // 42883 = function not found
      console.error('❌ Error:', tableError.message);
    }

  } catch (err) {
    console.error('❌ Error inesperado:', err.message);
  }

  console.log('\n📋 RECOMENDACIONES:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('Para verificar las policies manualmente en Supabase:');
  console.log('1. Ve a: https://app.supabase.com → Tu proyecto');
  console.log('2. Database → Policies');
  console.log('3. Busca la tabla: user_profiles');
  console.log('');
  console.log('Para ver las policies via SQL Editor:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('SELECT');
  console.log('  schemaname,');
  console.log('  tablename,');
  console.log('  policyname,');
  console.log('  permissive,');
  console.log('  roles,');
  console.log('  cmd,');
  console.log('  qual,');
  console.log('  with_check');
  console.log('FROM pg_policies');
  console.log("WHERE tablename = 'user_profiles';");
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('⚠️ POSIBLE PROBLEMA DE RECURSIÓN:');
  console.log('');
  console.log('Si una policy hace esto:');
  console.log('  EXISTS (');
  console.log('    SELECT 1 FROM user_profiles  ← RECURSIÓN AQUÍ');
  console.log('    WHERE user_id = auth.uid()');
  console.log('    AND user_role = \'ADMINISTRADOR\'');
  console.log('  )');
  console.log('');
  console.log('Esto causa recursión infinita porque está consultando');
  console.log('la misma tabla dentro de su propia policy.');
  console.log('');
  console.log('✅ SOLUCIÓN CORRECTA:');
  console.log('');
  console.log('-- Permitir que usuarios lean su propio perfil');
  console.log('CREATE POLICY "Users can read own profile"');
  console.log('ON user_profiles FOR SELECT');
  console.log('USING (user_id = auth.uid());');
  console.log('');
  console.log('-- Para administradores (sin recursión):');
  console.log('-- Opción 1: Usar auth.jwt()');
  console.log('CREATE POLICY "Admins can read all profiles"');
  console.log('ON user_profiles FOR SELECT');
  console.log("USING (auth.jwt() ->> 'user_role' = 'ADMINISTRADOR');");
  console.log('');
  console.log('-- Opción 2: Usar metadata del usuario (requiere configuración)');
  console.log('CREATE POLICY "Admins can read all profiles"');
  console.log('ON user_profiles FOR SELECT');
  console.log("USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'ADMINISTRADOR');");
  console.log('');
}

checkRLSPolicies().then(() => {
  console.log('\n✅ Verificación completada');
  process.exit(0);
}).catch(err => {
  console.error('\n❌ Error fatal:', err);
  process.exit(1);
});

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_KEY
);

async function cleanup() {
  console.log('=== Limpiando datos de prueba ===');

  // Eliminar pedidos de prueba
  const { error: pedidosError } = await supabase
    .from('tbl_pedidos_rep')
    .delete()
    .like('num_pedido', 'TEST/%');

  if (pedidosError) console.error('Error limpiando pedidos:', pedidosError);
  else console.log('✅ Pedidos de prueba eliminados');

  // Eliminar materiales de prueba (rango 90000-90999)
  const { error: materialesError } = await supabase
    .from('tbl_materiales')
    .delete()
    .gte('matricula_89', 90000)
    .lt('matricula_89', 91000);

  if (materialesError) console.error('Error limpiando materiales:', materialesError);
  else console.log('✅ Materiales de prueba eliminados');

  // Eliminar proveedores de prueba
  const { error: proveedoresError } = await supabase
    .from('tbl_proveedores')
    .delete()
    .like('nombre', '%Test%');

  if (proveedoresError) console.error('Error limpiando proveedores:', proveedoresError);
  else console.log('✅ Proveedores de prueba eliminados');

  console.log('\n=== Limpieza completada ===');
}

cleanup();

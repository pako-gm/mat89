import { test, expect } from '@playwright/test';
import { login, TEST_USERS, navigateToOrders, openNewOrderForm, selectSupplier, selectWarehouse, toggleWarranty } from './helpers/auth';
import {
  createTestMaterial,
  createTestSupplier,
  createTestOrderWithWarranty,
  createTestReception,
  cleanupTestData,
  getUserIdByEmail,
} from './helpers/database';

/**
 * Tests de Integración: Sistema de Garantías + Ámbito de Almacenes
 *
 * Estos tests verifican las 7 reglas de negocio críticas del sistema de garantías:
 * 1. Material sin historial → Permite envío con garantía
 * 2. Material con recepción pendiente (mismo almacén) → BLOQUEADO
 * 3. Material con recepción pendiente (otro almacén) → BLOQUEADO (Global)
 * 4. Material IRREPARABLE → BLOQUEADO permanentemente
 * 5. Material con garantía rechazada → Muestra historial, permite continuar
 * 6. Proveedor interno (es_externo = FALSE) → No aplica validaciones
 * 7. Proveedor externo sin materiales duplicados → Permite envío
 */

test.describe('Sistema de Garantías - Integración con Ámbito de Almacenes', () => {
  let userId: string;
  let externalSupplierId: string;
  let internalSupplierId: string;

  test.beforeAll(async () => {
    // Limpiar datos de prueba previos
    await cleanupTestData();

    // Obtener ID de usuario de prueba
    userId = await getUserIdByEmail(TEST_USERS.normal.email);

    // Crear proveedores de prueba
    const externalSupplier = await createTestSupplier('Proveedor Externo Test', true);
    const internalSupplier = await createTestSupplier('Proveedor Interno Test', false);

    externalSupplierId = externalSupplier.id;
    internalSupplierId = internalSupplier.id;
  });

  test.afterAll(async () => {
    // Limpiar datos de prueba
    await cleanupTestData();
  });

  test('CASO 1: Material sin historial → Permite envío con garantía', async ({ page }) => {
    // Crear material nuevo sin historial
    const material = await createTestMaterial(90001, 'Material Sin Historial');

    // Login
    await login(page, TEST_USERS.normal.email, TEST_USERS.normal.password);
    await navigateToOrders(page);
    await openNewOrderForm(page);

    // Llenar formulario de pedido usando helpers para Radix UI
    await selectSupplier(page, externalSupplierId);
    await selectWarehouse(page, '141'); // ALM141
    await toggleWarranty(page, true);

    // Agregar material - el campo de matrícula es un componente personalizado
    await page.locator('input[placeholder="89xxxxxx"]').first().fill(material.matricula_89.toString());
    await page.locator('input[name="quantity"]').first().fill('1');
    await page.click('button:has-text("Agregar Material")');

    // Click en Guardar
    await page.click('button:has-text("Guardar Pedido")');

    // NO debería aparecer modal de historial (material nuevo)
    await expect(page.getByText('Historial de Garantías')).not.toBeVisible({ timeout: 2000 });

    // Debería aparecer modal de confirmación de garantía
    await expect(page.getByText('Confirmar Envío en Garantía')).toBeVisible({ timeout: 5000 });

    // Click en "Enviar con Garantía"
    await page.click('button:has-text("Enviar con Garantía")');

    // Verificar que se guardó exitosamente
    await expect(page.getByText('Pedido guardado exitosamente')).toBeVisible({ timeout: 5000 });
  });

  test('CASO 2: Material con recepción pendiente (mismo almacén) → BLOQUEADO', async ({ page }) => {
    // Crear material y pedido previo sin recepción
    const material = await createTestMaterial(90002, 'Material Con Recepción Pendiente');
    const previousOrder = await createTestOrderWithWarranty({
      supplierId: externalSupplierId,
      warehouse: '141',
      materials: [{ registration: material.matricula_89, quantity: 1 }],
      warranty: true,
      userId,
    });

    // NO crear recepción (queda pendiente)

    // Login
    await login(page, TEST_USERS.normal.email, TEST_USERS.normal.password);
    await navigateToOrders(page);
    await openNewOrderForm(page);

    // Intentar crear nuevo pedido con el mismo material
    await selectSupplier(page, externalSupplierId);
    await selectWarehouse(page, '141'); // Mismo almacén
    await toggleWarranty(page, true);
    await page.locator('input[placeholder="89xxxxxx"]').first().fill(material.matricula_89.toString());
    await page.locator('input[name="quantity"]').first().fill('1');
    await page.click('button:has-text("Agregar Material")');
    await page.click('button:has-text("Guardar Pedido")');

    // DEBE aparecer modal de historial
    await expect(page.getByText('Historial de Garantías')).toBeVisible({ timeout: 5000 });

    // Debe mostrar que hay un envío pendiente de recepción
    await expect(page.getByText('Pendiente de Recepción')).toBeVisible();

    // El botón "Continuar" NO debe estar visible (bloqueado)
    await expect(page.getByRole('button', { name: /Continuar/i })).not.toBeVisible();

    // Debe mostrar mensaje de bloqueo
    await expect(page.getByText(/No puede enviar este material/i)).toBeVisible();
  });

  test('CASO 3: Material con recepción pendiente (otro almacén) → BLOQUEADO (Global)', async ({ page }) => {
    // Crear material y pedido previo desde ALM140
    const material = await createTestMaterial(90003, 'Material Pendiente Otro Almacén');
    await createTestOrderWithWarranty({
      supplierId: externalSupplierId,
      warehouse: '140', // ALM140
      materials: [{ registration: material.matricula_89, quantity: 1 }],
      warranty: true,
      userId,
    });

    // Login
    await login(page, TEST_USERS.normal.email, TEST_USERS.normal.password);
    await navigateToOrders(page);
    await openNewOrderForm(page);

    // Intentar enviar desde ALM141 (diferente almacén)
    await page.selectOption('select[name="supplier"]', externalSupplierId);
    await page.selectOption('select[name="warehouse"]', '141'); // Almacén DIFERENTE
    await page.check('input[type="checkbox"][name="warranty"]');
    await page.fill('input[name="registration"]', material.matricula_89.toString());
    await page.fill('input[name="quantity"]', '1');
    await page.click('button:has-text("Agregar Material")');
    await page.click('button:has-text("Guardar Pedido")');

    // DEBE mostrar modal de historial con bloqueo GLOBAL
    await expect(page.getByText('Historial de Garantías')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Pendiente de Recepción')).toBeVisible();
    await expect(page.getByText(/ALM140/i)).toBeVisible(); // Debe mostrar el almacén que lo envió

    // Debe estar bloqueado (sin botón Continuar)
    await expect(page.getByRole('button', { name: /Continuar/i })).not.toBeVisible();
  });

  test('CASO 4: Material IRREPARABLE → BLOQUEADO permanentemente', async ({ page }) => {
    // Crear material, pedido y recepción como IRREPARABLE
    const material = await createTestMaterial(90004, 'Material Irreparable');
    const order = await createTestOrderWithWarranty({
      supplierId: externalSupplierId,
      warehouse: '141',
      materials: [{ registration: material.matricula_89, quantity: 1 }],
      warranty: true,
      userId,
    });

    // Obtener la línea de pedido
    const { data: orderLine } = await test.step('Get order line', async () => {
      const { supabaseTest } = await import('./helpers/database');
      return supabaseTest
        .from('tbl_lineas_pedidos_rep')
        .select('id')
        .eq('pedido_id', order.id)
        .single();
    });

    // Crear recepción con estado IRREPARABLE
    await createTestReception({
      orderId: order.id,
      lineId: orderLine!.id,
      warehouseReceives: '141',
      status: 'IRREPARABLE',
      quantity: 1,
      warrantyAccepted: true,
    });

    // Login
    await login(page, TEST_USERS.normal.email, TEST_USERS.normal.password);
    await navigateToOrders(page);
    await openNewOrderForm(page);

    // Intentar crear nuevo pedido con material IRREPARABLE
    await selectSupplier(page, externalSupplierId);
    await selectWarehouse(page, '141');
    await toggleWarranty(page, true);
    await page.locator('input[placeholder="89xxxxxx"]').first().fill(material.matricula_89.toString());
    await page.locator('input[name="quantity"]').first().fill('1');
    await page.click('button:has-text("Agregar Material")');
    await page.click('button:has-text("Guardar Pedido")');

    // Debe mostrar modal con mensaje de IRREPARABLE
    await expect(page.getByText('Historial de Garantías')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/IRREPARABLE/i)).toBeVisible();
    await expect(page.getByText(/marcado como irreparable/i)).toBeVisible();

    // Debe estar BLOQUEADO permanentemente
    await expect(page.getByRole('button', { name: /Continuar/i })).not.toBeVisible();
  });

  test('CASO 5: Material con garantía rechazada → Muestra historial, permite continuar', async ({ page }) => {
    // Crear material, pedido y recepción con garantía RECHAZADA
    const material = await createTestMaterial(90005, 'Material Garantía Rechazada');
    const order = await createTestOrderWithWarranty({
      supplierId: externalSupplierId,
      warehouse: '141',
      materials: [{ registration: material.matricula_89, quantity: 1 }],
      warranty: true,
      userId,
    });

    const { data: orderLine } = await test.step('Get order line', async () => {
      const { supabaseTest } = await import('./helpers/database');
      return supabaseTest
        .from('tbl_lineas_pedidos_rep')
        .select('id')
        .eq('pedido_id', order.id)
        .single();
    });

    // Crear recepción con garantía RECHAZADA
    await createTestReception({
      orderId: order.id,
      lineId: orderLine!.id,
      warehouseReceives: '141',
      status: 'UTIL',
      quantity: 1,
      warrantyAccepted: false,
      rejectionReason: 'El proveedor rechazó la garantía por mal uso',
    });

    // Login
    await login(page, TEST_USERS.normal.email, TEST_USERS.normal.password);
    await navigateToOrders(page);
    await openNewOrderForm(page);

    // Crear nuevo pedido con el mismo material
    await selectSupplier(page, externalSupplierId);
    await selectWarehouse(page, '141');
    await toggleWarranty(page, true);
    await page.locator('input[placeholder="89xxxxxx"]').first().fill(material.matricula_89.toString());
    await page.locator('input[name="quantity"]').first().fill('1');
    await page.click('button:has-text("Agregar Material")');
    await page.click('button:has-text("Guardar Pedido")');

    // Debe mostrar modal de historial
    await expect(page.getByText('Historial de Garantías')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Rechazada')).toBeVisible();
    await expect(page.getByText(/mal uso/i)).toBeVisible();

    // Debe permitir CONTINUAR (botón visible)
    const continueButton = page.getByRole('button', { name: /Continuar/i });
    await expect(continueButton).toBeVisible();

    // Click en Continuar
    await continueButton.click();

    // Debe mostrar modal de confirmación de garantía
    await expect(page.getByText('Confirmar Envío en Garantía')).toBeVisible({ timeout: 5000 });
  });

  test('CASO 6: Proveedor interno (es_externo = FALSE) → No aplica validaciones', async ({ page }) => {
    // Crear material con historial de garantía externa
    const material = await createTestMaterial(90006, 'Material Para Proveedor Interno');
    await createTestOrderWithWarranty({
      supplierId: externalSupplierId,
      warehouse: '141',
      materials: [{ registration: material.matricula_89, quantity: 1 }],
      warranty: true,
      userId,
    });

    // Login
    await login(page, TEST_USERS.normal.email, TEST_USERS.normal.password);
    await navigateToOrders(page);
    await openNewOrderForm(page);

    // Crear pedido con PROVEEDOR INTERNO
    await selectSupplier(page, internalSupplierId);
    await selectWarehouse(page, '141');
    await toggleWarranty(page, true);
    await page.locator('input[placeholder="89xxxxxx"]').first().fill(material.matricula_89.toString());
    await page.locator('input[name="quantity"]').first().fill('1');
    await page.click('button:has-text("Agregar Material")');
    await page.click('button:has-text("Guardar Pedido")');

    // NO debe mostrar modal de historial (proveedor interno)
    await expect(page.getByText('Historial de Garantías')).not.toBeVisible({ timeout: 2000 });

    // Debe ir directamente al modal de confirmación
    await expect(page.getByText('Confirmar Envío en Garantía')).toBeVisible({ timeout: 5000 });
  });

  test('CASO 7: Proveedor externo sin materiales duplicados → Permite envío', async ({ page }) => {
    // Crear dos materiales DIFERENTES
    const material1 = await createTestMaterial(90007, 'Material Único 1');
    const material2 = await createTestMaterial(90008, 'Material Único 2');

    // Login
    await login(page, TEST_USERS.normal.email, TEST_USERS.normal.password);
    await navigateToOrders(page);
    await openNewOrderForm(page);

    // Crear pedido con múltiples materiales sin historial
    await page.selectOption('select[name="supplier"]', externalSupplierId);
    await page.selectOption('select[name="warehouse"]', '141');
    await page.check('input[type="checkbox"][name="warranty"]');

    // Agregar material 1
    await page.fill('input[name="registration"]', material1.num_registro.toString());
    await page.fill('input[name="quantity"]', '1');
    await page.click('button:has-text("Agregar Material")');

    // Agregar material 2
    await page.fill('input[name="registration"]', material2.num_registro.toString());
    await page.fill('input[name="quantity"]', '1');
    await page.click('button:has-text("Agregar Material")');

    // Guardar pedido
    await page.click('button:has-text("Guardar Pedido")');

    // NO debe mostrar modal de historial (materiales sin duplicados)
    await expect(page.getByText('Historial de Garantías')).not.toBeVisible({ timeout: 2000 });

    // Debe ir directamente al modal de confirmación
    await expect(page.getByText('Confirmar Envío en Garantía')).toBeVisible({ timeout: 5000 });

    // Aceptar garantía
    await page.click('button:has-text("Enviar con Garantía")');

    // Verificar éxito
    await expect(page.getByText('Pedido guardado exitosamente')).toBeVisible({ timeout: 5000 });
  });
});
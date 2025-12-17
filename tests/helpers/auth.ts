import { Page, expect } from '@playwright/test';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();
dotenv.config({ path: '.env.test' });

export const TEST_USERS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL || 'admin@test.com',
    password: process.env.TEST_ADMIN_PASSWORD || 'admin123',
  },
  normal: {
    email: process.env.TEST_USER_EMAIL || 'user@test.com',
    password: process.env.TEST_USER_PASSWORD || 'user123',
  },
};

/**
 * Realizar login en la aplicación
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/');

  // Esperar a que aparezca el formulario de login
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });

  // Ingresar credenciales
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Click en el botón de login
  await page.click('button[type="submit"]');

  // Esperar navegación después del login
  await page.waitForURL(/\/(?!login)/, { timeout: 15000 });
}

/**
 * Logout de la aplicación
 */
export async function logout(page: Page) {
  // Buscar el botón de logout (puede variar según tu implementación)
  await page.click('[data-testid="logout-button"]', { timeout: 5000 }).catch(() => {
    // Si no hay data-testid, intentar por texto
    page.getByText('Cerrar sesión').click();
  });

  await page.waitForURL('/login', { timeout: 5000 });
}

/**
 * Navegar a la página de pedidos
 */
export async function navigateToOrders(page: Page) {
  // Buscar el link/botón de "Pedidos" en el menú
  await page.click('text=Pedidos', { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}

/**
 * Abrir el formulario de nuevo pedido
 */
export async function openNewOrderForm(page: Page) {
  // Click en el botón "Nuevo Pedido" o similar
  await page.click('button:has-text("Nuevo Pedido")', { timeout: 10000 }).catch(async () => {
    await page.click('button:has-text("Agregar")', { timeout: 10000 });
  });

  // Esperar a que aparezca el formulario
  await page.waitForSelector('[role="dialog"]', { timeout: 5000 });
}

/**
 * Seleccionar un proveedor en el formulario (Radix UI Select)
 */
export async function selectSupplier(page: Page, supplierId: string) {
  // Buscar el label "Proveedor" y hacer click en el SelectTrigger asociado
  await page.getByText('Proveedor').locator('..').locator('button').first().click();

  // Esperar a que aparezca el dropdown
  await page.waitForSelector('[role="option"]', { timeout: 5000 });

  // Seleccionar la opción por value
  await page.locator(`[role="option"][data-value="${supplierId}"]`).click();
}

/**
 * Seleccionar un almacén en el formulario (Radix UI Select)
 */
export async function selectWarehouse(page: Page, warehouseCode: string) {
  // Buscar el label "Almacén" y hacer click en el SelectTrigger asociado
  await page.getByText('Almacén').locator('..').locator('button').first().click();

  // Esperar a que aparezca el dropdown
  await page.waitForSelector('[role="option"]', { timeout: 5000 });

  // Seleccionar la opción por value
  await page.locator(`[role="option"][data-value="${warehouseCode}"]`).click();
}

/**
 * Activar checkbox de garantía (Radix UI Switch)
 */
export async function toggleWarranty(page: Page, checked: boolean = true) {
  const warrantySwitch = page.locator('button#warranty[role="switch"]');
  const isChecked = await warrantySwitch.getAttribute('data-state') === 'checked';

  if (isChecked !== checked) {
    await warrantySwitch.click();
  }
}
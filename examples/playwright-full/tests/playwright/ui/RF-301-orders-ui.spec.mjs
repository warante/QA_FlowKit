import { test, expect } from '@playwright/test';

test('RF-301 TC-002 shows the ready order', async ({ page }) => {
  await page.goto('/orders');

  await expect(page.getByRole('heading', { name: 'Orders' })).toBeVisible();
  await expect(page.getByRole('article', { name: 'Order ORD-301' })).toContainText('QA handbook');
  await expect(page.getByTestId('order-status')).toHaveText('ready');
});

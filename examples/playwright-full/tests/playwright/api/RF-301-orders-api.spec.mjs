import { test, expect } from '@playwright/test';

test('RF-301 TC-001 lists the ready order', async ({ request }) => {
  const response = await request.get('/api/orders');

  expect(response.status()).toBe(200);
  await expect(response).toBeOK();
  const body = await response.json();
  expect(body.orders).toEqual([{ id: 'ORD-301', item: 'QA handbook', status: 'ready' }]);
});

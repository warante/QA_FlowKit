const ALLOWED_PERMISSION_VALUES = new Set(['allowed', 'approval', 'denied']);

export function validatePhasePermissions(permissions) {
  if (!permissions || typeof permissions !== 'object') {
    throw new Error('Phase permissions must be an object.');
  }
  for (const key of ['createLocal', 'modifyExisting', 'externalWrite', 'delete']) {
    if (!ALLOWED_PERMISSION_VALUES.has(permissions[key])) {
      throw new Error(`Invalid permission value for ${key}: ${permissions[key]}`);
    }
    if (permissions.externalWrite !== 'denied' || permissions.delete !== 'denied') {
      throw new Error('Phase permissions must deny externalWrite and delete.');
    }
  }
}

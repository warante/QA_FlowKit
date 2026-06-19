const ALLOWED_PERMISSION_VALUES = new Set(['allowed', 'approval', 'denied']);

export function validatePhasePermissions(permissions, phaseId) {
  if (!permissions || typeof permissions !== 'object') {
    throw new Error('Phase permissions must be an object.');
  }
  for (const key of ['createLocal', 'modifyExisting', 'externalWrite', 'delete']) {
    if (!ALLOWED_PERMISSION_VALUES.has(permissions[key])) {
      throw new Error(`Invalid permission value for ${key}: ${permissions[key]}`);
    }
    if (key === 'delete' && permissions.delete !== 'denied') {
      throw new Error('Phase permissions must deny delete.');
    }
    if (key === 'externalWrite') {
      if (phaseId === 'sync-apply') {
        if (permissions.externalWrite !== 'approval') {
          throw new Error('Phase sync-apply permissions must declare externalWrite as approval.');
        }
      } else {
        if (permissions.externalWrite !== 'denied') {
          throw new Error('Phase permissions must deny externalWrite.');
        }
      }
    }
  }
}

import { validateWorkflowContract } from './harness-contract.mjs';

export { validateWorkflowContract };

export async function validateWorkflowContractFile(cwd, _options = {}) {
  return validateWorkflowContract(cwd);
}

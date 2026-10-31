import { Plugin } from '@opencode/plugin';
import { setupOpenCodePlugin } from '../../../.qa-ai/scripts/lib/opencode-v2-plugin.mjs';

export default Plugin.define({
  id: 'qa-flowkit',
  setup: setupOpenCodePlugin
});

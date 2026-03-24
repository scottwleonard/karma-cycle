import { defineConfig } from 'vite';
import { execSync } from 'child_process';

const buildHash = execSync('git rev-parse --short HEAD').toString().trim();

export default defineConfig({
  define: {
    __BUILD_HASH__: JSON.stringify(buildHash),
  },
});

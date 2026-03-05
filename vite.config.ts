import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// E5 FIX: Removed lucide-react from optimizeDeps.exclude.
// The original exclusion was a workaround for a very old lucide-react bug that
// was fixed in v0.300+. At v0.344.0 this exclusion only slows cold dev startup.
export default defineConfig({
  plugins: [react()],
});

import {join} from 'node:path';
import {defineConfig} from 'vitest/config';

export default defineConfig({
	test: {
		include: ['test/**/*.test.ts'],
		environment: 'node',
		globalSetup: [join(__dirname, './test/prool/globalSetup.ts')],
	},
});

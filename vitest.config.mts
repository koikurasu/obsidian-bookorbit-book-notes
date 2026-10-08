import { defineConfig } from 'vitest/config';

// Resolve the plugin root from this config file's location so the
// "obsidian" alias points at the test mock. URL and decodeURIComponent
// are globals, so no Node built-in module needs to be imported here.
const configDir = decodeURIComponent(new URL('.', import.meta.url).pathname);

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/*.test.ts'],
	},
	resolve: {
		alias: {
			obsidian: `${configDir}src/test/obsidian-mock.ts`,
		},
	},
});

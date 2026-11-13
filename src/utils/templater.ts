import type { App, TFile } from 'obsidian';

interface TemplaterPlugin {
	settings?: {
		trigger_on_file_creation?: boolean;
	};
	templater?: {
		overwrite_file_commands: (file: TFile) => Promise<void>;
	};
}

function getTemplaterPlugin(app: App): TemplaterPlugin | null {
	const pluginContainer = (app as App & { plugins?: { plugins?: Record<string, unknown> } }).plugins;
	const candidate = pluginContainer?.plugins?.['templater-obsidian'];

	if (!candidate || typeof candidate !== 'object') {
		return null;
	}

	return candidate;
}

export function hasTemplaterPlugin(app: App): boolean {
	return !!getTemplaterPlugin(app);
}

/**
 * Runs Templater on a freshly-created file so that any `<% ... %>` expressions
 * in the template are evaluated. Only runs when Templater's own
 * "trigger on file creation" option is off (to avoid double-processing).
 */
export async function useTemplaterPluginInFile(app: App, file: TFile): Promise<void> {
	const templater = getTemplaterPlugin(app);
	if (templater && !templater.settings?.trigger_on_file_creation && templater.templater) {
		await templater.templater.overwrite_file_commands(file);
	}
}

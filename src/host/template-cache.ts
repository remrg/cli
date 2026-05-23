import { getHost } from './get-host';
import { HostTemplate } from './host';

const cache: Record<string, HostTemplate> = {};

export async function initializeCache(): Promise<void> {
	const host = await getHost();
	const templates = await host.getTemplates();
	cacheTemplates(templates);
}

export function getCachedTemplateNames(): string[] {
	return Object.keys(cache);
}

export function getCachedTemplates(): HostTemplate[] {
	return Object.values(cache);
}

export function getCachedTemplate(name: string): HostTemplate | undefined {
	return cache[name];
}

/**
 * @private
 */
export function cacheTemplates(templates: HostTemplate[]) {
	for (const template of templates) {
		cache[template.name] = template;
	}
}

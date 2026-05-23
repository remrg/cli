import { Template } from '@/templates/template';
import { getHost } from './get-host';

const cache: Record<string, Template> = {};

export async function initializeCache(): Promise<void> {
	const host = await getHost();
	const templates = await host.getTemplates();
	cacheTemplates(templates);
}

export function getCachedTemplateNames(): string[] {
	return Object.keys(cache);
}

export function getCachedTemplates(): Template[] {
	return Object.values(cache);
}

export function getCachedTemplate(name: string): Template | undefined {
	return cache[name];
}

/**
 * @private
 */
export function cacheTemplates(templates: Template[]) {
	for (const template of templates) {
		cache[template.name] = template;
	}
}

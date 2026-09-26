/**
 * Template options matching remrg.yml file format.
 * Single canonical shape for both reading and writing.
 */
export interface TemplateYamlOptions {
	name: string; // e.g., "remrg/base-code"
	track?: string;
	version?: string;
	description?: string;
	type?: string;
	license?: string;
	access?: 'private' | 'public';
	roots: string[];
}

export function getTemplateYaml(options: TemplateYamlOptions): string {
	return `name: ${options.name}
${options.track ? `track: ${options.track}\n` : ''}
version: ${options.version ?? '1.0.0'}
description: ${options.description ?? ''}
type: ${options.type ?? 'feature'}
license: ${options.license ?? 'MIT'}
access: ${options.access ?? 'private'}
roots:
${options.roots.map((root) => `- ${root}`).join('\n')}
`;
}

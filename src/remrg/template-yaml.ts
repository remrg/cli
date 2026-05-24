export interface TemplateYamlOptions {
	projectName: string;
	organization: string;
	version?: string;
	description?: string;
	type?: string;
	license?: string;
	access?: 'private' | 'public';
	roots: string[];
}

export function getTemplateYaml(options: TemplateYamlOptions): string {
	const fullName = options.organization
		? `${options.organization}/${options.projectName}`
		: options.projectName;

	return `name: ${fullName}
version: ${options.version ?? '1.0.0'}
description: ${options.description ?? ''}
type: ${options.type ?? 'feature'}
license: ${options.license ?? 'MIT'}
access: ${options.access ?? 'private'}
roots:
${options.roots.map((root) => `- ${root}`).join('\n')}
`;
}

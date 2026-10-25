import { TemplateYamlOptions } from '../../remrg';

export function validateTemplateBranch(name: string, branch: string): void {
	if (!/^\w[\w.-]*(?:\/[\w.-]+)*$/.test(branch)) {
		throw new Error(`Invalid branch for template "${name}": ${branch}`);
	}
}

export function getInstalledTemplateBranch(
	name: string,
	options?: TemplateYamlOptions
): string | undefined {
	const track = options?.track;
	if (track === undefined || track === null) {
		return undefined;
	}

	if (typeof track !== 'string' || !track.startsWith('branch/')) {
		throw new Error(
			`Unsupported track for template "${name}": ${String(track)} ` +
				'(expected "branch/<name>")'
		);
	}

	const branch = track.slice('branch/'.length);
	validateTemplateBranch(name, branch);

	return branch;
}

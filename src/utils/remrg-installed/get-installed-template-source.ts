import { TemplateYamlOptions } from '../../remrg';
import { Template } from '../../templates';
import { getInstalledTemplateBranch } from './get-installed-template-branch';

// HTTPS/SSH/git URLs or scp-style SSH (git@host:org/repo); excludes shell metacharacters
const GIT_URL =
	/^(?:(?:https?|ssh|git):\/\/[\w.~%@:+/-]+|[\w.-]+@[\w.-]+:[\w.~%+/-]+)$/;

/**
 * Resolve the remote source for a third-party template from its remrg.yml.
 *
 * @param name Installed template name (e.g. `@org/template`)
 * @param options Parsed remrg.yml
 * @returns The template source, or undefined if the manifest has no url
 */
export function getInstalledTemplateSource(
	name: string,
	options?: TemplateYamlOptions
): Template | undefined {
	if (!options?.url) {
		return undefined;
	}

	const url = options.url;

	if (typeof url !== 'string' || !GIT_URL.test(url)) {
		throw new Error(`Invalid url for template "${name}": ${String(url)}`);
	}

	const branch = getInstalledTemplateBranch(name, options) ?? 'main';

	return { name, url, branch };
}

import { TemplateYamlOptions } from '../../remrg';
import { loadInstalledTemplateNames } from './load-installed-template-names';
import { loadInstalledTemplate } from './load-installed-template';

/**
 * Loads all installed templates and their parsed remrg.yml files.
 *
 * @param dir The root directory of the project
 * @returns An array of objects with the template name and parsed options (if any)
 */
export function loadInstalledTemplates(
	dir: string
): Array<{ name: string; options?: TemplateYamlOptions }> {
	const names = loadInstalledTemplateNames(dir);

	return names.map((name) => ({
		name,
		options: loadInstalledTemplate(dir, name),
	}));
}

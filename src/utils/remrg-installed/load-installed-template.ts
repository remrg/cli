import { existsSync, readFileSync } from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import { TemplateYamlOptions } from '../../remrg';
import { getInstalledDir } from './get-installed-dir';

/**
 * Loads and parses the remrg.yml file for a specific installed template.
 *
 * @param dir The root directory of the project
 * @param name The name of the template to load
 * @returns Parsed TemplateYamlOptions, or undefined if the remrg.yml file doesn't exist
 */
export function loadInstalledTemplate(
	dir: string,
	name: string
): TemplateYamlOptions | undefined {
	const installedDir = getInstalledDir(dir);
	const yamlPath = path.join(installedDir, name, 'remrg.yml');

	if (!existsSync(yamlPath)) {
		return undefined;
	}

	const content = readFileSync(yamlPath, 'utf8');
	return yaml.load(content) as TemplateYamlOptions;
}

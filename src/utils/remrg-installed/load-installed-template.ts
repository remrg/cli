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
	const defaultOptions: TemplateYamlOptions = {
		name: '',
		roots: [],
	};

	try {
		const loaded = yaml.load(content);
		const options = typeof loaded === 'object' && loaded !== null ? loaded : {};

		if (
			!('name' in options) ||
			!options['name'] ||
			typeof options['name'] !== 'string'
		) {
			throw new Error('Template name is missing in remrg.yml');
		}

		return {
			...defaultOptions,
			...options,
			name: options.name,
			roots: Array.isArray((options as Partial<TemplateYamlOptions>).roots)
				? ((options as Partial<TemplateYamlOptions>).roots as unknown[]).filter(
						(root): root is string => typeof root === 'string'
					)
				: [],
		};
	}
	catch {
		return defaultOptions;
	}
}

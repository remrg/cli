import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { getTemplateYaml, TemplateYamlOptions } from '../remrg';

export function writeTemplateYaml(
	dir: string,
	options: TemplateYamlOptions
): void {
	// Extract project name from "org/project" format
	const projectName = options.name.split('/').pop() || options.name;

	mkdirSync(path.join(dir, `.remrg/installed/${projectName}`), {
		recursive: true,
	});

	writeFileSync(
		path.join(dir, `.remrg/installed/${projectName}/remrg.yml`),
		getTemplateYaml(options)
	);
}

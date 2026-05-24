import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { getTemplateYaml, TemplateYamlOptions } from '../remrg';

export function writeTemplateYaml(
	dir: string,
	options: TemplateYamlOptions
): void {
	mkdirSync(path.join(dir, `.remrg/installed/${options.projectName}`), {
		recursive: true,
	});

	writeFileSync(
		path.join(dir, `.remrg/installed/${options.projectName}/remrg.yml`),
		getTemplateYaml(options)
	);
}

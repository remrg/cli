import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { getPlaceholdersYaml, PlaceholdersYaml } from '../remrg';

export function writePlaceholdersYaml(dir: string, options: PlaceholdersYaml) {
	mkdirSync(path.join(dir, './remrg'), { recursive: true });

	writeFileSync(
		path.join(dir, './remrg/placeholders.yaml'),
		getPlaceholdersYaml(options)
	);
}

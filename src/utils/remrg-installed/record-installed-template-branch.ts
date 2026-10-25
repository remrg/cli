import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import * as yaml from 'js-yaml';
import { Template } from '../../templates';
import { getInstalledDir } from './get-installed-dir';
import { loadInstalledTemplate } from './load-installed-template';
import { loadInstalledTemplateNames } from './load-installed-template-names';

export function recordInstalledTemplateBranch(
	dir: string,
	template: Template,
	branch: string
): void {
	let name = template.name;
	if (name === 'remote') {
		const names = loadInstalledTemplateNames(dir);
		if (names.length !== 1) {
			throw new Error(
				'Cannot identify the remote template manifest to record its branch. ' +
					'Expected exactly one installed template.'
			);
		}
		name = names[0]!;
	}

	const manifest = loadInstalledTemplate(dir, name);
	if (!manifest) {
		throw new Error(`Template "${name}" lacks its .remrg/installed manifest.`);
	}
	const track = `branch/${branch}`;
	const url =
		name !== template.name && !manifest.url ? template.url : undefined;
	if (manifest.track === track && !url) {
		return;
	}

	const filename = path.join(getInstalledDir(dir), name, 'remrg.yml');
	const fields = yaml.load(readFileSync(filename, 'utf8')) as object;
	writeFileSync(
		filename,
		yaml.dump({ ...fields, track, ...(url ? { url } : {}) })
	);
}

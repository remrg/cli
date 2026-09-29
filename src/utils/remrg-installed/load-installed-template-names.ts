import { readdirSync } from 'fs';
import path from 'path';
import { getInstalledDir } from './get-installed-dir';

function listDirectories(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true })
		.filter((dirent) => dirent.isDirectory())
		.map((dirent) => dirent.name);
}

/**
 * Loads the names of all installed templates.
 * Scoped folders (`@org/template`) are expanded to `@org/template` names.
 *
 * @param dir The root directory of the project
 * @returns Array of installed template names (folder names)
 */
export function loadInstalledTemplateNames(dir: string): string[] {
	const installedDir = getInstalledDir(dir);

	return listDirectories(installedDir).flatMap((name) =>
		name.startsWith('@')
			? listDirectories(path.join(installedDir, name)).map(
					(child) => `${name}/${child}`
				)
			: [name]
	);
}

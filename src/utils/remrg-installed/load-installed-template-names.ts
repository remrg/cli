import { readdirSync } from 'fs';
import { getInstalledDir } from './get-installed-dir';

/**
 * Loads the names of all installed templates.
 *
 * @param dir The root directory of the project
 * @returns Array of installed template names (folder names)
 */
export function loadInstalledTemplateNames(dir: string): string[] {
	const installedDir = getInstalledDir(dir);

	return readdirSync(installedDir, {
		withFileTypes: true,
	})
		.filter((dirent) => dirent.isDirectory())
		.map((dirent) => dirent.name);
}

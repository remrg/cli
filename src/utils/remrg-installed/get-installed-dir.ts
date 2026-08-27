import { existsSync } from 'fs';
import path from 'path';

/**
 * Ensures the .remrg/installed path exists and returns it.
 * Overwrites with a friendly error message if it doesn't exist.
 */
export function getInstalledDir(dir: string): string {
	const installedDir = path.join(dir, '.remrg', 'installed');

	if (!existsSync(installedDir)) {
		throw new Error(
			'Project does not appear to be a remrg project ' +
				'(.remrg/installed not found).'
		);
	}

	return installedDir;
}

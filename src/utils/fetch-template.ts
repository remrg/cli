import { execSync } from 'child_process';
import { CommandRunner } from 'ts-script';

import { Template } from '../templates';
import { revParse } from './git/rev-parse';

/**
 * A template that has been fetched into the local repository
 */
export interface FetchedTemplate {
	name: string;
	remoteName: string;
	ref: string;
	sha: string;
}

/**
 * Add a template remote (if needed) and fetch its branch, without merging
 *
 * @param runner Command runner
 * @param template Template to fetch
 * @param branch Branch to fetch
 * @returns The fetched remote ref and its resolved SHA
 */
export function fetchTemplate(options: {
	runner: CommandRunner;
	template: Template;
	branch: string;
}): FetchedTemplate {
	const { runner, template } = options;
	const branch = template.branch || options.branch || 'main';
	const remoteName = `remrg-${template.name}`;

	const remotes = execSync('git remote', { cwd: runner.dir })
		.toString()
		.split('\n')
		.map((r) => r.trim());

	if (!remotes.includes(remoteName)) {
		runner.run(`git remote add ${remoteName} ${template.url}`, {
			loadingDescription: `Adding remote for ${template.name}`,
		});
	}

	runner.run(`git fetch ${remoteName} ${branch}`, {
		loadingDescription: `Fetching ${template.name}`,
	});

	const ref = `${remoteName}/${branch}`;

	return {
		name: template.name,
		remoteName,
		ref,
		sha: revParse(runner.dir, ref),
	};
}

/**
 * Remove a template remote
 *
 * @param runner Command runner
 * @param remoteName Remote to remove
 */
export function removeTemplateRemote(
	runner: CommandRunner,
	remoteName: string
): void {
	runner.run(`git remote remove ${remoteName}`, {
		loadingDescription: 'Cleaning up',
	});
}

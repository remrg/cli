import { CommandRunner } from 'ts-script';
import { Template } from '../templates';
import { getCachedTemplateNames } from '../host';
import { execSync } from 'child_process';

/**
 * Merge template from remote
 *
 * @param runner Command runner
 * @param type Template type
 * @param isExistingProject (Optional) Pass true for existing projects
 */
export function mergeTemplate(options: {
	runner: CommandRunner;
	template: Template;
	isExistingProject?: boolean;
	branch: string;
}): void {
	const url = options.template.url;
	const branch = options.template.branch || options.branch || 'main';
	const template = options.template;
	const runner = options.runner;
	const isExistingProject = !!options.isExistingProject;

	const templateNames = getCachedTemplateNames();

	if (template.name !== 'remote' && !templateNames.includes(template.name)) {
		throw new Error(`Template "${template.name}" not found`);
	}

	const remoteName = `remrg-${template.name}`;

	const remotes = execSync('git remote', { cwd: runner.dir })
		.toString()
		.split('\n')
		.map((r) => r.trim());

	if (remotes.includes(remoteName)) {
		runner.log.warn(
			`Remote "${remoteName}" already exists, skipping adding remote`
		);
	}
	else {
		runner.run(`git remote add ${remoteName} ${url}`, {
			loadingDescription: 'Adding template',
		});
	}

	runner.run(`git fetch ${remoteName} ${branch}`, {
		loadingDescription: 'Fetching',
	});

	if (isExistingProject) {
		runner.run(
			`git merge ${remoteName}/${branch} --allow-unrelated-histories`,
			{
				loadingDescription: 'Merging',
			}
		);
	}
	else {
		runner.run(`git pull ${remoteName} ${branch} --allow-unrelated-histories`, {
			loadingDescription: 'Pulling',
		});
	}

	runner.run(`git remote remove ${remoteName}`, {
		loadingDescription: 'Cleaning up',
	});
}

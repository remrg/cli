import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import {
	loadInstalledTemplate,
	loadInstalledTemplateNames,
} from './remrg-installed';

export function validateTemplateContinuation(
	dir: string,
	templateName: string,
	branch: string
): void {
	const git = (...args: string[]) =>
		execFileSync('git', args, {
			cwd: dir,
			encoding: 'utf8',
			stdio: ['ignore', 'pipe', 'ignore'],
		}).trim();

	let root: string;
	try {
		root = git('rev-parse', '--show-toplevel');
	}
	catch (error) {
		throw new Error('The current directory is not a Git repository.', {
			cause: error,
		});
	}
	if (path.resolve(root) !== path.resolve(dir)) {
		throw new Error('Run --continue from the Git repository root.');
	}

	const mergeHead = git('rev-parse', '--git-path', 'MERGE_HEAD');
	if (
		existsSync(path.resolve(dir, mergeHead)) ||
		git('ls-files', '--unmerged')
	) {
		throw new Error(
			'Resolve all merge conflicts and commit the merge ' +
				'before running --continue.'
		);
	}

	try {
		const ref = `refs/remotes/remrg-${templateName}/${branch}`;
		const sha = git('rev-parse', '--verify', `${ref}^{commit}`);
		git('merge-base', '--is-ancestor', sha, 'HEAD');
	}
	catch (error) {
		throw new Error(
			`No completed template merge found for "${templateName}". ` +
				'Run the original command without --continue, or resolve and commit ' +
				'the merge first. Use the original template and --branch options.',
			{ cause: error }
		);
	}

	if (!existsSync(path.join(dir, '.remrg', 'installed'))) {
		throw new Error(
			'Cannot continue: .remrg/installed metadata is missing. ' +
				'Restore the template metadata from the merge and retry --continue.'
		);
	}
	const names = loadInstalledTemplateNames(dir);
	const name = templateName === 'remote' ? names[0] : templateName;
	if (!name || !names.includes(name) || !loadInstalledTemplate(dir, name)) {
		throw new Error(
			`Cannot continue: installed manifest for "${templateName}" is missing. ` +
				'Restore the template metadata from the merge and retry --continue.'
		);
	}
}

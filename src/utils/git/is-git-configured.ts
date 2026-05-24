import { execSync } from 'child_process';
import { CommandRunner } from 'ts-script';

/**
 * Check git config
 *
 * @param runner Command runner
 */
export function isGitConfigured(runner: CommandRunner): boolean {
	const gitConfig = execSync('git config --list', {
		encoding: 'utf-8',
		cwd: runner.dir,
	}).toString();

	return gitConfig.includes('user.name') && gitConfig.includes('user.email');
}

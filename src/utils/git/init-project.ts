import { CommandRunner } from 'ts-script';

/**
 * Create a new git project
 *
 * @param runner Command runner
 * @param name Project name
 */
export function initProject(runner: CommandRunner, name: string): void {
	runner.run('git init ' + name, {
		loadingDescription: 'Creating Repo...',
	});
}

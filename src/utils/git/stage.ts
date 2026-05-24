import { CommandRunner } from 'ts-script';

export function stage(runner: CommandRunner): void {
	runner.run('git add .', {
		loadingDescription: 'Staging changes',
	});
}

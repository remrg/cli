import { log } from './log';

import { CommandDispatcher } from 'ts-commands';

/**
 * Start your application in the main() function
 */
export async function main(): Promise<void> {
	log.info('{{ remrg:var project-name }}\n');

	new CommandDispatcher({
		commands: [
			// {{ remrg:task Add Command classes here }}
		],
	}).run();
}

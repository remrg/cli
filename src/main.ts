import { log } from './log';

import { CommandDispatcher } from 'ts-commands';

import { initializeCache } from './host/template-cache';
import { commands } from './commands';

/**
 * Start your application in the main() function
 */
export async function main(): Promise<void> {
	log.info('remrg-cli\n');

	log.info('Fetching templates...');
	await initializeCache();

	log.info('Templates fetched successfully!\n');

	new CommandDispatcher({
		commands,
	}).run();
}

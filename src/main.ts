import { log } from './log';

import { CommandDispatcher } from 'ts-commands';

import { getCachedTemplateNames, initializeCache } from './host/template-cache';

/**
 * Start your application in the main() function
 */
export async function main(): Promise<void> {
	log.info('remrg-cli\n');

	log.info('Fetching templates...');
	await initializeCache();

	log.info('Templates fetched successfully!\n', getCachedTemplateNames());

	new CommandDispatcher({
		commands: [
			// {{ remrg:task Add Command classes here }}
		],
	}).run();
}

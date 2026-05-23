import { env } from '../env';
import { Host } from './host';

export async function getHost(): Promise<Host> {
	const hostName = env.REMRG_HOST;

	switch (hostName.toLowerCase()) {
		case 'github':
			return import('./hosts/github.js').then(
				(module) => new module.GithubHost()
			);
		default:
			throw new Error(`Unsupported host: ${hostName}`);
	}
}

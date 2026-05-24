import { AppConfig, configure } from 'ts-appconfig';

/**
 * Environment Variables Schema
 */
export class Environment extends AppConfig {
	readonly APP_TITLE = 'remrg-cli';

	readonly REMRG_HOST = 'github';
	readonly REMRG_GITHUB_ORG = 'remrg-templates';
}

/**
 * Load & export environment variables
 */
export const env: Environment = configure(Environment);

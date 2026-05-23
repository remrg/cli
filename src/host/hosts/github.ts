import * as https from 'https';
import { env } from '../../env';
import { Host } from '../host';
import { Template } from '../../templates';

interface GithubRepo {
	name: string;
	html_url: string;
	default_branch: string;
}

export class GithubHost extends Host {
	public org = env.REMRG_GITHUB_ORG;

	public async getTemplates(): Promise<Template[]> {
		return new Promise((resolve, reject) => {
			https
				.get(
					`https://api.github.com/orgs/${this.org}/repos`,
					{
						headers: {
							Accept: 'application/vnd.github+json',
							'X-GitHub-Api-Version': '2026-03-10',
							'User-Agent': 'undefined',
						},
					},
					(res) => {
						let data = '';

						res.on('data', (chunk) => {
							data += chunk;
						});

						res.on('end', () => {
							if (res.statusCode && res.statusCode >= 400) {
								reject(new Error(`Error ${res.statusCode}`));
								return;
							}
							try {
								const json = JSON.parse(data);
								const mapped: Template[] = json.map((repo: GithubRepo) => ({
									name: repo.name,
									url: repo.html_url,
									branch: repo.default_branch,
								}));

								resolve(mapped);
							}
							catch (error) {
								reject(error);
							}
						});
					}
				)
				.on('error', (err) => {
					reject(err);
				});
		});
	}
}

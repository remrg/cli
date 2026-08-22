export interface PlaceholdersYaml {
	name: string;
	organization: string;
	license: string;
}

export function getPlaceholdersYaml(options: PlaceholdersYaml): string {
	return `name: ${options.name}
organization: ${options.organization}
license: ${options.license}`;
}

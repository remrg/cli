import { CommandOption, OptionType } from 'ts-commands';

export function org(): CommandOption {
	return {
		key: 'org',
		type: OptionType.string,
		description: 'organization name',
	};
}

import { CommandOption, OptionType } from 'ts-commands';

export function remoteUrl(): CommandOption {
	return {
		key: 'remote',
		type: OptionType.string,
		description: 'template remote url/path',
	};
}

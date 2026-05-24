import { CommandRunner } from 'ts-script';

export function configUser(
	cmd: CommandRunner,
	name: string,
	email: string
): void {
	cmd.run(`git config user.name "${name}"`);
	cmd.run(`git config user.email "${email}"`);
}

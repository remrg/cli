import { execFileSync } from 'child_process';

/**
 * Resolve a ref to a commit SHA
 *
 * @param dir Repository directory
 * @param ref Ref to resolve
 * @returns The resolved commit SHA
 */
export function revParse(dir: string, ref: string): string {
	return execFileSync('git', ['rev-parse', ref], { cwd: dir })
		.toString()
		.trim();
}

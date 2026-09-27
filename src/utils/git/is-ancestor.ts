import { execFileSync } from 'child_process';

/**
 * Check if one commit is reachable from another
 *
 * @param dir Repository directory
 * @param ancestor Ref/SHA that may be an ancestor
 * @param descendant Ref/SHA that may contain the ancestor
 * @returns True if `ancestor` is already contained in `descendant`
 */
export function isAncestor(
	dir: string,
	ancestor: string,
	descendant: string
): boolean {
	try {
		execFileSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
			cwd: dir,
			stdio: 'ignore',
		});

		return true;
	}
	catch (error) {
		// Exit 1 means "not an ancestor"; anything else is a real git failure
		if ((error as { status?: number }).status === 1) {
			return false;
		}

		throw error;
	}
}

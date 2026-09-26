import { loadInstalledTemplates } from './load-installed-templates';

/**
 * Returns a topologically sorted array of template names based on their lineage
 * as defined in their remrg.yml files under .remrg/installed.
 *
 * It filters out only directories found in .remrg/installed.
 * If there's a circular dependency, it will throw an Error.
 *
 * @param dir The root directory of the project
 * @returns An array of template names in dependency order (roots first)
 */
export function getTemplateLineage(dir: string): string[] {
	const installedTemplates = loadInstalledTemplates(dir);

	if (installedTemplates.length === 0) {
		return [];
	}

	interface LineageNode {
		name: string;
		roots: string[];
	}

	const nodes = new Map<string, LineageNode>();

	for (const template of installedTemplates) {
		nodes.set(template.name, {
			name: template.name,
			roots: template.options?.roots || [],
		});
	}

	const sortedTemplates: string[] = [];
	const visited = new Set<string>();
	const visitStack = new Set<string>();

	const visit = (nodeName: string) => {
		if (visited.has(nodeName)) {
			return;
		}

		if (visitStack.has(nodeName)) {
			throw new Error(`Circular dependency detected in templates: ${nodeName}`);
		}

		visitStack.add(nodeName);

		const node = nodes.get(nodeName);
		if (node) {
			for (const root of node.roots) {
				// We only sort amongst installed roots
				if (nodes.has(root)) {
					visit(root);
				}
			}
		}

		visitStack.delete(nodeName);
		visited.add(nodeName);
		sortedTemplates.push(nodeName);
	};

	for (const templateName of nodes.keys()) {
		visit(templateName);
	}

	return sortedTemplates;
}

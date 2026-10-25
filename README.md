# remrg

remrg is an advanced CLI tool for scaffolding new projects from templates, seamlessly merging additional features, and effortlessly syncing updates as your templates evolve over time.

## Installation

```bash
npm install -g @remrg/cli
```

## Templates

Browse all [official remrg templates](https://github.com/orgs/remrg-templates/repositories)

## Guides

### Create a project

```bash
remrg create [TEMPLATE] [PROJECT_NAME]
```

#### Options

- `--remote` Specify a remote URL. Use `remote` as the template name while using the `--remote` option
- `--templatize` Create a template project
- `--verbose` Verbose logs
- `--org` Specify the organization
- `--license` Specify the license name

## Getting Started

Read the [Getting Started Guide](./docs/guides/getting-started.md) to get started.

## License

Licensed under the [{{ remrg:var license }}](LICENSE.md).

### Initialize remrg in an existing project

```bash
remrg init [TEMPLATE]
```

Initializes remrg in an existing Git repository that was not created with remrg.
Run the command from the repository root.
Use `remote` as the template name with `--remote` to initialize from a Git URL.

#### Options

- `--branch` Specify the template branch
- `--remote` Specify a remote URL/path; use `remote` as the template name
- `--org` Specify the organization placeholder value
- `--license` Specify the license placeholder value
- `--continue` Complete initialization after resolving and committing a template merge
- `--verbose`, `-v` Enable verbose logs

### Update templates

```bash
remrg update
```

Updates all templates installed in the current project, in dependency order. Templates that are not available in the remote cache are skipped. If no templates are installed, the command exits without making changes.

#### Options

- `--branch` Specify the branch to use for all installed templates instead of each template's configured branch
- `--verbose`, `-v` Enable verbose logs

### Add a template

```bash
remrg add [TEMPLATE]
```

#### Options

- `--branch` Specify the template branch
- `--continue` Complete an interrupted template merge after resolving and committing conflicts
- `--verbose` Verbose logs

If `init` or `add` stops on merge conflicts, resolve the conflicted files, stage
them with `git add`, and commit the merge. Then rerun the same command with
`--continue`, preserving the original template and options (including `--branch`,
`--remote`, `--org`, and `--license` when used):

```bash
remrg init [TEMPLATE] --continue
remrg add [TEMPLATE] --continue
```

Continuation skips fetching and merging, validates the merged installed-template
manifest, and finishes command metadata and cleanup. Keep the temporary
`remrg-<template>` Git remote until continuation succeeds; it identifies the
interrupted merge. An aborted merge cannot be continued. `update --continue` is
not supported.

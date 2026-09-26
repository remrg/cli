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
- `--verbose` Verbose logs

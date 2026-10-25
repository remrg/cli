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
- `--branch` Specify the template branch and record it for future updates
- `--templatize` Create a template project
- `--verbose` Verbose logs

### Branch selection and tracking

- `create`, `init`, and `add` select `--branch`, then the cached template's default branch, then `main` (also the default for remote URLs).
- When re-adding an installed template, its existing `track: branch/<name>` takes precedence over the cached default, unless `--branch` is specified.
- After installation, the selected branch is recorded in that template's installed `.remrg/installed/<template>/remrg.yml`. This replaces any template-provided `track` with the branch actually merged; all other manifest fields, including custom fields and lineage, are preserved. Other installed templates are not changed. Commit the metadata changes made by `add` or `init` along with your project changes; `create` commits them automatically.
- `update` uses the installed manifest's URL when present, otherwise the cached URL. Branch precedence is `--branch`, installed `track`, then the cached default (or `main` for manifests with a URL), then `main`. Existing manifests are not rewritten or automatically migrated by `update`; a manifest without `track` keeps its previous fallback behavior.
- `update --branch` is a one-time override for all templates and does not change recorded tracking. To persistently switch branches, use `add --branch` or edit the installed manifest.
- Remote URL installations must contain exactly one installed template so tracking can be recorded unambiguously. A missing or ambiguous manifest causes an error after merging and may require manual cleanup. If its manifest lacks a URL, the installation URL is recorded as well.
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
- `--verbose` Verbose logs

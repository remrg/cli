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
- `--verbose`, `-v` Enable verbose logs
- `--continue` Finish an interrupted init using the files already merged, without fetching or merging again

#### Recovering an interrupted init

Before initializing, commit or back up your existing work (including untracked files)
and record `git rev-parse HEAD`. Init merges template history into your repository;
it does not automatically abort merges, reset history, or remove files on failure.

If init fails, inspect `git status` before doing anything else:

1. **Merge conflicts:** resolve each conflicted file, preserving the project changes
   you need. Stage only the resolved files with `git add <resolved-files>`, then
   finish the merge with `git commit`. Even after all conflicts are staged, the
   merge must be committed before continuing init.
2. **Installed-manifest validation fails after the merge:** the merged history and
   template files remain in place. Repair or restore the template's
   `.remrg/installed/<template>/remrg.yml` from a trusted copy of the template at
   the revision you merged. For scoped templates the directory is
   `.remrg/installed/@org/template/`. The manifest must be valid YAML with a
   nonempty string `name`; preserve its tracking and lineage metadata. If metadata
   was never supplied, obtain it from the template maintainer rather than inventing
   it. Continuation will keep rejecting invalid or missing metadata.
3. Run **the same init command with `--continue`**, including the original template,
   `--remote`, `--branch`, `--org`, and `--license` options where applicable:

   ```bash
   remrg init remote --remote /path/to/template --continue
   ```

   This validates the installed metadata and writes `.remrg/placeholders.yaml` if
   it is missing. Existing placeholders are preserved byte-for-byte; inspect/edit
   them manually if needed. No template is fetched or merged again, and no Git
   commit is created. Review and commit the recovered metadata yourself.

A normal retry rejects existing `.remrg` metadata; it is not a rollback or a way
to restart a partial initialization. Use `--continue` only to finish a merge you
have already reviewed, not to install a different template or add another one.
If fetching failed before any template files were merged, fix that failure and
retry normally instead.

**To abandon initialization manually:** first back up the entire working tree
(including untracked files and any conflict resolutions) outside the repository,
and inspect `git status` and `git reflog`. If a merge is still active, you may
choose `git merge --abort`; Git may be unable to reconstruct pre-existing
uncommitted work, so do not skip the backup. If the merge was committed, preserve
the current history with a backup branch and identify the actual init merge
commit using `git log --merges`. After reviewing its parents, you may choose
`git revert -m 1 <init-merge-commit>` to undo its changes without resetting history.
This can itself conflict. For a fast-forward (no merge commit), use the recorded
pre-init revision/reflog to identify changes and undo them selectively instead.
Review leftover untracked metadata separately; never blindly delete `.remrg`,
run `git clean`, or hard-reset as a recovery shortcut.

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

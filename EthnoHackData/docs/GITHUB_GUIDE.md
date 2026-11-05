# Uploading my contribution to GitHub

## What to upload

Extract the delivery ZIP and upload the complete **`role_a_data/` folder**, keeping its internal structure. It already contains the methodology, source data, original results, English review views, code, tests and validation. The separately supplied methodology file is for convenient reading; do not add a duplicate at the repository root.

Do not upload the ZIP itself as a replacement for readable repository files. Do not add `build/`, virtual environments or Python caches. The package excludes those and includes a local `.gitignore`.

Keep originals for provenance. Use `README.md`, `docs/METHODOLOGY.md` and `outputs/english/` to present the work in English. Raw source labels and original historical workbooks remain unchanged.

**Before describing this as the final eight-substance dataset, supply the eight ATCs or identify the additional exclusion alongside psyllium.** The current package explicitly records that membership as pending. It can be uploaded as a working branch while that detail is completed.

## Browser route

This route requires write access to the team's existing repository.

1. Open the repository and select its default branch as the starting point.
2. Open the branch selector and type `data/role-a-provenance`; select the option to create it.
3. Confirm that the new branch is selected.
4. Select **Add file → Upload files** and drag the extracted `role_a_data` folder into the upload area. Check that paths begin with `role_a_data/`.
5. Enter a short commit message, for example `Document Role A data provenance and English review views`, and commit to this branch.
6. Open `role_a_data/README.md` and check the rendered links and folder structure.
7. Open a pull request when the team is ready to review the contribution. A branch push does not itself merge it into the default branch.

The upload contains fewer than 100 files and each is below 25 MiB, within GitHub's documented browser-upload limits at the time of preparation. Keep `.gitignore` and `.gitattributes` with the folder; enable hidden-file visibility locally if necessary.

## Terminal route for a fresh local clone

Use Git Bash or a terminal with Git installed. Replace the example URL with the team's actual URL; the placeholder is not a real repository.

```bash
git clone https://github.com/OWNER/REPOSITORY.git
cd REPOSITORY
git switch -c data/role-a-provenance
```

Copy the extracted `role_a_data` folder into that repository folder. Then:

```bash
git status
git add role_a_data/
git diff --cached --stat
git commit -m "Document Role A data provenance and English review views"
git push -u origin data/role-a-provenance
```

`git add` stages this contribution, `commit` records a local snapshot, and `push` uploads the branch. The `.gitattributes` file preserves bytes across Windows line-ending settings so recorded SHA-256 values remain meaningful.

If using an existing clone, inspect `git status` first and preserve any unfinished work before switching branches. Do not run reset/clean commands to make the folder appear clean. If this branch already exists, switch to it instead of trying to create it again. If `role_a_data/` is already in the team repository, review the existing files before replacing them.

No GitHub branch or pull request has been created by preparing these files. The repository URL and authenticated access are needed for an actual upload.

## Official references

- [Manage branches](https://docs.github.com/en/pull-requests/how-tos/commit-changes/managing-branches-within-your-repository)
- [Add files](https://docs.github.com/en/repositories/working-with-files/managing-files/adding-a-file-to-a-repository)
- [About Git](https://docs.github.com/en/get-started/using-git/about-git)
- [Push commits](https://docs.github.com/en/get-started/using-git/pushing-commits-to-a-remote-repository)

Instructions checked on 2026-11-05. Repository permissions and branch rules may affect the available controls.

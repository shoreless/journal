# Journal

A daily log of small AI experiments, published at **https://shoreless.github.io/journal/**.

## Writing an entry

```sh
scripts/new-entry.sh "Teaching a model to haiku"
# → _posts/2026-10-05-teaching-a-model-to-haiku.md
```

Fill in the front matter and the three sections, commit, push to `main`. GitHub Pages rebuilds
the site automatically. Set `DATE=2026-10-01` to backfill a past day.

Front matter fields (all optional except `title`):

| Field      | Shows as                                         |
|------------|--------------------------------------------------|
| `question` | The "Question" line in the entry's summary card  |
| `tools`    | Models/tools used, e.g. `[Claude, Whisper]`      |
| `verdict`  | One-line outcome, also shown on the home page    |
| `tags`     | Links to the tags page                           |

Images and other files can go in `assets/` and be linked with
`{{ '/assets/whatever.png' | relative_url }}`.

## Previewing locally

```sh
bundle install
bundle exec jekyll serve --livereload
# → http://localhost:4000/journal/
```

## Enabling GitHub Pages (one-time)

Repo **Settings → Pages → Build and deployment**: Source *Deploy from a branch*, branch `main`,
folder `/ (root)`.

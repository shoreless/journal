# Journal

Things made with AI, most days — published at **https://shoreless.github.io/journal/**.

An entry can be anything: a standalone webpage, an image, a video, or just words. Each one is
shown as it was made, under a thin bar with the day, the AI used, and its notes. A day can
hold several entries.

## Adding an entry

```sh
# A built site (folder or zip with an index.html), an .html file, an image, a PDF…
scripts/add-entry.sh "Abyss" "ChatGPT Astra" ~/Downloads/abyss-giant-squid-source.zip

# Words only
scripts/add-entry.sh "Thinking about prompts" "Claude"

# Thumbnail for the home page (needs Chrome + ImageMagick)
scripts/thumb.sh _posts/2026-10-04-abyss.md
```

`add-entry.sh` copies the work into `works/<date>-<slug>/` untouched and creates
`_posts/<date>-<slug>.md`. If the zip is a whole project with the site in a build folder
(e.g. `dist/`), the rest of the project — source, README, tests — is kept in
`works/<date>-<slug>/source/` (minus `node_modules`). Commit and push to `main`; GitHub Pages rebuilds the site.
Set `DATE=2026-10-01` to file an entry under an earlier day.

### Entry front matter

| Field       | What it does                                                            |
|-------------|-------------------------------------------------------------------------|
| `title`     | Shown on the card and in the bar                                        |
| `date`      | Day it belongs to; the time sets the order within a day                 |
| `ai`        | The AI it was made with, shown as a chip                                |
| `src`       | Path to the work (e.g. `/works/2026-10-04-abyss/`). Omit for words-only |
| `thumb`     | Card image. Without one, words entries show a text preview              |
| `notes_url` | External notes (a shared chat, a post) — adds a "Notes ↗" link          |

The body of the post is the notes (behind the **Notes** button) for entries with a `src`, or
the entry itself for words-only ones.

## Previewing locally

```sh
bundle install
bundle exec jekyll serve --livereload
# → http://localhost:4000/journal/
```

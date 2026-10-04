#!/usr/bin/env bash
# Add a journal entry.
#
#   scripts/add-entry.sh "Title" "AI used" [source]
#
# source (optional) can be a folder or .zip containing an index.html (a built site),
# or any single file (an .html page, image, video, PDF…). It's copied to works/<date>-<slug>/.
# If the index.html sits inside a bigger project (e.g. project/dist/), the rest of the project
# is kept in works/<date>-<slug>/source/.
# Leave it out for a words-only entry. Anything written in the post body becomes the
# entry's notes (behind the Notes button) or, for words-only entries, the entry itself. Set DATE=YYYY-MM-DD to file it under another day.
set -euo pipefail
cd "$(dirname "$0")/.."

title="${1:?usage: add-entry.sh \"Title\" \"AI used\" [source]}"
ai="${2:?usage: add-entry.sh \"Title\" \"AI used\" [source]}"
src="${3:-}"
date="${DATE:-$(date +%F)}"
slug=$(printf '%s' "$title" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g')
name="${date}-${slug}"
post="_posts/${name}.md"
dest="works/${name}"

[[ -e "$post" ]] && { echo "Already exists: $post" >&2; exit 1; }

src_line=""
if [[ -n "$src" ]]; then
  [[ -e "$dest" ]] && { echo "Already exists: $dest" >&2; exit 1; }
  tmp=""
  if [[ "$src" == *.zip ]]; then
    tmp=$(mktemp -d); unzip -q "$src" -d "$tmp"; src="$tmp"
  fi
  mkdir -p "$dest"
  if [[ -d "$src" ]]; then
    # Use the shallowest folder holding an index.html (e.g. a build's dist/).
    root=$(find "$src" -name index.html -not -path '*/node_modules/*' | awk '{ print length, $0 }' | sort -n | head -1 | cut -d' ' -f2-)
    [[ -z "$root" ]] && { echo "No index.html found in $3" >&2; rm -rf "$dest"; exit 1; }
    site="$(dirname "$root")"
    cp -R "$site/." "$dest/"
    src_line="src: /${dest}/"
    # If the site was a build inside a bigger project (e.g. project/dist/), keep the rest of
    # the project (source, README, tests) in source/, minus installed dependencies.
    top="$src"
    while [[ $(find "$top" -mindepth 1 -maxdepth 1 | wc -l) -eq 1 && -d $(find "$top" -mindepth 1 -maxdepth 1) ]]; do
      top=$(find "$top" -mindepth 1 -maxdepth 1)
    done
    if [[ "$(cd "$site" && pwd)" != "$(cd "$top" && pwd)" ]]; then
      rel="${site#"$top"/}"
      mkdir -p "$dest/source"
      (cd "$top" && tar cf - --exclude="./$rel" --exclude=node_modules --exclude=.git .) | (cd "$dest/source" && tar xf -)
    fi
  elif [[ "$src" == *.html || "$src" == *.htm ]]; then
    cp "$src" "$dest/index.html"
    src_line="src: /${dest}/"
  else
    cp "$src" "$dest/"
    src_line="src: /${dest}/$(basename "$src")"
  fi
  [[ -n "$tmp" ]] && rm -rf "$tmp"
fi

{
  echo "---"
  echo "title: \"${title//\"/\\\"}\""
  echo "date: ${date} $(date +%H:%M:%S) $(date +%z)"
  echo "ai: \"${ai//\"/\\\"}\""
  [[ -n "$src_line" ]] && echo "$src_line"
  [[ -n "$src_line" ]] && echo "# thumb: /assets/thumbs/${name}.jpg   (scripts/thumb.sh $post makes one)"
  echo "# notes_url: https://…               (link to a chat or write-up elsewhere)"
  echo "---"
  echo
} > "$post"

echo "$post"
if [[ -n "$src_line" ]]; then
  echo "$dest/"
  ignored=$(git ls-files --others --ignored --exclude-standard "$dest")
  [[ -n "$ignored" ]] && printf 'Warning: git would ignore these files, so they would be missing online:\n%s\n' "$ignored" >&2
fi
exit 0

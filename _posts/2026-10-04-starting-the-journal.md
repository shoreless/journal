---
title: "Starting the journal"
date: 2026-10-04
tags: [meta]
tools: [Claude Code]
question: "Can a daily habit of small AI experiments become a way of responding to the world?"
verdict: "Set up — let's see"
---

## What I tried

Asked Claude Code to turn an empty repo into a journal: plain Markdown entries, one per
day-ish, served from GitHub Pages with no build step of my own.

## What happened

It's a Jekyll site. Each experiment is a file in `_posts/`, and a small script stamps out
today's entry with the same skeleton every time — question, what I tried, what happened,
takeaway.

## Takeaway

The format is deliberately light so that writing an entry costs less than the experiment
itself. The rule: if I tried something, it gets an entry, even if it failed.

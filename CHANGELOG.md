# Changelog

All notable changes to this project will be documented in this file.

## [v0.1.0] - 2026-11-19

### Features
* feat(editor): integrate CodeMirror 6 and replace legacy regex overlay (#6) (bbc7ad5)
* feat: add dynamic filters, state persistence, pyrefly, app icons, and e2e refactor (4a70c73)
* feat(workbench): add clickable breadcrumbs, progress sync, and reorder console messages (1a9055a)
* feat(mvp): complete bento workbench, collapsible navigation, testcase tables, and test reorganization (0880619)
* feat(workbench): enhance layout, markdown tables, submission gating, and lifecycle e2e tests (5c801cb)
* feat(core): initialize workbench with postgresql dialect support (227ce09)

### Bug Fixes
* fix(db): ensure non-destructive startup seeding and modularize workbench view (b739194)

### Refactoring
* refactor(core): simplify architecture, consolidate api client, and enforce explicit typing (d5680e9)

### Docs & Chores
* test(isolation): implement savepoint rollback fixtures and granular submission deletion (a4984fa)

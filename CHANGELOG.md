# Changelog

Release versions mark tested milestones, not every commit.

## [1.0.0] - 2026-11-14

First tagged release of IDReady.

### Included
- Local photo upload, camera capture and clipboard image import.
- Preset and custom photo sizes, crop controls, borders and name tags.
- On-device background removal with manual erase/restore cleanup.
- Multi-photo printable sheets with individual quantities and PDF export.
- Editable photo drafts and complete sheet drafts stored in this browser.
- Offline asset setup, print calibration and CSC size-only guidance.
- Compact responsive editor and export controls.

### Known limitations
- Drafts are browser-local, not cloud backups; clearing site storage can remove them.
- Background removal may require manual edge cleanup.
- Physical printing requires Actual size / 100% scaling.
- Real-device performance, Safari compatibility and physical print accuracy require further testing.
- Photo size presets do not guarantee official ID acceptance.
- Development dependency security advisories require review.

### Validation
Prior implementation checks passed build, lint, formatting and 23 unit tests.
The sheet-draft browser test verifies reload, editable restoration and PDF download.
This release does not include unrelated uncommitted working-tree changes.

## Version policy

- Patch (1.0.1): bug fixes.
- Minor (1.1.0): backward-compatible features.
- Major (2.0.0): breaking changes, including incompatible saved-data changes.
- Publish a tag and GitHub Release after a tested group of changes is ready.

[1.0.0]: https://github.com/Ralphyy9yy/IDReady/releases/tag/v1.0.0

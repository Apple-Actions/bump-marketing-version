# Bump Marketing Version

A GitHub Action that keeps your repo `MARKETING_VERSION` one minor past the latest **live** App Store Connect version (`READY_FOR_DISTRIBUTION` / `READY_FOR_SALE`). When it bumps, it:

1. Updates `Config/Shared.xcconfig` (and `ios/Skip.env` when present)
2. Ensures `release-notes/<new-version>/.gitkeep`
3. Moves unreleased `release-notes/<old>/*.md` files that are not in the old version tag

The action does **not** commit or push — your workflow should do that when `bumped` is `true` (often with a GitHub App token that can bypass branch protections).

Pairs with [`Apple-Actions/prepare-app-store`](https://github.com/Apple-Actions/prepare-app-store) and the rest of the suite:

- [`Apple-Actions/upload-testflight-build`](https://github.com/Apple-Actions/upload-testflight-build)
- [`Apple-Actions/prepare-app-store`](https://github.com/Apple-Actions/prepare-app-store)
- [`Apple-Actions/xcodebuild`](https://github.com/Apple-Actions/xcodebuild)

## Usage

```yaml
- id: bump
  uses: Apple-Actions/bump-marketing-version@v1
  with:
    issuer-id: ${{ vars.APPSTORE_ISSUER_ID }}
    api-key-id: ${{ vars.APPSTORE_API_KEY_ID }}
    api-private-key: ${{ secrets.APPSTORE_API_PRIVATE_KEY }}

- if: steps.bump.outputs.bumped == 'true'
  run: |
    git add Config/Shared.xcconfig release-notes/
    git commit -m "Bump MARKETING_VERSION to ${{ steps.bump.outputs.new-version }}"
    git push
```

| Input | Default | Description |
|-------|---------|-------------|
| `issuer-id` | *(required)* | App Store Connect API issuer id |
| `api-key-id` | *(required)* | App Store Connect API key id |
| `api-private-key` | *(required)* | PKCS8 PEM private key |
| `version-file` | `Config/Shared.xcconfig` | File with `MARKETING_VERSION` + bundle id |
| `skip-env-file` | auto `ios/Skip.env` if present | Optional second marketing-version file |
| `release-notes-root` | `release-notes` | Per-version notes root |
| `platform` | `IOS` (or `platform-file`) | ASC platform |
| `platform-file` | | File with platform string |
| `dry-run` | `false` | Report without writing |

| Output | Description |
|--------|-------------|
| `bumped` | `true` when files were updated |
| `old-version` | Previous marketing version (when bumped) |
| `new-version` | New marketing version (when bumped) |

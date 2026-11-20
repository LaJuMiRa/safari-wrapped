#!/usr/bin/env bash
# Builds the Safari app and packages dist/Browsing-Wrapped-<version>.zip plus its SHA-256.
#
#   ./release.sh            version from the VERSION file
#   VERSION=1.2.3 ./release.sh
#
# The version is written into extension/manifest.json and passed to Xcode as
# MARKETING_VERSION, so app, extension and zip always carry the same number.
# If the Xcode project ("Browsing Wrapped/") is missing, it is generated with
# safari-web-extension-converter first.
#
# After the build: create a GitHub release v<version> with the zip, then set
# version and sha256 in Casks/browsing-wrapped.rb of LaJuMiRa/homebrew-tap.
set -euo pipefail

cd "$(dirname "$0")"
VERSION="${VERSION:-$(tr -d '[:space:]' < VERSION)}"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "error: version '$VERSION' is not of the form X.Y.Z" >&2
    exit 1
fi

APP_NAME="Browsing Wrapped"
PROJECT="$APP_NAME/$APP_NAME.xcodeproj"
WORK="${BW_WORK_DIR:-${TMPDIR:-/tmp}/browsing-wrapped-build}"
# Minimum macOS for app and extension. Keep in sync with `depends_on macos:` in the cask (:tahoe = 26).
MIN_MACOS="26.0"

echo "==> Version $VERSION"
node -e '
  const fs = require("fs");
  const file = "extension/manifest.json";
  const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
  if (manifest.version !== process.argv[1]) {
    fs.writeFileSync(file, JSON.stringify({ ...manifest, version: process.argv[1] }, null, 2) + "\n");
    console.log("    manifest.json version set to " + process.argv[1]);
  }
' "$VERSION"

echo "==> Building popup and Wrapped page"
npm ci --no-audit --no-fund
npm run build

if [[ ! -d "$PROJECT" ]]; then
    echo "==> Generating Xcode project"
    xcrun safari-web-extension-converter ./extension \
        --app-name "$APP_NAME" \
        --bundle-identifier com.laurenz.browsingwrapped \
        --macos-only --no-open --no-prompt
fi

echo "==> Building $APP_NAME.app (Release)"
rm -rf "$WORK"
xcodebuild \
    -project "$PROJECT" \
    -scheme "$APP_NAME" \
    -configuration Release \
    -destination "generic/platform=macOS" \
    -derivedDataPath "$WORK/derived" \
    -quiet \
    MARKETING_VERSION="$VERSION" \
    MACOSX_DEPLOYMENT_TARGET="$MIN_MACOS" \
    build

BUILT="$WORK/derived/Build/Products/Release/$APP_NAME.app"
STAGE="$WORK/stage/$APP_NAME.app"
mkdir -p "$WORK/stage"
# Clean copy without resource forks / extended attributes (iCloud metadata breaks the signature).
ditto --norsrc --noextattr "$BUILT" "$STAGE"
codesign --verify --deep --strict "$STAGE"

BUILT_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$STAGE/Contents/Info.plist")"
if [[ "$BUILT_VERSION" != "$VERSION" ]]; then
    echo "error: app reports version $BUILT_VERSION, expected $VERSION" >&2
    exit 1
fi

mkdir -p dist
ZIP="dist/Browsing-Wrapped-$VERSION.zip"
rm -f "$ZIP" "$ZIP.sha256"
ditto -c -k --norsrc --noextattr --keepParent "$STAGE" "$ZIP"
SHA="$(shasum -a 256 "$ZIP" | awk '{print $1}')"
echo "$SHA  $(basename "$ZIP")" > "$ZIP.sha256"

echo "==> $ZIP"
echo "    sha256: $SHA"
echo
echo "Next: tag v$VERSION, upload the zip to the GitHub release, then update the cask:"
echo "    version \"$VERSION\""
echo "    sha256 \"$SHA\""

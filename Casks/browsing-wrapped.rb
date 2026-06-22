cask "browsing-wrapped" do
  version "1.0.0"
  sha256 "REPLACE_WITH_SHA256" # after the release, compute with `shasum -a 256 <zip>`

  url "https://github.com/LaJuMiRa/safari-rapped/releases/download/v#{version}/Browsing-Wrapped-#{version}.zip"
  name "Browsing Wrapped"
  desc "Local-only Safari extension for browsing recaps"
  homepage "https://github.com/LaJuMiRa/safari-wrapped"

  depends_on macos: ">= :big_sur"

  app "Browsing Wrapped.app"

  caveats <<~EOS
    Browsing Wrapped is an unsigned app.
    On first launch: right-click the app in Finder -> "Open"
    (or allow it under System Settings -> Privacy & Security).

    Then enable the extension:
      Safari -> Settings -> Extensions -> "Browsing Wrapped".

    All data stays local on your device.
  EOS
end

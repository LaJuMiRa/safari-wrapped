cask "browsing-wrapped" do
  version "1.0.0"
  sha256 "REPLACE_WITH_SHA256" # nach dem Release mit `shasum -a 256 <zip>` ermitteln

  url "https://github.com/<YOUR-GITHUB-USERNAME>/safari-rapped/releases/download/v#{version}/Browsing-Wrapped-#{version}.zip"
  name "Browsing Wrapped"
  desc "Local-only Safari extension for Spotify-Wrapped-style browsing recaps"
  homepage "https://github.com/<YOUR-GITHUB-USERNAME>/safari-rapped"

  depends_on macos: ">= :big_sur"

  app "Browsing Wrapped.app"

  caveats <<~EOS
    Browsing Wrapped ist eine unsignierte App.
    Beim ersten Start: Rechtsklick auf die App im Finder -> "Öffnen"
    (oder Freigabe unter Systemeinstellungen -> Datenschutz & Sicherheit).

    Danach die Erweiterung aktivieren:
      Safari -> Einstellungen -> Erweiterungen -> "Browsing Wrapped".

    Alle Daten bleiben lokal auf deinem Gerät.
  EOS
end

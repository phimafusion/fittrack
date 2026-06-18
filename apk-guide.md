# 📱 FitTrack - Installations- & Deployment-Anleitung

FitTrack ist als **PWA (Progressive Web App)** konzipiert. Das bedeutet, du kannst die App auf zwei verschiedene Arten auf deinem Smartphone nutzen: als schnelle PWA (Empfohlen) oder als eigenständige native Android-APK.

---

## 🛠️ Methode 1: Installation als PWA (Einfachste & schnellste Methode)

Die Installation als PWA ist der einfachste Weg. Es ist keine Kompilierung oder Software-Installation nötig. Die PWA läuft plattformübergreifend auf **iOS und Android**, belegt kaum Speicherplatz und aktualisiert sich automatisch, sobald du den Code auf deinem Server aktualisierst.

### Schritt 1: App im Internet veröffentlichen (Hosting)
Die App muss über eine verschlüsselte Verbindung (`https://`) im Internet erreichbar sein. Du kannst die App in wenigen Sekunden kostenlos hochladen über:
- **Vercel** (Befehl im Ordner ausführen: `vercel` – lädt das Verzeichnis sofort hoch)
- **Netlify** (Ziehe den Ordner `fitnesstracker` einfach per Drag-and-Drop auf das Netlify-Dashboard)
- **GitHub Pages** (Z. B. unter `https://username.github.io/fitnesstracker`)

### Schritt 2: Auf dem Smartphone installieren
Öffne die veröffentlichte URL auf deinem Smartphone im Browser:

* **Unter Android (Google Chrome)**:
  1. Öffne die URL deiner gehosteten App.
  2. Es sollte automatisch ein Banner am unteren Rand erscheinen: **"FitTrack zum Startbildschirm hinzufügen"** oder **"App installieren"**.
  3. Falls nicht: Tippe oben rechts auf die **drei Punkte** und wähle **"App installieren"** oder **"Zum Startbildschirm hinzufügen"**.
  
* **Unter iOS / iPhone (Apple Safari)**:
  1. Öffne die URL in **Safari** (andere Browser auf iOS unterstützen die Installation nicht optimal).
  2. Tippe unten in der Navigationsleiste auf den **Teilen**-Button (Viereck mit Pfeil nach oben).
  3. Scrolle etwas nach unten und wähle **"Zum Home-Bildschirm"** (Add to Home Screen).
  4. Bestätige den Namen und klicke oben rechts auf **"Hinzufügen"**.

**Ergebnis**: FitTrack erscheint nun als normales App-Icon auf deinem Home-Bildschirm. Sie startet ohne Browser-Suchleiste im Vollbildmodus, läuft flüssig und ist dank Service-Worker und lokalem Cache komplett offline-fähig!

---

## 📦 Methode 2: Kompilieren in eine signierte Android-APK (.apk)

Wenn du eine "echte" App-Datei (`.apk`) für Android haben möchtest (z. B. um sie im Google Play Store zu veröffentlichen oder als eigenständige Datei an Freunde zu senden), kannst du die App über **PWA Builder** verpacken.

### Schritt 1: APK generieren
1. Besuche [pwabuilder.com](https://www.pwabuilder.com).
2. Gib die öffentliche URL deiner unter Methode 1 gehosteten FitTrack PWA ein und klicke auf **Start**.
3. PWA Builder überprüft dein Manifest und zeigt an, ob alles bereit ist.
4. Klicke auf **Build My App** und wähle **Google Play (Android)**.
5. Konfiguriere die Einstellungen im Modal (z. B. Paketname: `com.fittrack.app`, App Name: `FitTrack`).
6. Klicke auf **Generate** und lade die generierte ZIP-Datei herunter.

### Schritt 2: Auf dem Smartphone installieren
1. Entpacke die ZIP-Datei auf deinem PC.
2. Suche darin nach der Datei `app-release-signed.apk`.
3. Kopiere diese Datei auf dein Android-Handy (per USB, Google Drive oder E-Mail).
4. Tippe die Datei auf dem Handy an, um sie zu installieren (erlaube bei Aufforderung die Installation aus *"unbekannten Quellen"*).

---

## 🔍 Lokaler Test vor der Veröffentlichung (Optional)

Möchtest du die App auf deinem Handy testen, ohne sie vorher im Internet zu veröffentlichen?
1. Starte den lokalen Server auf deinem PC (z. B. mit `python -m http.server 8000`).
2. Finde die lokale IP-Adresse deines PCs heraus (PowerShell: `ipconfig`, z. B. `192.168.1.150`).
3. Öffne auf deinem Smartphone den Browser und rufe `http://192.168.1.150:8000` auf (PC und Handy müssen im selben WLAN sein).
4. Du kannst die App auch von dieser lokalen Adresse aus wie in Methode 1 beschrieben als PWA auf deinem Home-Bildschirm installieren.

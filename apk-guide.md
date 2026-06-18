# 📱 FitTrack - Anleitung für APK-Erstellung & Mobiles Testen

Diese Anleitung erklärt, wie du deine FitTrack-App auf einem mobilen Gerät testen und sie in eine signierte, installierbare Android-APK kompilieren kannst.

---

## 1. App auf dem Smartphone testen (Lokales Netzwerk)

Bevor du die App fest installierst, kannst du sie direkt auf deinem Smartphone im selben WLAN-Netzwerk ausführen, um sie im Fitnessstudio zu testen:

1. **Finde die IP-Adresse deines Computers**:
   - Öffne die PowerShell oder Eingabeaufforderung auf deinem PC.
   - Führe den Befehl `ipconfig` aus.
   - Suche nach der **IPv4-Adresse** unter deinem aktiven Netzwerkadapter (z. B. `192.168.1.150`).
2. **Aufruf über das Smartphone**:
   - Stelle sicher, dass dein Smartphone und dein Computer im **selben WLAN-Netzwerk** angemeldet sind.
   - Öffne den Browser auf deinem Smartphone (Chrome für Android, Safari für iOS) und rufe die Adresse auf: `http://<IP-deines-Computers>:8000` (z. B. `http://192.168.1.150:8000`).
3. **Als PWA installieren**:
   - **Unter Android (Chrome)**: Tippe oben rechts auf die drei Punkte und wähle **"Zum Startbildschirm hinzufügen"** oder **"App installieren"**.
   - **Unter iOS (Safari)**: Tippe unten auf den **Teilen**-Button (Viereck mit Pfeil nach oben) und wähle **"Zum Home-Bildschirm"**.
   - Die App hat nun ein eigenes Icon auf deinem Smartphone und startet im Vollbildmodus – komplett offline-fähig!

---

## 2. Kompilieren in eine signierte Android-APK (.apk)

Um die Web-App in eine native Android-App zu verpacken, nutzen wir **PWA Builder** (ein kostenloses Tool von Microsoft, das Progressive Web Apps in App-Store-Formate konvertiert).

### Schritt 1: App im Internet veröffentlichen (Hosting)
PWA Builder benötigt eine öffentlich erreichbare URL deiner App. Du kannst deinen lokalen Ordner in Sekunden kostenlos hochladen über:
- **Vercel** (Befehl im Ordner ausführen: `vercel` – lädt das Verzeichnis sofort hoch)
- **Netlify** (Ziehe den Ordner `fitnesstracker` einfach per Drag-and-Drop auf das Netlify-Dashboard)
- **GitHub Pages** (Z. B. unter `https://username.github.io/fitnesstracker`)

### Schritt 2: APK generieren auf PWA Builder
1. Besuche [pwabuilder.com](https://www.pwabuilder.com).
2. Gib die öffentliche URL deiner gehosteten FitTrack PWA ein (z. B. `https://my-fittrack.vercel.app`) und klicke auf **Start**.
3. PWA Builder überprüft deine `manifest.json` und bestätigt, dass die App bereit für die Paketierung ist.
4. Klicke auf **Build My App** und wähle **Google Play (Android)**.
5. Konfiguriere die Einstellungen im Modal:
   - **Package ID**: `com.fittrack.app`
   - **App Name**: `FitTrack`
   - **Launcher Title**: `FitTrack`
6. Klicke auf **Generate**. Nach Abschluss des Builds lädst du die generierte ZIP-Datei herunter.

### Schritt 3: Extrahieren und Installieren
1. Entpacke die heruntergeladene ZIP-Datei auf deinem PC.
2. Suche darin nach der Datei namens `app-release-signed.apk` (oder einer ähnlichen `.apk`-Datei).
3. Kopiere diese `.apk`-Datei auf dein Android-Smartphone (per USB-Kabel, Google Drive, E-Mail oder WhatsApp).
4. Tippe die `.apk`-Datei auf deinem Smartphone an, um die Installation zu starten.
   - *Hinweis: Ggf. musst du in den Android-Einstellungen die Installation aus "unbekannten Quellen" erlauben.*

Deine FitTrack-App läuft nun als vollwertige, native Android-App auf deinem Smartphone!

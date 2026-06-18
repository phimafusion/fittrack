# 🏋️‍♂️ FitTrack - Dein mobiler Fitness-Tracker

FitTrack ist eine moderne, progressive Web-App (PWA) zur Dokumentation von Trainingseinheiten, Übungen, Sätzen und Gewichten im Fitnessstudio. Entwickelt mit Fokus auf Performance, vollständige Offline-Fähigkeit und ein ansprechendes **Sports-Tech-Design im Dark Mode**.

---

## ✨ Hauptfunktionen

* **💪 Interaktiver Trainings-Logger**: Starte ein Training, füge Übungen und Sätze hinzu, hake sie ab und tracke dein bewegtes Volumen in Echtzeit.
* **📅 Trainingsverlauf (History)**: Behalte deine vergangenen Trainingseinheiten im Blick. Lösche alte Einträge oder bearbeite sie nachträglich direkt in der Historie (inklusive automatischer Neuberechnung des Gesamtvolumens).
* **🔥 Firebase Auth & Firestore-Synchronisation**: 
  * Melde dich per E-Mail/Passwort oder über den Google-Login an, um deine Daten sicher in der Cloud zu speichern.
  * **Offline-Erste Speicherung**: Dank Firestore-Cache arbeitet die App auch im tiefsten Funkloch des Fitnessstudios offline und synchronisiert die Daten automatisch, sobald du wieder Netz hast.
* **👤 Gast-Modus mit Auto-Merge**: Du kannst die App komplett ohne Account nutzen. Alle Workouts werden lokal im Browser (`localStorage`) gespeichert. Sobald du dich anmeldest, werden deine lokalen Gast-Workouts automatisch mit deinem Cloud-Profil zusammengeführt.
* **🎨 Premium UI/UX**: Native Browser-Popups wurden durch maßgeschneiderte, animierte Dialoge und Toast-Benachrichtigungen im Sport-Tech-Design ersetzt.
* **📲 PWA & APK-Ready**: Die App kann direkt auf dem Homescreen installiert werden (PWA) oder über Tools wie PWA Builder in eine native Android APK kompiliert werden.

---

## 🛠️ Technologien

* **Core**: Semantisches HTML5 & modulares, modernes ES6 Javascript (Clean Code, Trennung von UI-Rendering und App-Logik).
* **Styling**: HSL-basierte Farbpalette im Dark Mode, Responsive Design für mobile Geräte und flüssige CSS-Keyframe-Animationen.
* **Backend**: Firebase SDK (Auth & Cloud Firestore).
* **Testing**: QUnit (36 automatisierte Unit- und Integrationstests für das Datenmodell, das Bearbeiten von Trainingseinheiten und die Migrationsguards).

---

## 🚀 Erste Schritte

### 1. Lokales Setup

Klone das Repository auf deinen Computer:
```bash
git clone https://github.com/phimafusion/fittrack.git
cd fittrack
```

### 2. Firebase Konfiguration

Kopiere die Beispiel-Konfigurationsdatei und trage deine Firebase-Credentials ein:
1. Benenne die Datei [js/firebase-config.example.js](file:///c:/Users/phili/Documents/antigravity_git/fitnesstracker/js/firebase-config.example.js) um in `js/firebase-config.js`.
2. Trage deine Projektschlüssel aus der Firebase-Konsole ein:
```javascript
export const firebaseConfig = {
  apiKey: "DEIN_API_KEY",
  authDomain: "DEIN_PROJECT.firebaseapp.com",
  projectId: "DEIN_PROJECT",
  storageBucket: "DEIN_PROJECT.firebasestorage.app",
  messagingSenderId: "DEINE_SENDER_ID",
  appId: "DEINE_APP_ID"
};
```
*Hinweis: `js/firebase-config.js` ist in der `.gitignore` eingetragen und wird nicht auf GitHub hochgeladen.*

### 3. Server starten
Starte einen einfachen lokalen Webserver im Projektverzeichnis, zum Beispiel mit Python:
```bash
python -m http.server 8000
```
Öffne anschließend [http://localhost:8000](http://localhost:8000) in deinem Browser.

---

## 🧪 Tests ausführen

FitTrack verfügt über eine integrierte Testsuite. Um die Tests auszuführen, starte den lokalen Server und öffne:
👉 **[http://localhost:8000/test.html](http://localhost:8000/test.html)**

Hier werden alle 36 Unit- und Integrationstests direkt im Browser ausgeführt und validiert.

---

## 📱 Auf dem Smartphone nutzen (PWA / APK)

* Detaillierte Schritte, wie du die App lokal auf deinem Smartphone testest, sie als PWA installierst oder in eine eigenständige **Android APK** umwandelst, findest du in der Datei **[apk-guide.md](file:///c:/Users/phili/Documents/antigravity_git/fitnesstracker/apk-guide.md)**.

---

## 🔮 Zukünftige Features & Roadmap

Folgende Features sind für zukünftige Versionen geplant:
* ⏱️ **Pausen-Timer (Rest Timer)**: Automatischer Countdown nach beendetem Satz.
* 🏆 **Letzte Trainingswerte & PRs**: Direkte Anzeige deiner letzten Leistungen beim Eintragen von Gewichten sowie Kennzeichnung von Rekorden.
* 📊 **Statistik-Dashboard**: Grafische Auswertung von Trainingsvolumen, Frequenz und trainierten Muskelgruppen.
* 📋 **Trainingspläne / Vorlagen**: Schnelles Starten von vordefinierten Routinen (z. B. Push/Pull/Legs).


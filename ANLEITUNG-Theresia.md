# VitaLunaris – Inhalte selbst bearbeiten 🌙
### Eine einfache Anleitung für Theresia

Du kannst alle Texte, Preise, Bilder, Stimmen und Fragen auf der Website selbst ändern – ganz ohne Programmieren. Hier ist Schritt für Schritt, wie es geht.

---

## 1. Einloggen

1. Öffne im Browser: **https://vitalunaris.ch/_emdash/admin**
   *(zum Üben lokal: http://localhost:4321/_emdash/admin)*
2. Melde dich an. Du landest im **Verwaltungsbereich** (das «Backoffice»).

> 💡 Tipp: Speichere die Adresse als Lesezeichen.

---

## 2. So funktioniert das Bearbeiten (das Grundprinzip)

Es sind immer **die gleichen 4 Schritte**:

1. **Links eine Sammlung wählen** (z. B. «Praxisangebote»).
2. **Den Eintrag anklicken**, den du ändern möchtest (z. B. «hypnose»).
3. **Die Felder ändern** – Text überschreiben, Bild tauschen usw.
4. Oben rechts auf **Speichern** klicken. ✅

Die Website aktualisiert sich danach automatisch.

---

## 3. Wo finde ich welche Seite?

Links in der Seitenleiste sind die Inhalte in Gruppen («Sammlungen») sortiert:

| Sammlung | Was drin ist |
|---|---|
| **Praxisangebote** | Übersicht · 1:1 Aufstellung · Hypnose · Numerologie · Fussreflexzonen · Jawort by Jansen |
| **Ausbildung (Programme)** | Übersicht · Soulcoach Level 1 · Level 2 · Infoanlässe |
| **Workshops & Kurse** | Aktueller Monatsworkshop · Kalender & Übersicht · die 4 Monats-Workshops |
| **Seiten** | Startseite · Über uns · Ausbildung-Startseite · Kontakt · News |
| **Team** | Theresia · Axel · Marlen (eure Kurzbiografien) |
| **Rechtliches** | AGB · Datenschutz · Impressum |
| **Seiten-Einstellungen** | das Menü oben & der Footer unten |

> Wenn du nicht sicher bist, wo eine Seite ist: Die Datei **EDITING-GUIDE.md** listet jede Seite mit ihrer Adresse und ihrem Platz im Backoffice.

---

## 4. Texte ändern

- Klicke in das Textfeld, **markiere den alten Text** und schreibe deinen neuen.
- Ein Zeilenumbruch im Text wird mit `<br/>` gemacht (steht meist schon drin – einfach lassen).
- Danach **Speichern**.

---

## 5. Bilder hochladen / austauschen 📷

1. Beim Bild-Feld auf **Bild auswählen / hochladen** klicken.
2. Dein Foto vom Computer aussuchen → es wird in die **Mediathek** geladen.
3. Auswählen → **Speichern**.

So ersetzt du nach und nach die Platzhalter-Bilder durch eure echten Fotos.

> 💡 Verwende möglichst Bilder im Querformat oder Hochformat passend zur Stelle (die Grösse passt sich automatisch an). Gute Auflösung, aber nicht riesig (ca. 1–2 MB reicht).

---

## 6. Listen bearbeiten: Stimmen, Häufige Fragen, Karten

Manche Felder sind **Listen** mit mehreren Einträgen (z. B. «Stimmen», «Häufige Fragen», «Ablaufschritte»):

- **Eintrag ändern:** einfach in die Felder schreiben.
- **Neuen Eintrag hinzufügen:** auf **+ Hinzufügen** klicken.
- **Eintrag löschen:** auf das **Papierkorb-Symbol** beim Eintrag.
- **Reihenfolge ändern:** Einträge per **Ziehen** verschieben.

> ⚠️ Bitte **keine erfundenen Stimmen/Testimonials** eintragen – nur echte, mit Einverständnis.

---

## 7. Menü oben & Footer unten

Gehe zu **Seiten-Einstellungen**:

- **Menü:** unter «Navigation» – jeder Punkt hat eine **Beschriftung** und einen **Link**.
- **Footer:** Spalten, Telefonnummern, E-Mail, Adresse, Social-Media-Links, Copyright.

**Aufklappmenüs (Unterpunkte):** Diese stehen als kleine Liste im Format
```
[{"label":"Hypnose","href":"/praxisangebote/hypnose"}]
```
👉 Am einfachsten: einen bestehenden Eintrag kopieren und nur **label** (Anzeigename) und **href** (Adresse, beginnt mit `/`) anpassen. Anführungszeichen `" "` und die Klammern `[ ]` immer stehen lassen.

---

## 8. Speichern & prüfen

- Nach jeder Änderung **Speichern**.
- Öffne die echte Seite in einem neuen Tab und **lade sie neu** (F5), um das Ergebnis zu sehen.

---

## ✅ Goldene Regeln

- **Speichern nicht vergessen.**
- **Bilder** über «Hochladen» einfügen – nicht kopieren/einfügen.
- Bei **Links** immer mit `/` beginnen (z. B. `/kontakt`).
- Bei den **Listen-/JSON-Feldern**: nur den Text zwischen den Anführungszeichen ändern, Klammern stehen lassen.
- Im Zweifel: **erst eine Kleinigkeit testen**, neu laden, schauen – dann weitermachen.
- Etwas geht kaputt? Kein Problem – der vorherige Stand lässt sich wiederherstellen. Melde dich einfach.

---

Viel Freude beim Gestalten 💛
*Bei Fragen jederzeit beim Team melden.*

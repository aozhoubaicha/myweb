<p align="center">
  Übersetzungen ➜&nbsp;
  <a href="../README.md"><img src="https://flagcdn.com/256x192/us.png" width="48" alt="United States Flag"></a>
  <a href="TR.md"><img src="https://flagcdn.com/256x192/tr.png" width="48" alt="Turkey Flag"></a>
  <a href="ES.md"><img src="https://flagcdn.com/256x192/es.png" width="48" alt="Spain Flag"></a>
  <a href="FR.md"><img src="https://flagcdn.com/256x192/fr.png" width="48" alt="France Flag"></a>
  <a href="RU.md"><img src="https://flagcdn.com/256x192/ru.png" width="48" alt="Russia Flag"></a>
  <a href="JA.md"><img src="https://flagcdn.com/256x192/jp.png" width="48" alt="Japan Flag"></a>
</p>

---

> [!NOTE]
> **Hallo, nachdem neue Maßnahmen eingeführt wurden, habe ich mich entschieden, diesen Bot zu entwickeln, und er war in nur einem Tag fertig. Aufgrund dieser Maßnahmen scheint es derzeit unmöglich, einen vollständig automatisierten Bot zu erstellen. Dank einer aktuellen Ausnutzung können wir jedoch mit einer einzigen Verifizierung in einer Sekunde aus 12 Konten zeichnen. Wenn die Konten voll sind, können wir 12 * 62 = <strong>744</strong> Pixel pro Sekunde senden. Wenn du bereit bist, habe ich unten erklärt, wie du ihn benutzt.**

---

<p align="center"><strong>WPlace UltraBOT</strong></p>

<p align="center">
  Mit mehreren Konten kannst du auf <a href="https://wplace.live" target="_blank">WPlace</a> gewünschte Pixel setzen.
 </p>

---

<p align="center"><strong>🚀┃ So installierst du den Bot:</strong></p>

<p align="center">
  Der Bot ist leicht einzurichten, aber schwer zu meistern. Spaß beiseite – anfangs wirkt die Nutzung vielleicht schwierig, doch nach den jüngsten Maßnahmen gibt es keinen anderen Bot, der so funktioniert. Die Mühe lohnt sich also.
 </p>

<br>

### 🔧┃Installation (DE)

- Anforderungen:
  - Node.js >= 18.18.0

- Schritte:
  1. Abhängigkeiten installieren:
     
     ```bash
     npm install
     ```
  2. Anwendung starten:
     
     ```bash
     npm start
     ```
  3. `http://localhost:3000` im Browser öffnen.

<details open>
  <summary><h2>📖┃Anleitung</h2></summary>

---

![Teil 1](https://i.imgur.com/yS9093x.png)

Wenn du `localhost:3000` öffnest, solltest du eine Seite wie diese sehen.<br>

---

![Teil 2](https://i.imgur.com/taF0I2T.png)

Öffne einen neuen Tab und gehe zu `chrome://extensions/`.<br>
Aktiviere den Entwicklermodus.<br>

![](https://i.imgur.com/oe42A42.png)

Klicke auf „Load unpacked“ (Entpackte Erweiterung laden).<br>

![](https://i.imgur.com/jPyzOr3.png)

Wähle den Ordner `WPlace-Helper` aus.<br>

---

![Teil 3](https://i.imgur.com/YVyvw3a.png)

Gehe zur Seite `wplace.live`.<br>
Drücke `F12`.<br>
Wähle im oberen Bereich den Reiter „Application“ (falls du ihn nicht findest, klicke auf den gelb markierten Bereich und wähle ihn aus).<br>
Klicke auf `cf_clearance` und kopiere den Wert unten.<br>

---

![Teil 4](https://i.imgur.com/sJvyiC6.png)

Gehe zurück zum Bot.<br>
Klicke auf die Schaltfläche „Accounts“ und dann auf „Settings“. Füge den kopierten Wert in das Feld `cf_clearance` ein und speichere.

---

![Teil 5](https://i.imgur.com/vJkPMx8.png)

Gehe zu `wplace.live`. Wenn du oben auf die Erweiterung klickst, sollte sie so aussehen.<br>
Stelle sicher, dass der Abschnitt „pixel token“ aktiviert ist, und versuche, normal einen Pixel auf die Karte zu setzen.<br>

![Teil 5 (Fehler)](https://i.imgur.com/uZmJDad.png)

Wenn du den gezeigten Fehler erhältst, bist du auf dem richtigen Weg. Klicke erneut auf die Erweiterung, dann erscheinen „World X“ und „World Y“ für die Stelle, die du malen wolltest. Kopiere sie.<br>

---

![Teil 6](https://i.imgur.com/LniE1E8.png)

Wenn du die Koordinaten World X und World Y eingibst und auf „fetch“ klickst, sollte eine Karte wie im Bild erscheinen.<br>

---

![Teil 7](https://i.imgur.com/vJkPMx8.png)

Gehe zurück zur vorherigen Seite, klicke auf die Erweiterung und kopiere den „Account Token“.

---

![Teil 8](https://i.imgur.com/8sjhH1L.png)

![Teil 8](https://i.imgur.com/jf6W8NV.png)

Du wirst zum Bereich Accounts weitergeleitet. Klicke auf „Add Account“. Auf der sich öffnenden Seite:
- Gib einen beliebigen Namen für das Konto ein.
- Füge in das Feld „Account Token“ den zuvor kopierten Wert ein.
- Klicke auf „Add“.

---

![Teil 9](https://i.imgur.com/DJUEywj.png)

Nachdem du beliebig viele Konten hinzugefügt hast, kannst du oben rechts die Gesamtanzahl der Pixel und die verfügbaren Pixel für alle Konten sehen.<br>
Das hochgeladene Bild wird automatisch in die auf der Website verfügbaren kostenlosen Farbpaletten konvertiert und so hochgeladen. Dieses System wird in Zukunft weiter verbessert.

Wenn du mit „Upload Image“ ein Bild hochlädst:

- Oben links wird die Anzahl der für das Bild benötigten Pixel angezeigt.
- Oben rechts befindet sich ein Schloss-Symbol. Wenn du es aktivierst, kannst du das Bild nicht verschieben. Mit „X“ löschst du das Bild.
- In der linken Leiste siehst du alle hochgeladenen Bilder. Wenn du ein Bild auf der Seite nicht findest, klicke es in der Leiste an, um direkt dorthin zu springen.

---

![Teil 10](https://i.imgur.com/Dzt1p3o.png)

Klicke auf die Schaltfläche „Ready“. Im erscheinenden Fenster wähle mit „Select Account“ deine aktiven Konten aus. Wenn du fertig bist, klicke erneut auf „Select Account“, um das Fenster zu schließen.

---

![Teil 11](https://i.imgur.com/QKJRVL9.png)

Wenn du in das Bild hineinzoomst, wird jeder transparente Pixel, den du füllst, mit der entsprechenden Farbe aus deinem hochgeladenen Bild eingefärbt, und du kannst nur innerhalb der Bildgrenzen Pixel platzieren. Wenn du eine bestimmte Farbe auswählst, kannst du überall malen – bis zu deiner maximalen Pixelkapazität.

---

![Teil 12](https://i.imgur.com/vJkPMx8.png)

Gehe zurück zu WPlace. Da der vorherige Token abgelaufen ist, versuche, einen neuen Pixel zu senden, und kopiere den neuen „pixel token“.

---

![Teil 13](https://i.imgur.com/wDp07pH.png)

Gehe zurück auf unsere Seite, füge den Wert in das Feld „token“ ein und klicke auf „Start“.

---

![Teil 14](https://i.imgur.com/iQTH5TR.png)

Wenn alles korrekt war, solltest du eine Benachrichtigung wie diese erhalten und die Änderungen sollten auf der Karte übernommen worden sein. Das war's – wiederhole die Schritte, um jedes gewünschte Bild zu erstellen.

</details>

<br>

> [!IMPORTANT]
> <p><sub><strong>1.</strong> Im Bereich Accounts kannst du mit „Check Pixel“ die verbleibenden Pixel für dieses Konto manuell prüfen. Normalerweise geschieht dies alle 90 Sekunden automatisch.</sub></p>
> <p><sub><strong>2.</strong> Account-Token sind etwa 3–4 Stunden gültig. Während der automatischen Prüfung wird ein Konto inaktiv, wenn der Token abläuft. Du kannst es reaktivieren, indem du den neuen Token im Bereich Bearbeiten einfügst und „Check Pixel“ klickst.</sub></p>
> <p><sub><strong>3.</strong> Sobald der Sendetoken im Panel erscheint, musst du schnell sein. Wenn du zu lange wartest, läuft er ab und du erhältst einen 403-Refresh-Fehler.</sub></p>

<br>

Da das gesamte Projekt an einem Tag erstellt wurde, melde bitte eventuelle Lücken oder gewünschte Funktionen.

---

<p align="center">
  <img src="https://i.imgur.com/msR5dM9.png" alt="Startseite"/>
</p>

---

### 📋┃To-do

- [x] Übersetzungen [TR/USA]
- [ ] Script-Fehler beheben
- [x] Anleitungen

---

<p align="center">
  <a href="#"><img src="https://komarev.com/ghpvc/?username=xacter&repo=WPlace-UltraBOT&style=for-the-badge&label=Views:&color=gray"/></a>
</p>



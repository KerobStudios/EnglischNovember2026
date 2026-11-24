# Mission Top Marks – Romys Englisch-Vokabeltrainer

Lernseite für den Englisch-Vokabeltest (Politics, British monarchy, Brexit) mit Synonymübungen zum Thesaurus für abgenutzte Wörter.

**Live:** https://kerobstudios.github.io/EnglischNovember2026/

Das Testdatum wird direkt in der App eingetragen (Plan → Countdown antippen) und im Browser gespeichert.

## Inhalt
- **Politics: Topic Vocabulary** – 31 Vokabeln mit den Memory Aids vom Blatt (Definition, Beispielsatz, Wortfamilie, Kollokationen)
- **Text 6: The British monarchy** – 14 Textvokabeln mit Zeilenangabe und Beispielsatz
- **Skills Lab: Argumentative writing** – 9 Textvokabeln
- **Brexit-related terms and phrases** – 29 Begriffe
- **Thesaurus for commonly overused words** – 54 Gruppen mit 287 Synonymen, jedes mit deutscher Bedeutung

## Lernmodi
| Bereich | Was passiert |
|---|---|
| Plan | 13-Schritte-Sprint für heute Abend und morgen früh, Fortschritt pro Blatt, Fehlerliste, Testdatum |
| Wörter | Alle Vokabeln mit Eselsbrücke, Memory Aid, Beispielsatz, Aussprache, Wortfamilien, Stolperfallen |
| Karten | Karteikarten in beide Richtungen mit Leitner-Stufen (0–3) |
| Üben | Multiple Choice, Schreiben, Lückentext, Memory Aid (Definition → Wort), Diktat, Paare, Blitzrunde |
| Synonyme | Welches passt?, Rückwärts, Ausreißer, Ersetzen im Satz, Drei nennen, Paare, Blitzrunde |
| Test | Generalprobe (25 Aufgaben inkl. 5 Synonym-Aufgaben, benotet) und Abfrage-Modus für Eltern |

Antworten werden tolerant geprüft: Artikel, „(to)“, „sth./sb.“, Groß-/Kleinschreibung und Bindestriche sind egal, Umlaute dürfen als ae/oe/ue geschrieben werden, ein Buchstabendreher zählt als „fast richtig“. Bei langen deutschen Erklärungen (Brexit) reicht das Stichwort.

Der Lernstand wird im Browser gespeichert (localStorage). Keine Anmeldung, kein Server.

## Entwicklung
Quelltext liegt in `src/` (`data.js`, `app.js`, `style.css`, `body.html`).
`./build.sh` setzt daraus `index.html` zusammen. Vorlage: [SpanischNovember2026](https://github.com/KerobStudios/SpanischNovember2026).

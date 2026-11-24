#!/bin/sh
# Baut index.html (GitHub Pages) und artifact.html (ohne Dokumentgerüst) aus src/
set -e
cd "$(dirname "$0")"
HEAD='<title>Mission Top Marks</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700;800&family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&display=swap">'
{
  printf '%s\n<style>\n' "$HEAD"; cat src/style.css; printf '</style>\n'
  cat src/body.html
  printf '<script>\n'; cat src/data.js; printf '\n</script>\n<script>\n'; cat src/app.js; printf '\n</script>\n'
} > artifact.html
{
  printf '<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<meta name="description" content="Romys Vokabeltrainer für den Englisch-Test: Politics, British monarchy, Brexit und Synonyme">\n<meta name="theme-color" content="#012169">\n'
  cat artifact.html | sed -n '1,/<\/style>/p'
  printf '</head>\n<body>\n'
  sed '1,/<\/style>/d' artifact.html
  printf '</body>\n</html>\n'
} > index.html
echo "built: $(wc -c < index.html) bytes"

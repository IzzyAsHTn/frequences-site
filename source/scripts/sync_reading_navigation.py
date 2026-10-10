#!/usr/bin/env python3
"""Relie les notes selon l’ordre éditorial enregistré dans work/reading-navigation.json."""
from pathlib import Path
import html
import json
import re

ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = ROOT / 'outputs'
BOOKS = json.loads((ROOT / 'work/reading-navigation.json').read_text())

def link(note, label, css=''):
    return (f'<a class="reading-path-link {css}" href="{html.escape(note["file"], quote=True)}">'
            f'<span>{html.escape(label)}</span><strong>{html.escape(note["title"])}</strong></a>')

def main():
    prepared = []
    for book_index, book in enumerate(BOOKS):
        notes = book['notes']
        book_label = f'Cahier {book["number"]:02d} · {book["name"]}'
        index_href = f'index.html#{book["anchor"]}'
        for index, note in enumerate(notes):
            path = OUTPUTS / note['file']
            source = path.read_text()
            number = index + 1
            crumb = (f'<nav class="crumb" aria-label="Fil d’Ariane"><a href="index.html#accueil">Accueil</a>'
                     f'<span aria-hidden="true">/</span><a href="{index_href}">{book_label}</a>'
                     f'<span aria-hidden="true">/</span><span aria-current="page">Note {number:02d} sur {len(notes):02d}</span></nav>')
            source, count = re.subn(r'<nav class="crumb"[^>]*>.*?</nav>', lambda _: crumb, source, flags=re.S)
            if count != 1: raise ValueError(f'Fil d’Ariane inattendu : {path.name}')
            if index:
                previous = link(notes[index-1], f'← Précédente · Note {index:02d}')
            else:
                previous = link({'file': 'index.html#cahiers', 'title': 'Choisir un cahier'}, 'Première note du cahier')
            if number < len(notes):
                following = link(notes[index+1], f'Suivante · Note {number+1:02d} →', 'reading-path-next')
            elif book_index+1 < len(BOOKS):
                next_book = BOOKS[book_index+1]
                following = link(next_book['notes'][0], f'Cahier suivant · {next_book["name"]} →', 'reading-path-next')
            else:
                following = link({'file': 'index.html#cahiers', 'title': 'Retrouver les cahiers'}, 'Fin du cahier', 'reading-path-next')
            nav = (f'<nav class="reading-path" aria-label="Parcours de lecture : {book_label}">'
                   f'<p class="reading-path-position">{book_label} · Note {number:02d} sur {len(notes):02d}</p>'
                   f'<div class="reading-path-links">{previous}{following}'
                   f'<a class="reading-path-index" href="{index_href}"><span>Sommaire du {book_label}</span>'
                   f'<span>{len(notes)} notes <span aria-hidden="true">↑</span></span></a></div></nav>')
            if note['file'] == 'midi-ne-transporte-pas-le-son.html':
                nav += ('<p class="reading-path-reference">Pour faire le lien avec l’audio : '
                        '<a href="controleur-devient-instrument.html">Quand le contrôleur devient instrument</a>.</p>')
            source, count = re.subn(
                r'<nav class="(?:related|reading-path)"[^>]*>.*?</nav>(?:\s*<p class="reading-path-reference">.*?</p>)?',
                lambda _: nav, source, flags=re.S)
            if count != 1: raise ValueError(f'Navigation de lecture inattendue : {path.name}')
            source, count = re.subn(
                r'<a href="index.html#(?:lectures|cahier-02|cahier-03)">(?:La revue|Sommaire)</a>',
                lambda _: f'<a href="{index_href}">Sommaire</a>', source)
            if count != 1: raise ValueError(f'Lien du sommaire inattendu : {path.name}')
            prepared.append((path, source))
    for path, source in prepared: path.write_text(source)
    print(f'Navigation synchronisée dans {len(prepared)} notes.')

if __name__ == '__main__': main()

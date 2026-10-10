#!/usr/bin/env python3
"""Référence la feuille CSS commune depuis les pages HTML de Fréquences."""

from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = ROOT / "outputs"
VERSION = "2026-10-10.13"
PAGES = (
    "buffer-audio.html",
    "controleur-devient-instrument.html",
    "effets-audio.html",
    "echantillonnage-audio.html",
    "enveloppe-adsr.html",
    "familles-de-filtres.html",
    "frequences.html",
    "index.html",
    "midi-automation.html",
    "midi-controleur.html",
    "midi-dynamique.html",
    "midi-gestes-expressifs.html",
    "midi-ne-transporte-pas-le-son.html",
    "midi-note-evenement.html",
    "midi-routage.html",
    "modulaire-sans-mur.html",
    "modulations.html",
    "oscillateur.html",
    "reperes.html",
    "sampling-instrumental.html",
    "decouper-un-echantillon.html",
    "transposer-un-echantillon.html",
    "velocite-zones-echantillons.html",
)


def main():
    css = (OUTPUTS / "frequences-design-system.css").read_text(encoding="utf-8").strip()
    if "</style" in css.lower():
        raise ValueError("La source CSS ne peut pas contenir une fermeture de balise style.")
    stylesheet = (
        f'<link id="frequences-design-system" rel="stylesheet" '
        f'href="frequences-design-system.css?v={VERSION}">'
    )
    prepared = []
    for name in PAGES:
        path = OUTPUTS / name
        source = path.read_text(encoding="utf-8")
        source = re.sub(
            r'<link\b[^>]*\bhref=[\"\']frequences-design-system\.css(?:\?[^\"\']*)?[\"\'][^>]*>\s*',
            "",
            source,
        )
        source = re.sub(
            r'<style\b[^>]*\bid=[\"\']frequences-design-system[\"\'][^>]*>.*?</style>\s*',
            "",
            source,
            flags=re.DOTALL,
        )
        source, head_count = re.subn(
            r"</head>", lambda _: stylesheet + "\n</head>", source
        )
        source, body_count = re.subn(
            r"<body\b([^>]*)>",
            lambda match: '<body data-design-system="red-industrial"'
            + re.sub(r'\s+data-design-system=[\"\'][^\"\']*[\"\']', "", match[1])
            + ">",
            source,
            count=1,
        )
        if head_count != 1 or body_count != 1:
            raise ValueError(f"Structure HTML inattendue : {name}")
        prepared.append((path, source))

    # Chaque page est préparée avant d'écrire, pour détecter les structures inattendues.
    for path, source in prepared:
        path.write_text(source, encoding="utf-8")
    print(f"Styles communs référencés dans {len(prepared)} pages, version {VERSION}.")


if __name__ == "__main__":
    main()

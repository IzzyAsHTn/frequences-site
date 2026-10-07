#!/usr/bin/env python3
"""Exporte les sources locales autorisées vers les fichiers suivis par GitHub."""

from pathlib import Path
import shutil


ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = ROOT / "outputs"
PUBLISHED_PAGES = (
    "buffer-audio.html",
    "controleur-devient-instrument.html",
    "echantillonnage-audio.html",
    "effets-audio.html",
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
)
SHARED_OUTPUT_FILES = ("UAD2.jpg", "frequences-design-system.css")


def copy_file(source: Path, destination: Path) -> None:
    if not source.is_file():
        raise FileNotFoundError(f"Fichier source manquant : {source}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def main() -> None:
    # Le dossier source local contient aussi trois pages concept MIDI non publiées.
    for name in PUBLISHED_PAGES:
        source = OUTPUTS / name
        copy_file(source, ROOT / name)
        copy_file(source, ROOT / "source" / "outputs" / name)

    for name in SHARED_OUTPUT_FILES:
        source = OUTPUTS / name
        copy_file(source, ROOT / name)
        copy_file(source, ROOT / "source" / "outputs" / name)

    assets = OUTPUTS / "assets"
    if not assets.is_dir():
        raise FileNotFoundError(f"Dossier de ressources manquant : {assets}")
    asset_files = sorted(path for path in assets.rglob("*") if path.is_file())
    if not asset_files:
        raise FileNotFoundError(f"Aucune ressource trouvée dans : {assets}")
    for source in asset_files:
        copy_file(source, ROOT / "assets" / source.relative_to(assets))

    scripts = ROOT / "scripts"
    script_files = sorted(path for path in scripts.glob("*.py") if path.is_file())
    if not script_files:
        raise FileNotFoundError(f"Aucun script Python trouvé dans : {scripts}")
    for source in script_files:
        copy_file(source, ROOT / "source" / "scripts" / source.name)

    copy_file(
        ROOT / "work" / "reading-navigation.json",
        ROOT / "source" / "work" / "reading-navigation.json",
    )

    print(
        f"Synchronisation prête : {len(PUBLISHED_PAGES)} pages, "
        f"{len(SHARED_OUTPUT_FILES)} fichiers partagés, {len(asset_files)} ressources, "
        f"{len(script_files)} scripts et la configuration de lecture."
    )
    print("Les trois pages concept MIDI et les notes de travail restent locales.")


if __name__ == "__main__":
    main()

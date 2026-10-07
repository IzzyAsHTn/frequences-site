# Fréquences

Magazine pédagogique francophone consacré à la musique, à l’informatique musicale et aux technologies du son.

## Aperçu

Les pages HTML prêtes à servir sont à la racine du dépôt, avec `index.html` comme page d’accueil. Les 19 pages distribuées comprennent les deux cahiers et leurs modules interactifs.

## Sources

Les pages éditables et scripts de synchronisation se trouvent dans `source/`. La configuration du parcours de lecture est dans `source/work/reading-navigation.json`. Les trois pages concept MIDI sont volontairement absentes de la distribution et de cette copie source.

Le site public est publié avec GitHub Pages depuis la branche `main`, à la racine du dépôt : [izzyashtn.github.io/frequences-site](https://izzyashtn.github.io/frequences-site/).

## Synchroniser le projet local

Le dossier du projet local est relié à la branche `main` de ce dépôt. Les dossiers locaux `outputs/`, `scripts/` et `work/` sont volontairement exclus du suivi direct : ils contiennent aussi des pages concept et des notes de travail. Avant un envoi, exporter les fichiers du site avec `python3 tools/sync_local_project.py`. Cette commande met à jour les pages publiées, leur copie source, les ressources, les scripts éditoriaux et le parcours de lecture. Elle laisse de côté les trois pages concept MIDI.

Depuis la racine du projet, la séquence habituelle est :

```sh
git pull --ff-only
python3 tools/sync_local_project.py
git status
git add -A
git commit -m "Mettre à jour le site"
git push
```

Vérifier `git status` avant le commit. Si `git pull --ff-only` signale une divergence, arrêter et examiner les versions avant toute résolution.

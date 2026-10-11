# Fréquences

Magazine pédagogique francophone consacré à la musique, à l’informatique musicale et aux technologies du son.

## Aperçu

Les pages HTML prêtes à servir sont à la racine du dépôt, avec `index.html` comme page d’accueil. Les 23 pages distribuées comprennent trois cahiers et leurs modules interactifs. La feuille commune `frequences-design-system.css`, également à la racine, est nécessaire au rendu graphique et peut être réutilisée en cache entre les pages.

## Sources

Dans le dossier de travail local, `outputs/` contient les originaux éditables des pages publiées et de leurs ressources. Ce dossier est exclu de Git parce qu’il contient aussi des pages concept et des notes de travail. Dans ce dépôt, `source/outputs/` est une copie de référence synchronisée des pages HTML et des fichiers partagés ; elle n’est pas l’emplacement d’édition. Les ressources sont distribuées à la racine (`assets/` notamment). Les scripts et la configuration du parcours de lecture sont également recopiés dans `source/`. Les trois pages concept MIDI sont volontairement absentes de la distribution et de ces copies.

Le site public est publié avec GitHub Pages depuis la branche `main`, à la racine du dépôt : [izzyashtn.github.io/frequences-site](https://izzyashtn.github.io/frequences-site/).

## Synchroniser le projet local

Le dossier du projet local est relié à la branche `main` de ce dépôt. Les dossiers locaux `outputs/`, `scripts/` et `work/` sont volontairement exclus du suivi direct : ils contiennent aussi des pages concept et des notes de travail. Après une modification de la feuille commune, lancer `python3 scripts/sync_design_system.py` pour recalculer automatiquement son empreinte de cache dans les pages locales. Avant un envoi, exporter les fichiers du site avec `python3 tools/sync_local_project.py`. Cette commande met à jour les pages publiées, leur copie source, les ressources, les scripts éditoriaux et le parcours de lecture. Elle laisse de côté les trois pages concept MIDI.

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

# Fréquences

Magazine pédagogique francophone consacré à la musique, à l’informatique musicale et aux technologies du son.

## Aperçu

Les pages HTML prêtes à servir sont à la racine du dépôt, avec `index.html` comme page d’accueil. Les 23 pages distribuées comprennent trois cahiers et leurs modules interactifs. La feuille commune `frequences-design-system.css`, également à la racine, est nécessaire au rendu graphique et peut être réutilisée en cache entre les pages.

## Sources

Dans le dossier de travail local, `outputs/` contient les originaux éditables des pages publiées et de leurs ressources. Ce dossier est exclu de Git parce qu’il contient aussi des pages concept et des notes de travail. Dans ce dépôt, `source/outputs/` est une copie de référence synchronisée des pages HTML et des fichiers partagés ; elle n’est pas l’emplacement d’édition. Les ressources sont distribuées à la racine (`assets/` notamment). Les scripts et la configuration du parcours de lecture sont également recopiés dans `source/`. Les trois pages concept MIDI sont volontairement absentes de la distribution et de ces copies.

Le site public est publié avec GitHub Pages depuis la branche `main`, à la racine du dépôt : [izzyashtn.github.io/frequences-site](https://izzyashtn.github.io/frequences-site/).

## Synchroniser le projet local

Le dossier du projet local est relié à la branche `main` de ce dépôt. Les dossiers locaux `outputs/`, `scripts/` et `work/` sont volontairement exclus du suivi direct : ils contiennent aussi des pages concept et des notes de travail. Avant un envoi, exporter les fichiers du site avec `python3 tools/sync_local_project.py`. Cette commande recalcule l’empreinte de cache du CSS, met à jour les pages publiées, leur copie source, les ressources, les scripts éditoriaux et le parcours de lecture, puis génère le sitemap depuis les URL canoniques. Elle laisse de côté les trois pages concept MIDI.

Depuis la racine du projet, la séquence habituelle est :

```sh
git pull --ff-only
python3 tools/sync_local_project.py
python3 tools/check_site.py
git status
git add -A
git commit -m "Mettre à jour le site"
git push
```

Vérifier `git status` avant le commit. Si `git pull --ff-only` signale une divergence, arrêter et examiner les versions avant toute résolution.

## Styles et ateliers

Les styles des 23 pages sont regroupés dans `outputs/frequences-design-system.css`, puis exportés à la racine. Les groupes listés en tête de feuille et les attributs `data-style-groups` des pages isolent les variantes. Les sélecteurs `:where()` ne renforcent pas leur spécificité ; les règles du système graphique restent après les règles des pages. Modifier cette feuille commune pour les ajustements de style, puis exporter. Éviter de réintroduire des blocs `<style>` dans les pages.

Les cinq ateliers utilisant D3 chargent la bibliothèque, leur composant graphique et leur script d’initialisation avec `defer`, dans cet ordre. Les quatre ateliers Sampling utilisent `assets/sampling-audio.js` pour interrompre les sources, les déconnecter et suspendre le contexte lorsque l’onglet est masqué ou quitté. Aucun message de lecture visible n’est ajouté.

Le fond privilégie `assets/background-studio.webp` ; `UAD2.jpg` reste une solution de secours. La conversion ne change ni le sujet de l’image ni ses droits, qui restent à confirmer séparément.

## Indexation et contrôles

`sitemap.xml` contient les 23 URL canoniques, sans les copies `source/outputs/` ni les concepts. `robots.txt` est également généré, mais les robots ne le consultent qu’à la racine du domaine : celui situé dans `/frequences-site/` sur GitHub Pages n’a pas cette portée. Le sitemap peut être soumis directement à un moteur de recherche. Voir la [documentation Google](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt).

`python3 tools/check_site.py` vérifie les liens et ancres locaux, les ressources, les copies, les liens d’évitement, l’empreinte CSS, les scripts D3 différés et le sitemap. Ce contrôle statique ne remplace pas une vérification des interactions dans un navigateur ni une écoute sur un appareil réel.

Les copies `source/outputs/` sont conservées pour cette étape afin de préserver le fonctionnement de la synchronisation. Une suppression éventuelle doit être accompagnée d’une réorganisation explicite des sources et de l’export.

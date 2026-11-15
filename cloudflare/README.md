# Garage IA — serveur IA Cloudflare
Ce dossier contient le serveur Cloudflare Workers AI. L'application publique reste sur GitHub Pages.

## Mise en ligne gratuite
1. Créer un compte Cloudflare gratuit.
2. Ouvrir Workers & Pages, créer un Worker nommé garage-ia-api.
3. Copier le contenu de worker.js dans l'éditeur et déployer.
4. Dans Settings > Bindings, ajouter un binding **Workers AI** nommé **AI** puis redéployer.
5. Copier l'adresse HTTPS du Worker (de forme https://garage-ia-api.<sous-domaine>.workers.dev).
6. Dans le fichier **ai-config.js** à la racine du dépôt GitHub, remplacer la chaîne vide par cette adresse.
7. Tester le chatbot après le déploiement GitHub Pages.

Le chatbot utilise des réponses prédéfinies tant que l'URL n'est pas configurée. Le serveur refuse les origines autres que le site de démonstration et limite la taille des messages, mais un site public nécessite aussi des protections anti-abus avant une commercialisation (rate limiting, Turnstile, surveillance des quotas). Aucune clé secrète ne doit être placée sur GitHub Pages.

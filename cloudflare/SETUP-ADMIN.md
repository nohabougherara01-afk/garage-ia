# Garage Horizon — espace administrateur (prototype mono-garage)

1. Cloudflare > Storage & databases > D1 : créer une base `garage-horizon`.
2. Dans la console D1, exécuter le contenu de `schema.sql`.
3. Cloudflare > Workers & Pages : créer un NOUVEAU Worker, par exemple `garage-admin-api` (ne pas remplacer `garage-ia-api`). Coller `admin-worker.js` et déployer.
4. Worker > Settings > Bindings : ajouter D1 avec nom de variable exactement `DB`, sélectionner la base créée.
5. Worker > Settings > Variables and secrets : ajouter un **Secret** nommé `ADMIN_TOKEN`, avec une chaîne aléatoire d'au moins 32 caractères (ne jamais publier dans GitHub).
6. Dans GitHub, éditer `admin-config.js` pour mettre l'URL de ce nouveau Worker, par exemple `https://garage-admin-api.<sous-domaine>.workers.dev`.
7. Ouvrir `https://nohabougherara01-afk.github.io/garage-ia/admin.html`, saisir la clé et enregistrer. Tester le GET public /config.

Sécurité : secret jamais stocké dans le dépôt ni dans localStorage. Le formulaire n'envoie la clé qu'au Worker HTTPS. Les mises à jour sont protégées par le secret et une vérification d'origine, mais une vérification Origin seule n'est pas une authentification. Limiter les accès et surveiller les abus. Ne pas réutiliser la même clé pour plusieurs garages. Pour une vraie plateforme multi-clients, ajouter des comptes individuels via Cloudflare Access / fournisseur d'identité, permissions par garage, audit et isolation des données.

Ce prototype enregistre les informations dans D1 et expose un endpoint public GET /config. L'affichage du site et les réponses du chatbot ne sont PAS encore reliés à ce endpoint : il faut une étape d'intégration supplémentaire.

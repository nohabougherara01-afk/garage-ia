# Garage Horizon SaaS — backend en préparation

Ce dossier est du **code source non déployé**. Le site de démonstration et son Worker existant ne sont pas modifiés.

## Préparer Cloudflare

1. Créer un **nouveau** Worker (ex. garage-saas-api), sans remplacer garage-admin-api.
2. Lui lier une base D1 via la variable `DB` (base existante ou nouvelle selon votre stratégie).
3. Exécuter `schema.sql` dans D1 **après sauvegarde**, en environnement de test.
4. Déployer `worker.js` sur ce nouveau Worker.
5. Ajouter le secret `STRIPE_WEBHOOK_SECRET` et les variables `STRIPE_PRICE_ASSISTANT` / `STRIPE_PRICE_PREMIUM` correspondant aux **IDs de prix Stripe**, pas aux liens de paiement.
6. Déclarer dans Stripe un webhook vers `https://VOTRE-WORKER.workers.dev/stripe/webhook` pour les événements `customer.subscription.created`, `customer.subscription.updated` et `customer.subscription.deleted`.

## Sécurité et limites

- Le webhook vérifie la signature HMAC Stripe et l'âge du timestamp.
- Les accès au planning nécessitent un jeton opaque dont seul le SHA-256 est stocké dans D1.
- Chaque requête est filtrée par `garage_id` côté serveur.
- **Aucun compte n'est créé automatiquement** : il manque encore l'inscription, la vérification d'e-mail, la création sécurisée de jetons et l'association vérifiée du client Stripe.
- Les liens Stripe Payment Links existants ne transmettent pas automatiquement une identité de garage fiable. Un flux Checkout serveur ou un onboarding avec association Stripe vérifiée sera nécessaire.
- Le calendrier n'effectue pas encore de réservation atomique ni de synchronisation avec l'IA.
- Ne pas utiliser en production avant tests, durcissement, gestion des secrets et du RGPD.

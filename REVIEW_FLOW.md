# Restaurant review flow

Tap **+**, search with the existing Google Places autocomplete, select a restaurant,
choose 1–5 stars, write a review, and sign in with Auth0 before posting. The backend
resolves the Google Place to its own restaurant UUID and attributes the review to
the access token's subject. Successful submissions show a confirmation and refresh
the Home feed when returning. Failed submissions retain the draft while the screen
is open; retrying an unchanged draft reuses its submission ID.

## Configuration

Copy the public settings from `messy-app/.env.example` into your private
`messy-app/.env.local`. Restart Expo after changing them. On a physical phone,
the API URL must be reachable from that phone (not `localhost`).

1. Create an Auth0 **Native** application for iOS/Android, with Token Endpoint
   Authentication Method **None** and Authorization Code enabled. The app uses
   PKCE; do not add a client secret to Expo.
2. Create an Auth0 API using **RS256**. Put its identifier in
   `EXPO_PUBLIC_AUTH0_AUDIENCE`, the Native application's client ID in
   `EXPO_PUBLIC_AUTH0_CLIENT_ID`, and the tenant hostname in `EXPO_PUBLIC_AUTH0_DOMAIN`.
3. Add `messyapp://oauth` to the application's Allowed Callback URLs. Use a
   development build for native OAuth; Expo Go cannot provide this custom callback.
   Without an Apple membership, use an iOS simulator on a Mac or web for sign-in testing.
4. For web, create a separate Auth0 **Single Page Application**, use its client ID
   in the web environment, allow the exact `/oauth` callback (for example
   `http://localhost:8081/oauth`), and add the web origin to Allowed Web Origins
   and Allowed Origins (CORS). Configure the gateway's CORS_ORIGINS as well.
5. Configure all backend services with `JWT_ISSUER=https://YOUR_DOMAIN/`,
   `JWT_AUDIENCE` matching the API identifier, and
   `JWT_JWKS_URL=https://YOUR_DOMAIN/.well-known/jwks.json`.
   The restaurants service also needs its own server-side `GOOGLE_PLACES_API_KEY`
   with Places API (New) enabled. Restrict keys appropriately for each client/server.
6. Apply the companion backend PR's migrations before running the new flow.

Access tokens are stored in SecureStore on native and memory only on web. An expired
session requires sign-in again; refresh tokens are not requested. Sign out clears
the app session; login explicitly prompts for authentication again. Drafts are
not persisted across closing the screen or restarting the app.

## Validation

Run `npx tsc --noEmit` and `npx expo export --platform all` from `messy-app`.
Manual acceptance: select a restaurant, verify empty rating/text cannot submit,
sign in, simulate a network failure, retry, confirm one saved review and restaurant
name on Home. Cancel prompts before discarding a written draft.

Auth0 tenant/application setup and live Google credentials are external prerequisites.
Browser smoke testing can mock these providers; it does not replace a real Auth0
tenant test or physical-device verification.

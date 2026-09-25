# Restaurant review flow

Sign in or create an account with Auth0, then complete your display-name profile.
The app protects all tabs and review routes until both steps finish, including
direct links. Valid stored native sessions are restored; sign-out or token expiry
returns to the authentication screen. The OAuth callback remains accessible.
The Create an account button opens Auth0 Universal Login's signup screen; enable
signup on the application's Auth0 connection to accept new accounts.

Tap **+**, search with the existing Google Places autocomplete, select a restaurant,
choose 1–5 stars, and write a review. The backend
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

After login (including a restored session), the app loads `GET /users/me`. A missing
profile prompts for a public display name, then `PUT /users/me` creates it using the
identity verified by the backend. Returning users keep their existing name and bio.
Profile requests can be retried without signing in again unless the token is expired.
The review form requires a loaded profile before posting and preserves the draft
during setup. This is a frontend onboarding requirement; the reviews API still
authenticates authors independently and does not enforce profile existence.

Run the authentication regression checks with `node --test scripts/*.test.cjs`
from `messy-app`.

## Validation

Run `npx tsc --noEmit` and `npx expo export --platform all` from `messy-app`.
Manual acceptance: select a restaurant, verify empty rating/text cannot submit,
sign in, simulate a network failure, retry, confirm one saved review and restaurant
name on Home. Cancel prompts before discarding a written draft.

Auth0 tenant/application setup and live Google credentials are external prerequisites.
Browser smoke testing can mock these providers; it does not replace a real Auth0
tenant test or physical-device verification.

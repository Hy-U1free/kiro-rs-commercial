# Microsoft External IdP Credential Support Design

## Goal

Allow credentials exported from Kiro IDE Microsoft external IdP login to be imported, refreshed, persisted, and used without requiring an IdC `clientSecret`.

## Problem

The current manager supports two refresh paths:

- `social`: posts `refreshToken` to Kiro's desktop auth refresh endpoint.
- `idc`: posts `clientId`, `clientSecret`, and `refreshToken` to AWS SSO OIDC.

Microsoft external IdP credentials are a third flow. They include `authMethod: "external_idp"`, `clientId`, `tokenEndpoint`, and `scopes`, but they do not include `clientSecret`. The current admin UI sees `clientId` without `clientSecret` and reports that IdC mode needs both fields. If the credential is coerced to Social, the backend refreshes against the wrong endpoint and receives 401.

## Approach

Add `external_idp` as a first-class authentication method while preserving existing `social`, `idc`, `builder-id`, and `iam` behavior.

The credential model will persist these additional optional fields:

- `tokenEndpoint`: OAuth token endpoint, for example `https://login.microsoftonline.com/<tenant>/oauth2/v2.0/token`.
- `scopes`: OAuth scope string sent during refresh.
- `issuerUrl`: optional metadata retained from Kiro export.
- `provider`: optional metadata retained from Kiro export, typically `ExternalIdp`.

The backend refresh dispatcher will route `authMethod: "external_idp"` to a new Microsoft-compatible OAuth refresh function. This function will send an `application/x-www-form-urlencoded` request to `tokenEndpoint` with:

- `client_id`
- `grant_type=refresh_token`
- `refresh_token`
- `scope`, when provided

It will read `access_token`, optional rotated `refresh_token`, optional `expires_in`, and optional `token_type`. Existing refresh-token validation and proxy handling will still apply.

## Admin API And UI

Admin add/update request types will accept `tokenEndpoint`, `scopes`, `issuerUrl`, and `provider`.

The add/edit credential dialogs will include an `External IdP` auth method. For that mode:

- `clientId` is required.
- `tokenEndpoint` is required.
- `clientSecret` is not required and is not shown as required.
- `scopes` is optional, but imported Kiro exports should carry it through when present.

Batch import and KAM import will honor an explicit `authMethod: "external_idp"` or `provider: "ExternalIdp"`. They will send the external IdP fields to the backend instead of trying to infer IdC from `clientId`.

## Error Handling

Missing external IdP fields will produce local validation errors:

- Missing `clientId`: `External IdP 刷新需要 clientId`
- Missing `tokenEndpoint`: `External IdP 刷新需要 tokenEndpoint`

HTTP refresh failures will be classified similarly to existing upstream credential failures. A Microsoft 401 will clearly mean the external IdP refresh token is expired or invalid and needs reauthentication.

## Compatibility

Existing credentials continue to work:

- Existing `social` credentials still use the Kiro Social refresh endpoint.
- Existing `idc`, `builder-id`, and `iam` credentials still use AWS SSO OIDC and require `clientSecret`.
- Credentials with no `authMethod` keep the current inference behavior: both `clientId` and `clientSecret` means IdC; otherwise Social.

## Testing

Backend tests will cover:

- Deserializing and serializing external IdP fields.
- Dispatching `external_idp` to the external IdP refresh path.
- Sending form-encoded Microsoft OAuth refresh requests.
- Preserving rotated refresh tokens and computed `expiresAt`.
- Keeping existing Social and IdC endpoint behavior unchanged.

Frontend verification will cover:

- TypeScript build/typecheck.
- Import logic accepts external IdP credentials without `clientSecret`.
- Add/edit UI sends external IdP fields.


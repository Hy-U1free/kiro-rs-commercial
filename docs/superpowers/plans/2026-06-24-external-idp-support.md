# External IdP Credential Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add first-class Microsoft `external_idp` credential import and refresh support without breaking existing Social and IdC credentials.

**Architecture:** Extend the existing credential struct and admin request types with optional external IdP metadata, then route `authMethod: "external_idp"` to a dedicated OAuth form refresh function. Keep existing Social/IdC inference unchanged for credentials that do not explicitly declare external IdP.

**Tech Stack:** Rust 2024, Tokio, Reqwest, Serde, Chrono, React, TypeScript, Vite.

---

### Task 1: Backend Credential Model And Refresh Logic

**Files:**
- Modify: `src/kiro/model/credentials.rs`
- Modify: `src/kiro/model/token_refresh.rs`
- Modify: `src/kiro/token_manager.rs`

- [ ] **Step 1: Add failing credential model tests**

Add a test in `src/kiro/model/credentials.rs` that deserializes:

```json
{
  "refreshToken": "test_refresh",
  "authMethod": "external_idp",
  "clientId": "client-123",
  "tokenEndpoint": "https://login.microsoftonline.com/tenant/oauth2/v2.0/token",
  "scopes": "api://example/.default offline_access",
  "issuerUrl": "https://login.microsoftonline.com/tenant/v2.0",
  "provider": "ExternalIdp"
}
```

Assert that `auth_method`, `client_id`, `token_endpoint`, `scopes`, `issuer_url`, and `provider` are preserved.

- [ ] **Step 2: Run model test and verify red**

Run: `cargo test kiro::model::credentials::tests::test_deserialize_external_idp_credentials -- --nocapture`

Expected: FAIL because `KiroCredentials` does not yet have the external IdP fields.

- [ ] **Step 3: Add external IdP fields**

Add optional `token_endpoint`, `scopes`, `issuer_url`, and `provider` fields to `KiroCredentials` with camelCase serde mapping.

- [ ] **Step 4: Run model test and verify green**

Run: `cargo test kiro::model::credentials::tests::test_deserialize_external_idp_credentials -- --nocapture`

Expected: PASS.

- [ ] **Step 5: Add failing refresh tests**

Add backend tests in `src/kiro/token_manager.rs` for:

- `external_idp` auth method is detected by helper logic.
- External IdP validation rejects missing `clientId`.
- External IdP validation rejects missing `tokenEndpoint`.
- Form body construction includes `client_id`, `grant_type=refresh_token`, `refresh_token`, and optional `scope`.

- [ ] **Step 6: Run refresh tests and verify red**

Run: `cargo test external_idp -- --nocapture`

Expected: FAIL because helpers and refresh logic do not exist.

- [ ] **Step 7: Implement external IdP refresh path**

Implement:

- Auth method canonicalization preserves `external_idp`.
- Dispatcher routes `external_idp` to `refresh_external_idp_token`.
- `ExternalIdpRefreshResponse` response model.
- Validation for `clientId` and `tokenEndpoint`.
- Form-encoded request to the credential `tokenEndpoint`.
- Update of `accessToken`, rotated `refreshToken`, and `expiresAt`.

- [ ] **Step 8: Run backend targeted tests**

Run: `cargo test external_idp -- --nocapture`

Expected: PASS.

### Task 2: Admin API Persistence

**Files:**
- Modify: `src/admin/types.rs`
- Modify: `src/kiro/token_manager.rs`

- [ ] **Step 1: Add failing API field propagation tests**

Add tests around `AddCredentialRequest` or `KiroCredentials` construction showing `tokenEndpoint`, `scopes`, `issuerUrl`, and `provider` can flow from admin request into stored credentials.

- [ ] **Step 2: Run propagation tests and verify red**

Run: `cargo test admin_external_idp -- --nocapture`

Expected: FAIL because request types and update application do not include external IdP fields.

- [ ] **Step 3: Extend admin request types and persistence**

Add optional external IdP fields to add/update request types and copy them in:

- `add_credential`
- update revalidation temporary credential
- `apply_update_fields`

- [ ] **Step 4: Run propagation tests and verify green**

Run: `cargo test admin_external_idp -- --nocapture`

Expected: PASS.

### Task 3: Admin UI Import And Forms

**Files:**
- Modify: `admin-ui/src/types/api.ts`
- Modify: `admin-ui/src/components/add-credential-dialog.tsx`
- Modify: `admin-ui/src/components/edit-credential-dialog.tsx`
- Modify: `admin-ui/src/components/batch-import-dialog.tsx`
- Modify: `admin-ui/src/components/kam-import-dialog.tsx`

- [ ] **Step 1: Extend TypeScript API types**

Add `external_idp` to the add request auth method union and add optional `tokenEndpoint`, `scopes`, `issuerUrl`, and `provider`.

- [ ] **Step 2: Update add credential form**

Add `External IdP` as an auth method. Require `clientId` and `tokenEndpoint` for this method, carry `scopes`, `issuerUrl`, and `provider`, and keep `clientSecret` required only for `idc`.

- [ ] **Step 3: Update edit credential form**

Allow editing external IdP fields. Preserve existing behavior for Social/IdC.

- [ ] **Step 4: Update batch import inference**

If input has `authMethod: "external_idp"` or `provider: "ExternalIdp"`, send `authMethod: "external_idp"` and pass external IdP fields without requiring `clientSecret`.

- [ ] **Step 5: Update KAM import inference**

Apply the same external IdP inference to KAM import and carry nested/flat external IdP fields.

- [ ] **Step 6: Run admin UI build**

Run: `npm install` in `admin-ui` if dependencies are missing, then `npm run build`.

Expected: TypeScript and Vite build succeed.

### Task 4: Documentation And Verification

**Files:**
- Modify: `README.md`
- Add: `credentials.example.external_idp.json`

- [ ] **Step 1: Add example credential file**

Create `credentials.example.external_idp.json` with safe example Microsoft external IdP values.

- [ ] **Step 2: Update README**

Document `authMethod: "external_idp"` and the fields `tokenEndpoint`, `scopes`, `issuerUrl`, and `provider`.

- [ ] **Step 3: Run full backend verification**

Run: `cargo test`

Expected: All Rust tests pass.

- [ ] **Step 4: Run admin UI verification**

Run: `npm run build` in `admin-ui`.

Expected: Build succeeds.

- [ ] **Step 5: Review git diff**

Run: `git diff --stat` and inspect modified files for secrets or accidental token output.

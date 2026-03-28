# E2E Tests — Notes

This folder contains Playwright E2E tests for Sommelier Arena.

## Local Playwright browser installation behind a corporate TLS proxy

If your network performs TLS interception (corporate proxy like Zscaler), Playwright's browser downloads may fail with TLS errors. The recommended approach is to provide your organization's root CA to Node for the single install command.

1. Convert your org certificate (DER `.cer` or `.crt`) to PEM if needed:

```bash
openssl x509 -in "/path/to/org-root-ca.cer" -inform DER -out "/path/to/org-root-ca.pem" -outform PEM
```

1. Run the Playwright installer from this directory while trusting the PEM file (one-off):

```bash
cd e2e
NODE_EXTRA_CA_CERTS="/path/to/org-root-ca.pem" npx playwright install --with-deps
```

Notes:

- Use a full filesystem path for `NODE_EXTRA_CA_CERTS` (do not check the PEM into source control).
- If you are behind an HTTP proxy, prefix the command with `HTTPS_PROXY="http://proxy:port"`.
- Avoid `NODE_TLS_REJECT_UNAUTHORIZED=0` in CI or shared environments — it disables TLS verification globally.

## Locator strict-mode changes

While running tests we observed Playwright strict-mode violations where `getByLabel('Wine name')` matched multiple inputs (the form contains many related inputs and sr-only labels). To make locators unambiguous we updated tests to use the exact label match:

```ts
// before
page.getByLabel('Wine name').fill('Test Wine');

// after
page.getByLabel('Wine name', { exact: true }).fill('Test Wine');
```

This keeps tests robust while avoiding brittle DOM selectors. If you prefer, you can scope locators further (e.g. by container `locator()` or `data-testid` attributes).

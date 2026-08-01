# OnPart Frontend

Static RTL frontend for the OnPart spare-parts platform.

## Local preview

Serve this directory with a local HTTP server. Opening files directly may break clean URLs and API behavior.

## Shared files

- js/api.js: API base URL, authentication headers, timeout and HTTP error handling.
- js/components.js: shared navigation, toast and server-backed cart helpers.
- css/style.css: shared visual styles.
- shop.html: product search, filters, quantities, cart and checkout.

## Release checklist

1. Check the syntax of js/api.js and js/components.js.
2. Test login, product search, quantity changes, cart synchronization and checkout.
3. Test desktop and mobile widths.
4. Commit and push through GitHub Desktop.
5. Verify the Liara deployment and hard-refresh the production site.

## Security

Treat API content as untrusted. Escape text before inserting it into innerHTML. Never commit tokens, passwords or environment files.

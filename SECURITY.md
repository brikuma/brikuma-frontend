# Frontend security boundary

This POC ships public/demo-safe static assets only. It does not provide authentication, authorization, cloud persistence, private delivery, payment, messaging or model-provider services. Do not place secrets, personal profiles, private designs or protected listings in the bundle.

Runtime requests must remain same-origin static requests. User references remain in memory: only PNG/JPEG/WebP image previews and PDF filename metadata are permitted; never inject SVG/HTML, parse PDFs, upload or log contents. Release image object URLs on removal/unmount/reset. Avoid arbitrary HTML insertion and dynamic code evaluation.

Audit both production and development dependency trees after resolution; relevant high/critical advisories block delivery. Review copied UI component source separately from package audits. Original project material uses MIT, with upstream terms retained. No public deployment is approved. Use [GitHub Private Vulnerability Reporting](https://github.com/brikuma/brikuma-frontend/security/advisories/new) after activation; until then that reporting channel is unavailable. Do not post private findings in public issues. See [global security policy](../SECURITY.md), [dependencies](docs/engineering/DEPENDENCIES.md) and [asset provenance](docs/references/README.md).

A future static host can set a restrictive Content-Security-Policy, `X-Content-Type-Options: nosniff`, Referrer-Policy and framing policy. Header configuration is deferred; no server is introduced to pretend these are already configured. Browser-local `blob:` previews must be accounted for when defining a future CSP.

Follow [privacy setup](PRIVACY.md) before contributing.

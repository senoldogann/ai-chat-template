# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not** open a public issue. Instead, please report it via email to:

**senoldogan02@hotmail.com**

Please include the following information in your report:

- Type of vulnerability (e.g., XSS, SQL injection, etc.)
- Full paths of source file(s) related to the vulnerability
- The location of the affected code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the vulnerability

We will acknowledge receipt of your vulnerability report and work with you to understand and resolve the issue quickly.

## Security Best Practices

When using this template:

1. **Never commit API keys or secrets** to version control
2. **Use environment variables** for sensitive configuration
3. **Keep dependencies updated** regularly
4. **Review security advisories** for dependencies
5. **Use HTTPS** in production
6. **Implement rate limiting** for API endpoints
7. **Validate and sanitize** all user inputs
8. **Use prepared statements** for database queries (Prisma handles this)
9. **Implement proper authentication** if adding user accounts
10. **Regular security audits** of your deployment

## Disclosure Policy

When the security team receives a security bug report, they will assign it to a primary handler. This person will coordinate the fix and release process, involving the following steps:

1. Confirm the problem and determine the affected versions
2. Audit code to find any potential similar problems
3. Prepare fixes for all releases still under maintenance
4. Publish security advisories for all affected versions

We appreciate your efforts to responsibly disclose your findings, and will make every effort to acknowledge your contributions.


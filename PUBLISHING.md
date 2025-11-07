# Publishing Guide

This guide explains how to publish the AI Chat Template as an npm package or GitHub template.

## Prerequisites

1. **npm Account**: Create an account at [npmjs.com](https://www.npmjs.com/)
2. **GitHub Repository**: Create a repository for the project
3. **Update package.json**: Update the following fields:
   - `name`: Your package name (must be unique on npm)
   - `author`: Your name and email
   - `repository.url`: Your GitHub repository URL
   - `homepage`: Your project homepage
   - `bugs.url`: Your GitHub issues URL

## Publishing to npm

### 1. Prepare the Package

1. **Update version in package.json**
   ```json
   {
     "version": "1.0.0"
   }
   ```

2. **Update README.md**
   - Replace `yourusername` with your GitHub username
   - Replace `your.email@example.com` with your email
   - Update repository URLs

3. **Update LICENSE**
   - Update copyright year and name if needed

4. **Test the package locally**
   ```bash
   npm pack
   # This creates a .tgz file you can test
   ```

### 2. Login to npm

```bash
npm login
# Enter your username, password, and email
```

### 3. Publish

```bash
# For first-time publishing
npm publish

# For updates (after version bump)
npm version patch  # or minor, or major
npm publish
```

### 4. Verify

Visit `https://www.npmjs.com/package/your-package-name` to verify your package is published.

## Publishing as GitHub Template

### 1. Create GitHub Repository

1. Go to GitHub and create a new repository
2. Name it `ai-chat-template` (or your preferred name)
3. Make it public (for template) or private (your choice)

### 2. Push Code

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/ai-chat-template.git
git push -u origin main
```

### 3. Mark as Template

1. Go to your repository settings
2. Scroll to "Template repository"
3. Check "Template repository"
4. Save

### 4. Create Releases

1. Go to "Releases" in your repository
2. Click "Create a new release"
3. Tag version: `v1.0.0`
4. Release title: `v1.0.0 - Initial Release`
5. Add release notes from CHANGELOG.md
6. Publish release

## Version Management

Use [Semantic Versioning](https://semver.org/):
- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (1.1.0): New features (backward compatible)
- **PATCH** (1.0.1): Bug fixes (backward compatible)

### Version Bumping

```bash
# Patch version (1.0.0 -> 1.0.1)
npm version patch

# Minor version (1.0.0 -> 1.1.0)
npm version minor

# Major version (1.0.0 -> 2.0.0)
npm version major
```

## Pre-Publish Checklist

- [ ] Update version in package.json
- [ ] Update CHANGELOG.md with new version
- [ ] Update README.md with correct URLs
- [ ] Test the package locally (`npm pack`)
- [ ] Run linting (`npm run lint`)
- [ ] Build the project (`npm run build`)
- [ ] Test installation (`npm install ./package-name-1.0.0.tgz`)
- [ ] Update LICENSE copyright year if needed
- [ ] Commit all changes
- [ ] Create git tag (`git tag v1.0.0`)
- [ ] Push tags (`git push --tags`)

## Post-Publish

1. **Create GitHub Release**
   - Tag the release
   - Add release notes
   - Attach any additional files

2. **Update Documentation**
   - Update README if needed
   - Update website/docs if you have one

3. **Announce**
   - Share on social media
   - Post on relevant forums
   - Update your website

## Troubleshooting

### Package Name Already Taken

If your package name is already taken:
1. Choose a different name
2. Use scoped package: `@yourusername/ai-chat-template`
3. Update package.json with new name

### Publishing Errors

- **403 Forbidden**: Check if you're logged in (`npm whoami`)
- **400 Bad Request**: Check package.json for errors
- **Version Already Exists**: Bump version number

### Unpublishing

⚠️ **Warning**: Unpublishing is only allowed within 72 hours of publishing.

```bash
npm unpublish package-name@version
# or
npm unpublish package-name --force  # Unpublish all versions
```

## Best Practices

1. **Always test locally** before publishing
2. **Use semantic versioning** consistently
3. **Keep CHANGELOG.md updated**
4. **Tag releases** in Git
5. **Write clear release notes**
6. **Test installation** from npm after publishing
7. **Monitor for issues** after publishing

## Resources

- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [Semantic Versioning](https://semver.org/)
- [Keep a Changelog](https://keepachangelog.com/)


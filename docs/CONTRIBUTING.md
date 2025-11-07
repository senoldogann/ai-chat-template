# Contributing to AI Chat Template

Thank you for your interest in contributing to AI Chat Template! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/senoldogann/ai-chat-template/issues)
2. If not, create a new issue with:
   - A clear, descriptive title
   - Steps to reproduce the bug
   - Expected behavior
   - Actual behavior
   - Screenshots (if applicable)
   - Environment details (OS, Node version, etc.)

### Suggesting Features

1. Check if the feature has already been suggested
2. Create a new issue with:
   - A clear, descriptive title
   - Detailed description of the feature
   - Use cases and examples
   - Potential implementation approach (if you have ideas)

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/senoldogann/ai-chat-template.git
   cd ai-chat-template
   ```

2. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add comments for complex logic
   - Update documentation if needed
   - Add tests if applicable

4. **Commit your changes**
   ```bash
   git commit -m "Add: description of your changes"
   ```
   
   Use conventional commit messages:
   - `Add:` for new features
   - `Fix:` for bug fixes
   - `Update:` for updates to existing features
   - `Refactor:` for code refactoring
   - `Docs:` for documentation changes

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Provide a clear description
   - Reference related issues
   - Add screenshots if UI changes

## Development Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Set up the database**
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Code Style

- Use TypeScript for all new code
- Follow existing code formatting (Prettier)
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Keep functions small and focused
- Use async/await instead of promises where possible

## Testing

- Test your changes thoroughly
- Test with different LLM providers if applicable
- Test edge cases and error handling
- Ensure no breaking changes (or document them)

## Documentation

- Update README.md if adding new features
- Add JSDoc comments for new functions
- Update API documentation if changing endpoints
- Add examples if adding new features

## Code Review Process

All pull requests require review before merging:

1. **Automated Checks**: All PRs must pass CI/CD pipeline (linting, type checking, build)
2. **Code Review**: At least one maintainer must review and approve the PR
3. **Testing**: Changes must be tested and working
4. **Documentation**: Documentation must be updated if needed

### Review Criteria

- Code follows project style and conventions
- Changes are well-tested
- No breaking changes (or properly documented)
- Documentation is updated
- Security considerations are addressed

## Questions?

If you have questions, feel free to:
- Open an issue with the `question` label
- Check existing issues and discussions
- Contact the maintainer: senoldogan02@hotmail.com

Thank you for contributing! 🎉


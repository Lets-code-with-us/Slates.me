# Contributing to Slate Pad

First off, thank you for considering contributing to Slate! It's people like you that make Slate such a great tool.

## Feature Highlights & Contribution Opportunities

### 1. Text Node Capabilities
Current features:
- Rich Markdown editing with syntax highlighting
- Real-time formatting controls (bold, italic, underline)
- Code block support with language detection
- Auto-save with visual feedback

Looking for contributors to:
- Implement LaTeX equation rendering
- Add support for diagrams (Mermaid, PlantUML)
- Create collaborative editing features
- Enhance code editing with IntelliSense-like features
- Add table of contents generation for long notes

### 2. Media Integration
Current features:
- Support for images, videos, and PDFs
- PDF viewer with zoom/pan controls
- Progressive image loading
- Automatic file type detection

Looking for contributors to:
- Add audio file visualization
- Implement 3D model viewer (.glb, .obj files)
- Create better video player controls
- Add image editing capabilities
- Implement file compression options

### 3. Canvas Intelligence
Current features:
- Infinite canvas with zoom/pan
- Smart node placement
- Minimap navigation
- Advanced node search with filters

Looking for contributors to:
- Implement node grouping/folders
- Add custom canvas backgrounds
- Create node linking/relationship features
- Improve touch gestures and mobile experience
- Add canvas export/import functionality

### 4. Performance & Infrastructure
Current features:
- Efficient node virtualization
- Progressive loading
- Real-time updates
- Automatic file cleanup

Looking for contributors to:
- Implement WebAssembly for heavy computations
- Add offline support with ServiceWorker
- Create better error recovery mechanisms
- Improve canvas rendering performance
- Implement better caching strategies

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct:

- Use welcoming and inclusive language
- Be respectful of different viewpoints and experiences
- Accept constructive criticism gracefully
- Focus on what is best for the community
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check [existing issues](https://github.com/RavindranathTagor/slate-pad/issues) to avoid duplication. When you create a bug report, include as many details as possible:

- Use a clear and descriptive title
- Describe the exact steps to reproduce the problem
- Describe the behavior you observed and what behavior you expected
- Include screenshots if possible
- Mention your browser and operating system
- Include any relevant error messages from the console

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- Use a clear and descriptive title
- Provide a detailed description of the proposed functionality
- Include mockups or examples if applicable
- Explain why this enhancement would be useful
- Consider impact on existing features

### Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. If you've changed APIs, update the documentation
4. Ensure the test suite passes
5. Make sure your code follows the existing style
6. Include relevant issue numbers in your PR description

## Development Process

1. Set up your development environment:
   - Install Node.js 18+ or Bun
   - Install dependencies with \`npm install\` or \`bun install\`
   - Create a Supabase project and set up environment variables

2. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make your changes:
   - Follow the existing code style
   - Add comments for complex logic
   - Update types as needed
   - Keep commits atomic and meaningful

4. Test your changes:
   - Ensure existing features still work
   - Test on different browsers
   - Check both light and dark themes
   - Verify mobile responsiveness

5. Submit your PR:
   - Fill out the PR template completely
   - Link relevant issues
   - Add screenshots for UI changes
   - Request review from maintainers

## Style Guide

### TypeScript

- Use TypeScript for all new code
- Define proper interfaces and types
- Avoid \`any\` type unless absolutely necessary
- Use functional components with hooks

### React Components

- One component per file
- Use named exports
- Implement proper prop types
- Follow component folder structure

### CSS/Styling

- Use Tailwind CSS classes
- Follow mobile-first approach
- Support both light and dark themes
- Use CSS variables for theming

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters
- Reference issues and pull requests liberally

## File Structure

```
src/
├── components/      # React components
├── hooks/          # Custom React hooks
├── lib/            # Utility functions
├── types/          # TypeScript types
└── pages/          # Page components
```

## Questions?

Feel free to reach out to the maintainers if you have any questions. We're here to help!
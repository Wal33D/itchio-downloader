# Contributing

Thank you for taking the time to contribute! This project uses **Node.js 20.19+, 22.12+, or a newer supported release** and pnpm 9.

## Install Dependencies

Use pnpm to install development dependencies:

```bash
pnpm install
```

## Run Tests

Run the lint and Jest test suite before opening a pull request:

```bash
pnpm run lint
pnpm test
pnpm run build
pnpm audit --audit-level high
```

Format code with Prettier before committing:

```bash
pnpm run format
```

## Submit Pull Requests

1. Fork the repository and create a topic branch.
2. Commit your changes with clear messages (imperative present tense) and push to your fork.
3. Open a pull request against the `master` branch and describe your changes.

We appreciate any fixes or improvements!

For additional information about how the project works, see the [README](README.md) and the documentation in the `docs/` folder. The [Debugging guide](docs/Debugging.md) lists common troubleshooting steps.

# Para-Po Codespace

This environment reproduces the inventoried Linux development tools,  local skills, Codex plugins, Claude plugins, and compatible VS Code extensions. The manifest is `local-inventory.json`. Skills and Codex plugins are snapshots of installed packages, including their supporting resources; original notices remain inside the archives. Account credentials and private machine configuration are not included.

The image installs Node 22, Bun, Codex, Claude Code, Devin, Antigravity CLI (`agy`), Vercel, EAS, Expo Doctor, Expo tunnel support, uv, Python, document utilities and build tools. Features provide GitHub CLI and Docker. Setup installs Supabase, runs `npm ci`, and creates `.venv` with CPU TensorFlow and document libraries. Expo CLI comes from the project's SDK 57 dependency. Antigravity supports [headless CLI use](https://www.antigravity.google/docs/cli/install/).

Open this repository in Codespaces using `.devcontainer/devcontainer.json`. Setup ends with tool checks, lint and TypeScript checks. Run `bash .devcontainer/verify.sh` to repeat verification. Plugin installation failures are recorded in `plugin-install-results.json`; retry with `node .devcontainer/install-plugins.cjs` after authentication.

Sign in using `codex login`, `claude`, `devin`, `vercel login`, `supabase login` and `eas login` as needed. Reconnect app-backed plugins through their supported account flow. CLI installation does not transfer ChatGPT's connected apps or their OAuth sessions. Put API tokens in GitHub Codespaces secrets rather than committing them. The memory database and observer credentials are not migrated.

For the browser preview, run `npm run web` and open forwarded port 8081. For a phone development build, run `npx expo start --dev-client --tunnel`. This app's custom native modules require a development build; use `npx eas-cli@latest build --profile development` once an EAS development profile is configured. See [Expo CLI](https://docs.expo.dev/more/expo-cli/).

Codespaces is Linux: iOS simulators, local laptop hardware scripts, desktop applications such as Antigravity, and Windows/WSL host extensions cannot be reproduced here. Standard Codespaces has no CUDA GPU; model training runs on CPU. VS Code may mark some desktop-only extensions unavailable in the browser. Package installers use current versions except the inventoried Vercel version and project lockfile; skills and Codex plugin payloads are local snapshots.

Private account-synced skills can be transferred to `/workspaces/.para-po-private-skills.tar.gz`. Setup restores this archive on rebuild and links the skills to each assistant's skill directory. This file stays outside the repository.

The `.devcontainer` files are a [repository dev container configuration](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration/introduction-to-dev-containers), so future Codespaces receive the same setup.

#!/usr/bin/env bash
set -euo pipefail
export PATH="$HOME/.local/bin:$PATH"
for cli in node npm bun bunx git gh docker codex claude devin agy vercel eas supabase uv python3 rg jq ffmpeg pdftoppm tesseract libreoffice pandoc cmake; do
  command -v "$cli"
done
node -e 'const fs=require("fs");const i=require("./.devcontainer/local-inventory.json"); for(const s of i.skills) if(!fs.existsSync(process.env.HOME+"/.agents/skills/"+s+"/SKILL.md")) throw Error("Missing skill: "+s)'
npm run lint
npx --no-install tsc --noEmit

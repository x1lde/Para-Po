#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.local/bin:$PATH"
mkdir -p "$HOME/.agents/skills" "$HOME/.codex/skills" "$HOME/.claude/skills" "$HOME/.gemini/skills" "$HOME/.local/bin"
tar -xzf .devcontainer/skills.tar.gz -C "$HOME/.agents/skills"
# Keep privately transferred skills outside the repository, across rebuilds.
if [ -f /workspaces/.para-po-private-skills.tar.gz ]; then
  tar -xzf /workspaces/.para-po-private-skills.tar.gz -C "$HOME/.agents/skills"
fi
for skill in "$HOME/.agents/skills"/*; do
  name="$(basename "$skill")"
  ln -sfn "$skill" "$HOME/.codex/skills/$name"
  ln -sfn "$skill" "$HOME/.claude/skills/$name"
  ln -sfn "$skill" "$HOME/.gemini/skills/$name"
done

# Install the official Linux Supabase release (npm global install is unsupported).
architecture="$(uname -m)"
case "$architecture" in x86_64) architecture=amd64 ;; aarch64) architecture=arm64 ;; *) exit 1 ;; esac
release_dir="$(mktemp -d)"
curl -fsSL "https://github.com/supabase/cli/releases/latest/download/supabase_linux_${architecture}.tar.gz" -o "$release_dir/supabase.tar.gz"
tar -xzf "$release_dir/supabase.tar.gz" -C "$release_dir"
install -m 755 "$release_dir/supabase" "$HOME/.local/bin/supabase"

npm ci
uv venv --python 3.12 .venv
# Codespaces has no CUDA GPU; retain the repository's TensorFlow version range.
sed 's/tensorflow\[and-cuda\]/tensorflow/' ml/requirements.txt > /tmp/para-po-cpu-requirements.txt
uv pip install --python .venv/bin/python -r /tmp/para-po-cpu-requirements.txt
uv pip install --python .venv/bin/python python-docx openpyxl pypdf pdfplumber python-pptx reportlab
bash .devcontainer/verify.sh
node .devcontainer/install-plugins.cjs

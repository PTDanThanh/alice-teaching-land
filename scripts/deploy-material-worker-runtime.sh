#!/bin/zsh
set -euo pipefail

PROJECT_ROOT="${0:A:h:h}"
EXPECTED_PROJECT="/Users/phamthanh/Desktop/Project/learn-french/alice-teaching-land"
RUNTIME_DIR="/Users/phamthanh/Services/alice-material-worker"

if [[ "$PROJECT_ROOT" != "$EXPECTED_PROJECT" ]]; then
    print -u2 "Unexpected Alice Teaching Land source path: $PROJECT_ROOT"
    exit 1
fi

if [[ "$HOME/Services/alice-material-worker" != "$RUNTIME_DIR" ||
      -L "$HOME/Services" ||
      -L "$RUNTIME_DIR" ]]; then
    print -u2 "Refusing to deploy outside the dedicated Alice Worker runtime."
    exit 1
fi

if [[ ! -d "$RUNTIME_DIR" ||
      ! -f "$RUNTIME_DIR/package.json" ||
      ! -f "$RUNTIME_DIR/.env" ||
      -L "$RUNTIME_DIR/package.json" ||
      -L "$RUNTIME_DIR/.env" ]]; then
    print -u2 "The isolated Alice Worker runtime is missing or unsafe."
    exit 1
fi

if launchctl print "gui/$(id -u)/com.alice.material-worker" >/dev/null 2>&1; then
    print -u2 "Refusing to update the runtime while its LaunchAgent is loaded."
    exit 1
fi

if pgrep -f '^/opt/homebrew/bin/node .*scripts/material-scan-worker[.]ts$' >/dev/null 2>&1; then
    print -u2 "Refusing to update the runtime while a Worker process is running."
    exit 1
fi

typeset -a runtime_dirs=(
    scripts
    lib
    src
    src/models
)

for relative_dir in $runtime_dirs; do
    if [[ ! -d "$RUNTIME_DIR/$relative_dir" ||
          -L "$RUNTIME_DIR/$relative_dir" ]]; then
        print -u2 "Missing or unsafe runtime directory: $relative_dir"
        exit 1
    fi
done

typeset -a runtime_files=(
    scripts/material-scan-worker.ts
    lib/material-worker-mongodb.ts
    lib/material-clamav-scanner.ts
    lib/material-scan-worker-config.ts
    lib/material-scan-job.ts
    lib/material-file-promotion.ts
    lib/material-storage.ts
    lib/material-file-security.ts
    lib/material-malware-scanner.ts
    src/models/materialUpload.ts
    tsconfig.json
)

for relative_file in $runtime_files; do
    if [[ ! -f "$PROJECT_ROOT/$relative_file" ||
          -L "$PROJECT_ROOT/$relative_file" ||
          -L "$RUNTIME_DIR/$relative_file" ]]; then
        print -u2 "Missing or unsafe Worker source/target: $relative_file"
        exit 1
    fi
done

for relative_file in $runtime_files; do
    install -m 644 "$PROJECT_ROOT/$relative_file" "$RUNTIME_DIR/$relative_file"
done

print "Synced Alice Material Worker code to $RUNTIME_DIR (Worker not started)."

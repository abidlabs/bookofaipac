#!/usr/bin/env bash
set -euo pipefail
unset CI
IP="${REACT_NATIVE_PACKAGER_HOSTNAME:-}"
if [ -z "${IP}" ]; then
  IP="$(ipconfig getifaddr en0 2>/dev/null || true)"
fi
if [ -z "${IP}" ]; then
  IP="$(ipconfig getifaddr en1 2>/dev/null || true)"
fi
if [ -n "${IP}" ]; then
  export REACT_NATIVE_PACKAGER_HOSTNAME="${IP}"
fi
exec npx expo start --dev-client --host lan "$@"

#!/usr/bin/env python3
"""Start the local arcade with the same profile/save backend as the shared link."""
import os
from pathlib import Path
import sys

if __name__ == '__main__':
    root = Path(__file__).resolve().parent.parent
    env = {**os.environ, 'ARCADE_PORT': sys.argv[1] if len(sys.argv) > 1 else '8777'}
    os.chdir(root)
    os.execvpe('node', ['node', str(root / 'server/local.mjs')], env)

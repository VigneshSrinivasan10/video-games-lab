#!/usr/bin/env python3
"""Create private credentials for a fresh checkout without overwriting existing ones."""
import getpass
import hashlib
import json
import os
from pathlib import Path
import secrets


def main():
    directory = Path(__file__).resolve().parent.parent / '.hosting'
    destination = directory / 'auth.json'
    if destination.exists():
        raise SystemExit('Authentication already exists; keeping the current credentials.')
    password = getpass.getpass('Choose an arcade password (at least 12 characters): ')
    if len(password) < 12 or len(password) > 128:
        raise SystemExit('Use between 12 and 128 characters.')
    if password != getpass.getpass('Confirm password: '):
        raise SystemExit('Passwords did not match.')
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=salt.encode(), n=16384, r=8, p=1, dklen=64)
    credentials = {'salt': salt, 'hash': digest.hex(), 'secret': secrets.token_hex(32)}
    directory.mkdir(mode=0o700, parents=True, exist_ok=True)
    descriptor = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, 'w') as output:
        json.dump(credentials, output)
        output.write('\n')
    print('Created private authentication in .hosting/auth.json. Keep this directory out of Git.')


if __name__ == '__main__':
    main()

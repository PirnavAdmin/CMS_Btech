"""Read-only integration checks. Set CMS_BASE_URL, CMS_SUPERADMIN_TOKEN,
CMS_COLLEGEADMIN_TOKEN and CMS_OTHER_ROLE_TOKEN in your local environment.
Tokens are never printed. Requires Python 3; no third-party packages.
"""
import json
import os
import urllib.request
import urllib.error

base = os.environ['CMS_BASE_URL'].rstrip('/')
paths = ['/api/v1/admin/users', '/api/v1/admin/users/lookups']

def get(path, token=None):
    headers = {'ngrok-skip-browser-warning': 'true'}
    if token:
        headers['Authorization'] = 'Bearer ' + token
    try:
        with urllib.request.urlopen(urllib.request.Request(base + path, headers=headers), timeout=30) as response:
            return response.status, json.load(response)
    except urllib.error.HTTPError as exc:
        return exc.code, None

super_token = os.environ['CMS_SUPERADMIN_TOKEN']
status, body = get('/api/auth/me/access', super_token)
assert status == 200, ('access', status)
assert body['data']['buildId'] == 'cms-backend-20261103-password-setup-route-r7'
assert body['data']['isSuperAdmin'] is True
assert body['data']['academicYearScope'] == 'all-selected-colleges'
for path in paths:
    status, body = get(path, super_token)
    assert status == 200 and body['success'] is True, (path, status)
    if path.endswith('/lookups'):
        assert all(key in body['data'] for key in ('colleges', 'roles', 'statuses'))
    else:
        assert 'items' in body['data'] and 'totalCount' in body['data']
        assert 'password' not in json.dumps(body).lower()
    print('PASS: Super Admin', path)
    status, _ = get(path)
    assert status == 401, ('anonymous', path, status)
    for key in ('CMS_COLLEGEADMIN_TOKEN', 'CMS_OTHER_ROLE_TOKEN'):
        status, _ = get(path, os.environ[key])
        assert status == 403, (key, path, status)
print('PASS: build, Super Admin reads, anonymous rejection, other-role rejection')

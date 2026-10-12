import sys

# 1. Update limits.conf
with open('/etc/security/limits.conf', 'r') as f:
    limits = f.read()

if '65535' not in limits:
    with open('/etc/security/limits.conf', 'a') as f:
        f.write('\n* soft nofile 65535\n* hard nofile 65535\nroot soft nofile 65535\nroot hard nofile 65535\nnginx soft nofile 65535\nnginx hard nofile 65535\n')

# 2. Update nginx.conf
with open('/etc/nginx/nginx.conf', 'r') as f:
    nginx_cfg = f.read()

if 'worker_rlimit_nofile' not in nginx_cfg:
    nginx_cfg = nginx_cfg.replace('worker_processes auto;', 'worker_processes auto;\nworker_rlimit_nofile 65535;')

if 'worker_connections 1024;' in nginx_cfg:
    nginx_cfg = nginx_cfg.replace('worker_connections 1024;', 'worker_connections 4096;\n    multi_accept on;\n    use epoll;')

with open('/etc/nginx/nginx.conf', 'w') as f:
    f.write(nginx_cfg)

print('Updated nginx.conf and limits.conf successfully.')

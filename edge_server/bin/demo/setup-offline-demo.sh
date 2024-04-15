#!/bin/bash
set -e

echo "This script will set up your edge server installation for the offline demo. This should be run only once, and not in production."
echo ""

if grep -q proxy docker-compose.yml; then
  echo "Error: this script must be run in the root of the edge server directory, and only once."
  exit 1
fi


sed -n '1h;1!H;${g;s/ *ports:\n *- "80:80"\n *- "27021:27021"\n//;p;}' docker-compose.yml > tmp 

sed "3i\\
  proxy-80:\\
    image: hpello/tcp-proxy\\
    depends_on:\\
      - sync_server\\
    ports:\\
      - \"80:80\"\\
    networks:\\
      - default\\
      - internal\\
    command: sync_server 80\\
\\
  proxy-27021:\\
    image: hpello/tcp-proxy\\
    depends_on:\\
      - sync_server\\
    ports:\\
      - \"27021:27021\"\\
    networks:\\
      - default\\
      - internal\\
    command: sync_server 27021\\
\\
" tmp > tmp2

mv tmp2 docker-compose.yml
rm tmp

echo "Edge server offline demo set up successfully"

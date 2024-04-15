#!/bin/bash

if [ "$1" = "disable" ]; then
	docker network disconnect edge_server_default `docker ps --format '{{.Names}}' | grep sync_server`

	echo "Container is disconnected from the internet."

elif [ "$1" = "enable" ]; then
	docker network connect edge_server_default `docker ps --format '{{.Names}}' | grep sync_server`

	echo "Container is reconnected to the internet."
else
	echo "usage $0 [enable/disable]"
	exit 1
fi

build/edge_config.json docker-compose.yml: config.json
	mkdir -p build

	cat templates/config.tmpl | jq --argjson config '$(shell cat config.json)' \
		".edge.clientAppId = \$$config.clientAppId | \
		.edge.cloudSyncServerAuthSecret = \$$config.cloudSyncServerAuthSecret | \
		if \$$config.mongoDBURI \
		then .applog.store.urisByProviderRegion.\"aws-us-east-1\" = \$$config.mongoDBURI |\
			.db.mongoDBURIs.GLOBAL = \$$config.mongoDBURI |\
			.db.mongoDBURIs.LOCAL = \$$config.mongoDBURI \
		else . end | \
		.api.tls = \$$config.tls | \
		.edge.query = \$$config.query | \
        .edge.cloudSyncServerBaseURL = \$$config.cloudSyncServerBaseURL | \
        .edge.cloudTimeoutSeconds = \$$config.cloudTimeoutSeconds" > build/edge_config.json

	sed 's/80:/$(shell cat config.json | jq -r ".httpListenPort // 80 | if . == \"\" then 80 else . end"):/g' templates/docker-compose.tmpl > templates/docker-compose-tmp.tmpl
	sed 's/27021:/$(shell cat config.json | jq -r ".wireprotocolListenPort // 27021 | if . == \"\" then 27021 else . end"):/g' templates/docker-compose-tmp.tmpl > templates/docker-compose-tmp-1.tmpl && \
	mv templates/docker-compose-tmp-1.tmpl templates/docker-compose-tmp.tmpl

	sed 's/PLACEHOLDER_APP_ID/$(shell cat config.json | jq -r .clientAppId)/g' templates/docker-compose-tmp.tmpl > templates/docker-compose-tmp-1.tmpl && \
	mv templates/docker-compose-tmp-1.tmpl templates/docker-compose-tmp.tmpl
	sed 's/PLACEHOLDER_EDGE_TOKEN/$(shell cat config.json | jq -r .cloudSyncServerAuthSecret)/g' templates/docker-compose-tmp.tmpl > docker-compose.yml && \
	rm templates/docker-compose-tmp.tmpl

.PHONY: config
config: build/edge_config.json docker-compose.yml

.PHONY: status
status:
	@ ./bin/get_edge_status.sh

.PHONY: start up stop down clean
start up: config
	docker-compose up -d
stop down:
	docker-compose stop
clean: stop
	rm -rf build
	# remove containers and anonymous volumes
	docker-compose rm -vf
	# remove mongodb data volume if it exists
	-docker volume rm -f $$(docker volume ls | grep _mongodb_data_container | awk '{print $$2}')
	# remove edge logs volume if it exists
	-docker volume rm -f $$(docker volume ls | grep _edge_logs | awk '{print $$2}')

.PHONY: upgrade-minor upgrade-major upgrade-force
upgrade-minor: bin/upgrade.sh
	@ ./bin/upgrade.sh --minor
upgrade-major: bin/upgrade.sh
	@ ./bin/upgrade.sh --major
upgrade-force: bin/upgrade.sh
	@ ./bin/upgrade.sh --latest

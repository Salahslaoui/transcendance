all: up

up:
	docker compose up -d

build:
	docker compose build

down:
	docker compose down

start:
	docker compose start

stop:
	docker compose stop

ps:
	docker compose ps

logs:
	docker compose logs -f

clean:
	docker system prune -a --volumes -f

fclean: clean
	docker rmi frontend:v1 backend:v1 nginx:v1 redis:8.2.3-alpine 2>/dev/null || true

re: fclean up

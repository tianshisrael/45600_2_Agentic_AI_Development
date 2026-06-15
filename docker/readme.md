Building Image
docker build -t [IMAGE_NAME] [CONTEXT_FOLDER_DOCKERFILE_LOCATION]

Running the container
docker run [IMAGE_NAME]

Stopping the container
docker stop [CONTAINER_NAME]

Removing the container
docker rm [CONTAINER_NAME]

Listing containers
docker ps
docker ps -a

# Ex

1. Run the api project using docker commands
2. Change the HTML page inside the container and browse to localhost:3005

- Build the api image
  docker build -t express-docker-api ./api
- Run the api container
  docker run --rm -p 3005:3005 --name express-api express-docker-api
- Browse to http://localhost:3005
- Run docker exec -it express-api sh
- Run vi public/index.html inside the container
- Change the content and save the file :wq!
- Stop the container
  docker stop express-api

git reset --hard HEAD
git pull 
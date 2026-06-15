Building Image
docker build -t [IMAGE_NAME] [CONTEXT_FOLDER_DOCKERFILE_LOCATION]

Running the container
docker run [IMAGE_NAME]

# Ex

1. Run the api project using docker commands
2. Change the HTML page inside the container and browse to localhost:3005

- Run docker exec -it [CONTAINER_ID] sh
- Run vi index.html inside the container
- Change the content and save the file :wq!

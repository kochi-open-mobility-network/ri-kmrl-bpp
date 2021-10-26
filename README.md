# KMRL BPP

### Docker build
docker build . -t metro-bpp

### Docker run
docker run -p 8000:8000 --name metro --env MAPS_KEY=<<key>> metro-bpp
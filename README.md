# KMRL BPP

### Docker build
docker build . -t metro-bpp

### Docker run
docker run -p 8000:8000 --name metro --env MAPS_KEY=< key > metro-bpp

#### Env Variables
    MAPS_KEY : Google maps API key for location matrix API
    sign_public_key : Signing public key
    sign_private_key : Signing public key
    bpp_id 
    bpp_uri
    registry_url
    unique_key_id
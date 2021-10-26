# KMRL BPP

### Docker build
docker build . -t metro-bpp

### Docker run
docker run -p 8000:8000 --name metro --env MAPS_KEY=< key > metro-bpp

#### Other environment variables and default values if no value is passed :
    bpp_id: 'metro-bpp'
    bpp_uri: 'https://metro-bpp.com/'
    registry_url: 'https://beckn-one.succinct.in/subscribers/'
    unique_key_id: 'key1'
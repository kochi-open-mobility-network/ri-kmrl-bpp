# KMRL BPP Reference Implementation

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
    country : Default value set as "IND"
    domain: Default value set as "nic2004:60212"
    city: Default value set as ""
    core_version: Default value set as "0.9.1"
    
#### Optional
    THRESHOLD_DISTANCE_KM : Threshold to select next closest station (default: 0.50)
    MAX_STATIONS : Maximum number of nearest stations to return for a location (default:2)
    DISTANCE_LIMIT_KM : Maximum distance from which closest station should be returned (default:15)

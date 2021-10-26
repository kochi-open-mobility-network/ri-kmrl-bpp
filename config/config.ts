export const config = {
    THRESHOLD_DISTANCE_KM : 0.50,
    THRESHOLD_TIME_MIN : 3,
    USE_TIME_THRESHOLD : false, //Use time to determine close stops
    USE_MAPS_API : true, //Use Google maps API to determine close stops
    MAX_STATIONS : 2, //Maximum number of nearby stops to return for a location
    bpp_id: process.env.bpp_id || 'metro-bpp',
    bpp_uri: process.env.bpp_uri || 'https://metro-bpp.com/',
    registry_url: process.env.registry_url || 'https://beckn-one.succinct.in/subscribers/',
    unique_key_id: process.env.unique_key_id || 'key1',
    auth: true
}
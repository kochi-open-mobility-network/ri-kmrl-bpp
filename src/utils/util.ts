import _ from "lodash";
import { Request, response } from "express";
import { QueryTypes } from "sequelize";

import { Stops } from "../db/models/Stops.model";
const { config } = require("../../config/config");
import { sequelize } from "../db/index";
import { createAuthorizationHeader } from "./auth";
import { StopDataType } from "../schemas/stops.schema";
import axios from "axios";
import { StopTimeDataType, stopTimeSchema } from "../schemas/stopTime.schema";
import { ItemDataType, itemSchema } from "../schemas/item.schema";
import { FareDataType } from "../schemas/fare.schema";
import {
  FulfillmentDataType,
  fulfillmentSchehma,
} from "../schemas/fulfillment.schema";
import { LocationDataType } from "../schemas/location.schema";
import { writeFile, writeFileSync } from "fs";

export function combineURLs(baseURL: string, relativeURL: string) {
  return relativeURL
    ? baseURL.replace(/\/+$/, "") + "/" + relativeURL.replace(/^\/+/, "")
    : baseURL;
}

function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2 - lat1); // deg2rad below
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

const findClosestStops = async (gps: string): Promise<string[]> => {
  const lat1 = parseFloat(gps.split(",")[0]);
  const lon1 = parseFloat(gps.split(",")[1]);
  const stops = await getAllStations();
  var stops_obj: Array<StopDataType> = [];
  for (var stop of stops) {
    var stop_obj: any = stop.toJSON();
    const lat2 = parseFloat(stop.stop_lat);
    const lon2 = parseFloat(stop.stop_lon);
    const distance = getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2);
    stops_obj.push({
      ...stop_obj,
      distance,
    });
  }

  if (stops_obj.length == 0) {
    return [];
  }

  const sortedStops = _.sortBy(stops_obj, ["distance"]);
  const closestStop = sortedStops[0];
  var closestStopIds: Array<string> = [];
  closestStopIds.push(closestStop.stop_id);
  console.log(closestStop.stop_id, closestStop.distance, "kms away");
  if (closestStop.distance > config.DISTANCE_LIMIT_KM) {
    return [];
  }
  for (var this_stop of sortedStops.slice(1)) {
    if (
      this_stop.distance - closestStop.distance <
        config.THRESHOLD_DISTANCE_KM &&
      sortedStops.indexOf(this_stop) < config.MAX_STATIONS
    ) {
      closestStopIds.push(this_stop.stop_id);
      console.log(this_stop.stop_id, this_stop.distance, "kms away");
    } else {
      break;
    }
  }

  return closestStopIds;
};

const findClosestFromGMapsResponse = (sortedResponses: any): string[] => {
  const closestStop = sortedResponses[0];
  var closestStopIds: Array<string> = [];
  closestStopIds.push(closestStop.stop_id);
  console.log(
    "Closest is ",
    closestStop.stop_id,
    closestStop.distance.text,
    " and ",
    closestStop.duration.text,
    " away"
  );
  if (closestStop.distance.value / 1000 > config.DISTANCE_LIMIT_KM) {
    return [];
  }
  for (var stop of sortedResponses.slice(1)) {
    const threshold_passed = config.USE_TIME_THRESHOLD
      ? stop.duration.value / 60 - closestStop.duration.value / 60 <
        config.THRESHOLD_TIME_MIN
      : stop.distance.value / 1000 - closestStop.distance.value / 1000 <
        config.THRESHOLD_DISTANCE_KM;
    //console.log("Delta distance:", (stop.distance.value / 1000 - closestStop.distance.value / 1000),"Delta time:" ,(stop.duration.value / 60 - closestStop.duration.value / 60));
    if (
      threshold_passed &&
      sortedResponses.indexOf(stop) < config.MAX_STATIONS
    ) {
      closestStopIds.push(stop.stop_id);
      console.log(
        stop.stop_id,
        stop.distance.text,
        " and ",
        stop.duration.text,
        " away selected"
      );
    } else {
      break;
    }
  }
  return closestStopIds;
};

const findClosestStopsMaps = async (
  gpsStart: string,
  gpsEnd: string
): Promise<string[][]> => {
  try {
    const stops: any = await getAllStations();
    const origins = [gpsStart, gpsEnd].join("|");
    const destinations_array: Array<string> = [];
    for (var stop of stops) {
      destinations_array.push(`${stop.stop_lat},${stop.stop_lon}`);
    }
    const destinations = destinations_array.join("|");
    const response = await axios.get(
      "https://maps.googleapis.com/maps/api/distancematrix/json",
      {
        params: {
          destinations: destinations,
          origins: origins,
          key: process.env.MAPS_KEY,
          mode: "DRIVING",
        },
      }
    );
    if (response.data.status !== "OK") {
      console.log("Response from google maps:", response.data);
      throw "Maps API error";
    }

    const origin_distances = response.data.rows[0].elements;
    const destination_distances = response.data.rows[1].elements;

    for (var index in origin_distances) {
      origin_distances[index].stop_id = stops[index].stop_id;
    }
    for (var index in destination_distances) {
      destination_distances[index].stop_id = stops[index].stop_id;
    }
    const sorted_origin_distances = _.sortBy(origin_distances, [
      "distance.value",
    ]);
    const origin_stations = findClosestFromGMapsResponse(
      sorted_origin_distances
    );
    const sorted_destination_distances = _.sortBy(destination_distances, [
      "distance.value",
    ]);
    const destination_stations = findClosestFromGMapsResponse(
      sorted_destination_distances
    );
    return [origin_stations, destination_stations];
  } catch (error) {
    console.log(error);
    throw error;
  }
};

const validateGps = (gps: string): boolean => {
  if (gps.split(",").length !== 2) {
    return false;
  }
  var [lat, lon] = gps.split(",");
  var lat_val = parseFloat(lat);
  var lon_val = parseFloat(lon);
  if (
    !(!isNaN(lat_val) && !isNaN(lat as any) && lat_val <= 90 && lat_val >= -90)
  ) {
    return false;
  }
  if (
    !(
      !isNaN(lon_val) &&
      !isNaN(lon as any) &&
      lon_val <= 180 &&
      lon_val >= -180
    )
  ) {
    return false;
  }
  return true;
};

const validateInputs = (req: Request): string | null => {
  const body = req.body;
  const context = req.body.context;
  if (!context) {
    return "Context not found";
  }
  if (
    context.city != config.city ||
    context.domain != config.domain ||
    context.country != config.country ||
    context.core_version != config.core_version
  ) {
    return "Wrong value in context";
  }

  var start_received = false;
  var end_received = false;
  var start_gps_valid = true;
  var end_gps_valid = true;
  if (body.message?.intent?.fulfillment?.start?.location?.station_code) {
    start_received = true;
  }
  if (body.message?.intent?.fulfillment?.end?.location?.station_code) {
    end_received = true;
  }
  if (body.message?.intent?.fulfillment?.start?.location?.gps) {
    start_received = true;
    start_gps_valid = validateGps(
      body.message?.intent?.fulfillment?.start?.location?.gps
    );
  }
  if (body.message?.intent?.fulfillment?.end?.location?.gps) {
    end_received = true;
    end_gps_valid = validateGps(
      body.message?.intent?.fulfillment?.end?.location?.gps
    );
  }
  if (start_received && end_received && start_gps_valid && end_gps_valid) {
    return null;
  } else {
    return "Start and end locations not passed in expected format";
  }
};

const createOnSearch = async (req: Request): Promise<void> => {
  const body = req.body;
  var start_codes: Array<string> = [];
  var end_codes: Array<string> = [];
  if (body.message?.intent?.fulfillment?.start?.location?.station_code) {
    start_codes.push(
      body.message.intent.fulfillment.start.location.station_code
    );
  }
  if (body.message?.intent?.fulfillment?.end?.location?.station_code) {
    end_codes.push(body.message.intent.fulfillment.end.location.station_code);
  }

  const date = body.message?.intent?.fulfillment?.start?.time
    ? body.message?.intent?.fulfillment?.start?.time
    : new Date().toISOString();

  const callback_url =
    req.subscriber_type === "bg" ? req.subscriber_url : body.context.bap_uri;
  if (start_codes.length === 0 || end_codes.length === 0) {
    var start_location =
      body.message?.intent?.fulfillment?.start?.location?.gps;
    var end_location = body.message?.intent?.fulfillment?.end?.location?.gps;
    if (config.USE_MAPS_API) {
      try {
        console.log(
          req.body?.context?.transaction_id,
          "Received search parameter start location :",
          start_location
        );
        console.log(
          req.body?.context?.transaction_id,
          "Received search parameter end location :",
          end_location
        );
        [start_codes, end_codes] = await findClosestStopsMaps(
          start_location,
          end_location
        );
      } catch (e) {
        console.log(
          req.body?.context?.transaction_id,
          "MAPS API call failed. Using fallback algorithm"
        );
        start_codes = await findClosestStops(start_location);
        end_codes = await findClosestStops(end_location);
      }
    } else {
      if (start_codes.length === 0) {
        var start_location = body.message.intent.fulfillment.start.location.gps;
        console.log(
          req.body?.context?.transaction_id,
          "Received search parameter start location :",
          start_location
        );
        start_codes = await findClosestStops(start_location);
      }
      if (end_codes.length === 0) {
        var end_location = body.message.intent.fulfillment.end.location.gps;
        console.log(
          req.body?.context?.transaction_id,
          "Received search parameter end location :",
          end_location
        );
        end_codes = await findClosestStops(end_location);
      }
    }
  }
  console.log(req.body?.context?.transaction_id, "start stations");
  console.log(start_codes);
  console.log(req.body?.context?.transaction_id, "end stations");
  console.log(end_codes);
  if (start_codes.length === 0 || end_codes.length === 0) {
    console.log(req.body?.context?.transaction_id, "No routes found");
    return;
  }

  const items: Array<ItemDataType> = [];
  const fulfillments: Array<FulfillmentDataType> = [];

  const locationsMap = new Map<string, LocationDataType>();
  for (let location_code of start_codes) {
    const location: LocationDataType = await getLocationData(location_code);
    locationsMap.set(location_code, location);
  }
  for (let location_code of end_codes) {
    const location: LocationDataType = await getLocationData(location_code);
    locationsMap.set(location_code, location);
  }

  const locations: Array<LocationDataType> = Array.from(
    locationsMap,
    ([key, value]) => {
      return value;
    }
  );

  for (var start_code of start_codes) {
    for (var end_code of end_codes) {
      if (end_code == start_code) {
        continue;
      }

      const fare = await get_fare(start_code, end_code);
      const item = await buildItem(start_code, end_code, fare);
      items.push(item);

      const stopTimes = await get_stop_times(start_code, end_code, date);
      for (let stopTime of stopTimes) {
        const fulfillment = await buildFulfillment(
          start_code,
          end_code,
          locationsMap,
          stopTime
        );
        fulfillments.push(fulfillment);
      }
    }
  }

  if (items.length == 0) {
    return;
  }

  let response: any = {};
  response.context = body.context;
  response.context.action = "on_search";
  response.context.bpp_id = config.bpp_id;
  response.context.bpp_uri = config.bpp_uri;
  response.message = {
    catalog: {
      "bpp/descriptor": {
        name: "Kochi Metro Rail Ltd.",
      },
      "bpp/providers": [
        {
          id: "KMRL",
          descriptor: {
            name: "KMRL online",
          },
          locations: locations,
          items: items,
          fulfillments: fulfillments,
        },
      ],
    },
  };

  // // TODO: remove this on production...
  // try {
  //     writeFileSync('TestJSONs/developed_on_search.json', JSON.stringify(response));
  // } catch (error) {
  //     console.error(error);
  // }

  const url = combineURLs(callback_url, "/on_search");
  const axios_config = await createHeaderConfig(response);

  console.log(
    req.body?.context?.transaction_id,
    "Response body",
    JSON.stringify(response)
  );
  console.log(
    req.body?.context?.transaction_id,
    "Header",
    axios_config.headers
  );
  console.log(req.body?.context?.transaction_id, "Sending response to ", url);
  try {
    axios.post(url, response, axios_config);
  } catch (e) {
    console.log(e);
  }
};

const createHeaderConfig = async (request: any) => {
  const header = await createAuthorizationHeader(request);
  const axios_config = {
    headers: {
      Authorization: header,
    },
  };
  return axios_config;
};

const buildFulfillment = async (
  start_code: string,
  end_code: string,
  locationsMap: Map<string, LocationDataType>,
  stopTime: StopTimeDataType
): Promise<FulfillmentDataType> => {
  const startLocation = locationsMap.get(start_code);
  const endLocation = locationsMap.get(end_code);

  if (!startLocation || !endLocation) {
    throw new Error("Location not found");
  }

  const fulfillmentData: FulfillmentDataType = {
    id: `${start_code}_TO_${end_code}`,
    start: {
      location: startLocation,
      time: {
        timestamp: stopTime.arrival_time,
      },
    },
    end: {
      location: endLocation,
      time: {
        timestamp: stopTime.departure_time,
      },
    },
    vehicle: {
      category: "METRO",
    },
  };

  return fulfillmentSchehma.parse(fulfillmentData);
};

const buildItem = async (
  start_code: string,
  end_code: string,
  fare: FareDataType
): Promise<ItemDataType> => {
  const item: ItemDataType = {
    id: `SJT_${start_code}_TO_${end_code}`,
    descriptor: {
      code: "SJT",
      name: "Single Journey Ticket",
    },
    price: {
      value: fare.price,
      currency: "INR",
    },
    fulfillment_id: `${start_code}_TO_${end_code}`,
    matched: true,
  };

  return itemSchema.parse(item);
};

const getLocationData = async (code: string): Promise<LocationDataType> => {
  const station_details = await getStationDetails(code);
  const gps = `${station_details.stop_lat},${station_details.stop_lon}`;
  const name = station_details.stop_name;
  const location: LocationDataType = {
    id: code,
    descriptor: {
      name: name,
    },
    gps: gps,
    station_code: code,
  };

  return location;
};

const getStationDetails = async (code: string): Promise<Stops> => {
  const stop = await Stops.findOne({ where: { stop_id: code } });
  if (stop) {
    return stop;
  } else {
    throw "Stop not found";
  }
};

const getAllStations = async (): Promise<Stops[]> => {
  const stops = await Stops.findAll();
  return stops;
};

const get_stop_times = async (
  start_stop: string,
  end_stop: string,
  date: string
): Promise<Array<StopTimeDataType>> => {
  const date_obj = new Date(date);
  const date_ist = new Date(date_obj.getTime() - -330 * 60 * 1000);
  var weekday = new Array(7);
  weekday[0] = "sunday";
  weekday[1] = "monday";
  weekday[2] = "tuesday";
  weekday[3] = "wednesday";
  weekday[4] = "thursday";
  weekday[5] = "friday";
  weekday[6] = "saturday";
  const day = date_obj.getDay();
  var times = await sequelize.query(
    `SELECT DISTINCT ori.*, end.arrival_time as destination_time
                    FROM 'StopTimes' ori, 'StopTimes' end, 'Trips' trip, 'Calendars' cal
                    WHERE ori.trip_id = end.trip_id AND
                    ori.stop_sequence < end.stop_sequence AND
                    ori.trip_id = trip.trip_id AND
                    trip.service_id = cal.service_id AND
                    ('${date_ist
                      .toISOString()
                      .substring(
                        0,
                        10
                      )}' BETWEEN cal.start_date AND cal.end_date) AND
                    ori.stop_id = '${start_stop}' AND end.stop_id = '${end_stop}' AND
                    cal.${weekday[day]} = 1 order by ori.arrival_time`,
    { type: QueryTypes.SELECT }
  );

  const stopTimes: Array<StopTimeDataType> = [];
  for (var time of times) {
    time.arrival_time = new Date(
      date_ist.toISOString().substring(0, 10) +
        "T" +
        time.arrival_time +
        ".000+05:30"
    ).toISOString();
    time.departure_time = new Date(
      date_ist.toISOString().substring(0, 10) +
        "T" +
        time.departure_time +
        ".000+05:30"
    ).toISOString();
    time.destination_time = new Date(
      date_ist.toISOString().substring(0, 10) +
        "T" +
        time.destination_time +
        ".000+05:30"
    ).toISOString();

    const arrivalTime = Date.parse(time.arrival_time);
    if (arrivalTime >= date_obj.getTime()) {
      stopTimes.push(stopTimeSchema.parse(time));
    }
  }

  return stopTimes;
};

const get_fare = async (start: string, end: string): Promise<FareDataType> => {
  var fareObjs = await sequelize.query(
    `SELECT attr.*
                                        FROM 'FareRules' fare, 'FareAttributes' attr
                                        WHERE fare.fare_id = attr.fare_id AND
                                        fare.origin_id =  '${start}' AND 
                                        fare.destination_id = '${end}'`,
    { type: QueryTypes.SELECT }
  );
  if (fareObjs.length === 0) {
    throw "Fare rule not found";
  }

  const fare: FareDataType = {
    fare_id: fareObjs[0].fare_id,
    price: fareObjs[0].price,
    currency_type: fareObjs[0].currency_type,
    payment_method: fareObjs[0].payment_method,
    transfers: fareObjs[0].transfers,
    createdAt: fareObjs[0].createdAt,
    updatedAt: fareObjs[0].updatedAt,
  };

  return fare;
};

module.exports = { createOnSearch, validateInputs };

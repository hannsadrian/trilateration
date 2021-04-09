import ReactMapboxGl, { Layer, Feature, Marker } from "react-mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useState, useEffect } from "react";
import { calculate, Vector } from "weighted-positioning";

const Map = ReactMapboxGl({
  accessToken: process.env.REACT_APP_MAPBOX_TOKEN,
});

const metersToPixelsAtMaxZoom = (meters, latitude) =>
  meters / 0.075 / Math.cos((latitude * Math.PI) / 180);

function App() {
  let [addMode, setAddMode] = useState(false);
  let [editMode, setEditMode] = useState(false);
  let [wayPoints, setWayPoints] = useState([]);

  let [pos, setPos] = useState([0,0]);

  const addWayPoint = (map, event, index) => {
    setWayPoints((wps) => {
      wps.push({
        id: index,
        index: index,
        lat: event.lngLat.lat,
        lng: event.lngLat.lng,
        radius: 50,
      });
      return wps;
    });
    refresh();
    setTimeout(() => setAddMode(true), 100);
  };

  const reassignWayPoints = (newWayPoints, switchToEdit) => {
    setEditMode(switchToEdit);
    setWayPoints(newWayPoints);

    setTimeout(() => {
      for (let i = 0; i < newWayPoints.length; i++) {
        newWayPoints[i].index = i + 1;
      }
      setWayPoints(newWayPoints);
    }, 500);
  };

  const refresh = () => {
    setEditMode(true);
    setAddMode(true);
    setTimeout(() => {
      setEditMode(false);
      setAddMode(false);
    }, 50);
  };

  const calculatePos = () => {
    let beacons = [];

    wayPoints.forEach((wp) => {
      beacons.push({ v: new Vector(wp.lat, wp.lng), d: parseFloat(wp.radius) });
    });
    console.log(beacons);

    try {
      let pos = calculate(beacons);

      console.log("X: " + pos.x + "; Y: " + pos.y);
      setPos([pos.x, pos.y]);
    } catch (ignore) {}
  };

  return (
    <div>
      <div className="flex justify-center">
        <Map
          style="mapbox://styles/mapbox/streets-v9"
          containerStyle={{
            height: "70vh",
            width: "70vw",
          }}
          onClick={(_, event) => {
            console.log(event);
          }}
          onMouseDown={
            addMode &&
            ((map, event) => {
              setAddMode(false);
              addWayPoint(map, event, wayPoints.length + 1);
            })
          }
        >
          <Marker coordinates={[pos[1], pos[0]]} anchor="center" className="w-6 h-6">
            <img
              alt=""
              src={"https://rudder.cosmicsail.online/arrow_up.png"}
            />
          </Marker>

          {wayPoints.map((wp) => (
            <div key={wp.index}>
              <Layer
                id={"circle" + wp.index}
                type="circle"
                source={"waypoints"}
                paint={{
                  "circle-radius": {
                    stops: [
                      [0, 0],
                      [20, metersToPixelsAtMaxZoom(wp.radius, wp.lat)],
                      //[20, metersToPixelsAtMaxZoom(['get', 'radius'], 44)]
                    ],
                    base: 2,
                  },
                  "circle-color": "#007cbf",
                  "circle-opacity": 0.4,
                }}
              >
                <Feature coordinates={[wp.lng, wp.lat]} />
              </Layer>
              <Layer
                key={wp.id}
                type="symbol"
                layout={{
                  "icon-image": "harbor-15",
                  "icon-allow-overlap": true,
                  "text-field": wp.index.toString(),
                  "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                  "text-size": 11,
                  "text-transform": "uppercase",
                  "text-letter-spacing": 0.05,
                  "text-offset": [0, 1.5],
                }}
              >
                <Feature
                  draggable={!!editMode}
                  coordinates={[wp.lng, wp.lat]}
                  onDragEnd={(event) => {
                    if (event.lngLat)
                      setWayPoints((wps) => {
                        wps[wp.index - 1].lat = event.lngLat.lat;
                        wps[wp.index - 1].lng = event.lngLat.lng;
                        return wps;
                      });
                    refresh();
                    setTimeout(() => setEditMode(true), 100);
                  }}
                />
              </Layer>
            </div>
          ))}
        </Map>
      </div>
      <div className="flex justify-center w-full px-2 mt-2 mb-2 space-x-2 font-mono text-sm md:px-4 2xl:px-6">
        <button
          onClick={() => {
            setAddMode((a) => !a);
            if (!addMode) setEditMode(false);
          }}
          style={{ fontFamily: "monospace, Segoe UI Emoji" }}
          className={
            "px-2 py-1 bg-gray-300 dark:bg-gray-800 dark:text-gray-300 ring-orange-500 ring-0 hover:ring-2 transition duration-200 flex-none rounded " +
            (addMode && " ring-4 hover:ring-4 ")
          }
        >
          🗺 Add
        </button>
        <button
          onClick={() => {
            setEditMode((e) => !e);
            if (!editMode) setAddMode(false);
          }}
          className={
            "px-2 py-1 bg-gray-300 dark:bg-gray-800 dark:text-gray-300 ring-orange-500 ring-0 hover:ring-2 transition duration-200 rounded w-24 " +
            (editMode && "ring-4 hover:ring-4")
          }
        >
          Edit
        </button>
        <button
          disabled={wayPoints.length === 0}
          onClick={() => {
            setEditMode(false);
            setAddMode(false);
            wayPoints = [];
            reassignWayPoints(wayPoints, true);
          }}
          className={
            "px-2 py-1 bg-gray-300 dark:bg-gray-800 dark:text-gray-300 ring-orange-500 ring-0 hover:ring-2 transition duration-200 flex-none rounded " +
            (wayPoints.length === 0 &&
              " ring-0 hover:ring-0 cursor-not-allowed text-gray-500 dark:text-gray-600 ")
          }
        >
          🪂 Empty
        </button>
      </div>
      <button onClick={calculatePos}>calc</button>
      <div>
        {wayPoints.map((wp) => (
          <div className="flex ml-4">
            <h3 className="text-2xl font-bold">{wp.index}</h3>
            <div className="ml-2">
              <p>
                {wp.lat}, {wp.lng}
              </p>
              <input
                type="range"
                min={1}
                max={100}
                value={wp.radius}
                onChange={(event) => {
                  setWayPoints((wps) => {
                    wps[wp.index - 1].radius = event.target.value;
                    return wps;
                  });
                  refresh();
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;

import React, { Component } from "react";

import 'ol/ol.css';
import Geolocation from 'ol/Geolocation';
import Draw from 'ol/interaction/Draw';
import Map from 'ol/Map';
import View from 'ol/View';
import {toLonLat} from 'ol/proj';
import {OSM, Vector as VectorSource} from 'ol/source';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';

export default class MapPage extends Component {
    
    constructor(params) {
        super(params);
    }

    // component did mount is not running???
    componentDidMount() {

        var raster = new TileLayer({
            source: new OSM(),
        });
        
        // when wrapX = true, apparently troubles around the 180 meridian, though I don't see how this could be an
        // issue for us, and it looks better when it is wrapped and not an infinite number of maps stitched together
        var source = new VectorSource({wrapX: true});
        
        var vector = new VectorLayer({
            source: source,
        });
        
        var view = new View({
            center: [-11000000, 4600000],
            zoom: 4,
            extent: [-30000000, -20000000, 30000000, 20000000], // approximatley the entire world map, a bit more, to not allow endless panning
        });
        
        var map = new Map({
            layers: [raster, vector],
            target: "map",
            view: view,
        });

        // go to current location
        const geolocation = new Geolocation({
            projection: view.getProjection(),
            tracking: true,
        });
        
        geolocation.once('change:position', function () {
            view.setCenter(geolocation.getPosition());
            view.setResolution(2.388657133911758);
        });

        var typeSelect = document.getElementById('type');

        // current object being placed
        var draw;
        function addInteraction() {
            var value = typeSelect.value;
            if (value !== 'None') {
                draw = new Draw({
                source: source, // where the drawing occurs
                type: typeSelect.value,
                });
                map.addInteraction(draw); // create new drawing on mouse
            }
        }

        // update coordinates when the source changes
        source.addEventListener("change", function() {
            // var node = document.getElementById('coord-text-box');
            // node.innerText = JSON.stringify(dat,null,2);
            var dat = get_regions();
            if (dat.length > 0 && get_vin().length == 17) {
                document.getElementById('send_btn').disabled = false;
            } else {
                document.getElementById('send_btn').disabled = true;
            }
        });

        document.getElementById('id_input').addEventListener('change', function () {
            var dat = get_regions();
            if (dat.length > 0 && get_vin().length == 17) {
                document.getElementById('send_btn').disabled = false;
            } else {
                document.getElementById('send_btn').disabled = true;
            }
        });

        // remove currently active drawing when selected a new draw type
        typeSelect.onchange = function () {
            map.removeInteraction(draw);
            // check the new type and do stuff
            addInteraction();
        };

        // soft reset (remove last drawn point)
        function clear_current_interactive() {
            draw.removeLastPoint();
        }

        // hard reset that clears map
        function reset() {
            draw.removeLastPoint();
            source.refresh();
            document.getElementById('send_btn').disabled = true;
            var node = document.getElementById('id-text-box');
            node.innerText = "";
            node = document.getElementById('coord-text-box');
            node.innerText = "";
            document.getElementById('id_input').value = "";
        };

        function get_vin() {
            var elm = document.getElementById('id_input');
            return elm.value;
        }

        function get_regions() {
            var regions = [];
            source.getFeatures().forEach((element, i) => {
                switch(element.getGeometry().getType()) {
                    case "Circle":
                        var geo = element.getGeometry();
                        var center = toLonLat(geo.getCenter());
                        var radius = geo.getRadius();
                        regions.push({
                            type: "circle",
                            data: {
                                center: center,
                                radius: radius
                            }
                        });
                    break;
                    case "Polygon": 
                        var coords = element.getGeometry().getCoordinates()[0];
                        var final = [];
                        coords.forEach(e => {
                            final.push(toLonLat(e));
                        });
                        regions.push({
                            type: "polygon",
                            data: final
                        });
                    break;
                }
            });
            return regions;
        }

        // reset button
        document.getElementById('reset_btn').addEventListener('click', function () {
            reset();
        });

        function send_email(data) {
            var vin = data.vin;
            var regions = JSON.parse(data.regions);
            var created_at = data.created_at;
            var email = "sprinkjm@arizona.edu";
            var subject = `[PRIVZONE] Region Data :: ${vin} :: ${created_at}`;
            var body = JSON.stringify({
                vin: vin,
                regions: regions,
                created_at: created_at
            });
            window.open(`mailto:${email}?subject=${subject}&body=${encodeURIComponent(body)}`);
        }

        // send button
        document.getElementById('send_btn').addEventListener('click', function () {
            fetch("/api/add-entry/", {
                method: "POST",
                body: JSON.stringify({
                    vin: get_vin(),
                    regions: JSON.stringify(get_regions())
                }),
                headers: { "Content-Type": "application/json;" }
            }).then(response => {
                if (response.status != 201) {
                    console.log("Bad request...");
                }
                else {
                    return response.json();
                }
            }).then(res => {
                if (res != undefined) {
                    send_email(res);
                }
            });
        });

        // check for escape to do a soft reset and get rid of last drawn point
        document.addEventListener('keyup', function(event) {
            if (event.key == "Escape") {
                clear_current_interactive();
            }
        });

        // add interaction when loaded, so drawing can start instantly
        addInteraction();

        // save map and layer references to local state
        this.setState({ 
            map: map,
            raster: raster,
            source: source,
            vector: vector,
            view: view
        });
    }

    //! switch to using material ui for buttons?
    render () {
        return (
        <div className="container">
            <div className="map" id="map"></div>
            <div className="sidebar">
                <form id="type_form"> 
                    <select id="type" className="form_section">
                        <option value="Circle">Circle</option>
                        <option value="Polygon">Polygon</option>
                    </select>
                    <input type="button" value="Reset" id="reset_btn" className="form_section" />
                </form>
                <form id="id_form">
                    <input type="id_input" placeholder="Enter VIN" maxLength="17" id="id_input" className="form_section" />
                    <input type="button" value="Send" id="send_btn" className="form_section" disabled/>
                </form>
                <p id="id-text-box"></p>
                <p id="coord-text-box"></p>
                <p id="test_send_btn"></p>
            </div>
        </div>
    );
    }
}
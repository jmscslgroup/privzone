import ReactDOM from 'react-dom';
import React, { Component } from "react";

import 'ol/ol.css';
import Geolocation from 'ol/Geolocation';
import Draw from 'ol/interaction/Draw';
import Map from 'ol/Map';
import View from 'ol/View';
import {toLonLat} from 'ol/proj';
import {OSM, Vector as VectorSource} from 'ol/source';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';

import { Button } from "@material-ui/core";
import { Link } from "react-router-dom";

export default class MapPage extends Component {
    
    constructor(params) {
        super(params);
    }

    // component did mount is not running???
    componentDidMount() {

        console.log('here');

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
        update_coords();
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
        var node = document.getElementById('id-text-box');
        node.innerText = "";
        node = document.getElementById('coord-text-box');
        node.innerText = "";
        };

        // update id text
        function update_id() {
        var elm = document.getElementById('id_input');
        var node = document.getElementById('id-text-box');
        node.innerText = "ID: " + elm.value;
        elm.value = "";
        }

        // formats circle data and will eventually add to object that will be exported on the click of send
        function format_circle(element) {
        // send as json data
        var geo = element.getGeometry();
        var center = toLonLat(geo.getCenter());
        return "\n{ c: " + String(center) + ", r: " + String(geo.getRadius()) + "}";
        }

        // formats polygon data and will eventually add to object that will be exported on the click of send
        function format_polygon(element) {
        
        // need [0] because it is nested?
        var coords = element.getGeometry().getCoordinates()[0];
        var final = [];
        coords.forEach(e => {
            final.push(toLonLat(e));
        });
        return "\n[" + String(final) + "]";
        }

        // updates coordinate text
        function update_coords() {
        var node = document.getElementById('coord-text-box');
        var text = "Coords: [\n"
        var lst = source.getFeatures().forEach((element, i) => {
            text += "\t";
            switch(element.getGeometry().getType()) {
            case "Circle": text += format_circle(element); break;
            case "Polygon": text += format_polygon(element); break;
            default: text += "Unknown type??"; break;
            }
            if (i != source.getFeatures().length - 1) {
            text += ',\n';
            }
        });
        node.innerText = text + "\n\n]";
        }

        // reset button
        document.getElementById('reset_btn').addEventListener('click', function () {
        reset();
        });

        // id input field checking for enter
        document.getElementById('id_input').addEventListener('keydown', function (event) {
        if(event.key === 'Enter') {
            event.preventDefault();
            update_id();
        }
        });

        // send button
        document.getElementById('send_btn').addEventListener('click', function () {
        console.log("SENDING...");
        });

        // disabled send button until VIN and at least one privacy region are in
        document.getElementById('id_input').addEventListener('change', function() {
            document.getElementById('send_btn').disabled = false;
        });

        // test unclickable send button
        document.getElementById('send_btn').addEventListener('click', function() {
            document.getElementById('test_send_btn').innerHTML = "CLICKABLE!!!";
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
                <Button variant="contained" color="primary" to="/" component={Link}>Home</Button>
                <form id="type_form"> 
                    <select id="type" className="form_section">
                        <option value="Circle">Circle</option>
                        <option value="Polygon">Polygon</option>
                    </select>
                    <input type="button" value="Reset" id="reset_btn" className="form_section" />
                </form>
                <form id="id_form">
                    <input type="id_input" placeholder="Enter VIN" id="id_input" className="form_section" />
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
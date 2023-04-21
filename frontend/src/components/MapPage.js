import React, { Component } from "react";

import 'ol/ol.css';
import Geolocation from 'ol/Geolocation';
import Draw from 'ol/interaction/Draw';
import {Modify, Snap} from 'ol/interaction.js';
import Polygon from 'ol/geom/Polygon.js';
import Circle from 'ol/geom/Circle.js';
import Point from 'ol/geom/Point.js';
import GeometryCollection from 'ol/geom/GeometryCollection.js';
import {circular} from 'ol/geom/Polygon.js';
import {getDistance} from 'ol/sphere.js';
import {transform} from 'ol/proj.js';
import Map from 'ol/Map';
import View from 'ol/View';
import {toLonLat,fromLonLat} from 'ol/proj';
import Feature from 'ol/Feature';
import {OSM, Vector as VectorSource} from 'ol/source';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';
import {
    Fill,
    Stroke,
    Style
} from 'ol/style.js';


import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.js";

import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Navbar from 'react-bootstrap/Navbar';
import Container from 'react-bootstrap/Container';
import Spinner from 'react-bootstrap/Spinner';
//import Navbar from "./../Navigation/Navbar.js";

//import './../index.css';
import './../styles.css';

import Grid from '@mui/material/Grid';

import logo from './../logo.png'
//import Item from '@mui/material/Item';

//class CustomButton extends React.Component {
//    render() {
//        return <CustomButton /> ; // props.color will be set to blue
//      }
//}
//
//CustomButton.defaultProps = {
//  color: 'blue'
//};

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
        
//        const modify = new Modify({source: source});
        const defaultStyle = new Modify({source: source})
          .getOverlay()
          .getStyleFunction();
        
        const modify = new Modify({
          source: source,
          style: function (feature) {
            feature.get('features').forEach(function (modifyFeature) {
              const modifyGeometry = modifyFeature.get('modifyGeometry');
              if (modifyGeometry) {
                const modifyPoint = feature.getGeometry().getCoordinates();
                const geometries = modifyFeature.getGeometry().getGeometries();
                const polygon = geometries[0].getCoordinates()[0];
                const center = geometries[1].getCoordinates();
                const projection = map.getView().getProjection();
                let first, last, radius;
                if (modifyPoint[0] === center[0] && modifyPoint[1] === center[1]) {
                  // center is being modified
                  // get unchanged radius from diameter between polygon vertices
                  first = transform(polygon[0], projection, 'EPSG:4326');
                  last = transform(
                    polygon[(polygon.length - 1) / 2],
                    projection,
                    'EPSG:4326'
                  );
                  radius = getDistance(first, last) / 2;
                } else {
                  // radius is being modified
                  first = transform(center, projection, 'EPSG:4326');
                  last = transform(modifyPoint, projection, 'EPSG:4326');
                  radius = getDistance(first, last);
                }
                // update the polygon using new center or radius
                const circle = circular(
                  transform(center, projection, 'EPSG:4326'),
                  radius,
                  128
                );
                circle.transform('EPSG:4326', projection);
                geometries[0].setCoordinates(circle.getCoordinates());
                // save changes to be applied at the end of the interaction
                modifyGeometry.setGeometries(geometries);
              }
            });
            return defaultStyle(feature);
          },
        });

        modify.on('modifystart', function (event) {
          event.features.forEach(function (feature) {
            const geometry = feature.getGeometry();
            if (geometry.getType() === 'GeometryCollection') {
              feature.set('modifyGeometry', geometry.clone(), true);
            }
          });
        });

        modify.on('modifyend', function (event) {
          event.features.forEach(function (feature) {
            const modifyGeometry = feature.get('modifyGeometry');
            if (modifyGeometry) {
              feature.setGeometry(modifyGeometry);
              feature.unset('modifyGeometry', true);
            }
          });
        });
        map.addInteraction(modify);
        
        let draw, snap; // global so we can remove them later

        // go to current location
        const geolocation = new Geolocation({
            projection: view.getProjection(),
            tracking: true,
        });
        
        geolocation.once('change:position', function () {
            view.setCenter(geolocation.getPosition());
            view.setResolution(2.388657133911758);
        });

        var typeSelect = document.getElementById('id_shape');

        
        // See: https://openlayers.org/en/latest/examples/draw-and-modify-geodesic.html
        // current object being placed
        //var draw;
        function addInteractions() {
            var value = typeSelect.value;
            let geometryFunction;
            if(value === 'Geodesic') {
                value = 'Circle';
                geometryFunction = function (coordinates, geometry, projection) {
                    if (!geometry) {
                        geometry = new GeometryCollection([
                            new Polygon([]),
                            new Point(coordinates[0]),
                        ]);
                    }
                    console.log('GeometrY: ' + geometry);
                    const geometries = geometry.getGeometries();
                    const center = transform(coordinates[0], projection, 'EPSG:4326');
                    const last = transform(coordinates[1], projection, 'EPSG:4326');
                    const radius = getDistance(center, last);
                    const circle = circular(center, radius, 128);
                    circle.transform('EPSG:4326', projection);
                    geometries[0].setCoordinates(circle.getCoordinates());
                    geometry.setGeometries(geometries);
                    return geometry;
                };
            }
            
//            if (value !== 'None') {
                draw = new Draw({
                    source: source, // where the drawing occurs
                    type: value,
                    geometryFunction: geometryFunction
                });
//            }
            map.addInteraction(draw); // create new drawing on mouse
            snap = new Snap({source: source});
            map.addInteraction(snap);
        }

        // update coordinates when the source changes
        source.addEventListener("change", function() {
            // var node = document.getElementById('coord-text-box');
            // node.innerText = JSON.stringify(dat,null,2);
//            var dat = get_regions();
//            if (dat.length > 0 && get_vin().length == 17) {
//                document.getElementById('send_btn').disabled = false;
//            } else {
//                document.getElementById('send_btn').disabled = true;
//            }
        });

        document.getElementById('id_input').addEventListener('change', function () {
//            var dat = get_regions();
//            if (dat.length > 0 && get_vin().length == 17) {
//                document.getElementById('send_btn').disabled = false;
//            } else {
//                document.getElementById('send_btn').disabled = true;
//            }
        });

        // remove currently active drawing when selected a new draw type
        typeSelect.onchange = function () {
            map.removeInteraction(draw);
            // check the new type and do stuff
//            addInteraction();
            map.removeInteraction(snap);
            addInteractions();
        };

        // soft reset (remove last drawn point)
        function clear_current_interactive() {
            draw.removeLastPoint();
        }

        // hard reset that clears map
        function reset() {
            draw.removeLastPoint();
            source.refresh();
//            document.getElementById('send_btn').disabled = true;
            var node = document.getElementById('id-text-box');
            node.innerText = "";
            node = document.getElementById('coord-text-box');
            node.innerText = "";
            document.getElementById('id_input').value = "";
            document.getElementById('id_offset').value = "";
        };

        function get_vin() {
            var elm = document.getElementById('id_input');
            return elm.value;
        }
        
        function get_offset() {
            var elm = document.getElementById('id_offset');
            return elm.value;
        }
        
        
        const hysteresisColor = 'red';  // HACK!  this is a major hack to check for hysteresis boundaries during export

        function get_regions() {
            var regions = [];
            source.getFeatures().forEach((element, i) => {
                if( element.getStyle() ) {  // HACK HACK HACK!  Checking the color to determine if hysteresis is not my proudest moment
//                    console.log("STYLE! " + JSON.stringify(element.getStyle()) );
//                    console.log("COLOR! " + element.getStyle().getStroke().getColor() );
                    if( element.getStyle().getStroke().getColor().localeCompare(hysteresisColor) == 0) {
                        console.log("This is a hysteresis boundary!  skipping...");
                        return;
                    }
                }
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
//                        if ( element.getStyle() ) {
//
//                        }
                        
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
        
        function generate_config(data) {
            var vin = data.vin;
            var offset = data.offset;
            var regions = JSON.parse(data.regions);
            var created_at = data.created_at;
            //var email = "nobody@nowhere.internet";
            //var subject = `[PRIVZONE] Region Data :: ${vin} :: ${created_at} :: ${offset}`;
            return {
                vin: vin,
                offset: offset,
                regions: regions,
                created_at: created_at,
                view: {
                    zoom: view.getZoom(),
//                    extent: map.view.extent,
                    center: view.getCenter()
                }
            };
        }

        function send_email(data) {
            var vin = data.vin;
            var offset = data.offset;
//            var regions = JSON.parse(data.regions);
            var created_at = data.created_at;
            var email = "nobody@nowhere.internet";
            var subject = `[PRIVZONE] Region Data :: ${vin} :: ${created_at} :: ${offset}`;
//            var body = JSON.stringify({
//                vin: vin,
//                offset: offset,
//                regions: regions,
//                created_at: created_at
//            });
            var body = JSON.stringify(generate_config(data));
            window.open(`mailto:${email}?subject=${subject}&body=${encodeURIComponent(body)}`);
        }

        // send button
        document.getElementById('send_btn').addEventListener('click', function () {
            fetch("/api/add-entry/", {
                method: "POST",
                body: JSON.stringify({
                    vin: get_vin(),
                    offset: get_offset(),
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
        
        // fake it button
        document.getElementById('fake_btn').addEventListener('click', function () {
//            var type = "Polygon";
//            let geometryFunction = function (coordinates, geometry) {
//                console.log("iefhoiadfh");
//                const newCoordinates = [];
//                newCoordinates.push([0,0]);
//                newCoordinates.push([50,0]);
//                newCoordinates.push([50,50]);
//                newCoordinates.push([0,50]);
//                newCoordinates.push(newCoordinates[0].slice());
//                if (!geometry) {
//                    geometry = new Polygon([newCoordinates]);
//                } else {
//                    geometry.setCoordinates([newCoordinates]);
//                }
//                return geometry;
//            }
//            draw = new Draw({
//                source: source, // where the drawing occurs
//                type: "Polygon",
//                geometryFunction: geometryFunction,
//            });
//            map.addInteraction(draw); // create new drawing on mouse
//            //map.addInteraction();
            
            
            const newCoordinates = [];
            newCoordinates.push(fromLonLat([0, 0]));
            newCoordinates.push(fromLonLat([45, 0]));
            newCoordinates.push(fromLonLat([45, 45]));
            newCoordinates.push(fromLonLat([0, 45]));
            newCoordinates.push(fromLonLat([0, 0]));
            //newCoordinates.push(newCoordinates[0].slice());
            
            var polyone = new Polygon([newCoordinates]);
            var featureone = new Feature(polyone);
            
//            featureone.setStyle(new Style({
//                fill: new Fill({
//                  color: hysteresisColor
//                })
//              }))
            
            source.addFeature(featureone);
//            console.log("iefhoiadfh");
            //source.addPolygon(newCoordinates);
        });
        
        function importZoneFile(json) {
            reset();    // Not very great to have it here, but prevents doulbe importing
            
            var result = JSON.parse(json);
            var formatted = JSON.stringify(result, null, 2);
                document.getElementById('id_parse').value = formatted;
              
              var vin = result['vin'];
              var regions = result['regions'];
              console.log(`vin = ${vin}`);
              console.log(`regions: = ${regions.length}`);
              for(let i = 0; i < regions.length; i++) {
                  console.log(`- region ${i} is type ${regions[i]['type']}`);
                  addRegion(regions[i]);
              }
            
            if(result.hasOwnProperty('view')) {
                view.setZoom(result['view']['zoom']);
                view.setCenter(result['view']['center']);
            }
              
              document.getElementById('id_input').value = result['vin'];
              document.getElementById('id_offset').value = result['offset'];
        }
        
        function importCsv(csv) {
            for(let row of csv.split("\n")) {
                //   console.log(`row = ${row}`);
                let cols = row.split(",");
                //console.log(`cols = ${cols[2]}`);
                
                
                var center = fromLonLat([cols[2],cols[3]]);
                var pointone = new Point(center);
                var featureone = new Feature(pointone);
                
                source.addFeature(featureone);
            }
            
            
        
        }
        
        // import button
        document.getElementById('import_btn').addEventListener('click', function () {
            var files = document.getElementById('selectedFile').files;
            //console.log(files);
            if (files.length <= 0) {
                return false;
            }
            
            
            var fr = new FileReader();

            if(files[0].name.indexOf('.json') > -1) {
                fr.onload = function(e) {
                    //console.log(e);
                    //console.log("JSON:");
                    console.log(e.target.result);
                    importZoneFile(e.target.result);
                    //                var result = JSON.parse(e.target.result);
                    //                var formatted = JSON.stringify(result, null, 2);
                    //                    document.getElementById('id_parse').value = formatted;
                    //
                    //                  var vin = result['vin'];
                    //                  var regions = result['regions'];
                    //                  console.log(`vin = ${vin}`);
                    //                  console.log(`regions: = ${regions.length}`);
                    //                  for(let i = 0; i < regions.length; i++) {
                    //                      console.log(`- region ${i} is type ${regions[i]['type']}`);
                    //                      addRegion(regions[i]);
                    //                  }
                    //
                    //                  document.getElementById('id_input').value = result['vin'];
                    //                  document.getElementById('id_offset').value = result['offset'];
                }
              } else if(files[0].name.indexOf('.csv') > -1) {
                  
//                console.log("CSV!");
                  fr.onload = function(e) {
                     // console.log(e);
                      //console.log("CSV:");
                      //console.log(e.target.result);
                      importCsv(e.target.result);
                  }
              } else {
                  console.log("unsupported filetype!");
              }

              fr.readAsText(files.item(0));
        });
        
        function addRegion(region, hysteresis=false) {
            
            if(region['type'] == 'circle') {
                var center = fromLonLat(region['data']['center']);
                var radius = region['data']['radius'];
                var circleone = new Circle(center,radius);
                var featureone = new Feature(circleone);
                if(hysteresis) {
//                    var style = featureone.getStyle();
//                    style.fill.color = hysteresisColor;
//                    featureone.setStyle(style);
                    featureone.setStyle(new Style({
                        stroke: new Stroke({
                       // lineDash: 1,
                        color: hysteresisColor,
                    })
                    }))
                    
                }
                
                source.addFeature(featureone);
                console.log("circle added");
            } else {
                const coords = [];
                for(let i = 0; i < region['data'].length; i++) {
                    coords.push(fromLonLat(region['data'][i]));
                }
                //            coords.push(fromLonLat([0, 0]));
                //coords.push(coords[0].slice());
                
                var polyone = new Polygon([coords]);
                var featureone = new Feature(polyone);
                
                if(hysteresis) {
//                    var style = featureone.getStyle();
//                    style.fill.color = hysteresisColor;
//                    featureone.setStyle(style);
                    featureone.setStyle(new Style({
                        stroke: new Stroke({
                       // lineDash: 1,
                        color: hysteresisColor
                    })
                    }))
                    
                }
                
                
                source.addFeature(featureone);
                console.log("polygon added");
            }
            
            if('hysteresis' in region) {
                addRegion(region['hysteresis'], true);
            }
        }

        // check for escape to do a soft reset and get rid of last drawn point
        document.addEventListener('keyup', function(event) {
            if (event.key == "Escape") {
                clear_current_interactive();
            }
        });
        
        var bleDevice;
        var myCharacteristic;
        var myCommandCharacteristic;
        var myConfigCharacteristic;
        var hereToThePiCharacteristic;
        // check for bluetooth stuff
//        document.addEventListener('id_btn_connect_ble', function(event) {
        document.getElementById('id_btn_connect_ble').addEventListener('click', function () {
            console.log("Blue daba dee");
 
            
            let options = {};
            
             // options.acceptAllDevices = true;
//            options.filters = [ {name: "circles"} ];
            options.filters = [ {services: ['00000001-4d3d-3d3d-3d3d-3d3d3d3d3d3d'] } ];
//            options.filters = [ {services: ["00000001-710E-4A5B-8D75-3E5B444B3C3F"] } ];
             // optionalServices: [] // Required to access service later.
//            options.optionalServices = [ '00000001-710e-4a5b-8d75-3e5b444bc3cf' ];
//            };
            
            console.log('BLE> Requesting Bluetooth Device...');
            navigator.bluetooth.addEventListener('availabilitychanged', onAvailabiltyChanged);  // this is for Bluetooth as a whole, not indiivdual device connectivity
            console.log('BLE> with ' + JSON.stringify(options));
            navigator.bluetooth.requestDevice( options )
            .then(device => {
                bleDevice = device;
                //console.log(`Name: ${device.name}`);
                console.log('BLE> Name:             ' + device.name);
                console.log('BLE> Id:               ' + device.id);
                console.log('BLE> Connected:        ' + device.gatt.connected);
                
                device.addEventListener('gattserverdisconnected', onDisconnected);
                device.addEventListener('advertisementreceived', onAdvertisementReceived);
                
                heartbeatBleEnabled = false;
                setStatus("Connecting...");
                handleBleConnectionStateChange("Connecting...");
                device.gatt.connect()
                .then(server => {
                    console.log('BLE> Connected: ' + server.connected);
                    setStatus("Connection Success!");
        
                    handleBleConnectionStateChange("Connected");
                    //server.getPrimaryServices().
                    //then( services => console.log('server.getPrimaryServices(): -> ' + services.getPrimaryServices()));
                    
//                    server.getPrimaryService('00000001-710e-4a5b-8d75-3e5b444bc3cf')
                    server.getPrimaryService('00000001-4d3d-3d3d-3d3d-3d3d3d3d3d3d')
                    //                    .then(service => console.log('yay!'));
                    //                })
                    .then(service => {
                        device.addEventListener('serviceadded', onServiceAdded);
                        device.addEventListener('servicechanged', onServiceChanged);
                        device.addEventListener('serviceremoved', onServiceRemoved);
                        
                        console.log('BLE> getting characteristic 00000002-4d3d-3d3d-3d3d-3d3d3d3d3d3d...');
                        service.getCharacteristic('00000002-4d3d-3d3d-3d3d-3d3d3d3d3d3d')
                        .then(characteristic => {
                            console.log('BLE> Starting notifications...');
                            //                        return characteristic.startNotifications();
                            //
                            //                    })
                            //                    .then(characteristic => {
                            characteristic.startNotifications().then(characteristic => {
                                console.log('BLE> Adding eventListener...');
                                characteristic.addEventListener('characteristicvaluechanged',
                                                                //                                                        handleCharacteristicValueChanged);
                                                                handleNotificationCirclesCharacteristic);
                                console.log('BLE> Notifications have been started.');
                            });
                            console.log('BLE> Getting Descriptors...');
                            return characteristic.getDescriptors();
                        }).then(descriptors => {
                            console.log('BLE> - Descriptors: ' +
                                        descriptors.map(c => c.uuid).join('\n' + ' '.repeat(19)));
                        });
                        
                        console.log('BLE> getting characteristic 00000006-4d3d-3d3d-3d3d-3d3d3d3d3d3d...');
                        service.getCharacteristic('00000006-4d3d-3d3d-3d3d-3d3d3d3d3d3d')
                        .then(characteristic => {
                            console.log('BLE> Starting notifications...');
                            characteristic.startNotifications().then(characteristic => {
                                console.log('BLE> Adding eventListener...');
                                characteristic.addEventListener('characteristicvaluechanged',
                                                                handleNotificationCirclesStatusCharacteristic);
                                console.log('BLE> Notifications have been started.');
                            });
                        });
                              
                        console.log('BLE> getting characteristic 00000003-4d3d-3d3d-3d3d-3d3d3d3d3d3d...');
                        service.getCharacteristic('00000003-4d3d-3d3d-3d3d-3d3d3d3d3d3d')
                        .then(characteristic => {
                            console.log('BLE> - ' + characteristic);
                            myCommandCharacteristic = characteristic;
//                            characteristic.getDescriptors()
//                            .then(descriptors => {
//                                console.log('BLE> - Descriptors: ' +
//                                            descriptors.map(c => c.uuid).join('\n' + ' '.repeat(19)));
//                            });
                        });
                        
                        console.log('BLE> getting characteristic 00000004-4d3d-3d3d-3d3d-3d3d3d3d3d3d...');
                        service.getCharacteristic('00000004-4d3d-3d3d-3d3d-3d3d3d3d3d3d')
                        .then(characteristic => {
                            console.log('BLE> - ' + characteristic);
                            myConfigCharacteristic = characteristic;
                        });
                        
                        console.log('BLE> getting characteristic 00000005-4d3d-3d3d-3d3d-3d3d3d3d3d3d...');
                        service.getCharacteristic('00000005-4d3d-3d3d-3d3d-3d3d3d3d3d3d')
                        .then(characteristic => {
                            console.log('BLE> - ' + characteristic);
                            hereToThePiCharacteristic = characteristic;
                        });
                        
                        console.log('BLE> getting characteristic 00000003-710e-4a5b-8d75-3e5b444bc3cf...');
                        service.getCharacteristic('00000003-710e-4a5b-8d75-3e5b444bc3cf')
                        .then(characteristic => {
                            console.log('BLE> - ' + characteristic);
                            myCharacteristic = characteristic;
//                            characteristic.getDescriptors()
//                            .then(descriptors => {
//                                console.log('BLE> - Descriptors: ' +
//                                            descriptors.map(c => c.uuid).join('\n' + ' '.repeat(19)));
//                            });
                        });
                        //                        return service.getCharacteristic('00000002-710e-4a5b-8d75-3e5b444bc3cf');
                        //                    })
                        //                    .then(characteristic =>  {
                        console.log('BLE> getting characteristic 00000002-710e-4a5b-8d75-3e5b444bc3cf...');
                        service.getCharacteristic('00000002-710e-4a5b-8d75-3e5b444bc3cf')
                        .then(characteristic =>  {
                            
                            characteristic.getDescriptors()
                            .then(descriptors => {
                                console.log('BLE> - Descriptors: ' +
                                            descriptors.map(c => c.uuid).join('\n' + ' '.repeat(19)));
                            });
                            console.log('BLE> Starting notifications...');
                            //                        return characteristic.startNotifications();
                            //
                            //                    })
                            //                    .then(characteristic => {
                            characteristic.startNotifications().then(characteristic => {
                                console.log('BLE> Adding eventListener...');
                                characteristic.addEventListener('characteristicvaluechanged',
                                                                //                                                        handleCharacteristicValueChanged);
                                                                handleNotifications);
                                heartbeatBleEnabled = true;
                                console.log('BLE> Heartbeat otifications have been started.');
                            });
                            
                        })
                    })
                })
            })
            .catch(error => { console.error('BLE> There was an issue: ' + error); });
        });
        
        function handleCharacteristicValueChanged(event) {
          const value = event.target.value;
            var result = "";
            console.log("BLE> value: " + value);
            console.log("BLE> char code: " + String.fromCharCode(value));
            for (var i=0; i< value.byteLength; i++){
//                result += String.fromCharCode(value[i]);
                result += value.getUint8(i);
                console.log('BLE> Received ' + value.getUint8(i));
            }
          console.log('BLE> Received length ' + value.byteLength + ': ' + result);
        }
        
        function handleNotifications(event) {
          let value = event.target.value;
          let a = [];
          // Convert raw data bytes to hex values just for the sake of showing something.
          // In the "real" world, you'd use data.getUint8, data.getUint16 or even
          // TextDecoder to process raw data bytes.
//          for (let i = 0; i < value.byteLength; i++) {
//            a.push('0x' + ('00' + value.getUint8(i).toString(16)).slice(-2));
//              a.push('0x' + ('00' + value.getUint8(i).toString(16)).slice(-2));
//          }
//          console.log('BLE> ' + a.join(' '));
            let utf8decoder = new TextDecoder();
            //console.log('BLE> ' + utf8decoder.decode(value));
            heartbeatBleCounter = 0;    // reset heartbeat
            
            document.getElementById('id_cpu').value = utf8decoder.decode(value);
        }
        
        var buffer = "";
        var finalMessage = null;
        function handleNotificationCirclesCharacteristic(event) {
          let value = event.target.value;
//          let a = [];
          // Convert raw data bytes to hex values just for the sake of showing something.
          // In the "real" world, you'd use data.getUint8, data.getUint16 or even
          // TextDecoder to process raw data bytes.
//          for (let i = 0; i < value.byteLength; i++) {
//            a.push('0x' + ('00' + value.getUint8(i).toString(16)).slice(-2));
//              a.push('0x' + ('00' + value.getUint8(i).toString(16)).slice(-2));
//          }
//          console.log('BLE> handleNotificationCirclesCharacteristic(): ' + a.join(' '));
            let utf8decoder = new TextDecoder();
            buffer = buffer.concat(utf8decoder.decode(value));
            //console.log('BLE> CircleNotification: ' + utf8decoder.decode(value));
            console.log('BLE> CircleNotification: num bytes: ' + value.byteLength + ' final char: ' + value.getUint8(value.byteLength-1));
            if(value.getUint8(value.byteLength-1) == 0) {
                
                finalMessage = buffer.slice(0,buffer.length-1);
                buffer = "";
                
                //console.log('BLE> CircleNotification: This was the final message: ' + finalMessage);
                
                console.log("BLE> Input received: " + finalMessage);
//                importZoneFile(finalMessage);
                handleCirclesInput(finalMessage)
            }
            
//            document.getElementById('id_cpu').value = utf8decoder.decode(value);
        }
            
        function  handleNotificationCirclesStatusCharacteristic(event) {
            let value = event.target.value;
            
            let utf8decoder = new TextDecoder();
            
            var message = utf8decoder.decode(value);
            
            //                document.getElementById('id_status').value = utf8decoder.decode(value);
            setStatus("Pi says: " + message);
            
            if(message.localeCompare("Wifi removed!") == 0 ||
               message.localeCompare("Wifi complete!") == 0) {
                console.log("Wifi updated, refreshing configurations...");
                sendCirclesCommand("W");
            } else if(message.localeCompare("App command success!") == 0) {
                console.log("Apps updated, invoking app refresh");
                sendCirclesCommand("A");
            }
            
        }
        function setStatus(message) {
            document.getElementById('id_status').value = message;
        }
        
        function handleCirclesInput(message) {
            var input;
            try {
                input = JSON.parse(message);
            } catch(e) {
                setStatus("Error: Json parsing issue!")
                console.log("Error: Json parsing issue!");
                return;
            }
            if( !input.hasOwnProperty('type') ) {
                setStatus("Error: Json missing 'type' key")
                console.log("Error: Json missing 'type' key");
                return;
            }
            console.log("File type: " + input['type']);
            
            if( !input.hasOwnProperty('length') ) {
                setStatus("Error: Json missing 'length' key")
                console.log("Error: Json missing 'length' key");
                return;
            }
            console.log("File length:  " + input['length']);
            
            if( !input.hasOwnProperty('contents') ) {
                setStatus("Error: Json missing 'contents' key")
                console.log("Error: Json missing 'contents' key");
                return;
            }
            //console.log("File contents: " + input['contents']);
            console.log(" - my length: " + input['contents'].length);
            if(input['length'] == input['contents'].length) {
                console.log("Success in reading input!");
//                if(input['type'].localeCompare('zonefile') == 0) {
//                    importZoneFile(input['contents']);
//                }
                handleInputJson(input)
            } else {
                setStatus("Error: Json length mismatch!")
            }
            
        }
        
        function handleInputJson(input) {
            // The json object shoiuld be well formed at this point, no need to check length here
            if(input['type'].localeCompare('zonefile') == 0) {
                console.log("This is a zonefile!");
                importZoneFile(input['contents']);
            } else if(input['type'].localeCompare('wifi') == 0) {
                
                console.log("This is a wifi thing!");
                importWifi(JSON.parse(input['contents']));
            } else if(input['type'].localeCompare('wifi_scan') == 0) {
                console.log("This is a wifi scan result!");
                importWifiScan(JSON.parse(input['contents']));
            } else if(input['type'].localeCompare('app_info') == 0) {
                console.log("This is an app info!");
                importAppInfo(JSON.parse(input['contents']));
            }
        }
        
        function importWifi(contents) {
            console.log("Wifi contents: " + JSON.stringify(contents) )
            
            
            let ifaces = {}
            contents['interfaces'].forEach( iface => {
                ifaces[iface['name']] = iface;
            })
            
//            let ifaces = {
//                'wlan0': contents['wlan0'],
//                'eth0': contents['eth0'],
//                'lo': contents['lo']
//            };
//            if ('eth1' in contents) {
//                ifaces['eth1'] = contents['eth1'];
//            }
            
            clearTable('id_iface_table');
            
            var myTable = document.getElementById('id_iface_table');
//            var tableRows = myTable.getElementsByTagName('tr');
            var myTableBody = myTable.getElementsByTagName('table')[0].getElementsByTagName('tbody')[0];
//            var tableRows = mmyTableBody.getElementsByTagName('tr');
//            var rowCount = tableRows.length;
//            for( var i = rowCount-1; i > 0; i--) {
////                myTable.deleteRow(i);
//                myTableBody.removeChild(tableRows[i]);
//            }
//            ifaces.forEach( iface => {
            for( const iface in ifaces ) {
                var rowNode = document.createElement("tr");
                var cellNode = document.createElement("td");
//                let row = myTable.insertRow();
//                let face = row.insertCell(0);
//                face.innerText = iface;
                var textNode = document.createTextNode(iface);
                cellNode.appendChild(textNode);
                rowNode.appendChild(cellNode);
                
                
                
                cellNode = document.createElement("td");
//                let ip = ip.insertCell(0);
//                ip.innerText = ifaces[iface]['IP'];
                textNode = document.createTextNode(ifaces[iface]['IP']);
                cellNode.appendChild(textNode);
                rowNode.appendChild(cellNode);
                
                
                myTableBody.appendChild(rowNode);
            }
            
            document.getElementById('id_select_wifi_aps').options.length = 0;
            //            for( ap of contents['configured']) {
            contents['configured'].forEach(ap => {
                document.getElementById('id_select_wifi_aps').append(new Option(ap, ap));
                
//                var length=document.getElementById('id_select_wifi_aps').options.length
//                document.getElementById('id_select_wifi_aps').options[length] = new Option( ap, length )
                //                document.getElementById(id).selectedIndex = length;
            })
            
            
            document.getElementById('id_wifi').value = contents['current'] + " " + ifaces['wlan0']['IP'];
        }
        
        function importWifiScan(contents) {
            document.getElementById('id_spinner_wifi_scan').hidden = true;
            document.getElementById('id_select_wifi_scan_aps').options.length = 0;
            contents['scan_result'].forEach(ap => {
                document.getElementById('id_select_wifi_scan_aps').append(new Option(ap, ap));
                
//                var length=document.getElementById('id_select_wifi_aps').options.length
//                document.getElementById('id_select_wifi_aps').options[length] = new Option( ap, length )
                //                document.getElementById(id).selectedIndex = length;
            })
        }
        
        function clearTable(table) {
            var myTable = document.getElementById(table);
            var myTableBody = myTable.getElementsByTagName('table')[0].getElementsByTagName('tbody')[0];
            var tableRows = myTableBody.getElementsByTagName('tr');
//            var tableRows = myTable.getElementsByTagName('tr');
            var rowCount = tableRows.length;
            for( var i = rowCount-1; i >= 0; i--) {
//                myTable.deleteRow(i);
                myTableBody.removeChild(tableRows[i]);
            }
        }
        
        function importAppInfo(contents) {
            console.log("App Info contents: " + JSON.stringify(contents) );
            
            let appSelect = document.getElementById('id_app_select');
            appSelect.options.length = 0;
            
            clearTable('id_table_apps');
            var myTable = document.getElementById('id_table_apps');
            var myTableBody = myTable.getElementsByTagName('table')[0].getElementsByTagName('tbody')[0];
            
            for( const i in contents ) {
                let appInfo = contents[i];
                console.log("appInfo = " + appInfo);
                var rowNode = document.createElement("tr");
                var cellNode = document.createElement("td");
                
                var textNode = document.createTextNode(appInfo['app']);
                cellNode.appendChild(textNode);
                rowNode.appendChild(cellNode);
                
                cellNode = document.createElement("td");
                textNode = document.createTextNode(appInfo['service']);
                cellNode.appendChild(textNode);
                rowNode.appendChild(cellNode);
                
                cellNode = document.createElement("td");
                textNode = document.createTextNode(appInfo['enabled']);
                cellNode.appendChild(textNode);
                rowNode.appendChild(cellNode);
                
                cellNode = document.createElement("td");
                textNode = document.createTextNode(appInfo['running']);
                cellNode.appendChild(textNode);
                rowNode.appendChild(cellNode);
                
                cellNode = document.createElement("td");
                textNode = document.createTextNode(appInfo['description']);
                cellNode.appendChild(textNode);
                rowNode.appendChild(cellNode);
                
//                myTable.appendChild(rowNode);
                myTableBody.appendChild(rowNode);
                
                // Selection fo renabling:
                
                appSelect.append(new Option(appInfo['app'], appInfo['app']));
            }
            appSelect.append(new Option("None", "None"));   // For disabling apps
        }
        
        function onDisconnected(event) {
          // Object event.target is Bluetooth Device getting disconnected.
          myCharacteristic = null;
          console.log('BLE> Bluetooth Device disconnected');
          setStatus("Disconnected, try reconnecting");
            handleBleConnectionStateChange("Disconnected");
        }
        
        function handleBleConnectionStateChange(state) {
            var connectionLabel = document.getElementById('id_label_status');
            connectionLabel.value = state;
            
            var spinner = document.getElementById('id_spinner_ble');
            
            if(state.localeCompare("Connected") == 0 ) {
                connectionLabel.style.backgroundColor = "cyan";
                shouldEnableBleRequiredUi(true);
                spinner.hidden = true;
            } else if (state.localeCompare("Disconnected") == 0 ) {
                connectionLabel.style.backgroundColor = "red";
                shouldEnableBleRequiredUi(false);
                spinner.hidden = true;
            } else {
                connectionLabel.style.backgroundColor = "orange";
                shouldEnableBleRequiredUi(false);
                spinner.hidden = false;
            }
            // check state then disable/enable various ui elements here:
        }
        
        function shouldEnableBleRequiredUi(enable) {
            const bleElements = [
                           'id_btn_send_zone',
                           'id_btn_read_zone',
                           'id_btn_read_zone_processed',
                           'id_btn_add_wifi',
                           'id_wifi_psk',
                           'id_btn_read_wifi',
                           'id_btn_del_wifi',
                           'id_btn_app_enable',
                           'id_btn_app_read',
                           'id_btn_app_restart',
                           'id_btn_app_stop',
                           'id_btn_wifi_scan'
            ];
            bleElements.forEach( element => {
                document.getElementById(element).disabled = !enable;
            })
        }
        
        // Default:
        handleBleConnectionStateChange("Disconnected");
        
        var heartbeatBleCounter = 0;
        var heartbeatBleEnabled = false;
        setInterval(function(){
            if(!heartbeatBleEnabled) {
                return;
            }
            if(heartbeatBleCounter >= 15) {
                console.log("heartbeat failure!");
                handleBleConnectionStateChange("Disconnected");
            } else {
                heartbeatBleCounter++;
            }
            
        }, 1000)
        
        function onAvailabiltyChanged(event) {
          console.log('BLE> Availability changed: ' + event.value);
        }
        function onAdvertisementReceived(event) {
          console.log('BLE> Advertisement Received: ' + event.value);
        }
        
        
        function onServiceAdded(event) {
          console.log('BLE> Service Added: ' + event.value);
        }
        function onServiceChanged(event) {
          console.log('BLE> Service Changed: ' + event.value);
        }
        function onServiceRemoved(event) {
          console.log('BLE> Service Removed: ' + event.value);
            handleBleConnectionStateChange("Disconnected");
        }
        
        function sendCirclesCommand(value) {
            if (!myCommandCharacteristic) {
                return;
              }
            let encoder = new TextEncoder('utf-8');
//             let value = "C";
            console.log('BLE> Setting Command: ' + value);
            myCommandCharacteristic.writeValue(encoder.encode(value))
             .then(_ => {
               console.log('BLE> Command Characteristic User Description changed to: ' + value);
             })
             .catch(error => {
                 console.log('BLE> Argh! ' + error);
                 setStatus("Error occured, try reconnecting: " + error);
                 handleBleConnectionStateChange("Disconnected");
             });
        }
        
        function sendToBlue(value) {
            if (!myCharacteristic) {
                return;
              }
            let encoder = new TextEncoder('utf-8');
//             let value = "C";
            console.log('BLE> Setting Characteristic User Description...');
            myCharacteristic.writeValue(encoder.encode(value))
             .then(_ => {
               console.log('BLE> Characteristic User Description changed to: ' + value);
             })
             .catch(error => {
                 console.log('BLE> Argh! ' + error);
                 setStatus("Error occured, try reconnecting: " + error);
                 
                 handleBleConnectionStateChange("Disconnected");
             });
        }
        function sendCirclesConfig(value) {
            if (!myConfigCharacteristic) {
                return;
              }
            let encoder = new TextEncoder('utf-8');
//             let value = "C";
            console.log('BLE> Setting Config Characteristic User Description...');
            myConfigCharacteristic.writeValue(encoder.encode(value))
             .then(_ => {
               console.log('BLE> Config Characteristic User Description changed to: ' + value);
             })
             .catch(error => {
                 console.log('BLE> Argh! ' + error);
                 setStatus("Error occured, try reconnecting: " + error);
                 handleBleConnectionStateChange("Disconnected");
             });
        }
        
        function sendJsonDataToPi(buffer) {
            if (!hereToThePiCharacteristic) {
                return;
              }
            const max_size = 500;
            
            console.log('BLE> Sending large buffer to pi: ' + buffer.slice(0, max_size));
            
            let encoder = new TextEncoder('utf-8');
            hereToThePiCharacteristic.writeValue(encoder.encode(buffer.slice(0, max_size)))
            .then(_ => {
                if( buffer.length > max_size) {
                    sendJsonDataToPi(buffer.slice(max_size));
                    console.log('BLE> Success! sending next data chunk...');
                } else {
                    console.log('BLE> Success! Complete!');
                    console.log('BLE> Finalizing with uint8 (0)....!');
                    hereToThePiCharacteristic.writeValue(new Uint8Array([0]));
                }
            })
            .catch(error => {
                console.log('BLE> Argh! ' + error);
                setStatus("Error occured, try reconnecting: " + error);
                handleBleConnectionStateChange("Disconnected");
            });
            
        }
        
        document.getElementById('c_btn').addEventListener('click', function () {
            sendToBlue("C");
        })
        document.getElementById('f_btn').addEventListener('click', function () {
            sendToBlue("F");
        })
        document.getElementById('id_btn_read_wifi').addEventListener('click', function () {
            sendCirclesCommand("W");
        })
        document.getElementById('id_btn_wifi_scan').addEventListener('click', function () {
            sendCirclesCommand("S");
            document.getElementById('id_spinner_wifi_scan').hidden = false;
        })
        document.getElementById('id_btn_app_read').addEventListener('click', function () {
            sendCirclesCommand("A");
        })
        document.getElementById('id_btn_app_restart').addEventListener('click', function () {
            sendCirclesCommand("Ar");
        })
        document.getElementById('id_btn_app_stop').addEventListener('click', function () {
            sendCirclesCommand("As");
        })
        document.getElementById('id_app_fake').addEventListener('click', function () {
            var contents = [{
                app: "pandarecord",
                service: "pandarecord",
                enabled: "no",
                running: "yes",
                description: "CAN/GPS recorder"
            },{
                app: "simpleSend",
                service: "simplesend",
                enabled: "yes",
                running: "no",
                description: "Joystick command spoofer"
            }];
            importAppInfo(contents);
        })
        document.getElementById('id_btn_add_wifi').addEventListener('click', function () {
            console.log('Configuring wifi AP: ' + document.getElementById('id_select_wifi_scan_aps').value);
            
            document.getElementById('id_wifi_psk').value;
            
            var contents = JSON.stringify({
                ssid: document.getElementById('id_select_wifi_scan_aps').value,
                psk: document.getElementById('id_wifi_psk').value
            })
            
            var data = {
                type: 'wifi_add',
                contents: contents,
                length: contents.length
            }
            
            sendJsonDataToPi(JSON.stringify(data));
            
        })
        document.getElementById('id_btn_del_wifi').addEventListener('click', function () {
            console.log('Deleting wifi AP: ' + document.getElementById('id_select_wifi_aps').value);
            
            var contents = JSON.stringify({
                ssid: document.getElementById('id_select_wifi_aps').value
            })
            var data = {
                type: 'wifi_remove',
                contents: contents,
                length: contents.length
            }
            
            sendJsonDataToPi(JSON.stringify(data));
        })
        document.getElementById('id_btn_send_zone').addEventListener('click', function () {
           // sendCirclesConfig("{example: 'data'}");
            //sendJsonDataToPi("hello input BLE!");
            //sendJsonDataToPi(generate_config(data));
            
            // bad copy/paste:
            fetch("/api/add-entry/", {
                method: "POST",
                body: JSON.stringify({
                    vin: get_vin(),
                    offset: get_offset(),
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
                    //send_email(res);
                    var contents = JSON.stringify(generate_config(res))
                    console.log("BLE> Sending config file Length: " + contents.length)
                    var myJson = {
                        type: "zonefile",
                        contents: contents,
                        length: contents.length
                    }
//                    sendJsonDataToPi(generate_config(res));
                    sendJsonDataToPi(JSON.stringify(myJson));
                }
            });
        })
        document.getElementById('id_btn_read_zone').addEventListener('click', function () {
            //readCirclesConfig();
            sendCirclesCommand("R");
        })
        
        document.getElementById('id_btn_app_enable').addEventListener('click', function () {
            let appSelect = document.getElementById('id_app_select');
            console.log('Enabling app: ' + appSelect.value);
            
            var contents = JSON.stringify({
                app: appSelect.value,
            })
            
            var data = {
                type: 'app_enable',
                contents: contents,
                length: contents.length
            }
            
            sendJsonDataToPi(JSON.stringify(data));
        })
        
        
        document.getElementById('id_btn_read_zone_processed').addEventListener('click', function () {
            //readCirclesConfig();
            sendCirclesCommand("P");
        })
        
        // add interaction when loaded, so drawing can start instantly
        addInteractions();
        

        // save map and layer references to local state
        this.setState({ 
            map: map,
            raster: raster,
            source: source,
            vector: vector,
            view: view
        });
        
        
        
//        document.getElementById('id_nav').addEventListener('click', function () {
//            console.log('Click! ' + document.getElementById('id_nav').value);
////
////            //document.getElementById('id_form_2').hidden = true;
////        })
////        document.getElementById('id_two').addEventListener('click', function () {
////            console.log('Click Two! ' + document.getElementById('id_tab').value)
//        })
        
        var formZone = document.getElementById('id_form_zone');
        var formInternet = document.getElementById('id_form_internet');
        var formApps = document.getElementById('id_form_apps');
        var formDebug = document.getElementById('id_form_debug');
        
        var formElements = [
            formZone,
            formInternet,
            formApps,
            formDebug
            ];
        
        
        
        function setFormCurrent( formElement ) {
            document.getElementById('map').hidden = true;
            document.getElementById('id_container_zone').hidden = true;
            formElements.forEach( function (element) {
                    element.hidden = true;
            });
            formElement.hidden = false;
        }
        
        document.getElementById('id_navbar').addEventListener('click', function () {
            var navbar = document.getElementById('id_navbar');
//            console.log('Click! Navbar' + navbar);
//            console.log('Click! Navbar' + this.children);
//            $(".nav").find(".active").removeClass("active");
//            $(this).addClass("active");
            
            
        })
        document.getElementById('id_nav_zone').addEventListener('click', function () {
//            console.log('Click zone! ');
            setFormCurrent( formZone );
            document.getElementById('map').hidden = false;
            document.getElementById('id_container_zone').hidden = false;
        })
        
        document.getElementById('id_nav_internet').addEventListener('click', function () {
//            console.log('Click internet');
            setFormCurrent( formInternet );
        })
        
        document.getElementById('id_nav_debug').addEventListener('click', function () {
//            console.log('Click internet');
            setFormCurrent( formDebug );
        })
        
        document.getElementById('id_nav_apps').addEventListener('click', function () {
//            console.log('Click Apps');
            setFormCurrent( formApps );
        })
    }
    
    
//                <div className="tab" id="id_tab">
//                    <button className="tablinks" value="London">London</button>
//                    <button className="tablinks">Two</button>
//                </div>
    
    
//    <div className="row">
//        <div>
//            <input type="button" value="Debug" id="id_nav_debug" className="form_section" />
//            <input type="button" value="Connect" id="id_nav_connect" className="form_section" />
//        </div>
//    </div>
//    </form>
    
    //! switch to using material ui for buttons?
    render () {
        
        return (
                
                
            
                <div className="container">
                
                
                <Navbar variant="light" bg="light" id="id_navbar">
                <Container fluid>
                  <Navbar.Brand href="#">
                    <img
                              alt=""
                            src={logo}
                              width="30"
                              height="30"
                              className="d-inline-block align-top"
                            />{' '}
                    CIRCLES Pi Setup
                    </Navbar.Brand>
                  <button
                    className="navbar-toggler"
                    type="button"
                    data-toggle="collapse"
                    data-target="#navbarNavDropdown"
                    aria-controls="navbarNavDropdown"
                    aria-expanded="false"
                    aria-label="Toggle navigation"
                  >
                    <span className="navbar-toggler-icon"></span>
                  </button>

                  <div className="collapse navbar-collapse" id="navbarNavDropdown">
                    <ul className="navbar-nav">
                      <li className="nav-item active">
                        <a className="nav-link" href="#" id="id_nav_zone">Zones</a></li>
                      <li className="nav-item">
                        <a className="nav-link" id="id_nav_internet" href="#">Internet</a>
                      </li>
                <li className="nav-item">
                    <a className="nav-link" id="id_nav_apps" href="#">Apps</a>
                </li>
                    <li className="nav-item">
                        <a className="nav-link" id="id_nav_debug" href="#">Debug</a>
                    </li>
                      
                    </ul>
                  </div>
                
                <Form className="d-flex">
                <Navbar.Collapse className="justify-content-end">
                
                <Navbar.Text>Bluetooth:</Navbar.Text>
                </Navbar.Collapse>
                            <Form.Control
                              type="text bg-red"
                              id="id_label_status"
                              placeholder="Disconnected"
                              className="me-2"
                              aria-label="Search"
                            />
                <Spinner animation="border" variant="primary" id="id_spinner_ble"/>
                            <Button variant="primary" id="id_btn_connect_ble">Connect</Button>
                          </Form>
                
                </Container>
                </Navbar>
                
                
                
                
                
                
                
                <div className="container" id="id_container_view">
                
                
            <form id="id_form_apps">
                
                
                
                    <h4>Apps:</h4>
                <div>
                    <div className="app-table" id="id_table_apps">
                <table>
                <thead>
                <tr>
                  <th>Name</th>
                  <th>Service</th>
                  <th>Enabled</th>
                  <th>Running</th>
                  <th>Description</th>
                </tr>
                </thead>
                <tbody>
                <tr/>
                </tbody>
                </table>
                </div>
                </div>
                
                <select id="id_app_select" className="form_section" />
                <input type="button" value="Enable App" id="id_btn_app_enable" className="form_section"/>
                <input type="button" value="Refresh Apps" id="id_btn_app_read" className="form_section"/>
                <input type="button" value="Fake it" id="id_app_fake" className="form_section"/>
                <input type="button" value="Restart" id="id_btn_app_restart" className="form_section"/>
                <input type="button" value="Stop" id="id_btn_app_stop" className="form_section"/>
                
            </form>
                
                
                
                
                <Form id="id_form_internet">
                    <h4>Wifi:</h4>
                
                <div className="row">
                  <div className="col-sm-6">
                <div className="card text-left border-dark mb-3" style={{"maxWidth": "23rem"}}>
                <div className="card-header">
                    Current
                  </div>
                <div className="card-body">
                <Form.Label>Current Connected WiFi:</Form.Label>
                <br/>
                <Form.Control id="id_wifi" placeholder="Perform Refresh"/>
                <br/>
                <Button variant="primary" type="submit" id="id_btn_read_wifi">Refresh</Button>
                <br/>
                
                <Form.Label>Currently Configured WiFi Access Points:</Form.Label>
                <br/>
                
                <Form.Select id="id_select_wifi_aps" >
                </Form.Select>
                <br/>
                <Button variant="primary" type="submit" id="id_btn_del_wifi">Delete</Button>
                </div>
                </div>
                
                </div>
                
                
                <div className="col-sm-6">
                <div className="card text-left border-dark mb-3" style={{"maxWidth": "23rem"}}>
                
                <div className="card-header">
                    Scan/Add WiFi
                  </div>
                <div className="card-body">
                <Form.Label>Scanned WiFi Access Points:</Form.Label>
                <br/>
                <Form.Select id="id_select_wifi_scan_aps" >
                    <option>Perform WiFi Scan</option>
                </Form.Select>
                <br/>
                <Button variant="primary" type="submit" id="id_btn_wifi_scan">Scan Wifi</Button>
                <Spinner animation="border" id="id_spinner_wifi_scan" hidden="true"/>
                <br/>
                <Form.Label>WiFi Password:</Form.Label>
                <Form.Control type="password" placeholder="Password" id="id_wifi_psk" />
                <br/>
                <Button variant="primary" type="submit" id="id_btn_add_wifi">Add</Button>
                </div>
                </div>
                
                </div>
                </div>
                
                        <div className="table" id="id_iface_table">
                <table>
                <thead>
                <tr>
                  <th>iface</th>
                  <th>IP</th>
                </tr>
                </thead>
                <tbody>
                <tr />
                </tbody>
                </table>
                        </div>
               
                

                </Form>
                
                
                <form id="id_form_debug">
                <h4>Bluetooth Status:</h4>
                    <input type="id_input" placeholder="BLE Status" id="id_status" className="form_section" />
                <br/>
                <input type="button" value="Fake Poly" id="fake_btn" className="form_section"/>
                <input type="id_input" placeholder="Parsed" id="id_parse" className="form_section" />
                <h4>Pi Temperature:</h4>
                    <input type="id_input" placeholder="CPU Temp" id="id_cpu" className="form_section" />
                    <input type="button" value="Set C" id="c_btn" className="form_section"/>
                    <input type="button" value="Set F" id="f_btn" className="form_section"/>

                
                </form>
                
                <div className="container" id="id_container_zone">
            <div className="map" id="map"></div>
            <div className="sidebar">

                
                
                
                
                
                
                <form id="id_form_zone">
                    <select id="id_shape" className="form_section">
                        <option value="Circle">Circle</option>
                        <option value="Polygon">Polygon</option>
                        <option value="Geodesic">Geodesic</option>
                    </select>
                    <input type="button" value="Reset" id="reset_btn" className="form_section" />
                    <input type="id_input" placeholder="Offset in Meters" id="id_offset" className="form_section" />
                    <input type="button" value="Email" id="send_btn" className="form_section"/>
 
                    <input type="id_input" placeholder="Enter VIN" maxLength="17" id="id_input" className="form_section" />
                    <input type="file" id="selectedFile" />
                    <input type="button" value="Import" id="import_btn" className="form_section"/>
                
                <h4>Zone File Transfer:</h4>
                    <div className="row">
                        <div className="column">
                            <input type="button" value="Send Zone" id="id_btn_send_zone" className="form_section"/>
                        </div>
                        <div className="column">
                            <input type="button" value="Read Zone" id="id_btn_read_zone" className="form_section"/>
                            <input type="button" value="Read Processed" id="id_btn_read_zone_processed" className="form_section"/>
                        </div>
                    </div>
                
                </form>
                
               
                
                
                
                <p id="id-text-box"></p>
                <p id="coord-text-box"></p>
                <p id="test_send_btn"></p>
            </div>
                </div>
                
                </div>
                </div>
    );
    }
}

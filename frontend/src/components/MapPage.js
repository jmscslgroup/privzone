import React, { Component } from "react";

import 'ol/ol.css';
import Geolocation from 'ol/Geolocation';
import Draw from 'ol/interaction/Draw';
import {Modify, Snap} from 'ol/interaction.js';
import Polygon from 'ol/geom/Polygon.js';
import Circle from 'ol/geom/Circle.js';
import Point from 'ol/geom/Point.js';
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
        
        const modify = new Modify({source: source});
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

        var typeSelect = document.getElementById('type');

        // current object being placed
        //var draw;
        function addInteraction() {
            var value = typeSelect.value;
            if (value !== 'None') {
                draw = new Draw({
                source: source, // where the drawing occurs
                type: typeSelect.value,
                });
                map.addInteraction(draw); // create new drawing on mouse
                snap = new Snap({source: source});
                map.addInteraction(snap);
            }
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
                created_at: created_at
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
//                  color: 'red'
//                })
//              }))
            
            source.addFeature(featureone);
            console.log("iefhoiadfh");
            //source.addPolygon(newCoordinates);
        });
        
        function importJson(json) {
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
                    importJson(e.target.result);
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
//                    style.fill.color = 'red';
//                    featureone.setStyle(style);
                    featureone.setStyle(new Style({
                        stroke: new Stroke({
                       // lineDash: 1,
                        color: 'red'
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
                coords.push(coords[0].slice());
                
                var polyone = new Polygon([coords]);
                var featureone = new Feature(polyone);
                
                if(hysteresis) {
//                    var style = featureone.getStyle();
//                    style.fill.color = 'red';
//                    featureone.setStyle(style);
                    featureone.setStyle(new Style({
                        stroke: new Stroke({
                       // lineDash: 1,
                        color: 'red'
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
        
        var myCharacteristic;
        var myCommandCharacteristic;
        var myConfigCharacteristic;
        var hereToThePiCharacteristic;
        // check for bluetooth stuff
//        document.addEventListener('blue_btn', function(event) {
        document.getElementById('blue_btn').addEventListener('click', function () {
            console.log("Blue daba dee");
            
            
//            navigator.bluetooth.getAvailability().then((available) => {
//              if (available) {
//                console.log("This device supports Bluetooth!");
//              } else {
//                console.log("Doh! Bluetooth is not supported");
//              }
//            });
            
           // let optionalServices = document.getElementById('optionalServices').value
            //    .split(/, ?/).map(s => s.startsWith('0x') ? parseInt(s) : s)
             //   .filter(s => s && BluetoothUUID.getService);
            
//            const options = {
//                //filters: [ { name: "1J8GX58S03C507022" } ],
////            filters: [
//////                        {services: ["00000001-710e-4a5b-8d75-3e5b444bc3cf"] }
////                      //{namePrefix: "Temperature" }
////                        {namePrefix: "T" }
////                      ],
//              acceptAllDevices : true,
//              optionalServices: ['00000001-710e-4a5b-8d75-3e5b444b3c3f'] // Required to access service later.
//            };
            
            let options = {};
            
             // options.acceptAllDevices = true;
//            options.filters = [ {name: "circles"} ];
            options.filters = [ {services: ['00000001-3d3d-3d3d-3d3d-3d3d3d3d3d3d'] } ];
//            options.filters = [ {services: ["00000001-710E-4A5B-8D75-3E5B444B3C3F"] } ];
             // optionalServices: [] // Required to access service later.
//            options.optionalServices = [ '00000001-710e-4a5b-8d75-3e5b444bc3cf' ];
//            };
            
            console.log('BLE> Requesting Bluetooth Device...');
            navigator.bluetooth.addEventListener('availabilitychanged', onAvailabiltyChanged);  // this is for Bluetooth as a whole, not indiivdual device connectivity
            console.log('BLE> with ' + JSON.stringify(options));
            navigator.bluetooth.requestDevice( options )
            .then(device => {
                //console.log(`Name: ${device.name}`);
                console.log('BLE> Name:             ' + device.name);
                console.log('BLE> Id:               ' + device.id);
                console.log('BLE> Connected:        ' + device.gatt.connected);
                
                device.addEventListener('gattserverdisconnected', onDisconnected);
                device.addEventListener('advertisementreceived', onAdvertisementReceived);
                device.gatt.connect()
                .then(server => {
                    console.log('BLE> Connected: ' + server.connected);
                    //server.getPrimaryServices().
                    //then( services => console.log('server.getPrimaryServices(): -> ' + services.getPrimaryServices()));
                    
//                    server.getPrimaryService('00000001-710e-4a5b-8d75-3e5b444bc3cf')
                    server.getPrimaryService('00000001-3d3d-3d3d-3d3d-3d3d3d3d3d3d')
                    //                    .then(service => console.log('yay!'));
                    //                })
                    .then(service => {
                        device.addEventListener('serviceadded', onServiceAdded);
                        device.addEventListener('servicechanged', onServiceChanged);
                        device.addEventListener('serviceremoved', onServiceRemoved);
                        
                        console.log('BLE> getting characteristic 00000002-3d3d-3d3d-3d3d-3d3d3d3d3d3d...');
                        service.getCharacteristic('00000002-3d3d-3d3d-3d3d-3d3d3d3d3d3d')
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
                        
                        console.log('BLE> getting characteristic 00000006-3d3d-3d3d-3d3d-3d3d3d3d3d3d...');
                        service.getCharacteristic('00000006-3d3d-3d3d-3d3d-3d3d3d3d3d3d')
                        .then(characteristic => {
                            console.log('BLE> Starting notifications...');
                            characteristic.startNotifications().then(characteristic => {
                                console.log('BLE> Adding eventListener...');
                                characteristic.addEventListener('characteristicvaluechanged',
                                                                handleNotificationCirclesStatusCharacteristic);
                                console.log('BLE> Notifications have been started.');
                            });
                        });
                              
                        console.log('BLE> getting characteristic 00000003-3d3d-3d3d-3d3d-3d3d3d3d3d3d...');
                        service.getCharacteristic('00000003-3d3d-3d3d-3d3d-3d3d3d3d3d3d')
                        .then(characteristic => {
                            console.log('BLE> - ' + characteristic);
                            myCommandCharacteristic = characteristic;
//                            characteristic.getDescriptors()
//                            .then(descriptors => {
//                                console.log('BLE> - Descriptors: ' +
//                                            descriptors.map(c => c.uuid).join('\n' + ' '.repeat(19)));
//                            });
                        });
                        
                        console.log('BLE> getting characteristic 00000004-3d3d-3d3d-3d3d-3d3d3d3d3d3d...');
                        service.getCharacteristic('00000004-3d3d-3d3d-3d3d-3d3d3d3d3d3d')
                        .then(characteristic => {
                            console.log('BLE> - ' + characteristic);
                            myConfigCharacteristic = characteristic;
                        });
                        
                        console.log('BLE> getting characteristic 00000005-3d3d-3d3d-3d3d-3d3d3d3d3d3d...');
                        service.getCharacteristic('00000005-3d3d-3d3d-3d3d-3d3d3d3d3d3d')
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
                                console.log('BLE> Notifications have been started.');
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
          for (let i = 0; i < value.byteLength; i++) {
            a.push('0x' + ('00' + value.getUint8(i).toString(16)).slice(-2));
              a.push('0x' + ('00' + value.getUint8(i).toString(16)).slice(-2));
          }
          console.log('BLE> ' + a.join(' '));
            let utf8decoder = new TextDecoder();
            console.log(utf8decoder.decode(value));
            
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
            //console.log('BLE> CircleNotification: num bytes: ' + value.byteLength + ' final char: ' + value.getUint8(value.byteLength-1));
            if(value.getUint8(value.byteLength-1) == 0) {
                
                finalMessage = buffer.slice(0,buffer.length-1);
                buffer = "";
                
                //console.log('BLE> CircleNotification: This was the final message: ' + finalMessage);
                
                console.log("BLE> Input received");
//                importJson(finalMessage);
                handleCirclesInput(finalMessage)
            }
            
//            document.getElementById('id_cpu').value = utf8decoder.decode(value);
        }
            
            function  handleNotificationCirclesStatusCharacteristic(event) {
                let value = event.target.value;
                
                let utf8decoder = new TextDecoder();
                
                document.getElementById('id_status').value = utf8decoder.decode(value);
            }
        
        function handleCirclesInput(message) {
            var input = JSON.parse(message);
            console.log("File type: " + input['type']);
            //console.log("File contents: " + input['contents']);
            console.log("File length:  " + input['length']);
            console.log(" - my length: " + input['contents'].length);
            if(input['length'] == input['contents'].length) {
                console.log("Success in reading input!");
                if(input['type'].localeCompare('zonefile') == 0) {
                    importJson(input['contents']);
                }
            }
            
        }
        
        function onDisconnected(event) {
          // Object event.target is Bluetooth Device getting disconnected.
          myCharacteristic = null;
          console.log('BLE> Bluetooth Device disconnected');
        }
        
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
        }
        
        function sendCirclesCommand(value) {
            if (!myCommandCharacteristic) {
                return;
              }
            let encoder = new TextEncoder('utf-8');
//             let value = "C";
            console.log('BLE> Setting Command Characteristic User Description...');
            myCommandCharacteristic.writeValue(encoder.encode(value))
             .then(_ => {
               console.log('BLE> Command Characteristic User Description changed to: ' + value);
             })
             .catch(error => {
                 console.log('BLE> Argh! ' + error);
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
             });
        }
        
        function sendLargeString(buffer) {
            if (!hereToThePiCharacteristic) {
                return;
              }
            const max_size = 500;
            
            console.log('BLE> Sending large buffer to pi: ' + buffer.slice(0, max_size));
            
            let encoder = new TextEncoder('utf-8');
            hereToThePiCharacteristic.writeValue(encoder.encode(buffer.slice(0, max_size)))
            .then(_ => {
                if( buffer.length > max_size) {
                    sendLargeString(buffer.slice(max_size));
                    console.log('BLE> Success! sending next data chunk...');
                } else {
                    console.log('BLE> Success! Complete!');
                    console.log('BLE> Finalizing with uint8 (0)....!');
                    hereToThePiCharacteristic.writeValue(new Uint8Array([0]));
                }
            })
            .catch(error => {
                console.log('BLE> Argh! ' + error);
            });
            
        }
        
        document.getElementById('c_btn').addEventListener('click', function () {
            sendToBlue("C");
        })
        document.getElementById('f_btn').addEventListener('click', function () {
            sendToBlue("F");
        })
        document.getElementById('cmd_btn').addEventListener('click', function () {
            sendCirclesCommand("Gimme");
        })
        document.getElementById('sendcfg_btn').addEventListener('click', function () {
           // sendCirclesConfig("{example: 'data'}");
            //sendLargeString("hello input BLE!");
            //sendLargeString(generate_config(data));
            
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
//                    sendLargeString(generate_config(res));
                    sendLargeString(JSON.stringify(myJson));
                }
            });
        })
        document.getElementById('readcfg_btn').addEventListener('click', function () {
            //readCirclesConfig();
            sendCirclesCommand("R");
        })

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
                    <input type="id_input" placeholder="Offset in Meters" id="id_offset" className="form_section" />
                    <input type="button" value="Send" id="send_btn" className="form_section"/>
                    <input type="button" value="Fake Poly" id="fake_btn" className="form_section"/>
                    <input type="file" id="selectedFile" />
                    <input type="button" value="Import" id="import_btn" className="form_section"/>
                    <input type="id_input" placeholder="Parsed" id="id_parse" className="form_section" />
                    <input type="button" value="Blue" id="blue_btn" className="form_section"/>
                    <input type="id_input" placeholder="CPU Temp" id="id_cpu" className="form_section" />
                    <input type="button" value="Set C" id="c_btn" className="form_section"/>
                    <input type="button" value="Set F" id="f_btn" className="form_section"/>
                    <input type="button" value="Send Cmd" id="cmd_btn" className="form_section"/>
                    <input type="button" value="Send Config" id="sendcfg_btn" className="form_section"/>
                    <input type="button" value="Read Config" id="readcfg_btn" className="form_section"/>
                    <input type="id_input" placeholder="BLE Status" id="id_status" className="form_section" />


                </form>
                <p id="id-text-box"></p>
                <p id="coord-text-box"></p>
                <p id="test_send_btn"></p>
            </div>
        </div>
    );
    }
}

import 'ol/ol.css';
import Geolocation from 'ol/Geolocation';
import Draw from 'ol/interaction/Draw';
import Map from 'ol/Map';
import View from 'ol/View';
import {toLonLat, transform} from 'ol/proj';
import {OSM, Vector as VectorSource} from 'ol/source';
import {Tile as TileLayer, Vector as VectorLayer} from 'ol/layer';

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
});

var map = new Map({
  layers: [raster, vector],
  target: 'map',
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

// id field apply button
document.getElementById('apply_btn').addEventListener('click', function () {
  update_id();
});

// send button
document.getElementById('send_btn').addEventListener('click', function () {
  console.log("SENDING...");
});

// check for escape to do a soft reset and get rid of last drawn point
document.addEventListener('keyup', function(event) {
  if (event.key == "Escape") {
    clear_current_interactive();
  }
});

// add interaction when loaded, so drawing can start instantly
addInteraction();
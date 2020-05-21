// initialize our map
var map = L.map('map');

//add esri topo basemap
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 11,
  minZoom: 7,
  attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
}).addTo(map);

//add a scale bar
L.control.scale({
  position: 'bottomleft'
}).addTo(map);

//load the data asynchronously
d3.queue()
  .defer(d3.json, 'https://opendata.arcgis.com/datasets/6a84756c2e444a87828bb7ce699fdac6_0.geojson') //the Iowa COVID-19 geojson file
  .await(drawMap); //load the layers after the map loads

//provide instructions for drawing the map
function drawMap(err, corona) {

  //get the total case count for Iowa
  var caseTotal = ss.sum(corona.features.map(function(feature) {
    return feature.properties['Confirmed'];
  }));

  // Group totals of confirmed cases into 5 ckmeans categories
  var caseStops = ss.ckmeans(corona.features.map(function(feature) {
    return feature.properties['Confirmed'];
  }), 5);

  // Add a function to style the counties by their confirmed cases (ck means)
  function getCaseColor(d) {
    return d >= ss.min(caseStops[4]) ? '#08519c' :
      d >= ss.min(caseStops[3]) ? '#3182bd' :
      d >= ss.min(caseStops[2]) ? '#6baed6' :
      d >= ss.min(caseStops[1]) ? '#bdd7e7' :
      d >= ss.min(caseStops[0]) ? '#eff3ff' :
      'rgba(0,0,0,0.0)';
  };

  //get the total death count for Iowa
  var deathTotal = ss.sum(corona.features.map(function(feature) {
    return feature.properties['Deaths'];
  }));

  console.log(deathTotal);

  // Group totals of deaths into 5 ckmeans categories
  var deathStops = ss.ckmeans(corona.features.map(function(feature) {
    return feature.properties['Deaths'];
  }), 5);

  // Add a function to style the counties by their confirmed deaths (ck means)
  function getDeathColor(d) {
    return d >= ss.min(deathStops[4]) ? '#08519c' :
      d >= ss.min(deathStops[3]) ? '#3182bd' :
      d >= ss.min(deathStops[2]) ? '#6baed6' :
      d >= ss.min(deathStops[1]) ? '#bdd7e7' :
      d >= ss.min(deathStops[0]) ? '#eff3ff' :
      'rgba(0,0,0,0.0)';
  };

  var cases = L.geoJson(corona, { //define layer with a variable

    style: function(feature) {

      var props = feature.properties;

      return {
        stroke: 1,
        color: "grey",
        weight: 1,
        fillColor: getCaseColor(props.Confirmed),
        fillOpacity: 0.5
      };
    },

    //restyle on mouseover, reset style on mouseout
    onEachFeature: function(feature, layer) {

      console.log(feature.properties);

      // bind a popup window
      layer.bindPopup('<h4><b>' + feature.properties.Name + ' County' +
        '<br>' + 'Population: ' + feature.properties.pop_est_2018 + '</b>' +
        '<br><br>Confirmed Cases: ' + feature.properties.Confirmed +
        '<br>Statewide Total: ' + caseTotal +
        '<br>Last Updated: ' + feature.properties.last_updated.substring(0, feature.properties.last_updated.length - 8) +
        '</h4>', {
          maxHeight: 300,
          minWidth: 150,
          maxWidth: 200,
        });

      // change layer style on mouseover
      layer.on("mouseover", function(e) {
        layer.setStyle({
          weight: 2,
          color: "blue",
          opacity: 0.75,
          fillOpacity: 0.75,
        }).bringToFront();
      });
      // reset style on mouseout
      layer.on("mouseout", function(e) {
        cases.resetStyle(e.target);
      });
    }

  }).addTo(map); // add COVID-19 Cases layer and style

  var deaths = L.geoJson(corona, { //define layer with a variable

    style: function(feature) {

      var props = feature.properties;

      return {
        stroke: 1,
        color: "grey",
        weight: 1,
        fillColor: getDeathColor(props.Deaths),
        fillOpacity: 0.5
      };
    },

    //restyle on mouseover, reset style on mouseout
    onEachFeature: function(feature, layer) {

      // bind a popup window
      layer.bindPopup('<h4><b>' + feature.properties.Name + ' County' +
        '<br>' + 'Population: ' + feature.properties.pop_est_2018 + '</b>' +
        '<br><br>Deaths: ' + feature.properties.Deaths +
        '<br>Statewide Total: ' + deathTotal +
        '<br>Last Updated: ' + feature.properties.last_updated.substring(0, feature.properties.last_updated.length - 8) +
        '</h4>', {
          maxHeight: 300,
          minWidth: 150,
          maxWidth: 200,
        });

      // change layer style on mouseover
      layer.on("mouseover", function(e) {
        layer.setStyle({
          weight: 2,
          color: "blue",
          opacity: 0.75,
          fillOpacity: 0.75,
        }).bringToFront();
      });
      // reset style on mouseout
      layer.on("mouseout", function(e) {
        deaths.resetStyle(e.target);
      });
    }

  }); // add COVID-19 Deaths layer and style

  //define layers
  var baselayers = {
    "Confirmed Cases": cases,
    "Confirmed Deaths": deaths,
  };

  //send the layers to the layer control
  L.control.layers(baselayers, null, {
    collapsed: false,
  }).addTo(map);

  // create an info button to describe the map and supporting data
  var infoButton = L.easyButton({
    id: 'infoButton',
    position: 'topright',
    states: [{
      stateName: 'show-info',
      icon: '<strong>?</strong>',
      title: 'Tell me about this map',
      onClick: function(btn, map) {
        $("#dialog").dialog();
      }
    }]
  }).addTo(map);

  // create legends for both layers
  var caseLegend = L.control({
    position: 'bottomright'
  });

  var deathLegend = L.control({
    position: 'bottomright'
  });

  // add content to the legend
  caseLegend.onAdd = function(map) {

    var div = L.DomUtil.create('div', 'info legend'),
      grades = [ss.min(caseStops[0]), ss.min(caseStops[1]), ss.min(caseStops[2]), ss.min(caseStops[3]), ss.min(caseStops[4])],
      labels = ["<h6 style='font-size:14px; font-weight:bold'>Confirmed Cases</h6>"];

    // loop through our intervals and generate a label with a colored square for each interval
    for (var i = 0; i < grades.length; i++) {
      div.innerHTML +=
        labels.push('<i style="background:' + getCaseColor(grades[i]) + '"></i> ' +
          grades[i] + (grades[i + 1] ? '&ndash;' + (grades[i + 1] - 1) : '+'));
    }
    div.innerHTML = labels.join('<br>');
    return div;
  };

  // add content to the legend
  deathLegend.onAdd = function(map) {

    var div = L.DomUtil.create('div', 'info legend'),
      grades = [ss.min(deathStops[0]), ss.min(deathStops[1]), ss.min(deathStops[2]), ss.min(deathStops[3]), ss.min(deathStops[4])],
      labels = ["<h6 style='font-size:14px; font-weight:bold'>Confirmed Deaths</h6>"];

    // loop through our intervals and generate a label with a colored square for each interval
    for (var i = 0; i < grades.length; i++) {
      div.innerHTML +=
        labels.push('<i style="background:' + getDeathColor(grades[i]) + '"></i> ' +
          grades[i] + (grades[i + 1] ? '&ndash;' + (grades[i + 1] - 1) : '+'));
    }
    div.innerHTML = labels.join('<br>');
    return div;
  };

  // add this legend first, because this layer is on by default
  caseLegend.addTo(map);

  // when the user changes the baselayer, switch the legend
  map.on('baselayerchange', function(eventLayer) {
    // Switch to the Confirmed Cases legend...
    if (eventLayer.name === 'Confirmed Cases') {
      this.removeControl(deathLegend);
      caseLegend.addTo(this);
    } else { // Or switch to the Confirmed Deaths legend...
      this.removeControl(caseLegend);
      deathLegend.addTo(this);
    }
  });

  //fit the map to the extent of the cases layer upon drawing
  map.fitBounds(cases.getBounds());

}; //end drawMap function

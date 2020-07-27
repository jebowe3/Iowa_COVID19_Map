// initialize our map
var map = L.map('map');

// Add esri topo basemap
L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
  maxZoom: 11,
  minZoom: 7,
  attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, TomTom, Intermap, iPC, USGS, FAO, NPS, NRCAN, GeoBase, Kadaster NL, Ordnance Survey, Esri Japan, METI, Esri China (Hong Kong), and the GIS User Community'
}).addTo(map);

// Add a scale bar
L.control.scale({
  position: 'bottomleft'
}).addTo(map);

// Load the data asynchronously
d3.queue()
  .defer(d3.json, 'https://opendata.arcgis.com/datasets/6a84756c2e444a87828bb7ce699fdac6_0.geojson') //the Iowa COVID-19 geojson file
  .await(drawMap); //load the layers after the map loads

// Provide instructions for drawing the map
function drawMap(err, corona) {

  // Return all of the case numbers
  var caseArrayPrelim = corona.features.map(function(feature) {
    return feature.properties['Confirmed'];
  });

  // Remove the last value in the array, because these are pending investigation and not yet assigned to any county
  // CHECK YOUR DATA TO SEE IF IT IS INCLUDING ANY DATA NOT ASSIGNED TO A COUNTY
  var caseArray = caseArrayPrelim.slice(0,-1);

  // Get the total confirmed case count for Iowa
  var caseTotal = ss.sum(caseArray);

  // Group totals of confirmed cases into 5 ckmeans categories
  var caseStops = ss.ckmeans(caseArray, 5);

  // Add a function to style the counties by their confirmed cases (ck means)
  function getCaseColor(d) {
    return d >= ss.min(caseStops[4]) ? '#08519c' :
      d >= ss.min(caseStops[3]) ? '#3182bd' :
      d >= ss.min(caseStops[2]) ? '#6baed6' :
      d >= ss.min(caseStops[1]) ? '#bdd7e7' :
      d >= ss.min(caseStops[0]) ? '#eff3ff' :
      'rgba(0,0,0,0.0)';
  };

  // Return all of the death numbers
  var deathArrayPrelim = corona.features.map(function(feature) {
    return feature.properties['Deaths'];
  });

  // Remove the last value in the array, because these are pending investigation and not yet assigned to any county
  var deathArray = deathArrayPrelim.slice(0,-1)

  // Get the total confirmed death count for Iowa
  var deathTotal = ss.sum(deathArray);

  // Group totals of confirmed deaths into 5 ckmeans categories
  var deathStops = ss.ckmeans(deathArray, 5);

  // Add a function to style the counties by their confirmed deaths (ck means)
  function getDeathColor(d) {
    return d >= ss.min(deathStops[4]) ? '#08519c' :
      d >= ss.min(deathStops[3]) ? '#3182bd' :
      d >= ss.min(deathStops[2]) ? '#6baed6' :
      d >= ss.min(deathStops[1]) ? '#bdd7e7' :
      d >= ss.min(deathStops[0]) ? '#eff3ff' :
      'rgba(0,0,0,0.0)';
  };

  // *** NORMALIZING THE DATA *** //

  // Get an array of case counts per 1,000 people per county, rounded to two decimal places
  var normCaseArrayPrelim = corona.features.map(function(feature) {
    return (((feature.properties.Confirmed/feature.properties.pop_est_2018)*1000).toFixed(2));
  });

  // Remove the last entry in the array as this refers to cases pending investigation, not cases for a particular county
  var normCaseArray = normCaseArrayPrelim.slice(0,-1);

  // Group the case count per 1,000 people per county into 5 ckmeans categories
  var normCaseStops = ss.ckmeans(normCaseArray, 5);

  // Add a function to style the counties by cases/1,000 (ck means)
  function getNormCaseColor(d) {
    return d >= ss.min(normCaseStops[4]) ? '#08519c' :
      d >= ss.min(normCaseStops[3]) ? '#3182bd' :
      d >= ss.min(normCaseStops[2]) ? '#6baed6' :
      d >= ss.min(normCaseStops[1]) ? '#bdd7e7' :
      d >= ss.min(normCaseStops[0]) ? '#eff3ff' :
      'rgba(0,0,0,0.0)';
  };

  // Get an array of death counts per 1,000 people per county, rounded to two decimal places
  var normDeathArrayPrelim = corona.features.map(function(feature) {
    return (((feature.properties.Deaths/feature.properties.pop_est_2018)*1000).toFixed(2));
  });

  // Remove the last entry in the array as this refers to deaths pending investigation, not cases for a particular county
  var normDeathArray = normDeathArrayPrelim.slice(0,-1);

  // Group the death count per 1,000 people per county into 5 ckmeans categories
  var normDeathStops = ss.ckmeans(normDeathArray, 5);

  // Add a function to style the counties by deaths/1,000 (ck means)
  function getNormDeathColor(d) {
    return d >= ss.min(normDeathStops[4]) ? '#08519c' :
      d >= ss.min(normDeathStops[3]) ? '#3182bd' :
      d >= ss.min(normDeathStops[2]) ? '#6baed6' :
      d >= ss.min(normDeathStops[1]) ? '#bdd7e7' :
      d >= ss.min(normDeathStops[0]) ? '#eff3ff' :
      'rgba(0,0,0,0.0)';
  };

  // *** END NORMALIZING THE DATA *** //

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

  }); // End COVID-19 Deaths layer and style

  var normCases = L.geoJson(corona, { //define layer with a variable

    style: function(feature) {

      var colorProps = (feature.properties.Confirmed/feature.properties.pop_est_2018)*1000;

      return {
        stroke: 1,
        color: "grey",
        weight: 1,
        // Use parseFloat because one result is not a number, due to the
        // inclusion of cases pending investigation not assigned to any county
        fillColor: getNormCaseColor(parseFloat((colorProps).toFixed(2))),
        fillOpacity: 0.5
      };
    },

    //restyle on mouseover, reset style on mouseout
    onEachFeature: function(feature, layer) {

      var props = feature.properties;
      var colorProps = (props.Confirmed/props.pop_est_2018)*1000;

      // bind a popup window
      layer.bindPopup('<h4><b>' + props.Name + ' County' +
        '<br>' + 'Population: ' + props.pop_est_2018 + '</b>' +
        '<br><br>Cases per 1,000: ' + ((colorProps).toFixed(2)) +
        '<br>Last Updated: ' + props.last_updated.substring(0, props.last_updated.length - 8) +
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
        layer.setStyle({
          stroke: 1,
          color: "grey",
          weight: 1,
          // Use parseFloat because one result is not a number, due to the
          // inclusion of cases pending investigation not assigned to any county
          fillColor: getNormCaseColor(parseFloat((colorProps).toFixed(2))),
          fillOpacity: 0.5
        });
      });
    }

  }); // End COVID-19 Cases per 1,000 layer and style

  var normDeaths = L.geoJson(corona, { //define layer with a variable

    style: function(feature) {

      var colorProps = (feature.properties.Deaths/feature.properties.pop_est_2018)*1000;

      return {
        stroke: 1,
        color: "grey",
        weight: 1,
        // Use parseFloat because one result is not a number, due to the
        // inclusion of deaths pending investigation not assigned to any county
        fillColor: getNormDeathColor(parseFloat((colorProps).toFixed(2))),
        fillOpacity: 0.5
      };
    },

    //restyle on mouseover, reset style on mouseout
    onEachFeature: function(feature, layer) {

      var props = feature.properties;
      var colorProps = (props.Deaths/props.pop_est_2018)*1000;

      // bind a popup window
      layer.bindPopup('<h4><b>' + props.Name + ' County' +
        '<br>' + 'Population: ' + props.pop_est_2018 + '</b>' +
        '<br><br>Deaths per 1,000: ' + ((colorProps).toFixed(2)) +
        '<br>Last Updated: ' + props.last_updated.substring(0, props.last_updated.length - 8) +
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
        layer.setStyle({
          stroke: 1,
          color: "grey",
          weight: 1,
          // Use parseFloat because one result is not a number, due to the
          // inclusion of deaths pending investigation not assigned to any county
          fillColor: getNormDeathColor(parseFloat((colorProps).toFixed(2))),
          fillOpacity: 0.5
        });
      });
    }

  }); // End COVID-19 Deaths per 1,000 layer and style

  //define layers
  var baselayers = {
    "Confirmed Cases": cases,
    "Confirmed Deaths": deaths,
    "Cases/1,000 Pop.": normCases,
    "Deaths/1,000 Pop.": normDeaths,
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

  // create legends for layers
  var caseLegend = L.control({
    position: 'bottomright'
  });

  var deathLegend = L.control({
    position: 'bottomright'
  });

  var normCaseLegend = L.control({
    position: 'bottomright'
  });

  var normDeathLegend = L.control({
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

  // add content to the legend
  normCaseLegend.onAdd = function(map) {

    var div = L.DomUtil.create('div', 'info legend'),
      grades = [ss.min(normCaseStops[0]), ss.min(normCaseStops[1]), ss.min(normCaseStops[2]), ss.min(normCaseStops[3]), ss.min(normCaseStops[4])],
      labels = ["<h6 style='font-size:14px; font-weight:bold'>Cases Per 1,000 People</h6>"];

    // loop through our intervals and generate a label with a colored square for each interval
    for (var i = 0; i < grades.length; i++) {
      div.innerHTML +=
        // Use parseFloat because one result is not a number, due to the
        // inclusion of cases pending investigation not assigned to any county
        labels.push('<i style="background:' + getNormCaseColor(parseFloat(grades[i])) + '"></i> ' +
          grades[i] + (grades[i + 1] ? '&ndash;' + (grades[i + 1] - 0.01).toFixed(2) : '+'));
    }
    div.innerHTML = labels.join('<br>');
    return div;
  };

  // add content to the legend
  normDeathLegend.onAdd = function(map) {

    var div = L.DomUtil.create('div', 'info legend'),
      grades = [ss.min(normDeathStops[0]), ss.min(normDeathStops[1]), ss.min(normDeathStops[2]), ss.min(normDeathStops[3]), ss.min(normDeathStops[4])],
      labels = ["<h6 style='font-size:14px; font-weight:bold'>Deaths Per 1,000 People</h6>"];

    // loop through our intervals and generate a label with a colored square for each interval
    for (var i = 0; i < grades.length; i++) {
      div.innerHTML +=
        // Use parseFloat because one result is not a number, due to the
        // inclusion of deaths pending investigation not assigned to any county
        labels.push('<i style="background:' + getNormDeathColor(parseFloat(grades[i])) + '"></i> ' +
          grades[i] + (grades[i + 1] ? '&ndash;' + (grades[i + 1] - 0.01).toFixed(2) : '+'));
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
      this.removeControl(normCaseLegend);
      this.removeControl(normDeathLegend);
      caseLegend.addTo(this);
    } if (eventLayer.name === 'Confirmed Deaths') { // Or switch to the Confirmed Deaths legend...
      this.removeControl(caseLegend);
      this.removeControl(normCaseLegend);
      this.removeControl(normDeathLegend);
      deathLegend.addTo(this);
    } if (eventLayer.name === 'Cases/1,000 Pop.') { // Or switch to the Cases/1,000 Pop. legend...
      this.removeControl(caseLegend);
      this.removeControl(deathLegend);
      this.removeControl(normDeathLegend);
      normCaseLegend.addTo(this);
    } if (eventLayer.name === 'Deaths/1,000 Pop.') { // Or switch to the Deaths/1,000 Pop. legend...
      this.removeControl(caseLegend);
      this.removeControl(deathLegend);
      this.removeControl(normCaseLegend);
      normDeathLegend.addTo(this);
    }
  });

  //fit the map to the extent of the cases layer upon drawing
  map.fitBounds(cases.getBounds());

}; //end drawMap function

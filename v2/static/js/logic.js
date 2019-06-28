console.log('logic.js read in')

//  Craete loader function to show spinner
function loader() {
  $('#mapText').after('<div class="loader"></div>')
}

// Function to inialize script when search box is clicked
function enterSearch() {
  
  //call loader, remove conent from div tags
  $ ("#scrapeText").empty()
  $ ('#mapText').empty()
  $ ('#salaryText').empty()

  // use jQuery to pass variable to flask route to initiate 
  var searchurl = 'http://127.0.0.1:5000/search/'+$('#inputText').val() 
  $ (location).attr('href', searchurl)
  
  //  call loader function
  loader()

  // add text to show data is being scraped
  $ ("#scrapeText").append('<h3>Gathering Data for Search Term: "' + $('#inputText').val() + '"</h3>') 
};

// Function to create map when button is clicked
function mapResults() {

  // remove content from div tages
  $ ('#mapText').empty()
  $ ("#scrapeText").empty()
  $ ('#salaryText').empty()

  // set url endpoints for json calls
  // note: change when deployed
  const apiurl = 'http://127.0.0.1:5000/api'
  const salaryurl = 'http://127.0.0.1:5000/salary'

  // use d3 to grab value of search term to show on top of map
  d3.json(apiurl, function(data) {
   var searchTerm = data[0].Search_Term
   $ ("#mapText").append('<h3 align="center">Showing Data for Search Term: "' + searchTerm + '"</h3>') 
  })

 //  use d3 to grab salary data from salary end point
  d3.json(salaryurl, function(data) {
    console.log(data.median_salary)
   $ ("#salaryText").append('<h4 align="center">Median Salary: ' + data.median_salary + '</h4>')
  })
 
 // call api endpoint and create map by passing data to function
  var data = d3.json(apiurl, function(data) {
  createPoints(data)
  })
};

// initialize streetmap
var streetmap = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
  attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
  maxZoom: 18,
  id: "mapbox.streets",
  accessToken: API_KEY
});

// initalize darkmap layer
var darkmap = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
  attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
  maxZoom: 18,
  id: "mapbox.dark",
  accessToken: API_KEY
});

// initialize base map layer
var baseMaps = {
    "Street Map": streetmap,
    "Dark Mode": darkmap
  };

// initalize map on loading
var myMap = L.map("map", {
    center: [37.09, -95.71],
    zoom: 4.5,
    layers: [streetmap]
  });

// function to create map using api endpoint
function createPoints(data) {

  // remove map shown on load
  // add new map tag using jQuery 
  map.remove()
  $('#mapholder').after('<div id="map"></div>')
  
  // create job posting marker layer
  var jobPostingsArray = [];
  for (var i = 0; i < data.length; i++) {
      var jobPosting = data[i];
      if (jobPosting.Coordinates && jobPosting.Location) {
          jobPostingsArray.push(L.marker(jobPosting.Coordinates)
              .bindPopup("<h2>" + jobPosting.Title + "</h2>" + "<h3>" + jobPosting.Company + "</h3> <hr> <h4>" + jobPosting.Location +
              "</h4> <h5>" + jobPosting.Salary_Info + "</h5> <a href=\"" + jobPosting.Link + "\" target=\"_blank\">Find Job Posting Here</a>"));
      }
  };

  //  create jop posting heat layer
  var heatArray = [];
  for (var i = 0; i < data.length; i++) {
      var jobPosting = data[i];

      if (jobPosting.Location) {
        heatArray.push(jobPosting.Coordinates);
      };

      var heat = L.heatLayer(heatArray, {
        radius: 50,
        blur: 28,
        minOpacity: 0.55
      });
  };

  //create zillow house price points and heat layer
  var zillowArray = [];
  for (var i = 0; i < zillow.length; i++) {

      if (zillow[i].lat && zillow[i].lng) {
          zillowArray.push([zillow[i].lat, zillow[i].lng, zillow[i].medValuePSFt])
      }

      var zillowHeat = L.heatLayer(zillowArray, {
          radius: 10,
          blur: 1,
          max: 2004,
          minOpacity: 0.2,
          maxZoom: 7,
          gradient: {
              '.2': 'blue',
              '.4': 'green',
              '.6': 'yellow',
              '.75': 'orange',
              '.85': 'red',
              '.95': 'purple'
          },
      });
  };
  
  //create consumer price index layer using geoJSON
  var cpiLayer
  cpiLayer = L.geoJSON(msa_data, {
    color: 'white',
    fillColor: 'blue',
    onEachFeature: onEachFeature,
  })

  //bind popup and assign DOM event handling to each geoJSON element
  function onEachFeature(feature, layer){
    //event listeners
    layer.on({
      mouseout: function(event) {
        layer = event.target;
        layer.setStyle({
          fillOpacity: 0.1
        });
        this.closePopup();
      },
      click: function(event) {
        layer.openPopup();
        layer.setStyle({
          fillOpacity: 0.3
        });
      }
    })
    //create popup
    layer.bindPopup('<h3>'+layer.feature.properties.name+'</h3><h4>Cost of Living Factor: x'+
      Math.round((251.11/layer.feature.properties.cpi)*100)/100+'</h4><h4>Consumer Price Index: '+layer.feature.properties.cpi+'</h4>', {
        'offset': L.point(0,-30)});
  }
  
  //create job posting layer from array
  jobPostingsLayer = L.layerGroup(jobPostingsArray);

  //define overlays
  var overlayMaps = {
    "Job Postings": jobPostingsLayer,
    "HeatMap of Job Posts": heat,
    "Relative Median $/sqft (Housing)": zillowHeat,
    'Consumer Price Index': cpiLayer,
  };

  // initalize streetmap layer
  var streetmap = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
    attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
    maxZoom: 18,
    id: "mapbox.streets",
    accessToken: API_KEY
  });

  // initalize darkmap layer
  var darkmap = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
    attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
    maxZoom: 18,
    id: "mapbox.dark",
    accessToken: API_KEY
  });

  // initalize basemap layer
  var baseMaps = {
      "Street Map": streetmap,
      "Dark Map": darkmap
  };

  // initalize darkmap layer
  var myMap = L.map("map", {
      center: [37.09, -95.71],
      zoom: 4.5,
      layers: [streetmap, jobPostingsLayer, heat]
  });

  // add control
  L.control.layers(baseMaps, overlayMaps, {
      collapsed: false
  }).addTo(myMap);
}

// end of javascript, hoor

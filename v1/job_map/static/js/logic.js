//  Create dropdown list of available jobs
let dropdown = $('#selDataset');
  // empty existing dropdown options
  dropdown.empty();
  
  // create dropdown
  dropdown.append('<option selected="true" disabled>Choose Job Title</option>');
  dropdown.prop('selectedIndex', 0);
  
  // set endpoint to jobs data (provides search tearm and title case)
  const url = 'https://job-map-viz.herokuapp.com/jobs';

  // Populate dropdown with list of jobs using jQuery
  $.getJSON(url, function (data) {
    $.each(data, function (key, entry) {
      dropdown.append($('<option></option>').attr('onClick', "reply_click(this.id)").attr('value', entry.title).text(entry.label));
    })
});

//function to map data once selection is made
function optionChanged(newSample) {

  // since JS doesn't have a built-in title case method, create one
  function titleCase(str){
    str = str.toLowerCase().split(' ');
    let final = [ ];
      for(let  word of str){
        final.push(word.charAt(0).toUpperCase()+ word.slice(1));
      }
    return final.join(' ')
  }

  // title case job title
  var JobTitle = titleCase(newSample)

    // remove content from div tages
  $ ("#scrapeText").empty()
  $ ('#salaryText').empty()

    // use d3 to grab value of search term to show on top of map
  const apiurl = 'https://job-map-viz.herokuapp.com/filter/'+newSample
  var data = d3.json(apiurl, function(data) {
    createPoints(data)
      //  use d3 to grab salary data from salary end point
    const salaryurl = 'https://job-map-viz.herokuapp.com/salary/'+newSample;
    d3.json(salaryurl, function(data) {
      $ ("#salaryText").append('<h3 align="center">Median Salary for ' + JobTitle +' Job Posts: ' + data.median_salary + '</h3>')
    })
  })
}

// initialize streetmap
var streetmap = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
  attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
  maxZoom: 18,
  id: "mapbox.streets",
  accessToken: API_KEY
});

// initialize dark map
var darkmap = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
  attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
  maxZoom: 18,
  id: "mapbox.dark",
  accessToken: API_KEY
});

// initalize base map
var baseMaps = {
    "Street Map": streetmap,
    "Dark Mode": darkmap
};

//initalize map
var myMap = L.map("map", {
    center: [37.09, -95.71],
    zoom: 5,
    layers: [streetmap]
});

// function to create all data points on map
function createPoints(data) {

  //remove current map
  map.remove()
  $('#mapholder').after('<div id="map"></div>')
  
  // create job posting marker layer
  var jobPostingsArray = [];
  for (var i = 0; i < data.length; i++) {
      var jobPosting = data[i];
      console.log(jobPosting)
      if (jobPosting.Coordinates && jobPosting.Location) {
          jobPostingsArray.push(L.marker(jobPosting.Coordinates)
              .bindPopup("<h2>" + jobPosting.Title + "</h2>" + "<h3>" + jobPosting.Company + "</h3> <hr> <h4>" + jobPosting.Location +
              "</h4> <h5>" + jobPosting.Salary_Info + "</h5> <a href=\"" + jobPosting.Link + "\" target=\"_blank\">Find Job Posting Here</a>"));
      }
  };

  var heatArray = [];
  for (var i = 0; i < data.length; i++) {
      var jobPosting = data[i];

      if (jobPosting.Location) {
        heatArray.push(jobPosting.Coordinates);
      };

      var heat = L.heatLayer(heatArray, {
        radius: 80,
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
  //create pop up
  layer.bindPopup('<h3>'+layer.feature.properties.name+'</h3><h4>Cost of Living Factor: x'+
    Math.round((layer.feature.properties.cpi/251.11)*100)/100+'</h4><h4>Consumer Price Index: '+layer.feature.properties.cpi+'</h4>', {
      'offset': L.point(0,-30)});
    
}

  //create job posting layer from array
  jobPostingsLayer = new L.layerGroup(jobPostingsArray);

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
  var myMap = new L.Map("map", {
    center: [37.09, -95.71],
    zoom: 5,
    layers: [streetmap, heat, jobPostingsLayer]
  });

  // add control
  L.control.layers(baseMaps, overlayMaps, {
    collapsed: false
  }).addTo(myMap);
}
// reference:
//https://www.codebyamir.com/blog/populate-a-select-dropdown-list-with-json
let dropdown = $('#selDataset');

  dropdown.empty();
  
  dropdown.append('<option selected="true" disabled>Choose Job Title</option>');
  dropdown.prop('selectedIndex', 0);
  
  const url = 'https://job-map-viz.herokuapp.com/jobs';
  
  // Populate dropdown with list of provinces
  $.getJSON(url, function (data) {
    $.each(data, function (key, entry) {
      dropdown.append($('<option></option>').attr('onClick', "reply_click(this.id)").attr('value', entry.title).text(entry.label));
    })
});

function optionChanged(newSample) {
    // Fetch new data each time a new sample is selected
    console.log(newSample)
    var apiurl = 'https://job-map-viz.herokuapp.com/filter/'+newSample
    var data = d3.json(apiurl, function(data) {
    createPoints(data)
})
}


var streetmap = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
  attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
  maxZoom: 18,
  id: "mapbox.streets",
  accessToken: API_KEY
});

var darkmap = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
  attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
  maxZoom: 18,
  id: "mapbox.dark",
  accessToken: API_KEY
});

var baseMaps = {
    "Street Map": streetmap,
    "Dark Map": darkmap
  };

var myMap = L.map("map", {
    center: [37.09, -95.71],
    zoom: 5,
    layers: [streetmap]
  });

function createPoints(data) {

  map.remove()
  $('#mapholder').after('<div id="map"></div>')
  

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


  jobPostingsLayer = new L.layerGroup(jobPostingsArray);

  var overlayMaps = {
    "Job Postings": jobPostingsLayer,
    "HeatMap of Job Posts": heat,
    "Median $/sqft (Housing)": zillowHeat
  };


  var streetmap = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
  attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
  maxZoom: 18,
  id: "mapbox.streets",
  accessToken: API_KEY
});

var darkmap = L.tileLayer("https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}", {
  attribution: "Map data &copy; <a href=\"https://www.openstreetmap.org/\">OpenStreetMap</a> contributors, <a href=\"https://creativecommons.org/licenses/by-sa/2.0/\">CC-BY-SA</a>, Imagery © <a href=\"https://www.mapbox.com/\">Mapbox</a>",
  maxZoom: 18,
  id: "mapbox.dark",
  accessToken: API_KEY
});

var baseMaps = {
    "Street Map": streetmap,
    "Dark Map": darkmap
  };
  var myMap = new L.Map("map", {
    center: [37.09, -95.71],
    zoom: 5,
    layers: [streetmap, heat, jobPostingsLayer]
  });


  L.control.layers(baseMaps, overlayMaps, {
    collapsed: false
  }).addTo(myMap);
}
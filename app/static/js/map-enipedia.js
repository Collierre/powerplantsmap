var map;
var infoWindow = new google.maps.InfoWindow();
var baseurl = location.protocol + "//" + location.host + "/"
var markersurl = baseurl + "static/img/markers/"
var icon_small = {x: 10, y: 8}
var icon_medium = {x: 17, y: 14}
var icon_large = {x: 30, y: 24}
var currentId = 0;
var markers_ext = ".png"
var all_continents = []
var all_countries = []
var fuel_types_categories = {
    'biomass': ['Biofuel', 'Biogas', 'Biomass'],
    'other-fossil': ['Blast_Furnace_Gas', 'Peat', 'Petroleum_Coke'],
    'coal': ['Brown_Coal', 'Coal', 'Coal_Seam_Gas', 'Coal_Water_Mixture', 'Coke_Oven_Gas', 'Hard_Coal', 'Lignite'],
    'oil': ['Diesel', 'Diesel_Oil', 'Fuel_Oil', 'Gasoil', 'Heavy_Fuel_Oil', 'Naphtha', 'Oil', 'Residual_Fuel_Oil'],
    'geothermal': ['Geothermal'],
    'hydro': ['Hydro'],
    'other': ['Hydrogen'],
    'gas': ['Landfill_Gas', 'Natural_Gas'],
    'waste': ['Municipal_Solid_Waste', 'Refuse', 'Refuse_Derived_Fuel', 'Waste_Heat'],
    'nuclear': ['Nuclear'],
    'solar': ['Solar_Radiation'],
    'other-renewable': ['Tidal', 'Wave'],
    'wind': ['Wind'],
    'unknown': ['Unknown']
}

var ep_wiki_url = "http://enipedia.tudelft.nl/wiki/"
var uniqueId = function() {
    return ++currentId
}

var markers = {}

function c(args) {
    console.log(args)
}

function createMarker (coordinate, iconurl, title, content) {

    var id = uniqueId()
    var icon_dims

    if(map.zoom > 11) {
        icon_dims = icon_large
    }

    else if(map.zoom > 7) {
        icon_dims = icon_medium
    }

    else {
        icon_dims = icon_small
    }

    if(iconurl.indexOf('default-marker.png') != -1) {
        var icon = iconurl
    }

    else {
        var icon = {
            url: iconurl,
            scaledSize: new google.maps.Size(icon_dims.x, icon_dims.y)
        }
    }

   var marker = new google.maps.Marker({
        id: id,
        title: title,
        map: map,
        position: coordinate,
        icon: icon
   })

    markers[id] = marker

    google.maps.event.addListener(marker, 'click', function(event) {
        infoWindow.setPosition(coordinate)
        infoWindow.setContent(content)
        infoWindow.open(map)
    })
}

function fetchData(continents, countries, fuel_types) {

    currentId = 0
    markers = {}

    var continents_query = ''
    var countries_query = ''
    var fuel_types_query = ''
    
    if(continents[0] != 'All' && continents[0] != 'None') {
        continents_query = "?plant prop:Continent a:" + continents[0] + " . \n"
    }
    
    if(countries[0] != 'All' && countries[0] != 'None') {
        countries_query = "     ?plant prop:Country a:" + countries[0] + " . \n"
    }

    if(fuel_types[0] != 'All' && fuel_types[0] != 'None') {
        fuel_types_query = "     FILTER("
        for(var n = 0; n < fuel_types.length; n++) {
            if(n > 0) {
                fuel_types_query += " || "
            }
            fuel_types_query += "?fuel_used = '" + fuel_types[n] + "'"
        }
        fuel_types_query += ") . "
    }
    c(fuel_types_query)
    
    var url = "http://enipedia.tudelft.nl/sparql/?default-graph-uri=&query="
    
    var query = "BASE <http://enipedia.tudelft.nl/wiki/>\n" +
        "PREFIX a: <http://enipedia.tudelft.nl/wiki/>\n" +
        "PREFIX prop: <http://enipedia.tudelft.nl/wiki/Property:>\n" +
        "PREFIX cat: <http://enipedia.tudelft.nl/wiki/Category:>\n" +
        "PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n" +
        "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" +
        "select ?plant_name ?latitude ?longitude ?fuel_used ?OutputMWh ?elec_capacity_MW ?wikipedia_page ?year_built ?owner_company ?power_plant_type where { \n" +
            continents_query +
            countries_query +
            fuel_types_query +
            "?plant rdf:type cat:Powerplant . \n" +
            "?plant rdfs:label ?plant_name . \n" +
            "?plant prop:Latitude ?latitude . \n" +
            "?plant prop:Longitude ?longitude . \n" +
            "OPTIONAL{?plant prop:Fuel_type ?fuel_type . \n" +
                "?fuel_type rdfs:label ?fuel_used } . \n" +
            "OPTIONAL{?plant prop:Wikipedia_page ?wikipedia_page } . \n" +
            "OPTIONAL{?plant prop:Year_built ?year_built } . \n" +
            "OPTIONAL{?plant prop:Owner_company ?owner_company } . \n" +
            "OPTIONAL{?plant prop:Power_plant_type ?power_plant_type } . \n" +
            "?plant prop:Annual_Energyoutput_MWh ?OutputMWh . \n" +
            "OPTIONAL{?plant prop:Generation_capacity_electrical_MW ?elec_capacity_MW }. \n" +
        "} order by ?plant ?fuel_type"
    
    query = encodeURIComponent(query)


    // Send the JSONP request using jQuery
    var jqxhr = $.getJSON(url + query + "&format=application%2Fsparql-results%2Bjson&timeout=0&debug=on&callback=?", function(data) {
        //c(data)
    })
        .done(function(data) {
            c(data['results']['bindings'][0])
            var icon_url
            var content
            var coordinate
            var category
            for (var i in data['results']['bindings']) {
                title = data['results']['bindings'][i]['plant_name']['value']
                //type = 1 //data['results']['bindings'][i]['type']
                coordinate = new google.maps.LatLng(data['results']['bindings'][i]['latitude']['value'],data['results']['bindings'][i]['longitude']['value'])
                content = '<strong>'
                content += '<a href="' + ep_wiki_url + data['results']['bindings'][i]['plant_name']['value'] + '">'
                content += data['results']['bindings'][i]['plant_name']['value'].replace(" Powerplant", "")/*.replace(new RegExp("_", "g"), " ")*/
                content += '</a>'
                content += '</strong><br>'
                content += data['results']['bindings'][i]['fuel_used'] ? "Fuel: " + data['results']['bindings'][i]['fuel_used']['value'] + "<br>" : ''
                if(data['results']['bindings'][i]['elec_capacity_MW']) {
                    content += "Capacity: " + data['results']['bindings'][i]['elec_capacity_MW']['value'] + " MW<br>"
                }
                if(data['results']['bindings'][i]['year_built']) {
                    content += "Year built: " + data['results']['bindings'][i]['year_built']['value'] + "<br>"
                }
                if(data['results']['bindings'][i]['owner_company']) {
                    content += "Owner: " + data['results']['bindings'][i]['owner_company']['value'] + "<br>"
                }                content += data['results']['bindings'][i]['wikipedia_page'] ? "<a href='" + data['results']['bindings'][i]['wikipedia_page']['value'] + "'>Wikipedia Page</a><br>" : ''
                if(data['results']['bindings'][i]['fuel_used']) {
                    icon_url = baseurl + "static/img/markers/" + data['results']['bindings'][i]['fuel_used']['value'].replace(" ", "-").toLowerCase() + "-marker.png"
                }
                else {
                    icon_url = baseurl + "static/img/markers/default-marker.png" //data['results']['bindings'][i]['iconurl']
                }
                createMarker(coordinate, icon_url, title, content)
            }        
        })
}

function onError(jqXHR, textStatus, errorThrown) {
    console.log('error')
    console.log(jqXHR)
    console.log(textStatus)
    console.log(errorThrown)
}

function addZoomListeners() {

    function change_icon_size() {
        if(this.zoom > 7 && this.zoom <= 11 && this.previousZoom <= 7) {
            $.each(this.markers, function() {
                this.setIcon(icon = {
                    url: this.getIcon()['url'],
                    scaledSize: new google.maps.Size(icon_medium.x, icon_medium.y)
                })
            })
        }
        if(this.zoom <= 7 && this.previousZoom > 7) {
          $.each(this.markers, function() {
              this.setIcon(icon = {
                  url: this.getIcon()['url'],
                  scaledSize: new google.maps.Size(icon_small.x, icon_small.y)
              })
            })
        }
            if(this.zoom > 11 && this.previousZoom <= 11) {
                $.each(this.markers, function() {
                this.setIcon(icon = {
                    url: this.getIcon()['url'],
                    scaledSize: new google.maps.Size(icon_large.x, icon_large.y)
                })
            })
        }
        if(this.zoom <= 11 && this.previousZoom > 11) {
            $.each(this.markers, function() {
              this.setIcon(icon = {
                  url: this.getIcon()['url'],
                  scaledSize: new google.maps.Size(icon_medium.x, icon_medium.y)
              })
          })
        }

        this.previousZoom = this.zoom
    }

    google.maps.event.addListener(map, 'zoom_changed', change_icon_size)
}

function close_infowindow() {
    infoWindow.close()
}

function initialize() {

    var selected_countries = []
    $(':checkbox.country-filter').each(function() {
        if($(this).prop("checked", true)) {
            selected_countries.push(this.id)
        }
    })

    var selected_types = []
    $(':checkbox.type-filter').each(function() {
        if($(this).prop("checked", true)) {
            selected_types.push(this.id)
        }
    })

    //fetchData(selected_countries, selected_types)

    map = new google.maps.Map(document.getElementById('map'), {
        center: new google.maps.LatLng(53.90, -2.8),
        zoom: 6,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        previousZoom: 6,
        markers: markers
    })

    addZoomListeners()

    google.maps.event.addListener(map, 'click', close_infowindow)
}

google.maps.event.addDomListener(window, 'load', initialize);

/* Filter map results */
$(document).ready(function() {

    $.ajax({
        url: 'http://enipedia.tudelft.nl/sparql',
        type: 'POST', 
        data: {
            query: "BASE <http://enipedia.tudelft.nl/wiki/>\n" + 
                "PREFIX prop: <http://enipedia.tudelft.nl/wiki/Property:>\n" + 
                "PREFIX cat: <http://enipedia.tudelft.nl/wiki/Category:>\n" + 
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" + 
                "PREFIX fn: <http://www.w3.org/2005/xpath-functions#>\n" + 
                "select distinct(substr(str(?cont),33) as ?continent) where {\n" + 
                "  ?ppl rdf:type cat:Powerplant .\n" + 
                "  ?ppl prop:Continent ?cont .\n" + 
                "} order by ?continent",
            output: "json" 
        },
        dataType: 'jsonp',
        success: function(data) {
            //c(data)
            var continents_select = document.getElementById('continents')
            //c(continents_select)
            // Append blank option
            var option = document.createElement('option')
            option.setAttribute("value", "None")
            option.appendChild(document.createTextNode(""))
            continents_select.appendChild(option)
            
            // Append 'all' option
            var option = document.createElement('option')
            option.setAttribute("value", "All")
            option.appendChild(document.createTextNode("All"))
            continents_select.appendChild(option)
            
            var continents_options = data.results.bindings
            for (i = 0; i < continents_options.length; i++) {
                //c(continents_options[i].continent.value)
                all_continents.push(continents_options[i].continent.value)
                var option = document.createElement('option')
                // if (continents_options[i].continent.value == queryString["enipedia_continent"])
//                     opt.setAttribute("selected", "true")
                option.setAttribute("value", continents_options[i].continent.value)
                option.appendChild(document.createTextNode(continents_options[i].continent.value.replace("_", " ")))
                continents_select.appendChild(option)
            } 
        }
    })

    $.ajax({
        url: 'http://enipedia.tudelft.nl/sparql',
        type: 'POST', 
        data: {
            query: "BASE <http://enipedia.tudelft.nl/wiki/>\n" + 
                "PREFIX prop: <http://enipedia.tudelft.nl/wiki/Property:>\n" + 
                "PREFIX cat: <http://enipedia.tudelft.nl/wiki/Category:>\n" + 
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" + 
                "PREFIX fn: <http://www.w3.org/2005/xpath-functions#>\n" + 
                "select distinct(substr(str(?ctry),33) as ?country) where {\n" + 
                "  ?ppl rdf:type cat:Powerplant .\n" + 
                "  ?ppl prop:Country ?ctry .\n" + 
                "} order by ?country",
            output: "json" 
        },
        dataType: 'jsonp',
        success: function(data) {
            //c(data)
            var countries_select = document.getElementById('countries')
            //c(countries_select)
            // Append blank option
            var option = document.createElement('option')
            option.setAttribute("value", "None")
            option.appendChild(document.createTextNode(""))
            countries_select.appendChild(option)
            
            // Append 'all' option
            var option = document.createElement('option')
            option.setAttribute("value", "All")
            option.appendChild(document.createTextNode("All"))
            countries_select.appendChild(option)
            
            var countries_options = data.results.bindings
            for (i = 0; i < countries_options.length; i++) {
                //c(countries_options[i].country.value)
                all_countries.push(countries_options[i].country.value)
                var option = document.createElement('option')
                // if (countries_options[i].country.value == queryString["enipedia_country"])
//                     opt.setAttribute("selected", "true")
                option.setAttribute("value", countries_options[i].country.value)
                option.appendChild(document.createTextNode(countries_options[i].country.value.replace(new RegExp("_", "g"), " ")))
                countries_select.appendChild(option)
            } 
        }
    })
    
    //c(all_countries)
    
    $.ajax({
        url: 'http://enipedia.tudelft.nl/sparql',
        type: 'POST', 
        data: {
            query: "BASE <http://enipedia.tudelft.nl/wiki/>\n" + 
                "PREFIX prop: <http://enipedia.tudelft.nl/wiki/Property:>\n" + 
                "PREFIX cat: <http://enipedia.tudelft.nl/wiki/Category:>\n" + 
                "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\n" + 
                "PREFIX fn: <http://www.w3.org/2005/xpath-functions#>\n" + 
                "select distinct(substr(str(?ft),33) as ?fuel_type) where {\n" + 
                "  ?ppl rdf:type cat:Powerplant .\n" + 
                "  ?ppl prop:Fuel_type ?ft .\n" + 
                "} order by ?fuel_type",
            output: "json" 
        },
        dataType: 'jsonp',
        success: function(data) {
            //c(data)
            var fuel_types_ul = document.getElementById('fuel_types')
            //c(fuel_types_select)
            var li = document.createElement('li')
            li.appendChild(document.createTextNode(""))
            fuel_types_ul.appendChild(li)
            var fuel_types = data.results.bindings
            
            //var ul = document.createElement('ul')
            //$('ul.fuel_types #coal').append(ul)
            
            for (i = 0; i < fuel_types.length; i++) {
                for(cat in fuel_types_categories) {
                    //c(fuel_types_categories[cat])
                    if(fuel_types_categories[cat].indexOf(fuel_types[i].fuel_type.value) > -1) {
                        var parent_fuel_type = $('ul.fuel_types #' + cat + ' ul')
                        break
                    }
                    var parent_fuel_type = $('ul.fuel_types #unknown ul')
                }
                var li = $("<li></li>")
                var fuel_type_label = document.createElement('label')
                li.append(fuel_type_label)
                fuel_type_label.appendChild(document.createTextNode(fuel_types[i].fuel_type.value.replace(new RegExp("_", "g"), " ")))
                var fuel_type_checkbox = $("<input type='checkbox' name= '" + fuel_types[i].fuel_type.value + "'class='l3' checked>")
                $(fuel_type_label).append(fuel_type_checkbox)
                parent_fuel_type.append(li)
            } 
        }
    })
    
    $("select.plants").change(function() {
        for(var key in markers) {
            var marker = markers[key]
                marker.setMap(null)
        }
        selected_continents = []
        selected_countries = []
        selected_fuel_types = []
        //c($(this))
        if($(this).attr('id') == "continents") {
            $("select#countries option[value=None]").attr('selected', true)
        }
        else if($(this).attr('id') == "countries") {
            $("select#continents option[value=None]").attr('selected', true)
        }
        
        $("select#continents option:selected").each(function() {
            //c($(this).val())
            selected_continents.push($(this).val())
        })
        $("select#countries option:selected").each(function() {
            //c($(this).val())
            selected_countries.push($(this).val())
        })
        
        if($('ul#fuel_types #all').prop("checked")) {
            selected_fuel_types = ['All']
        }
        else {
            $("input.l3:checked").each(function() {
                selected_fuel_types.push($(this).attr("name"))
            })
        }
        fetchData(selected_continents, selected_countries, selected_fuel_types)
    })
    
    // $("select#continents").change(function() {
//         for(var key in markers) {
//             var marker = markers[key]
//                 marker.setMap(null)
//         }
//         selected_continents = []
//         selected_countries = []
//         selected_fuel_types = ['All']
//         $("select#continents option:selected").each(function() {   
//             selected_continents.push($(this).val())
//         })
// //         $("select#fuel_types option:selected").each(function() {   
// //             selected_fuel_types.push($(this).val())
// //         })
//         c(selected_continents)
//         //c(selected_fuel_types)
//         fetchData(selected_continents, selected_countries, selected_fuel_types)
//     })
//     
//     $("select#countries").change(function() {
//         selected_countries = []
//         selected_fuel_types = ['All']
//         $("select#countries option:selected").each(function() {   
//             selected_countries.push($(this).val())
//         })
// //         $("select#fuel_types option:selected").each(function() {   
// //             selected_fuel_types.push($(this).val())
// //         })
//         c(selected_countries)
//         //c(selected_fuel_types)
//         fetchData(selected_countries, selected_fuel_types)
//     })
    
//     $("select#fuel_types").change(function() {
//         selected_countries = []
//         selected_fuel_types = []
//         $("select#fuel_types option:selected").each(function() {   
//             selected_fuel_types.push($(this).val())
//         })
//         $("select#countries option:selected").each(function() {   
//             selected_countries.push($(this).val())
//         })
//         //c(selected_countries)
//         //c(selected_fuel_types)
//         fetchData(selected_countries, selected_fuel_types)
//     })

    // $(":checkbox.filter").change(function() {
//         for(var key in markers) {
//             var marker = markers[key]
//                 marker.setMap(null)
//         }
//         var selected_countries = []
//         $(':checkbox.country-filter').each(function() {
//             if($(this).prop("checked") == true) {
//                 selected_countries.push(this.id)
//             }
//         })
//         var selected_fuel_types = []
//         $(':checkbox.type-filter').each(function() {
//             if($(this).prop("checked") == true) {
//                 selected_fuel_types.push(this.id)
//             }
//         })
//         fetchData(selected_countries, selected_fuel_types)
//         map.markers = markers
//         //addZoomListeners()
//         google.maps.event.addListener(map, 'click', close_infowindow)
//     })

$('#select-location').submit(function(e) {
    var loadLocation
    loadLocation = $('#select-location-input').val()

    // Convert loadLocation into LatLng
    var geocoder = new google.maps.Geocoder()
    geocoder.geocode({
      'address': loadLocation,
    },
    function(results, status) {
      if(status == google.maps.GeocoderStatus.OK) {
         map.setCenter(results[0].geometry.location)
         map.setZoom(map.getZoom())
      }
    })
    e.preventDefault()
   })
   
   $(':checkbox.broad').change(function() {
        //console.log(this.checked)
        if($(this).prop("checked")) {
            //c($(this).find(':checkbox'))
            $(this).parent().next().find(':checkbox').prop("checked", true)
                //c($(this))
                //c(this.checked)
                //c($(this).prop("checked"))
                //c($(this).attr("checked"))
                //this.checked=true
                //$(this).prop("checked", true)
            //})
        }
        else {
            $(this).parent().next().find(':checkbox').prop("checked", false)
                //this.checked=false
                //$(this).prop("checked", false)
            //})
        }
    })
   
  //  $(':checkbox.all-country-filter').change(function() {
//         console.log(this.checked)
//         if(this.checked) {
//             $(':checkbox.continent-filter').prop("checked", true)
//             $(':checkbox.country-filter').prop("checked", true)
//         }
//         else {
//             $(':checkbox.continent-filter').prop("checked", false)
//             $(':checkbox.country-filter').prop("checked", false)
//         }
//     })
// 
//     $(':checkbox.all-type-filter').change(function() {
//         console.log(this.checked)
//         if(this.checked) {
//             $(':checkbox.type-filter').prop("checked", true)
//         }
//         else {
//             $(':checkbox.type-filter').prop("checked", false)
//     }
   
})
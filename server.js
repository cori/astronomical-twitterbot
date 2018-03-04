// init project
var express = require('express');
var app = express();

var requestor = require('request');
var j = requestor.jar();
var parser = require('parse5');

var horizonsUri = 'https://ssd.jpl.nasa.gov/horizons.cgi';

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.send('This will be a bot');
});

app.get("/api/v1", function( request, response ) {
  horizons_find_astro_body_step();
  response.send('This is an api for testing');
});

app.post("/api/v1", function( request, response ) {
  horizons_find_astro_body_step();
  // response.send('This is an api for testing');
});

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

//  fake out a Horizon API
//    Horizon tracks the state of the current configuration with sessions, 
//    so we need to reuse the session cookie from the first request

function horizons_find_astro_body_step( name ) {
  name="sol";
//  curl -d sstr=sedna -d body_group=all -d find_body=Search -d mb_list=planet https://ssd.jpl.nasa.gov/horizons.cgi -v 
  requestor.post({ jar: j, url: horizonsUri, form: {sstr:name,body_group:'all',find_body:'Search',mb_list:'planet'}}, function( error, response, body ) {
    console.log('error:', error); // Print the error if one occurred
    console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
    console.log(body); // Print the HTML for the Google homepage.

//  missing celestial body results in 
/*
<div class="error">
<a name="top"><b>&nbsp; ERROR:</b>
</a><ul>
<li>no matching body found
<li>please check your input and try again
</ul>
</div>
*/
    
});
  
}

function horizons_set_time_interval_step() {
//  curl --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d start_time="2018-02-25 12:00" -d stop_time="2018-02-25 12:01" -d step_size=1 -d interval_mode=f -d set_time_span="Use Specified Times" https://ssd.jpl.nasa.gov/horizons.cgi -v  
}

function horizons_set_display_step() {
//  curl --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d display=TEXT -d .cgifields=display -d set_display="Use Selection Above" https://ssd.jpl.nasa.gov/horizons.cgi -v  
}

function horizons_set_out_tabblbe_step() {
//  curl --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d oq_21=1 -d time_digits=MINUTES -d set_table="Use Selected Settings" -d set_table_settings=1 https://ssd.jpl.nasa.gov/horizons.cgi -v
}

function horizons_send_query() {
//  curl -v --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d go="Generate Ephemeris" https://ssd.jpl.nasa.gov/horizons.cgi#results
}
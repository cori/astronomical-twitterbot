//  TODO:  add bot-ness
//  TODO:  how to organize the "API" vs the bot?

// init project
var express = require('express');
var app = express();

var requestor = require('request');
var j = requestor.jar();

var cheerio = require('cheerio');

var iso8601 = require('iso8601.js')

var horizonsUri = 'https://ssd.jpl.nasa.gov/horizons.cgi';

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {      
  response.send('This will be a bot');
});

app.get("/api/v1/:astroBody", function( request, response ) {
  var step1 = horizons_find_astro_body_step( request.params.astroBody );
  console.log("step: " + step1);
  response.send(step1);
});

app.post("/api/v1/:astroBody", function( request, response ) {
  //  TODO: should the step requests just be chained? They're just building up the session data for the final request.
  horizons_find_astro_body_step( request.params.astroBody );
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
//  curl -d sstr=sedna -d body_group=all -d find_body=Search -d mb_list=planet https://ssd.jpl.nasa.gov/horizons.cgi -v 
  requestor.post({ jar: j, url: horizonsUri, form: {sstr:name, body_group:'all', find_body:'Search', mb_list:'planet'}}, function( error, response, body ) {
    
    var dom = cheerio.load(body);
    var errorNode = dom('.error');
    if( errorNode.length > 0 ) {
      console.log( "Horizons returned an error; most likely the celestial body you requested could not be found.");
      return "error";
    } else {
      var step2 = horizons_set_time_interval_step();
      console.log("step2: " +step2);
      return step2;
    }
        
  });
  
}

function horizons_set_time_interval_step() {
//  curl --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d start_time="2018-02-25 12:00" -d stop_time="2018-02-25 12:01" -d step_size=1 -d interval_mode=f -d set_time_span="Use Specified Times" https://ssd.jpl.nasa.gov/horizons.cgi -v
  var now = new Date();
  var then = new Date();
  then.setMinutes(now.getMinutes()+1);
  requestor.post({ jar: j, url: horizonsUri, form: {start_time:now, stop_time:then, step_size:'1', interval_mode:'f', set_time_span: 'Use Specified Times'}}, function( error, response, body ) {
    
    var dom = cheerio.load(body);
    var errorNode = dom('.error');
    if( errorNode.length > 0 ) {
      console.log( "Horizons returned an error; most likely the celestial body you requested could not be found.");
      return "error";
    } else {
      console.log("step2: " + body);
      return body;
    }
    
  });
  
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
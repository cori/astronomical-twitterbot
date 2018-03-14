//  TODO: add bot-ness id:0 gh:2 ic:gh
//  TODO: how to organize the "API" vs the bot? id:1 gh:3 ic:gh
//  TODO: logging? id:8 gh:12 ic:gh
//  TODO: data persistance? id:7 gh:11 ic:gh
//  TODO: set up cron id:9 gh:13 ic:gh
//  TODO: reply immediately if 2*lt < ~5 minutes (the period I'll poll twitter for new messages) id:10 gh:14 ic:gh

// init project
var express = require('express');
var app = express();

var requestor = require('request');
var j = requestor.jar();

var cheerio = require('cheerio');

var moment = require('moment');

var horizonsUri = 'https://ssd.jpl.nasa.gov/horizons.cgi';

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {      
  response.send('This will be a bot');
});

app.get("/api/v1/:astroBody", function( request, response ) {
  j = requestor.jar();  //  need a new jar on every request to reset the session
  var step1 = horizons_find_astro_body_step( request.params.astroBody );
  console.log("step: " + step1);
  response.send(step1);
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

//  TODO: extract the request pattern id:4 gh:7 ic:gh
function horizons_find_astro_body_step( name ) {
  console.clear();
//  curl -d sstr=sedna -d body_group=all -d find_body=Search -d mb_list=planet https://ssd.jpl.nasa.gov/horizons.cgi -v 
  requestor.post({ jar: j, url: horizonsUri, form: {sstr:name, body_group:'all', find_body:'Search', mb_list:'planet'}}, function( error, response, body ) {
    
    var dom = cheerio.load(body);
    var errorNode = dom('.error');
    if( errorNode.length > 0 ) {
      console.log( "Horizons returned an error; most likely the celestial body you requested could not be found.");
      return "error";
    } else {
      var step2 = horizons_set_time_interval_step();
      // console.log("step2: " + step2);
      // console.log(j);
      return step2;
    }
        
  });
  
}

function horizons_set_time_interval_step() {
//  curl --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d start_time="2018-02-25 12:00" -d stop_time="2018-02-25 12:01" -d step_size=1 -d interval_mode=f -d set_time_span="Use Specified Times" https://ssd.jpl.nasa.gov/horizons.cgi -v
  var now = new Date();
  var then = new Date();
  then.setMinutes(now.getMinutes()+1);
  now = moment(now).format('YYYY-MMM-D HH:mm');
  then = moment(then).format('YYYY-MMM-D HH:mm');

  requestor.post({ jar: j, url: horizonsUri, form: {start_time:now, stop_time:then, step_size:'1', interval_mode:'m', set_time_span: 'Use Specified Times'}}, function( error, response, body ) {
    
    var dom = cheerio.load(body);
    var errorNode = dom('.error');
    var settings = dom('h3').next();
    if( errorNode.length > 0 ) {
      console.log( "Horizons returned an error.");
      return "error";
    } else {
      var step3 = horizons_set_out_table_step( now.replace( 'T', ' ' ), then.replace( 'T', ' ') );
      // console.log("step3: " + settings);
      return step3;
    }
    
  });
  
}

function horizons_set_out_table_step( start_time, end_time ) {
//  curl --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d oq_21=1 -d time_digits=MINUTES -d set_table="Use Selected Settings" -d set_table_settings=1 https://ssd.jpl.nasa.gov/horizons.cgi -v
  requestor.post({ jar: j, url: horizonsUri, form: {oq_21:'1', time_digits:'MINUTES', obj_data:'NO', set_table_settings:'1', set_table: 'Use Settings Abbove'}}, function( error, response, body ) {
    
    var dom = cheerio.load(body);
    var errorNode = dom('.error');
    var settings = dom('h3').next();
    if( errorNode.length > 0 ) {
      console.log( "Horizons returned an error.");
      return "error";
    } else {
      var step4 = horizons_set_display_step( start_time, end_time );
      // console.log("step4: " + settings);
      return step4;
    }
    
  });
}

function horizons_set_display_step( start_time, end_time ) {
//  curl --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d display=TEXT -d .cgifields=display -d set_display="Use Selection Above" https://ssd.jpl.nasa.gov/horizons.cgi -v  
  
  requestor.post({ jar: j, url: horizonsUri, form: {display:'TEXT', set_display:'Use Selection Above'}}, function( error, response, body ) {
    
    var dom = cheerio.load(body);
    var errorNode = dom('.error');
    if( errorNode.length > 0 ) {
      console.log( "Horizons returned an error.");
      return "error";
    } else {
      var step5 = horizons_send_query( start_time, end_time );
      // console.log("step5: " + step5);
      return step5;
    }
    
  });

}

function horizons_send_query( start_time, end_time ) {
//  curl -v --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d go="Generate Ephemeris" https://ssd.jpl.nasa.gov/horizons.cgi#results
  
//  TODO: handle the final error model id:5 gh:8 ic:gh
// *** Horizons ERROR/Unexpected Results ***


 

// Cannot interpret date. Type "?!" or try YYYY-Mon-Dy {HH:MM} format.

// *******************************************************************************
  
  requestor.post({ jar: j, url: horizonsUri, form: {go:'Generate Ephemeris'}}, function( error, response, body ) {
    
    var dom = cheerio.load(body);
    var errorNode = dom('.error');
    if( errorNode.length > 0 ) {
      console.log( "Horizons returned an error.");
      return "error";
    } else {
      var lt = find_light_time( body, start_time, end_time );
      // console.log(j);
      // console.log("step5: " + body);
      return lt;
    }
    
  });

}

function find_light_time( output, start_time, end_time ) {
  //  this is a little fragile
  //  the times appear in the output table more than once as of 2018-03-14, but....
  var lt = output.split(start_time)[2].split(end_time)[0].trimLeft();
}

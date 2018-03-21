//  TODO: add bot-ness id:0 gh:2 ic:gh
//  TODO: how to organize the "API" vs the bot? id:1 gh:3 ic:gh
//  TODO: logging? id:8 gh:12 ic:gh
//  TODO: data persistance? id:7 gh:11 ic:gh
//  TODO: set up cron id:9 gh:13 ic:gh
//  TODO: reply immediately if 2*lt < ~5 minutes (the period I'll poll twitter for new messages) id:10 gh:14 ic:gh

// init project
var express = require('express');
var app = express();

var requestor = require('request-promise')
var j = {};

var cheerio = require('cheerio');

var moment = require('moment');
var momentDurationFormatSetup = require("moment-duration-format");

var horizonsUri = 'https://ssd.jpl.nasa.gov/horizons.cgi';

var time_boundaries = new Object();


app.get("/", function (request, response) {      
  response.send('This will be a bot');
});

app.get("/api/v1/:astroBody", function( request, response ) {
  
  var outcome = get_roundtrip_light_time_steps_promise( request.params.astroBody );
  
  outcome.then( function( steps_output ) {
    response.send( steps_output );    
  })
  .catch ( function (error) {
    console.log(error);
    response.status(503).send(error.message);
    throw new Error( error );
  });
  
});

function get_roundtrip_light_time_steps_promise( body_name ) {
  
  time_boundaries = new Object();
  
  var step1 = horizons_find_astro_body_step( body_name );

  var step2 = step1.then ( function( html ) {
      var dom = cheerio.load( html );
      var errorNode = dom('.error');
      if( errorNode.length > 0 ) {
        var errorStr = 'Horizons returned an error; most likely the celestial body you requested, ' + body_name + ', could not be found.';
        throw new Error(errorStr);
      } else {
        return horizons_set_time_interval_step();
      }
    })
    .catch ( function (error) {
      throw new Error( error );
    });
  
  var step3 = step2.then( function( stepData ) {
    console.log(stepData);
    time_boundaries = stepData;
    return horizons_set_out_table_step();
    })
    .catch( function( err ) {
      throw new Error( err );
    });
  
  var step4 = step3.then( function( stepData ) {
    return horizons_set_display_step();
    })
    .catch( function( err ) {
      throw new Error( err );
    });
  
  var step5 = step4.then( function( stepData ) {
    return horizons_send_query( time_boundaries );
    })
    .catch( function( err ) {
      throw new Error( err );
    });
    
  step5.then( function( stepData ) {
    console.log(j);
    console.log( 'final info: ' + stepData );
    })
    .catch( function( err ) {
      throw new Error( err );
    });
  
  return step5;

}

//  fake out a Horizon API
//    Horizon tracks the state of the current configuration with sessions, 
//    so we need to reuse the session cookie from the first request

//  TODO: extract the request pattern id:4 gh:7 ic:gh

//  TODO: something's up with the times - I'm either getting 16:33 or 20:27 no matter what body names I use. id:17 gh:23 ic:gh
//          Argh! for some bodies there are multiple possible responses, and you've got to select amongst them

/******************  multi-body selection  ******************
<form method="post" action="https://ssd.jpl.nasa.gov/horizons.cgi#top" enctype="multipart/form-data">
<h3>select from 2 matching bodies:</h3>
<select name="body" size="2">
<option value="MB:5">Jupiter Barycenter</option>
<option value="MB:599">Jupiter</option>
</select><br>
<br>
<input type="submit" name="select_body" value="Select Indicated Body">
&nbsp;&nbsp;&nbsp;
<input type="submit" name="cancel" value="Cancel">
</form>

request content
body=MB:599
select_body=Select Indicated Body
************************************************************/

function horizons_find_astro_body_step( name ) {
  
  //  TODO: it seems like this doesn't always reset the session id, because we're getting back the same time for multiple bodies in one run id:20 gh:27 ic:gh
  // j = requestor.jar();  //  need a new jar on every request to reset the session
  return requestor.post({ jar: j, url: horizonsUri, form: {sstr:name, body_group:'all', find_body:'Search', mb_list:'planet'}})
    .then( function( html ) {
      var dom = cheerio.load(html);
      var errorNode = dom('.error');
      var settings = dom('h3').next();
      var multiple_body_options = dom('select[name="body"]>option');
      if( multiple_body_options.length > 0 ) {
        
        multiple_body_options.each( function( ) {
          var option = dom(this);
          if( name.toLowerCase() == option.text().toLowerCase() ) {
            // console.log('matched option: ' + option.text().toLowerCase());
            // console.log('submitted name: ' + name.toLowerCase());
            return horizons_pick_astro_body( option.val() );
          }
        });
        
        //  return the first option if we don't find an exact match
        // console.log( 'first option: ' + dom(multiple_body_options[0]).text() );
        return horizons_pick_astro_body( dom(multiple_body_options[0]).val() );
      }
      return html;
    })
    .catch(function( error ) {
      console.log(error);
      throw new Error( error );
    });
  
}

function horizons_pick_astro_body( body_id ) {
  
  var formObj = {body:body_id, select_body:'Select Indicated Body'};
  return horizons_request( formObj );
  
}

function horizons_set_time_interval_step() {

  var now = new Date();
  var then = new Date();
  then.setMinutes(now.getMinutes()+1);
  now = moment(now).format('YYYY-MMM-D HH:mm');
  then = moment(then).format('YYYY-MMM-D HH:mm');
  // var time_boundaries = new Object();

  // console.log(j);
  return requestor.post({ jar: j, url: horizonsUri, form: {start_time:now, stop_time:then, step_size:'1', interval_mode:'m', set_time_span: 'Use Specified Times'}})
    .then( function( html ) {
      var dom = cheerio.load( html );
      var errorNode = dom('.error');
      var settings = dom('h3').first().next();
      // console.log(settings.html());
      if( errorNode.length > 0 ) {
        var errorStr = 'Horizons returned an error.';
        throw new Error( errorStr );
      } else {
        time_boundaries.start = now.replace( 'T', ' ');
        time_boundaries.end = then.replace( 'T', ' ');
        return time_boundaries;
      }
    })
    .catch(function( error ) {
      throw new Error( error );
    });
}

function horizons_set_out_table_step( ) {

  return requestor.post({ jar: j, url: horizonsUri, form: {oq_21:'1', time_digits:'MINUTES', obj_data:'NO', set_table_settings:'1', set_table: 'Use Settings Abbove'}})
    .then( function( body ) {
      var dom = cheerio.load(body);
      var errorNode = dom('.error');
      var settings = dom('h3').next();
      // console.log(settings.html());
      if( errorNode.length > 0 ) {
        console.log( "Horizons returned an error.");
        return "error";
      } else {
        return;
      }
    })
    .catch(function( error ) {
      throw new Error( error );
    });    
}

function horizons_set_display_step( start_time, end_time ) {

  return requestor.post({ jar: j, url: horizonsUri, form: {display:'TEXT', set_display:'Use Selection Above'}})
    .then( function( body ) {
      var dom = cheerio.load(body);
      var errorNode = dom('.error');
      var settings = dom('h3').next();
      // console.log(settings.html());
      if( errorNode.length > 0 ) {
        console.log( "Horizons returned an error.");
        return "error";
      } else {
        return;
      }
    })
    .catch( function( error ) {
      throw new Error( error );
    });
}

function horizons_send_query( time_boundaries ) {
//  curl -v --cookie "CGISESSID=f18cbbf793f8a319bd856e1e9738a11b" -d go="Generate Ephemeris" https://ssd.jpl.nasa.gov/horizons.cgi#results
  
//  TODO: handle the final error model id:5 gh:8 ic:gh
// *** Horizons ERROR/Unexpected Results ***


 

// Cannot interpret date. Type "?!" or try YYYY-Mon-Dy {HH:MM} format.

// *******************************************************************************
  return requestor.post({ jar: j, url: horizonsUri, form: {go:'Generate Ephemeris'}})
    .then( function( body ) {
      var dom = cheerio.load(body);
      var errorNode = dom('.error');
      if( errorNode.length > 0 ) {
        console.log( "Horizons returned an error.");
        return "error";
      } else {
        var lt = extract_one_way_light_time( body, time_boundaries );
        var rt = convert_owlt_to_round_trip( lt );
        return rt;
      }

    })
    .catch( function( error ) {
      throw new Error( error );
    });
}

function horizons_request( formObj ) {
  return requestor.post({ jar: j, url: horizonsUri, form: formObj })
    .then( function( html ) {
      var dom = cheerio.load(html);
      var errorNode = dom('.error');
      var settings = dom('h3').next();
      if( errorNode.length > 0 ) {
        var errMsg = "Horizons returned an error.";
        throw new Error( errMsg );
      }
      return html;
    })
    .catch(function( error ) {
      //  noop; these are handled further up the call stack
    });
}

function extract_one_way_light_time( output, time_boundaries ) {
  console.log('before split: ' + time_boundaries);
  //  this is a little fragile
  //  the times appear in the output table more than once as of 2018-03-14, but....
  //  TODO some kind of race condition here; on occasion time_boundries is undefined when we get here id:19 gh:26 ic:gh
  //    particularly (it seems) when there are multiple tweets/dms to handle
  var lt = output.split(time_boundaries.start)[2].split(time_boundaries.end)[0].trimLeft();
  return lt;
}

function convert_owlt_to_round_trip( one_way_light_time ) {
  var rt_time_decimal = one_way_light_time * 2;
  var dur = moment.duration(rt_time_decimal, 'minutes');
  return dur.format('mm:ss');
}

function respond_to_tweet(screen_name, id_str, body_name, light_time) {
    /* Now we can respond to each tweet. */
  // console.log(screen_name);
  T.post('statuses/update', {
    status: '@' + screen_name + ' the round-trip light-time to ' + body_name + ' is ' + light_time,
    in_reply_to_status_id: id_str
  }, function(err, data, response) {
    if (err){
        /* TODO: Proper error handling? id:14 gh:19 ic:gh*/
      console.log('Error!');
      console.log(err);
      throw new Error( err );
    }
    else{
      fs.writeFile(__dirname + '/last_mention_id.txt', id_str, function (err) {
        /* TODO: Error handling? id:13 gh:18 ic:gh*/
      });
    }
  });
}

function respond_to_dm(sender_id, id_str, body_name, light_time) {
  /* Now we can respond to each tweet. */
  T.post('direct_messages/new', {
    user_id: sender_id,
    text: 'The round-trip light-time to ' + body_name + ' is ' + light_time
  }, function(err, data, response) {
    if (err){
      /* TODO: Proper error handling? id:11 gh:16 ic:gh*/
      console.log('Error!');
      console.log(err);
      throw new Error( err );
    }
    else{
      fs.writeFile(__dirname + '/last_dm_id.txt', id_str, function (err) {
        /* TODO: Error handling? id:12 gh:17 ic:gh*/
      });
    }
  });
}

//*****************  BOT-NESS  *********************
var fs = require('fs'),
    path = require('path'),
    Twit = require('twit'),
    config = {
    /* Be sure to update the .env file with your API keys. See how to get them: https://botwiki.org/tutorials/make-an-image-posting-twitter-bot/#creating-a-twitter-app*/      
      twitter: {
        // consumer_key: process.env.CONSUMER_KEY,
        // consumer_secret: process.env.CONSUMER_SECRET,
        // access_token: process.env.ACCESS_TOKEN,
        // access_token_secret: process.env.ACCESS_TOKEN_SECRET
        consumer_key: process.env.TESTING_CKEY,
        consumer_secret: process.env.TESTING_CSECRET,
        access_token: process.env.TESTING_ATOKEN,
        access_token_secret: process.env.TESTING_ASECRET
      }
    },
    T = new Twit(config.twitter),
    stream = T.stream('statuses/sample');

app.all("/tweet", function (request, response) {
  /* Respond to @ mentions */
  fs.readFile(__dirname + '/last_mention_id.txt', 'utf8', function (err, last_mention_id) {
    /* First, let's load the ID of the last tweet we responded to. */
    console.log('last_mention_id:', last_mention_id);

    T.get('search/tweets', { q: 'to:' + process.env.TESTING_TWITTER_HANDLE + ' -from:' + process.env.TESTING_TWITTER_HANDLE, since_id: last_mention_id, result_type: "recent", count: 100 }, function(err, data, response) {
      /* Next, let's search for Tweets that mention our bot, starting after the last mention we responded to. */
      if (data.statuses.length){
        data.statuses.forEach(function(status) {
          j = requestor.jar();
          j.Store.removeCookies(horizonsUri);
          // console.log(status.id_str);
          // console.log(status.text);
          // console.log(status.user.screen_name);
          var tweet_content = status.text.replace('@' + process.env.TESTING_TWITTER_HANDLE + ' ', '');
          // console.log(tweet_content);
          //  TODO send query and respond id:16 gh:22 ic:gh
          var horizons_output = get_roundtrip_light_time_steps_promise( tweet_content );
          
          horizons_output.then( function( rt_time ) {
            respond_to_tweet( status.user.screen_name, status.id_str, tweet_content, rt_time );
          })
          .catch( function( error ) {
            console.log( error );
          });
          sleep(500).then();
                               
        });
      } else if (err) {
        console.log(err);
      } else {
        /* No new mentions since the last time we checked. */
        console.log('No new mentions...');      
      }
    });    
  });

  /* Respond to DMs */

  fs.readFile(__dirname + '/last_dm_id.txt', 'utf8', function (err, last_dm_id) {
    /* Load the ID of the last DM we responded to. */
    console.log('last_dm_id:', last_dm_id);

    T.get('direct_messages', { since_id: last_dm_id, count: 200 }, function(err, dms, response) {
      /* Next, let's search for Tweets that mention our bot, starting after the last mention we responded to. */
      if (dms.length){
        dms.forEach(function(dm) {
          j = requestor.jar();
          j.Store.removeCookies(horizonsUri);
          // console.log(dm.sender_id);
          // console.log(dm.id_str);
          // console.log(dm.text);
          //  TODO send query and respond to dm id:18 gh:24 ic:gh
          var horizons_output = get_roundtrip_light_time_steps_promise( dm.text );
          
          horizons_output.then( function( rt_time ) {
            respond_to_dm( dm.sender_id, dm.id_str, dm.text, rt_time );
          })
          .catch( function( error ) {
            console.log( error );
          });
        });
      } else if (err) {
        console.log(err);
      } else {
        /* No new DMs since the last time we checked. */
        console.log('No new DMs...');      
      }
    });    
  });  
  
  /* TODO: Handle proper responses based on whether the tweets succeed, using Promises. For now, let's just return a success message no matter what. id:15 gh:20 ic:gh*/
  response.sendStatus(200);
});

function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

// listen for requests :)
var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
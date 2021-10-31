const express = require('express');
const app = express();
const request = require('request');
var mysql = require('mysql2');

var con = mysql.createConnection({
   host: "localhost",
   user: "root",
   password: "*2021Amarbebsha",
   database: "hr_attendance"
});
con.connect(function(err) {
   if (err) {
      console.error('[MySQL] Error connecting: ' + err.stack);
      return;
   }
   console.log('[MySQL] Connected as id ' + con.threadId);
});

//const server = require('http').createServer(app);
const  server = app.listen(5000,function (){
   console.log('listening to port 5000');
});
const WebSocket = require('ws');

const wss = new WebSocket.Server({server:server});

wss.on('connection', function connection(ws){
   console.log('A new client Connected!');
   ws.send('Welcome New Client!');

   ws.on('message', function incoming(message){

      let date_ob = new Date();

      // current date
      // adjust 0 before single digit date
      // let date = ("0" + date_ob.getDate()).slice(-2);
      // let month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
      // let year = date_ob.getFullYear();
      // let hours = date_ob.getHours();
      // let minutes = date_ob.getMinutes();
      // let seconds = date_ob.getSeconds();
      // let currentTime = year + "-" + month + "-" + date + " " + hours + ":" + minutes + ":" + seconds;

      var str = message.toString();
      let parts = str.split(",");
      console.log(parts);
      var lat = parts[1];
      var lon = parts[2];
      var ssid = parts[3];
      var userData;
      var userAssignedLocationData;
      var userAssignedNetworkData;
      var mapAPIKey = 'AIzaSyD_iQ1GwgBkmiMxeUDiC7c3fQLmzdmddF0';

      var userQuery = "SELECT * FROM users WHERE id ="+parts[0]+" ";
      con.query(userQuery, function (err, result, fields) {
         if (err) throw err;
         userData = result[0];
         console.log(userData.name);
         var locationQuery = "SELECT * FROM locations WHERE id = "+userData.location_id;
         con.query(locationQuery, function (err, result, fields) {
            if (err) throw err;
            userAssignedLocationData = result[0];
            console.log(result[0].name);
         });
         var networkQuery = "SELECT * FROM networks WHERE id = "+userData.network_id;
         con.query(networkQuery, function (err, result, fields) {
            if (err) throw err;
            userAssignedNetworkData = result[0];
            console.log(result[0].ssid);
             if(userData.attendance_type == 1){
               console.log("location attendance")
                var mapResultAPI = 'https://maps.googleapis.com/maps/api/directions/json?origin=' + parts[1] +','+parts[2]+'&destination='+userAssignedLocationData.latitude +','+userAssignedLocationData.longitude +'&key='+mapAPIKey;
               console.log(mapResultAPI);
                request(mapResultAPI, function (error, response, body) {
                   console.error('error:', error); // Print the error if one occurred
                   console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                   //console.log('body:', body); //
                   console.log(typeof body);
                   var parsedval = JSON.parse(body);
                   //console.log(parsedval['routes'][0]['legs'][0]['distance']['value']);
                   var distance = parsedval['routes'][0]['legs'][0]['distance']['value'];
                   //console.log('response: ', response)// Print the HTML for the Google homepage.

                   if(distance <= userAssignedLocationData.radius){
                      console.log('inside radius');
                      var attendance = "SELECT * FROM attendances WHERE user_id ="+userData.id+" ORDER BY id DESC";
                      con.query(attendance, function (err, result, fields) {
                         if (err) throw err;
                         console.log(result);
                         if(result.length != 0){
                            var newEntryQuery = "INSERT INTO attendances (user_id, entry_time, created_at, updated_at) VALUES( "+userData.id+", now(), now(), now() )";
                            con.query(newEntryQuery, function (err, result, fields){
                               if (err) throw err;
                               console.log(result);
                               console.log('Entry Successful');
                            });
                         }else if(result[0].entry_time != null){
                            var entryQuery = "UPDATE attendances SET entry_time = NOW(), updated_at = now() WHERE user_id = "+userData.id;
                            con.query(entryQuery, function (err, result, fields){
                               if (err) throw err;
                               console.log(result);
                               console.log('Entry Successful');
                            });
                         }else{
                            var rowResult = JSON.parse(JSON.stringify(result[0]));
                            var one_day = 1000 * 60 * 60 * 24;
                            var nodeTime = Date.now();
                            var mysqlTime = new Date(rowResult.entry_time).getTime();
                            console.log('nodetime' +nodeTime);
                            console.log('mysqltime' +mysqlTime);
                            if ((nodeTime-one_day)<mysqlTime) {
                               console.log('difference is less than one day');
                               //if difference is less than 1 day then already exists;
                            }else{
                               var newEntryQuery = "INSERT INTO attendances (user_id, entry_time, created_at, updated_at) VALUES( "+userData.id+", now(), now(), now() )";
                               con.query(newEntryQuery, function (err, result, fields){
                                  if (err) throw err;
                                  console.log(result);
                                  console.log('Entry Successful');
                               });
                            }
                         }
                      });
                   }else{
                      console.log('outside radius');
                      var attendance = "SELECT * FROM attendances WHERE user_id ="+userData.id+" ";
                      con.query(attendance, function (err, result, fields) {
                         if (err) throw err;
                         console.log(result.length);
                         if(result.length != 0){
                            //console.log("exit"+result[0].exit_time+'12'+result[0].exit_time.length);
                            if(result[0].exit_time != null && result[0].exit_time.length != 0){
                               console.log('already exists');
                            }else if (result[0].entry_time != null){
                               var exitUpdateQuery = "UPDATE attendances SET exit_time = NOW(), updated_at = now() WHERE user_id = "+userData.id;
                               con.query(exitUpdateQuery, function (err, result, fields){
                                  if (err) throw err;
                                  console.log('Entry Successful');
                               });
                            }else{
                               console.log('Entry first1')
                            }
                         }else{
                            console.log('Entry first2');
                         }

                      });
                   }
                });

             }else if(userData.attendance_type == 2){
                console.log("Network attendance");
                console.log(parts[3]);
                if(userAssignedNetworkData.ssid == parts[3]){
                  console.log('ssid match');
                        //need to query this in descending order and pick the first one.
                         var attendance = "SELECT * FROM attendances WHERE user_id ="+userData.id+" ORDER BY id DESC";
                         con.query(attendance, function (err, result, fields) {
                            if (err) throw err;
                            console.log(result);
                            if(result.length == 0){
                               var newEntryQuery = "INSERT INTO attendances (user_id, entry_time, created_at, updated_at) VALUES( "+userData.id+", now(), now(), now() )";
                               con.query(newEntryQuery, function (err, result, fields){
                                  if (err) throw err;
                                  console.log(result);
                                  console.log('Entry Successful');
                               });
                            }else if(result[0].entry_time == null || result[0].entry_time == ''){
                                 var entryQuery = "UPDATE attendances SET entry_time = NOW(), updated_at = now() WHERE user_id = "+userData.id;
                                  con.query(entryQuery, function (err, result, fields){
                                     if (err) throw err;
                                     console.log(result);
                                     console.log('Entry Successful');
                                  });
                            }else{
                               var rowResult = JSON.parse(JSON.stringify(result[0]));
                               var one_day = 1000 * 60 * 60 * 24;
                               var nodeTime = Date.now();
                               var mysqlTime = new Date(rowResult.entry_time).getTime();
                               console.log('nodetime' +nodeTime);
                               console.log('mysqltime' +mysqlTime);
                               if ((nodeTime-one_day)<mysqlTime) {
                                  console.log('difference is less than one day');
                                    //if difference is less than 1 day then already exists;
                               }else{
                                  console.log('difference is greater than 1 day, can make new entry');
                                  //if difference is greater than 1 day then make new attedance entry;
                                  var newEntryQuery = "INSERT INTO attendances (user_id, entry_time, created_at, updated_at) VALUES( "+userData.id+", now(), now(), now() )";
                                  con.query(newEntryQuery, function (err, result, fields){
                                     if (err) throw err;
                                     console.log(result);
                                     console.log('Entry Successful');
                                  });
                               }
                            }
                         });
                }else{
                  console.log('ssid mismatch');
                   var attendance = "SELECT * FROM attendances WHERE user_id ="+userData.id+" ";
                         con.query(attendance, function (err, result, fields) {
                            if (err) throw err;
                            console.log(result.length);
                            if(result.length != 0){
                               //console.log("exit"+result[0].exit_time+'12'+result[0].exit_time.length);
                               if(result[0].exit_time != null && result[0].exit_time.length != 0){
                                  console.log('already exists');
                               }else if (result[0].entry_time != null){
                                  var exitUpdateQuery = "UPDATE attendances SET exit_time = NOW(), updated_at = now() WHERE user_id = "+userData.id;
                                  con.query(exitUpdateQuery, function (err, result, fields){
                                     if (err) throw err;
                                     console.log('Entry Successful');
                                  });
                               }else{
                                  console.log('Entry first1')
                               }
                            }else{
                               console.log('Entry first2');
                            }

                         });
                }
         }
         });
      });
      //
      // var locationQuery = "SELECT * FROM locations WHERE id = 6";
      // con.query(locationQuery, function (err, result, fields) {
      //    if (err) throw err;
      //    userAssignedLocationData = result[0];
      //    console.log(result[0].id);
      // });
      //
      // var networkQuery = "SELECT * FROM networks WHERE id = 5";
      // con.query(networkQuery, function (err, result, fields) {
      //    if (err) throw err;
      //    userAssignedLocationData = result[0];
      //    console.log(result[0].id);
      // });

      // con.connect(function(err) {
      //    if (err) throw err;
      //    console.log("Connected To mysql!");
      //    var userQuery = "SELECT * FROM users WHERE id ="+parts[0]+" ";
         // con.query(userQuery, function (err, result, fields) {
         //    if (err) throw err;
         //    userData = result[0];
         //    console.log(userData.attendance_type);
            // var locationQuery = "SELECT * FROM locations WHERE id ="+userData.location_id+" ";
            // con.query(locationQuery, function (err, result, fields) {
            //    if (err) throw err;
            //    userAssignedLocationData = result[0];
            //    console.log(result);
            // });
            // var networkQuery = "SELECT * FROM networks WHERE id ="+userData.network_id+" ";
            // con.query(networkQuery, function (err, result, fields) {
            //    if (err) throw err;
            //    userAssignedNetworkData = result[0];
            //    console.log(result);
               // if(userData.attendance_type == 1){
               //
               // }else if(userData.attendance_type == 2){
               //    console.log(userAssignedNetworkData.ssid);
               //    if(userAssignedNetworkData.ssid == parts[3]){
               //       console.log('matched');
               //       var attendance = "SELECT * FROM attendances WHERE user_id ="+userData.id+" ";
               //       con.query(attendance, function (err, result, fields) {
               //          if (err) throw err;
               //          console.log(result);
               //          if(result.length == 0){
               //             var newEntryQuery = "INSERT INTO attendances (user_id, entry_time, created_at, updated_at) VALUES( "+userData.id+", now(), now(), now() )";
               //             con.query(newEntryQuery, function (err, result, fields){
               //                if (err) throw err;
               //                console.log(result);
               //                console.log('Entry Successful');
               //             });
               //          }else if(result[0].entry_time == null){
               //
               //          }else{
               //
               //          }
               //       });
               //    }else{
               //       var attendance = "SELECT * FROM attendances WHERE user_id ="+userData.id+" ";
               //       con.query(attendance, function (err, result, fields) {
               //          if (err) throw err;
               //          console.log(result.length);
               //          if(result.length != 0){
               //             console.log("exit"+result[0].exit_time+'12'+result[0].exit_time.length);
               //             if(result[0].exit_time != null && result[0].exit_time.length != 0){
               //                console.log('already exists');
               //             }else if (result[0].entry_time != null){
               //                var exitUpdateQuery = "UPDATE attendances SET exit_time = NOW(), updated_at = now() WHERE user_id = "+userData.id;
               //                con.query(exitUpdateQuery, function (err, result, fields){
               //                   if (err) throw err;
               //                   console.log('Entry Successful');
               //                });
               //             }else{
               //                console.log('Entry first1')
               //             }
               //          }else{
               //             console.log('Entry first2');
               //          }
               //
               //       });
               //    }
               //
               // }
           // });



       //  });

     // });
      console.log('received: %s', message);
      ws.send('Got your message its: '+message);
   });
   console.log("Total client : "+wss.clients.size);
});




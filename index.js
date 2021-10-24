const express = require('express');
const app = express();

var mysql = require('mysql');

var con = mysql.createConnection({
   host: "localhost",
   user: "root",
   password: "",
   database: "erp_attendance"
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
      console.log('received: %s', message);
      ws.send('Got your message its: '+message);
   });
});




con.connect(function(err) {
   if (err) throw err;
   console.log("Connected!");
   con.query("SELECT * FROM users", function (err, result, fields) {
      if (err) throw err;
      console.log(result);
   });
});
var port      = 4100;
var count     = 0;

var ryan      = require( './lib/lib_google' );
var mongoAPI  = require( './lib/lib_mongo' );
var tensorAPI  = require( './lib/lib_tensor' );

var people        = {};
var createRoom = function(room){
    if(people[room] == undefined)
       people[room] = {};
}

io = require('socket.io',{'transports': ['websocket', 'polling']}).listen(port);
//io.set('transports', ["websocket", "polling"]);
var data = io.on('connection', function (socket) {
    count++;
    console.log('connect',count);

    socket.join('room');
    socket.room = 'room';
    createRoom('room');
    people[socket.room][socket.id] = {'name':'name'};
    console.log('Rooms:',people);
    if(people[socket.room]){
        people[socket.room][socket.id].mongo = new mongoAPI(socket);
        people[socket.room][socket.id].tensor = new tensorAPI(socket,people[socket.room][socket.id].mongo);
        ryan.setMongo(people[socket.room][socket.id].mongo);
    }
    socket.on('event', function(data){ console.log('event',data); });
    socket.on('disconnect', function(){
           count--;
           console.log('disconnect',count);
           people[socket.room][socket.id].mongo.closeConnection();
           delete people[socket.room][socket.id];
           socket.leave('room');
    });

    /**********************************************/
    /***********          GOOGLE            *******/
    /**********************************************/
    socket.on('open_connect', function(a){
           console.log('socket_open_connect');
           ryan.open_connect(socket,people[socket.room][socket.id].mongo,a);
    });
    socket.on('save_plan', function(a){
           console.log('socket_save');
           people[socket.room][socket.id].mongo.save(a);
    });
    socket.on('proc', function(list){
           console.log('socket_proc');
           people[socket.room][socket.id].mongo.process(list);
    });
    socket.on('send', function(doenca){
           console.log('socket_send');
           people[socket.room][socket.id].tensor.send(doenca);
    });
    socket.on('exam', function(a){
           console.log('socket_send');
           people[socket.room][socket.id].tensor.exam(a);
    });
    socket.on('getScores', function(disease={},filter={'datatime':1}){
           console.log('socket_getScores');
           people[socket.room][socket.id].mongo.getScores(disease,filter);
    });
    socket.on('getDiseases', function(){
           console.log('socket_getDiseases');
           people[socket.room][socket.id].mongo.getDiseases();
    });
    socket.on('getCasos', function(){
           console.log('socket_getCasos');
           people[socket.room][socket.id].mongo.getCasos();
    });
});

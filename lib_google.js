const {google} = require('googleapis');

class oAPI{
    constructor(content){
      this.CLASS;
      this.SOCKET;
      this.MONGO;
      this.DATA;
      //
      this.open();
    }
    open(){
      this.CLASS = google.sheets({
        version: 'v4',
        auth: 'AIzaSyCLM1cD9a7A6hHuEyRPVc03cbO1IyYjCz0'
      });
    }
    setToken(socket){
       this.SOCKET = socket;
       return this;
    }
    setMongo(mongo=undefined){
      this.MONGO = mongo;
    }
    list(auth,range){
      this.CLASS.spreadsheets.values.get({
                  spreadsheetId: range.Plan,//'1rYqJ3orTe09ON-A6HaOXhvhuWdpo4jfPQyYWMVtq10A',
                  range: range.Load,//"A1:C2",
                  majorDimension:range.major,//ROWS,COLUMNS

      }, (err, response) =>{
            //console.log('response',response.data);
            _API.SOCKET.emit("html", response.data);
            this.DATA = response.data;
      });
    }
}
var _API = new oAPI();

var exec_open_connect = function(socket,mongo,range){
      _API.setToken(socket).list(_API.AUTH,range);
}
var exec_setMongo = function(a){
      _API.setMongo(a);
}
var exec_save = function(){
      _API.save();
}

exports.open_connect        = exec_open_connect;
exports.setMongo            = exec_setMongo;

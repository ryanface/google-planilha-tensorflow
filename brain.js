var brain = require('brain.js');

class oAPI{
    constructor(socket,mongo){
        this.SOCKET    = socket;
        this.MONGO     = mongo;
        this.net       = new brain.NeuralNetwork({
                              learningRate: 0.6 // global learning rate, useful when training using streams
                            });
        //scenes=10  ,days=7
        let train = this.dataTrain(7, 7);
        this.net.trainAsync(train);
    }
    open(param){
        //train={ d1: 1, d2: 3, d3: 5, d4: 1, d5: 3, d6: 2, d7: 1 }
        let tmp = []
        param.score = this.net.run(param.list);
        tmp.push(param);
        console.log(tmp);
        this.SOCKET.emit("train", tmp);
    }
    send(list){
        let result = [];
        for(let i in list){
           list[i].score = this.net.run(list[i].list);
           //if(list[i].score.item >= 0.8)
            result.push(list[i]);
        }
        //console.log('list',list);
        this.SOCKET.emit("train", result);
    }
    dataTrain(scenes,days){
        let sum   = 0;
        let train = [];
        let item  = new Object();
        for(let i=0; i<= scenes; i++){
            item = new Object();
            for(let j=sum; j<= (days+sum); j++){
               item['d'+(j-sum)] = j;
            }
          sum++;
          train.push({input: item, output: { item: 1 }});
        }
        //trainar o negativo --inverte os dados do treino
        for(let i in train){
          let tmp = [];
          for(let j in train[i].input){
             tmp.push(train[i].input[j]);
          }
          tmp.reverse();
          item  = new Object();
          for(let x in tmp){
             item['d'+x] = tmp[x];
          }
          train.push({input: item, output: { item: 0 }});
        }
        //console.log('train',train);
      return train;
    }
    clear(){

    }
}

module.exports = oAPI;

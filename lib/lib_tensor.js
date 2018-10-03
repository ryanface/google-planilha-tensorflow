const tf = require('@tensorflow/tfjs');
//const data = require('./data/data.js');

class oAPI{
    constructor(socket,mongo){
        this.SOCKET    = socket;
        this.MONGO     = mongo;
        // Define a model for linear regression.
        this.model = tf.sequential();
        //scenes=7  ,days=7
        let train = this.dataTrain(6,6);
        this.confTensor(train);
        //this.execTensor([[ 0, 1, 2, 3, 4, 2, 1]]);
    }
    confTensor(train){
      this.model.add(tf.layers.dense({ units: 16, inputShape: 7, activation: 'tanh' }));
      this.model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
      this.model.compile({ optimizer: 'sgd', loss: 'binaryCrossentropy', lr: 0.1 });
      const xs = tf.tensor2d(train.train);  //tf.tensor2d([[0, 1, 2, 3], [1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]]);
      const ys = tf.tensor2d(train.merge); //tf.tensor2d([ [0], [1] ]);
      this.model.fit(xs, ys, {
            epochs: 200,
            callbacks: {
              onEpochEnd: async (epoch, log) => {
                console.log(`Epoch ${epoch}: loss = ${log.loss}`);
              }
            }
      });/*.then(() => {
           model.predict(target).print();
      });  */
    }
    async execTensor(test){
      console.log('execTensor',test);
      if(test.length >= 7){
          const target = tf.tensor2d([test]); //[[ 0, 1, 2, 3, 4, 2, 1]]
          let ru = await this.model.predict(target); //.print();
          return ru.dataSync()[0];
      }else{
        console.log('incompleto:',test.length);
      }
    }
    async send(doenca){
         let result = [];
         await this.MONGO.group_by_day(doenca);
         let list = await this.MONGO.get_warms(doenca);
         //console.log('group_by_day',list);
         let data = this.mount_test(list);
         //console.log('mount_test',data);
         //
         for(let i in data){
            data[i].score = {'item':0};
            data[i].score.item = await this.execTensor(data[i].list);
            console.log('exam',data[i].list,data[i].score);
           //data[i].score = this.net.run(data[i].list);
           //if(list[i].score.item >= 0.8)
            result.push(data[i]);
         }
         //console.log('list',list);
         await this.MONGO.scores(doenca,result);
         this.SOCKET.emit("save", doenca, "process scores ok - "+doenca);
    }
    mount_test(list){
      //com base nos warms monta o test
      let data  = [];
      let count = 1;
      let index = 0;
      let item  = [];
      for (let i in list){
          //console.log(list[i]);
          if(data[index] == undefined) data[index] = {'score':0,'list':[],'doenca':''};
          item.push(list[i].casos);
         if(count == 1){
            data[index].doenca   = list[i].doenca;
            data[index].datatime = list[i].datatime;
            data[index].data     = new Date(list[i].data);
         }
         //console.log(i,this.proc.length);
         if(count >= 7 || parseInt(i) == (list.length-1)){
            data[index].datatimeEnd = list[i].datatime;
            data[index].dataEnd = new Date(list[i].data);
            data[index].list = item;
            //
            index++;
            count = 0;
            item  = [];
         }
         count++;
      }
      return data;
    }

    dataTrain(scenes,days){
        let sum   = 0;
        let train = [];
        let item  = [];
        let reverse = [];
        let merge = [];
        for(let i=0; i<= scenes; i++){
            item = [];
            for(let j=sum; j<= (days+sum); j++){
               item[(j-sum)] = j;
            }
            train.push(item);
            reverse = [];
            for(let x in item){
              reverse[x] = item[x];
            }
            reverse.reverse();
            train.push(reverse);

            merge.push([1], [0]);//priemiro array positivo,segundo negativo
          sum++;
        }
        //console.log(merge);
        //console.log(train);
      return {'train':train,'merge':merge};
    }

    async exam(data){
         let result = [];
         for(let i in data){
             data[i].score = {'item':0};
             data[i].score.item = await this.execTensor(data[i].list);
             console.log('exam',data[i].list,data[i].score);
             result.push(data[i]);
         }
         this.SOCKET.emit("exam", result);
    }
}

module.exports = oAPI;

process.env["GOOGLE_APPLICATION_CREDENTIALS"] = __dirname.concat("/test.json");
const {
  Reader,
  Entity,
  Batch,
  Queue,
  IterablePromise,
  RedisCache
} = require('./index')({
  projectId: 'pac-1234'
});

let myCache = new RedisCache({
  url: '//10.140.0.2:6379',
  password: 'Bjq3DojKaYvj',
});

let myReader = new Reader('Reports').useCache(myCache, 30);

let start_time;
Promise.resolve()
  .then(() => myCache.awaitConnection())
  .then(() => {
    console.log('FETCHING');
    start_time = Date.now();
    return Promise.resolve();
  })
  .then(() => myReader.runQuery())
  .then(() => {
    console.log('Request took:', Date.now() - start_time, 'ms');
    return Promise.resolve();
  })
  .then(() => {
    console.log('DELAYING');
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        start_time = Date.now();
        console.log('FETCHING');
        resolve();
      }, 20000);
    });
  })
  .then(() => myReader.runQuery())
  .then(() => {
    console.log('Request took:', Date.now() - start_time, 'ms');
    return Promise.resolve();
  })
  .catch(console.log);

myCache
  .set('name', 'Isaiah Joshua', 5)
  .then(() => myCache.get('name'))
  .then((response) => {
    console.log(response);
    return new Promise((resolve, reject) => {
      setTimeout(resolve, 6000);
    });
  })
  .then(() => myCache.get('name'))
  .then(console.log)
  .catch(console.log);

let myQueue = new Queue();
myQueue.push((callback)=>{
    setTimeout(() => {
      callback();
    }, 5000)
  })
  .then(() => console.log('queue ok!'))
  .catch(console.log);

myQueue
  .push((callback)=>{
    setTimeout(() => {
      callback('queue show this error!');
    }, 5500)
  })
  .then(() => console.log('queue ok!'))
  .catch(console.log);

myQueue
  .push((callback)=>{
      new IterablePromise([1,2,3,4,5])
        .all((item, index, resolve, reject) => {
          setTimeout(() => {
            console.log(item, index);
            resolve();
          }, 5500)
        })
        .then(() => {
          callback();
        })
        .catch(() => {
          callback('IterablePromise error!');
        })
  })
  .then(() => console.log('queue ok!'))
  .catch(console.log);



let alice = new Entity('Person');
let aliceData = {
  age: 16
};
Promise.resolve()
  .then(() => {
    console.log('Creating from UUID..');
    return Promise.resolve();
  })
  .then(() => alice.fromUUID())
  .then(() => {
    console.log('alice key:', alice.key);
    console.log('alice data:', alice.data);
    console.log('TEST: Mutating data.. alice.data should still be {}');
    alice.data = 123;
    console.log('alice data:', alice.data);
    return Entity
      .exists('Person', alice.key.name)
      .then((result) => console.log('alice exists?:', result))
      .then(() => Promise.resolve())
  })
  .then(() => {
    console.log('Upserting data..');
    return alice.upsert(aliceData);
  })
  .then(() => {
    console.log('alice key:', alice.key);
    console.log('alice data:', alice.data);
    return Promise.resolve();
  })
  .then(() => {
    console.log('Deleting entity..');
    return alice.delete();
  })
  .then(() => console.log(alice))
  .catch(console.error);

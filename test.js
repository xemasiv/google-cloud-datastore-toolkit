process.env["GOOGLE_APPLICATION_CREDENTIALS"] = __dirname.concat("/test.json");
const {
  Reader,
  Entity,
  Batch,
  Queue,
  IterablePromise
} = require('./index')({
  projectId: 'pac-1234'
});

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

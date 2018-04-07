process.env["GOOGLE_APPLICATION_CREDENTIALS"] = __dirname.concat("/test.json");
const {
  Reader,
  Entity,
  Batch
} = require('./index')({
  projectId: 'pac-1234'
});

let personEntity = new Entity('Person');
let personData = {
  date_created: Date.now(),
  name: 'Xema'
};
let personAppendedData = {
  last_name: 'Siv'
};
let personReader = new Reader('Person');
let personBatchOperation = new Batch(Batch.Types.DELETE);

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
/*
Promise.resolve()
  .then(() => personEntity.fromUUID())
  .then(() => personEntity.upsert(personData))
  .then(() => personEntity.getData())
  .then((data)=>{
    console.log('PERSON CREATED ===========================');
    console.log(data);
    return personEntity.merge(personAppendedData);
  })
  .then(() => personEntity.getData())
  .then((data)=>{
    console.log('PERSON UPDATED ===========================');
    console.log(data);
    return personReader.runQuery();
  })
  .then(({entities, keys, endCursor})=>{
    console.log('PERSONS FETCHED ==========================');
    console.log('entities:', entities.length, entities);
    console.log('keys:', keys.length, keys);
    console.log('endCursor:', endCursor);
    personBatchOperation.pushEntity(personEntity);
    // personBatchOperation.pushKeys(keys);
    return personBatchOperation.execute();
  })
  .then(()=>{
    console.log('PERSONS BATCH DELETED ====================');
  })
  .catch(console.log);
*/

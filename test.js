process.env["GOOGLE_APPLICATION_CREDENTIALS"] = __dirname.concat("/test.json");
const {
  Reader,
  Entity,
  Batch,
  _Chain
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
_Chain()
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

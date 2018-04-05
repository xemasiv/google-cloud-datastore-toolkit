Google Cloud Datastore Toolkit

### Summary:
* Goals are predictability and readability

```
// Set path for JSON, optional if already set in your environment
process.env["GOOGLE_APPLICATION_CREDENTIALS"] = __dirname.concat('/test.json');

// Set datastore constructor opts
const constructorOpts = {
  projectId: 'projectNameGoesHere'
};

// Destructure
const DatastoreToolkit = require('google-cloud-datastore-toolkit');
const { Reader, Entity, Batch } = DatastoreToolkit(constructorOpts);


// Create a person
let personEntity = new Entity('Person');
let personData = {
  date_created: Date.now(),
  username: 'xemasiv'
};
personEntity
  .fromUUID()
  .then(() => personEntity.upsert(personData))
  .then(() => {
    console.log('Person created!');
  })
  .catch(console.error);

// Get specific person
const personReader = new Reader('Person');
personReader
  .filter('username', '=', 'xemasiv')
  .then(({entities, keys, endCursor}) => {
    // Do your magic
  })
  .catch(console.error);

// Create another person
let personEntity2 = new Entity('Person');
let personData2 = {
  date_created: Date.now(),
  username: 'yourmom'
};
personEntity2
  .fromUUID()
  .then(() => personEntity.upsert(personData2))
  .then(() => {
    console.log('Another person created!');
  })
  .catch(console.error);

// Get all your persons
const personReader2 = new Reader('Person');
personReader2
  .runQuery()
  .then(({entities, keys, endCursor}) => {
    // Do your magic
  })
  .catch(console.error);

const batchDelete = new Batch(Batch.Types.DELETE);
batchDelete.pushEntity(personEntity);
batchDelete.pushKey(personEntity2.key);
batchDelete
  .execute()
  .then(()=>{
    console.log('Entities from keys deleted!');
  })
  .catch(console.error);
```

* Check test.js for working example

## Reader:

#### Methods:

* constructor(kind <String>, endCursor <String:OPTIONAL> )
* select(field/s <String>/<Array>)
  * returns self, for chaining
* ascend(col <String>)
  * returns self, for chaining
* descend(col <String>)
  * returns self, for chaining
* filter(col <String>, operator <String>, val <WhateverTheFuckYouWant>)
  * returns self, for chaining
* limit(limit <Int>)
  * returns self, for chaining
* runQuery()
  * returns {entities, keys, endCursor}

## Entity:

#### Methods:

* constructor(kind <String>)
  * specifies the kind of this entity
* fromUUID()
  * self-generates the key name as a uuidv4 string, checked for collision
  * returns Promise
* fromName(name <String>)
  * uses the provided string as the key name
  * returns Promise
* fromFilters(filters <Array>)
  * runs a query using filters, picks the first result
  * returns Promise
* getKey()
  * returns Promise of key <Object>
* getData()
  * returns Promise of data <Object>
* upsert(data <Object>)
  * upserts data
  * returns Promise
* merge(data <Object>)
  * fetches data first, then merges provided data (see source code)
  * returns Promise

## Batch:

#### Methods:

* constructor(type <Batch.Types>)
  * specifies the type of method for this batch operation
* pushKeys (keys <ObjectArray>)
* pushKey (key <Object>)
* pushEntity (entity <Entity>)
* execute ()

#### Statics:

* Types <Object>
  * DELETE

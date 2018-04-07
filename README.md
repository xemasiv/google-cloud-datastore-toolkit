### Google Cloud Datastore Toolkit

* Goals
  * Entities as variables consistent with their Datastore records.


### Changelog

* v3
  * Entity no has strict consistency with Datastore
    * fromUUID() now upserts with empty data.
    * fromKeyName() now auto-loads data, with auto-upsert option if no record was found.
    * fromFilters() now auto-loads data.
    * merge() and upsert() now also fetches data for consistency.
    * Internal use of `_kind`, `_key` and `_data`, so unwanted mutations with `.kind`, `.key` and `.data` will be ignored.
* v2
  * Everything's a mess, don't use.


### Classes, Methods, Arguments & Properties

* Entity
  * `constructor(kind)` Function
    * `kind` is our Entity's kind.
    * Arguments:
      * kind / args[0] / String
  * `.fromUUID()` Function, returns Promise
    * Generates a random UUIDv4 string for the entity's key name.
    * Availability of UUIDv4 string as key name is verified.
    * Upserts an empty data to reserve entry, for consistency.
    * Sets `Entity.key` and `Entity.data` properties before resolving.
  * `.fromKeyName(keyName, autoUpsert)` Function, returns Promise
    * Uses the supplied `keyName` as the key name for this entity.
    * Boolean `autoUpsert` can be set to `true` to auto-upsert empty data.
    * Sets `Entity.key` and `Entity.data` properties before resolving.
    * Arguments:
      * `keyName` / args[0] / String
      * `autoUpsert` / args[1] / Boolean, Optional, Default = false
  * `.fromFilters()` Function, returns Promise
    * We uses the key of the first entity that matches supplied filters.
    * Sets `Entity.key` and `Entity.data` properties before resolving.
    * Arguments:
      * `filters` / args[0] / Array of Filters
      * Example format of a `filter` is ['column', 'operator', 'value']
  * `.upsert()` Function, returns Promise
    * Upserts supplied data.
    * Also fetches data afterwards to re-assign `Entity.data` property, for consistency.
    * Arguments:
      * data / args[0] / Object
  * `.merge()` Function, returns Promise
    * Same like upsert, except we merge new data with existing data.
    * Also fetches data afterwards to re-assign `Entity.data` property, for consistency.
    * Arguments:
      * data / args[0] / Object
  * `.delete()` Function, returns Promise
    * Deletes the entity from Datastore.
    * Then sets `.key`, and `.data` properties of Entity to undefined.
  * `.kind` Property
  * `.key` Property
  * `.data` Property
  * `.ErrorTypes` static Property
    * ENTITY_NOT_FOUND
    * DATASTORE_ERROR



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
```

```
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


## Reader Methods:

* constructor(kind [String], endCursor [String:OPTIONAL] )
* select(field/s [String]/[Array])
  * returns self, for chaining
* ascend(col [String])
  * returns self, for chaining
* descend(col [String])
  * returns self, for chaining
* filter(col [String], operator [String], val [WhateverTheFuckYouWant])
  * returns self, for chaining
* limit(limit [Int])
  * returns self, for chaining
* runQuery()
  * returns {entities, keys, endCursor}


## Entity Methods:

* constructor(kind [String])
  * specifies the kind of this entity
* fromUUID()
  * self-generates the key name as a uuidv4 string, checked for collision
  * returns Promise
* fromName(name [String])
  * uses the provided string as the key name
  * returns Promise
* fromFilters(filters [Array])
  * runs a query using filters, picks the first result
  * returns Promise
* getKey()
  * returns Promise of key [Object]
* getData()
  * returns Promise of data [Object]
* upsert(data [Object])
  * upserts data
  * returns Promise
* merge(data [Object])
  * fetches data first, then merges provided data (see source code)
  * returns Promise


## Batch Methods:

* constructor(type [Batch.Types])
  * specifies the type of method for this batch operation
* pushKeys (keys [ObjectArray])
* pushKey (key [Object])
* pushEntity (entity [Entity])
* execute ()


## Batch Statics:

* Types [Object]
  * DELETE

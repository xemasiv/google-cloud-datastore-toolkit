### Google Cloud Datastore Toolkit

* Goals
  * Entities as variables on steroids.
  * Strict consistency with Datastore records for predictability.
  * Methods as Promises for readability.

### Changelog

* v4.0
  * Moved helpers to Toolkit.Helpers
* v3.2
  * New helpers: AssocPromise, AssocIterate
    * https://gist.github.com/xemasiv/90b6d8254545c422ae6c89f207312c42
* v3.1
  * Fixed handling for Reader when cache is not present.
* v3.0
  * Entity now has strict consistency with Datastore
  * New helpers: RedisCache, Queue, IterablePromise
* v2
  * Everything's a mess, don't use.

### Unrelated Notes

* It's too tiring to write docs.
* Maybe in v5, or v6, or v68.

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
  * `.exists(kind, keyName)` static Function, returns Promise
    * Checks if entity exists, resolves a boolean.
    * Arguments:
      * kind / args[0] / String
      * keyName / args[1] / String

* Reader
* Batch

* AssocPromise
* AssocIterate

* IterablePromise
  * `constructor(iterableArray)` Function
    * `iterableArray` is the iterable to be iterated.
    * Arguments:
      * iterableArray / args[0] / Array
  * `.all(promiseExecutorFunction)` Function, returns Promise
    * `promiseExecutorFunction` is the function to execute on all iterated values.
    * `promiseExecutorFunction` should takes `item`, `index`, `resolve` and `reject`, in order, and should call `resolve` or `reject`.
    * Returns a promise, which means this can be chained.
    * Arguments:
      * promiseExecutorFunction / args[0] / Function
* Queue
  * `constructor(concurrency)` Function
    * `concurrency` is the concurrency of this Queue instance.
    * Arguments:
      * concurrency / args[0] / Integer
  * `.push(executableFunction)` Function, returns Promise
    * Pushes an `executableFunction` to the queue.
    * Returns a promise, which means this can be chained.
    * `executableFunction` should take the argument `callback` then execute it once done, as shown in examples.
    * Arguments:
      * executableFunction / args[0] / Function

### Setup:

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

### Preloading entities:

```
let alice = new Entity('Person');
let bob = new Entity('Person');
Promise.all([
    alice.fromKeyName('alice_key_name'),
    bob.fromKeyName('bob_key_name')
  ])
  .then(() => {
    console.log(alice.data, bob.data);
  })
  .catch()
```

### Queue

```
let myQueue = new Queue();
let queueItem = myQueue.push((callback)=>{
    setTimeout(() => {
      callback();
    }, 5000)
  })
  .then(() => console.log('queue ok!'))
  .catch(console.log);
```

### IterablePromise

```
new IterablePromise([1,2,3,4,5])
  .all((item, index, resolve, reject) => {
    setTimeout(() => {
      console.log(item, index);
      resolve();
    }, 5500)
  })
  .then()
  .catch()
```

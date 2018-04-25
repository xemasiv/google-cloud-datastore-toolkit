### Google Cloud Datastore Toolkit

* Goals
  * Entities as variables on steroids.
  * Strict consistency with Datastore records for predictability.
  * Methods as Promises for readability.

### Changelog

* v7.2
  * Added Transaction support, see below.
* v7.1
  * Fixed Entity.fromKeyName
	* If passes UUIDv4 regex test, keep keyName as string.
	* Otherwise, apply parseInt
	* If no entity was found, load as String.
* v6.1
  * Fixed Entity.fromUUID bug:
	* Auto-assigned Key ID's are Integer. Across browser-server, these keys might be interpreted as String, which results in unpredictability
	* The fix is to use RegExUUIDv4 on keyName argument. If regex passed, keep it. Otherwise, parseInt it. This way non-uuidv4 keynames are transformed into Integers and not Strings.
* v5.1
  * Rewrite of Queue, now allows resolve and reject.
* v4.1
  * Woops typo
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

* Lol I'm too lazy to write docs.

### Classes, Methods, Arguments & Properties
Added @ `v7.2`

* Transaction
  * `constructor(...keyPairs)`
    * Creates a Transaction instance.
    * Accepts multiple key pairs, label are mapped to entity data.
    * Accepted Arguments
      * `keyPair` / args[0 to n] / Array : [label, key]
        Array Values
          * `label` / array[0] / string
          * `key` / array[1] / object; a datastore.key
  * `start(executorFunction)`
    * Passes the Function / Promise that handles the transaction.
    * Accepted Arguments
      * `executorFunction`
        Passed Arguments
          * `mappedResults` / args[0] / object
            * Modified and passed to 1T.commit()`
            * Format: `{ [label] : [data] }`
          * `T` / args[1], object
            * For running `T.commit(mappedResults)`
  * `commit(mappedResults)`
    * Receives the Updated mappedResults.
    * Saves and commits the the transaction.
    * Executes a rollback on commit error.
    * Accepted Arguments
      * `mappedResults` / args[0] / object

```
    let transactionAmount = 10;
    return new Transaction(
      ['alice', alice.key],
      ['bob', bob.key]
    ).start((R, T) => {
      R.alice.current -= transactionAmount;
      R.bob.current += transactionAmount;
      /*
        Validations:
        - No NaN / undefined / null value found.
        - Final values didn't equate below zero.
      */
      if (R.alice.current < 0) {
        return Promise.reject("Invalid transaction.")
      } else {
        return T.commit(R);
      }
    });
```

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
let x = new Queue();
Promise.resolve()
	.then(() => x.push((resolve, reject) => {
   	resolve(123);
  }))
  .then(console.log)
  .then(() => x.push((resolve, reject) => {
   	resolve(456);
   }))
  .then(console.log)
	.then(() => x.push((resolve, reject) => {
   	resolve(123);
  }))
  .then(console.log)
  .catch(console.error)
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

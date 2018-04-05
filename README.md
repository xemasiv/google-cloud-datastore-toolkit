Google Cloud Datastore Toolkit

### Summary:
* Goals are predictability and readability

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

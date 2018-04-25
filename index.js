const GoogleCloudDatastore = require('@google-cloud/datastore');
const UUID = require('uuid-random');
const async = require('async');
const redis = require('redis');
const hasha = require('hasha');
const CircularJSON = require('circular-json');
const RegExUUIDv4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const Toolkit = (opts) => {
  const Datastore = new GoogleCloudDatastore(opts);

  const Types = {
    DELETE: 'DELETE'
  };
  const EntityErrorTypes = {
    ENTITY_NOT_FOUND: 'ENTITY_NOT_FOUND',
    DATASTORE_ERROR: 'DATASTORE_ERROR'
  };

  class Transaction{
    constructor (...keyPairs) {
      this.transaction = Datastore.transaction();
      this.keyPairs = keyPairs;
    }
    start (executorFn) {
      const { transaction, keyPairs } = this;
      let T = this;
      return transaction
        .run()
        .then(() => {
          return Promise.all(keyPairs.map((keyPair) => transaction.get(keyPair[1])));
        })
        .then((results) => {
          let mappedResults = {};
          keyPairs.map((keyPair, keyPairIndex) => {
            mappedResults[keyPair[0]] = results[keyPairIndex][0];
          });
          return executorFn(mappedResults, T);
        });
    }
    commit (mappedResults) {
      const { transaction, keyPairs } = this;
      const updateArray =  keyPairs.map((keyPair) => {
        return {
          key: keyPair[1],
          data: mappedResults[keyPair[0]]
        };
      });
      transaction.save(updateArray);
      return transaction.commit().catch(() => transaction.rollback());
    }
  }

  class Batch {
    constructor (type) {
      switch (type) {
        case Types.DELETE:
          this.type = Types.DELETE;
          break;
        default:
          new TypeError('UNKNOWN TYPE used in Batch Operation.');
          break;
      }
      this.keys = [];
    }
    static get Types() {
      return Types;
    }
    pushKeys (keys) {
      this.keys = this.keys.concat(keys);
      return new Promise((r) => r());
    }
    pushKey (key) {
      this.keys.push(key);
      return new Promise((r) => r());
    }
    pushEntity (entity) {
      if (Boolean(entity.key) === false) {
        new TypeError('UNEXPECTED ENTITY pushed in Batch Operation.');
        return;
      }
      this.keys.push(entity.key);
      return new Promise((r) => r());
    }
    execute () {
      switch (this.type) {
        case Types.DELETE:
          return Datastore.delete(this.keys);
          break;
      }
    }
  }

  class Reader {
    constructor (kind, endCursor) {
      let query = Datastore.createQuery(kind);
      if (Boolean(endCursor) === true) {
        query = query.start(endCursor);
      }
      this._query = query;
      this._cache = undefined;
      this._expires = undefined;
    }
    ascend (col) {
      this._query = this._query.order(col);
      return this;
    }
    descend (col) {
      this._query = this._query.order(col, {
        descending: true,
      });
      return this;
    }
    select (fields) {
      this._query = this._query.select(fields);
      return this;
    }
    filter (col, operator, val) {
      this._query = this._query.filter(col, operator, val);
      return this;
    }
    limit (limit) {
      this._query = this._query.limit(limit);
      return this;
    }
    useCache (cache, expires) {
      this._cache = cache;
      this._expires = expires;
      return this;
    }
    runQuery () {
      return new Promise((resolve, reject)=>{
        let query = this._query;
        let cache = this._cache;
        let expires = this._expires;
        let key = hasha(
          CircularJSON.stringify(query),
          { algorithm: 'sha256' }
        );
        let data;
        Promise.resolve()
          .then(() => {
            return new Promise((resolve, reject) => {
              if (Boolean(cache) === false || cache.available === false) {
                resolve();
                return;
              }
              cache
                .get(key)
                .then((reply) => {
                  data = JSON.parse(reply);
                  resolve();
                })
            });
          })
          .then(() => {
            let cache = this._cache;
            return new Promise((resolve, reject) => {
              if (Boolean(data) === true) {
                resolve();
                return;
              }
              Datastore
                .runQuery(this._query)
                .then((results)=>{
                  let entities = results[0];
                  let keys = entities.map(entity => entity[Datastore.KEY]);
                  let info = results[1];
                  let endCursor = (
                    info.moreResults !== Datastore.NO_MORE_RESULTS ?
                    info.endCursor :
                    null
                  );
                  data = { entities, keys, endCursor };
                  if (Boolean(cache) === false || cache.available === false) {
                    resolve();
                    return;
                  }
                  cache
                    .set(key, JSON.stringify(data), expires)
                    .then(() => resolve())
                    .catch(reject);
                })
                .catch(reject);
            });
          })
          .then(() => {
            resolve(data);
          })
          .catch(reject);
      });
    }
  };

  const DatastoreErrorReject = (reject) => {
    return (...args) => {
      reject({
        type: EntityErrorTypes.DATASTORE_ERROR,
        info: args
      })
    }
  };

  class Entity {
    constructor (kind) {
      this._kind = kind;
    }
    fromUUID () {
      let instance = this;
      let kind = instance._kind;
      let uuid;
      let key;
      let data = {};
      return new Promise((resolve, reject)=>{
        const RecurseUUID = () => {
          uuid = UUID();
          key = Datastore.key([kind, uuid]);
          Datastore
            .get(key)
            .then((results) => {
              if (Boolean(results[0]) === true) {
                RecurseUUID();
              } else {
                instance._key = key;
                instance._data = data;
                Datastore
                  .upsert({key, data})
                  .then(() => resolve())
                  .catch(
                    DatastoreErrorReject(reject)
                  );
              }
            })
            .catch(
              DatastoreErrorReject(reject)
            );
        };
        RecurseUUID();
      });
    }
    fromKeyName (keyName, autoUpsert) {
      let instance = this;
	  let kind, key, data, parsedKeyName;
      kind = instance._kind;

	  // if UUIDv4, keep as string, otherwise parse as Integer.
	  parsedKeyName = RegExUUIDv4.test(keyName) ? keyName : parseInt(keyName);

      key = Datastore.key([kind, parsedKeyName]);
      data = {};
      return new Promise((resolve, reject)=>{
		Promise.resolve()
		  .then(() => Datastore.get(key))
          .then((results) => {
            if (Boolean(results[0]) === true) {
              instance._key = key;
              instance._data = results[0];
              resolve();
            } else {
              if (Boolean(autoUpsert) === true) {
                Datastore
                  .upsert({key, data})
                  .then(() => {
                    instance._key = key;
                    instance._data = data;
                    resolve();
                  })
                  .catch(DatastoreErrorReject(reject));
              } else {
				return Promise.reject();
              }
            }
          })
		  .catch(() => {
			// if not found as Integer, try as String
		    parsedKeyName = String(keyName);
			key = Datastore.key([kind, parsedKeyName]);
			return Datastore.get(key);
		  })
		  .then((results) => {
            if (Boolean(results[0]) === true) {
              instance._key = key;
              instance._data = results[0];
              resolve();
            } else {
              reject({
                type: EntityErrorTypes.ENTITY_NOT_FOUND
              })
            }
		  })
          .catch(DatastoreErrorReject(reject));
      });
    }
    fromFilters (filters) {
      let instance = this;
      let kind = instance._kind;
      return new Promise((resolve, reject)=>{
        let query = Datastore
          .createQuery(kind)
          .limit(1);
        filters.map((filter)=>{
          query = query.filter(filter[0], filter[1], filter[2]);
        });
        Datastore
          .runQuery(query)
          .then((results)=>{
            let entities = results[0];
            let keys = entities.map(entity => entity[Datastore.KEY]);
            if (Boolean(entities[0]) === true) {
              instance._data = entities[0];
              instance._key = keys[0];
              resolve();
            } else {
              reject({
                type: EntityErrorTypes.ENTITY_NOT_FOUND
              });
            }
          })
          .catch(
            DatastoreErrorReject(reject)
          );
      });
    }
    merge (newData) {
      let instance = this;
      let key = instance._key;
      return new Promise((resolve, reject)=>{
        Promise.resolve()
          .then(() => Datastore.get(key))
          .then((results) => {
            let existingData = results[0];
            return Datastore.upsert({key,
              data: {
                ...existingData,
                ...newData
              }
            });
          })
          .then(() => Datastore.get(key))
          .then((results) => {
            instance._data = results[0];
            resolve();
          })
          .catch(
            DatastoreErrorReject(reject)
          );
      });
    }
    upsert (data) {
      let instance = this;
      let key = instance._key;
      return new Promise((resolve, reject)=>{
        Promise.resolve()
          .then(() => Datastore.upsert({key, data}))
          .then(() => Datastore.get(key))
          .then((results) => {
            instance._data = results[0];
            resolve();
          })
          .catch(
            DatastoreErrorReject(reject)
          );
      });
    }
    delete () {
      let instance = this;
      let key = instance._key;
      return new Promise((resolve, reject)=>{
        Promise.resolve()
          .then(() => Datastore.delete(key))
          .then(() => {
            instance._key = undefined;
            instance._data = undefined;
            resolve();
          })
          .catch(
            DatastoreErrorReject(reject)
          );
      });
    }
    static get ErrorTypes() {
      return EntityErrorTypes;
    }
    get data () {
      return this._data;
    }
    get key () {
      return this._key;
    }
    get kind () {
      return this._kind;
    }
    static exists (kind, keyName) {
      return new Promise((resolve, reject)=>{
        let key = Datastore.key([kind, keyName]);
        Datastore
          .get(key)
          .then((results) => {
            if (Boolean(results[0]) === true) {
              resolve(true);
            } else {
              resolve(false)
            }
          })
          .catch(
            DatastoreErrorReject(reject)
          )
      });
    }
  }

  return {
    Reader, Entity, Batch, Transaction
  };
};

const Helpers = () => {

  class Queue {
    constructor (concurrency) {
      let queue = async.queue((promisified, callback) => {
        promisified(callback);
      }, Boolean(parseInt(concurrency)) ? concurrency : 1);
      this._queue = queue;
    }
    push (executableFunction) {
      let queue = this._queue;
      return new Promise((resolve, reject) => {
      	let promisified = (callback) => {
        	new Promise((resolve, reject) => {
        		executableFunction(resolve, reject);
          })
          .then((...args)=>callback(Promise.resolve.apply(Promise, args)))
          .catch((...args)=>callback(Promise.reject.apply(Promise, args)));
        }
        queue.push(promisified, (returned) => {
          returned.then(resolve).catch(reject);
        });
      });
    }
  }

  class IterablePromise{
    constructor (iterableArray) {
      this._iterableArray = iterableArray;
    }
    all (promiseExecutorFunction) {
      let iterableArray = this._iterableArray;
      return Promise.all(
        iterableArray.map((item, index) => {
          return new Promise((resolve, reject)=>{
            promiseExecutorFunction(item, index, resolve, reject);
          });
        })
      );
    }
  }

  class AssocPromise{
  	constructor () {
    	this._iterable = [];
    }
    push (iterate) {
    	if (Boolean(iterate._label) === false) {
      	return;
      }
    	if (Boolean(iterate._fn) === false) {
      	return;
      }
    	this._iterable.push(iterate);
      return this;
    }
    all () {
      let iterable = this._iterable;
      let resultObject = {};
      return Promise.all(
        iterable.map((iterate) => {
          return new Promise((resolve, reject) => {
            let label = iterate._label;
            let thisArg = iterate._thisArg;
            let fn = iterate._fn;
            let args = iterate._args;
            fn.apply(thisArg, args)
              .then((result) => {
                resultObject[label] = result;
                resolve();
              })
              .catch((error) => {
                resultObject[label] = error;
                resolve(true);
              });
          });
        })
      )
      .then((results) => {
      	results.map((result) => {
          if (Boolean(result) === true) {
            return Promise.reject(resultObject);
          }
        });
      	return Promise.resolve(resultObject);
      })
      .catch(() => {
      	return Promise.reject(resultObject);
      })
    }
  }

  class AssocIterate{
  	constructor (label) {
    	this._label = label;
      this._thisArg = null;
      this._args = [];
    }
    thisArg (thisArg) {
    	this._thisArg = thisArg;
      return this;
    }
    args (...args) {
    	this._args = args;
      return this;
    }
    fn (fn) {
    	this._fn = fn;
      return this;
    }
  }

  class RedisCache {
    constructor (redisOpts) {
      const client = redis.createClient(redisOpts);
      this._client = client;
    }
    awaitConnection () {
      const client = this._client;
      return new Promise((resolve, reject) => {
        if (this._client.connected === true) {
          resolve();
        } else {
          client.on('connect', resolve);
        }
      });
    }
    get (key) {
      const client = this._client;
      return new Promise((resolve, reject) => {
        client.get(key, (err, reply) => {
          Boolean(err) ? reject(err) : resolve(reply);
        });
      });
    }
    set (key, value, expires) {
      const client = this._client;
      return new Promise((resolve, reject) => {
        if (Boolean(parseInt(expires)) === true) {
          client.set(key, value, 'EX', expires, (err, reply) => {
            Boolean(err) ? reject(err) : resolve(reply);
          });
        } else {
          client.set(key, value, (err, reply) => {
            Boolean(err) ? reject(err) : resolve(reply);
          });
        }
      });
    }
    get available () {
      return this._client.connected;
    }
  }

  return {
    Queue,
    IterablePromise,
    AssocPromise,
    AssocIterate,
    RedisCache
  };
};

Toolkit.Helpers = Helpers();

module.exports = Toolkit;

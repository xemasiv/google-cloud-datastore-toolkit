const GoogleCloudDatastore = require('@google-cloud/datastore');
const UUID = require('uuid-random');
const async = require('async');
const redis = require('redis');
const hasha = require('hasha');
const CircularJSON = require('circular-json');

const Toolkit = (opts) => {
  const Datastore = new GoogleCloudDatastore(opts);

  const Types = {
    DELETE: 'DELETE'
  };
  const EntityErrorTypes = {
    ENTITY_NOT_FOUND: 'ENTITY_NOT_FOUND',
    DATASTORE_ERROR: 'DATASTORE_ERROR'
  };

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
        Promise.resolve()
          .then(() => {
            if (Boolean(cache) === true && cache.available === true) {
              console.log('GETTING FROM CACHE');
              cache
                .get(key)
                .then((reply) => {
                  console.log('FETCHED:', reply);
                  return Promise.resolve();
                })
            } else {
              return Promise.resolve();
            }
          })
          .then((reply) => {
            console.log('REPLY:', reply);
            // reply = value received from cache.
            if (Boolean(reply) === true) {
              console.log('RESOLVING FROM CACHE');
              // if we have it, resolve it.
              return Promise.resolve(reply);
            } else {
              console.log('RESOLVING FROM DATASTORE FETCH');
              // if not, we load it then cache it.
              return new Promise((resolve, reject) => {
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
                    let data = { entities, keys, endCursor };
                    cache
                      .set(key, JSON.stringify(data), expires)
                      .then(() => resolve(data))
                      .catch(reject);
                  })
                  .catch(reject);
              });
            }
          })
          .then(resolve)
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
      let kind = instance._kind;
      let key = Datastore.key([kind, keyName]);
      let data = {};
      return new Promise((resolve, reject)=>{
        Datastore
          .get(key)
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
                reject({
                  type: EntityErrorTypes.ENTITY_NOT_FOUND
                })
              }
            }
          })
          .catch(
            DatastoreErrorReject(reject)
          );
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

  class Queue {
    constructor (concurrency) {
      let queue = async.queue((executableFunction, callback) => {
        executableFunction(callback);
      }, Boolean(parseInt(concurrency)) ? concurrency : 1);
      this._queue = queue;
    }
    push (executableFunction) {
      let queue = this._queue;
      return new Promise((resolve, reject) => {
        queue.push(executableFunction, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
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

  class RedisCache {
    constructor (redisOpts) {
      const client = redis.createClient(redisOpts);
      this._client = client;
    }
    awaitConnection () {
      const client = this._client;
      return new Promise((resolve, reject) => {
        client.on('connect', resolve);
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

  return { Reader, Entity, Batch, IterablePromise, Queue, RedisCache };
}
module.exports = Toolkit;

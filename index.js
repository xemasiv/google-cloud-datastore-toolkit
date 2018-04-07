const GoogleCloudDatastore = require('@google-cloud/datastore');
const UUID = require('uuid-random');

const Toolkit = (opts) => {
  const Datastore = new GoogleCloudDatastore(opts);

  const Types = {
    DELETE: 'DELETE'
  };
  const EntityErrorTypes = {
    ENTITY_NOT_FOUND: 'ENTITY_NOT_FOUND',
    DATASTORE_ERROR: 'DATASTORE_ERROR'
  };

  class Batch{
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

  class Reader{
    constructor (kind, endCursor) {
      let query = Datastore.createQuery(kind);
      if (Boolean(endCursor) === true) {
        query = query.start(endCursor);
      }
      this.query = query;
    }
    ascend (col) {
      this.query = this.query.order(col);
      return this;
    }
    descend (col) {
      this.query = this.query.order(col, {
        descending: true,
      });
      return this;
    }
    select (fields) {
      this.query = this.query.select(fields);
      return this;
    }
    filter (col, operator, val) {
      this.query = this.query.filter(col, operator, val);
      return this;
    }
    limit (limit) {
      this.query = this.query.limit(limit);
      return this;
    }
    runQuery () {
      return new Promise((resolve, reject)=>{
        Datastore
          .runQuery(this.query)
          .then((results)=>{
            let entities = results[0];
            let keys = entities.map(entity => entity[Datastore.KEY]);
            let info = results[1];
            let endCursor = (
              info.moreResults !== Datastore.NO_MORE_RESULTS ?
              info.endCursor :
              null
            );
            resolve({entities, keys, endCursor});
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

  class Entity{
    constructor (kind) {
      this.kind = kind;
    }
    fromUUID () {
      let instance = this;
      let { kind } = instance;
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
                instance.key = key;
                instance.data = data;
                Datastore
                  .upsert({key, data})
                  .then(() => resolve())
                  .catch(DatastoreErrorReject(reject));
              }
            })
            .catch(DatastoreErrorReject(reject));
        };
        RecurseUUID();
      });
    }
    fromKeyName (keyName, autoUpsert) {
      let instance = this;
      let key = Datastore.key([this.kind, keyName]);
      let data = {};
      return new Promise((resolve, reject)=>{
        Datastore
          .get(key)
          .then((results) => {
            if (Boolean(results[0]) === true) {
              instance.key = key;
              instance.data = results[0];
              resolve();
            } else {
              instance.key = key;
              instance.data = data;
              if (Boolean(autoUpsert) === true) {
                Datastore
                  .upsert({key, data})
                  .then(() => resolve())
                  .catch(DatastoreErrorReject(reject));
              } else {
                reject({
                  type: EntityErrorTypes.ENTITY_NOT_FOUND
                })
              }
            }
          })
          .catch(DatastoreErrorReject(reject));
      });
    }
    fromFilters (filters) {
      let instance = this;
      return new Promise((resolve, reject)=>{
        let query = Datastore
          .createQuery(this.kind)
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
              instance.data = entities[0];
              instance.key = keys[0];
              resolve();
            } else {
              reject({
                type: EntityErrorTypes.ENTITY_NOT_FOUND
              });
            }
          })
          .catch((...args) => {
            reject({
              type: EntityErrorTypes.DATASTORE_ERROR,
              info: args
            })
          });
      });
    }
    merge (newData) {
      let instance = this;
      let { key } = instance;
      return Promise.resolve()
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
          instance.data = results[0];
          return Promise.resolve();
        });
    }
    upsert (data) {
      let instance = this;
      let { key } = instance;
      return Promise.resolve()
        .then(() => Datastore.upsert({key, data}))
        .then(() => Datastore.get(key))
        .then((results) => {
          instance.data = results[0];
          return Promise.resolve();
        });
    }
    delete () {
      let instance = this;
      let { key } = instance;
      return Promise.resolve()
        .then(() => Datastore.delete(key))
        .then(() => {
          instance.key = undefined;
          instance.data = undefined;
          return Promise.resolve();
        });
    }
    static get ErrorTypes() {
      return EntityErrorTypes;
    }
  }

  return { Reader, Entity, Batch };
}
module.exports = Toolkit;

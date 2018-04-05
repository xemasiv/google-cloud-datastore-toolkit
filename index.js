const GoogleCloudDatastore = require('@google-cloud/datastore');
const UUID = require('uuid-random');

// TODO:
// Batch
// Deleting of entities
// Batch operations
// Entity
// Delete

const Toolkit = (opts) => {
  const Datastore = new GoogleCloudDatastore(opts);

  const Types = {
    DELETE: 'DELETE'
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

  class Entity{
    constructor (kind) {
      this.kind = kind;
    }
    fromUUID () {
      let instance = this;
      let { kind } = instance;
      return new Promise((resolve, reject)=>{
        let uuid;
        const EntityNameGenerationLoop = () => {
          uuid = UUID();
          let query = Datastore.createQuery(kind).filter('name', '=', uuid);
          Datastore
            .runQuery(query)
            .then((results) => {
              if (results[0].length !== 0) {
                EntityNameGenerationLoop();
              } else {
                instance.key = Datastore.key([kind, uuid]);
                resolve();
              }
            })
            .catch(reject);
        };
        EntityNameGenerationLoop();
      });
    }
    fromName (name_or_id) {
      this.key = Datastore.key([this.kind, name_or_id]);
      return new Promise((r) => r());
    }
    fromFilters (filters) {
      let instance = this;
      return new Promise((resolve, reject)=>{
        let query = Datastore
          .createQuery(this.kind)
          .select('__key__')
          .limit(1);
        filters.map((filter)=>{
          query = query.filter(filter[0], filter[1], filter[2]);
        });
        Datastore
          .runQuery(query)
          .then((results)=>{
            let entities = results[0];
            let keys = entities.map(entity => entity[Datastore.KEY]);
            instance.key = keys[0];
            if (entities[0] !== undefined) {
              resolve();
            } else {
              reject('ENTITY_NOT_FOUND');
            }
          })
          .catch(reject);
      });
    }
    getKey () {
      let key = this.key;
      return new Promise((r)=> r(key));
    }
    getData () {
      let key = this.key;
      return new Promise((resolve, reject)=>{
        if (Boolean(key) === false) {
          reject('MISSING_ENTITY_KEY');
        }
        Datastore
          .get(key)
          .then((results)=>{
            if (results[0] !== undefined) {
              let data = results[0]
              resolve(data);
            } else {
              reject('ENTITY_NOT_FOUND');
            }
        });
      });
    }
    merge (newData) {
      let key = this.key;
      return Datastore
        .get(key).then((results)=>{
          let existingData = results[0];
          return Datastore.upsert({key,
            data: {
              ...existingData,
              ...newData
            }
          });
        });
    }
    upsert (data) {
      let key = this.key;
      return Datastore.upsert({key, data});
    }
  }

  const _Chain = () => {
    return new Promise(r => r());
  };

  return { Reader, Entity, Batch, _Chain };
}
module.exports = Toolkit;

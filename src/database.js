import pgp from 'pg-promise';
import Promise from 'bluebird';
import config from 'config';
import _ from 'lodash';

let pg = pgp({ promiseLib: Promise });
let db = null;

/**
 * Get the current database connection.
 * @return {Object} pgp database connection.
 */
export function getDB() {
  return db ? db : initialize();
}

/**
 * Initialize database connection.
 * @return {Object} pgp database connection.
 */
export function initialize() {
  if (db) {
    pg.end();
  }

  db = pg(config.get('database.connStr'));

  return db;
}

/**
 * Save an array of dataset metadata into the database.
 * @param  {Metadata[]}     metadatas an array of dataset metadata
 * @return {Promise<null>}            no return
 */
export function save(metadatas) {
  if (metadatas.length === 0) {
    return Promise.resolve();
  }

  let db = getDB();

  let columnSet = new pg.helpers.ColumnSet([
    'portal_id',
    'portal_dataset_id',
    'name',
    'description',
    'created_time',
    'updated_time',
    'portal_link',
    'data_link',
    'publisher',
    'tags',
    'categories',
    'raw'
  ], {
    table: 'view_latest_dataset'
  });

  let values = _.map(metadatas, metadata => {
    return {
      portal_id: metadata.portalID,
      portal_dataset_id: metadata.portalDatasetID,
      name: metadata.name || 'Untitled Dataset',
      description: metadata.description,
      created_time: dateToString(metadata.createdTime),
      updated_time: dateToString(metadata.updatedTime),
      portal_link: metadata.portalLink,
      data_link: metadata.dataLink,
      publisher: metadata.publisher || 'Unkown',
      tags: arrayToString(_.omit(metadata.tags, '')),
      categories: arrayToString(_.omit(metadata.categories, '')),
      raw: metadata.raw
    };
  });

  var query = pg.helpers.insert(values, columnSet);

  return db.none(query);
}

/**
 * Database helper functions
 * @type {Object}
 */
export const helpers = {
  dateToString: dateToString,
  arrayToString: arrayToString
};

/**
 * Convert a Date object to a string in the ISO-8601 format.
 * @param  {Date}   date  Date object
 * @return {String}       Date string. If the date is null, return null.
 */
function dateToString(date) {
  return date ? date.toISOString() : null;
}

/**
 * Convert an array of values into a PostgreSQL array string.
 * @param  {Array}  array JavaScript array
 * @return {String}       PostgreSQL array string
 */
function arrayToString(array) {
  let values = _.chain(array)
                .filter(value => value)
                .map(value => {
                  return '"' + value.replace('\'', '\'\'').trim() + '"';
                })
                .join(',')
                .value();

  return '{' + values + '}';
}

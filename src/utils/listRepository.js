import { sharepointConfig } from '../config/sharepointConfig.js';
import { ConflictError } from './errors.js';
import { LIST_SCHEMAS, recordToFields, rowToRecord, selectColumns } from './listSchemas.js';
import {
  buildQuery,
  odataQuote,
  spDelete,
  spGet,
  spGetAll,
  spMerge,
  spPost
} from './spRestClient.js';

const PAGE_SIZE = 5000;

const listBasePath = (listKey) => {
  const title = sharepointConfig.lists[listKey];
  if (!title) {
    throw new Error(`Liste inconnue : ${listKey}`);
  }
  return `/_api/web/lists/getbytitle('${odataQuote(title)}')`;
};

export const createListRepository = (listKey) => {
  const schema = LIST_SCHEMAS[listKey];
  if (!schema) {
    throw new Error(`Schéma de liste inconnu : ${listKey}`);
  }

  const select = selectColumns(schema);
  const hasRowVersion = schema.columns.includes('RowVersion');
  const itemsPath = () => `${listBasePath(listKey)}/items`;
  const itemPath = (spItemId) => `${itemsPath()}(${Number(spItemId)})`;

  const getAll = async () => {
    const rows = await spGetAll(`${itemsPath()}${buildQuery({ select, top: PAGE_SIZE })}`);
    return rows.map((row) => rowToRecord(schema, row));
  };

  const findBy = async (column, value) => {
    const rows = await spGetAll(
      `${itemsPath()}${buildQuery({
        select,
        filter: `${column} eq '${odataQuote(value)}'`,
        top: PAGE_SIZE
      })}`
    );
    return rows.map((row) => rowToRecord(schema, row));
  };

  // minimalmetadata expose `odata.etag` par élément : on récupère version métier et etag
  // en une seule lecture, ce qui permet une écriture verrouillée juste après.
  const findRawByKey = async (keyValue) => {
    if (!schema.keyField) {
      throw new Error(`La liste ${listKey} n’a pas de clé métier.`);
    }
    const payload = await spGet(
      `${itemsPath()}${buildQuery({
        select,
        filter: `${schema.keyField} eq '${odataQuote(keyValue)}'`,
        top: 2
      })}`,
      { metadata: 'minimal' }
    );
    const rows = (payload && payload.value) || [];
    if (!rows.length) {
      return null;
    }
    return { row: rows[0], etag: rows[0]['odata.etag'] || '*' };
  };

  const findByKey = async (keyValue) => {
    const found = await findRawByKey(keyValue);
    return found ? rowToRecord(schema, found.row) : null;
  };

  const create = async (record) => {
    const fields = recordToFields(schema, hasRowVersion ? { ...record, RowVersion: 1 } : record);
    const created = await spPost(itemsPath(), fields);
    return rowToRecord(schema, { ...fields, Id: created && created.Id });
  };

  const update = async (spItemId, record, etag) => {
    const fields = recordToFields(schema, record);
    await spMerge(itemPath(spItemId), fields, { etag: etag || '*' });
    return rowToRecord(schema, { ...fields, Id: spItemId });
  };

  const remove = (spItemId, etag) => spDelete(itemPath(spItemId), { etag: etag || '*' });

  // Concurrence optimiste à deux barrières : RowVersion pilote le parcours de conflit déjà
  // présent dans l’UI, IF-MATCH ferme la fenêtre de course côté serveur.
  const upsertByKey = async (record, { expectedRowVersion } = {}) => {
    const keyValue = record && record[schema.keyField];
    if (!keyValue) {
      throw new Error(`Champ clé « ${schema.keyField} » manquant.`);
    }

    const existing = await findRawByKey(keyValue);
    if (!existing) {
      return create(record);
    }

    const currentVersion = Number(existing.row.RowVersion) || 1;
    if (
      hasRowVersion &&
      typeof expectedRowVersion === 'number' &&
      expectedRowVersion > 0 &&
      expectedRowVersion !== currentVersion
    ) {
      throw new ConflictError('Conflit de version détecté.', rowToRecord(schema, existing.row));
    }

    const fields = recordToFields(
      schema,
      hasRowVersion ? { ...record, RowVersion: currentVersion + 1 } : record
    );
    await spMerge(itemPath(existing.row.Id), fields, { etag: existing.etag });
    return rowToRecord(schema, { ...existing.row, ...fields, Id: existing.row.Id });
  };

  return { schema, getAll, findBy, findByKey, findRawByKey, create, update, remove, upsertByKey };
};

const repositoryCache = new Map();

export const getRepository = (listKey) => {
  if (!repositoryCache.has(listKey)) {
    repositoryCache.set(listKey, createListRepository(listKey));
  }
  return repositoryCache.get(listKey);
};

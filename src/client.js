const lib = require('@aws-sdk/lib-dynamodb')
// const lib = {};
const {unmarshallOutput} = require('@aws-sdk/lib-dynamodb/dist-cjs/commands/utils');
// const unmarshallOutput = (val) => val;

const { isFunction } = require('./validations');
const { ElectroError, ErrorCodes } = require('./errors');
const DocumentClientVersions = {
    v2: 'v2',
    v3: 'v3',
    electro: 'electro',
};

const v3Methods = ['send'];
const v2Methods = ['get', 'put', 'update', 'delete', 'batchWrite', 'batchGet', 'scan', 'query', 'createSet', 'transactWrite', 'transactGet'];
const supportedClientVersions = {
    [DocumentClientVersions.v2]: v2Methods,
    [DocumentClientVersions.v3]: v3Methods,
}

class DocumentClientV2Wrapper {
    static init(client) {
        return new DocumentClientV2Wrapper(client, lib);
    }

    constructor(client, lib) {
        this.client = client;
        this.lib = lib;
        this.__v = 'v2';
    }

    get(params) {
        return this.client.get(params);
    }

    put(params) {
        return this.client.put(params);
    }

    update(params) {
        return this.client.update(params);
    }

    delete(params) {
        return this.client.delete(params);
    }

    batchWrite(params) {
        return this.client.batchWrite(params);
    }

    batchGet(params) {
        return this.client.batchGet(params);
    }

    scan(params) {
        return this.client.scan(params);
    }

    query(params) {
        return this.client.query(params);
    }

    _transact(transactionRequest) {
        let cancellationReasons;
        transactionRequest.on('extractError', (response) => {
            try {
                cancellationReasons = JSON.parse(response.httpResponse.body.toString()).CancellationReasons;
            } catch (err) {}
        });

        return {
            async promise() {
                return transactionRequest.promise()
                    .catch((err) => {
                        if (err) {
                            if (Array.isArray(cancellationReasons)) {
                                return {
                                    canceled: cancellationReasons
                                        .map(reason => {
                                            if (reason.Item) {
                                                return unmarshallOutput(reason, [{ key: "Item" }]);
                                            }
                                            return reason;
                                        })
                                };
                            }
                            throw err;
                        }
                    });
            }
        }
    }
    transactWrite(params) {
        const transactionRequest = this.client.transactWrite(params);
        return this._transact(transactionRequest);
    }

    transactGet(params) {
        const transactionRequest = this.client.transactGet(params);
        return this._transact(transactionRequest);
    }

    createSet(value) {
        if (Array.isArray(value)) {
            return this.client.createSet(value);
        } else {
            return this.client.createSet([value]);
        }
    }
}

class DocumentClientV3Wrapper {
    static init(client) {
        return new DocumentClientV3Wrapper(client, lib);
    }

    constructor(client, lib) {
        this.client = client;
        this.lib = lib;
        this.__v = 'v3';
    }

    promiseWrap(fn) {
        return {
            promise: async () => {
                return fn();
            }
        }
    }

    get(params) {
        return this.promiseWrap(() => {
            const command = new this.lib.GetCommand(params);
            return this.client.send(command);
        });
    }
    put(params) {
        return this.promiseWrap(() => {
            const command = new this.lib.PutCommand(params);
            return this.client.send(command);
        });
    }
    update(params) {
        return this.promiseWrap(() => {
            const command = new this.lib.UpdateCommand(params);
            return this.client.send(command);
        });
    }
    delete(params) {
        return this.promiseWrap(async () => {
            const command = new this.lib.DeleteCommand(params);
            return this.client.send(command);
        });
    }
    batchWrite(params) {
        return this.promiseWrap(async () => {
            const command = new this.lib.BatchWriteCommand(params);
            return this.client.send(command);
        });
    }
    batchGet(params) {
        return this.promiseWrap(async () => {
            const command = new this.lib.BatchGetCommand(params);
            return this.client.send(command);
        });
    }
    scan(params) {
        return this.promiseWrap(async () => {
            const command = new this.lib.ScanCommand(params);
            return this.client.send(command);
        });
    }
    query(params) {
        return this.promiseWrap(async () => {
            const command = new this.lib.QueryCommand(params);
            return this.client.send(command);
        });
    }
    transactWrite(params) {
        return this.promiseWrap(async () => {
            const transactionRequest = this.client.transactWrite(params);
            let cancellationReasons;
            transactionRequest.on('extractError', (response) => {
                try {
                    cancellationReasons = JSON.parse(response.httpResponse.body.toString()).CancellationReasons;
                } catch (err) {}
            });

            return new Promise((resolve, reject) => {
                transactionRequest.send((err, response) => {
                    if (err) {
                        if (Array.isArray(cancellationReasons)) {
                            return {
                                cancelled: cancellationReasons.map(reason => {
                                    if (reason.Item) {
                                        return unmarshallOutput(reason, [{ key: "Item" }]);
                                    }
                                    return reason;
                                })
                            }
                        }
                        return reject(err);
                    }
                    return resolve(response);
                });
            })
        });
    }
    transactGet(params) {
        return this.promiseWrap(async () => {
            const command = new this.lib.TransactGetCommand(params);
            return this.client.send(command);
        });
    }
    createSet(value) {
        if (Array.isArray(value)) {
            return new Set(value);
        } else {
            return new Set([value]);
        }
    }
}

function identifyClientVersion(client = {}) {
    if (client instanceof DocumentClientV3Wrapper || client instanceof DocumentClientV2Wrapper) {
        return DocumentClientVersions.electro;
    }
    for (const [version, methods] of Object.entries(supportedClientVersions)) {
        const hasMethods = methods.every(method => {
            return method in client && isFunction(client[method]);
        });
        if (hasMethods) {
            return version;
        }
    }
}

function normalizeClient(client) {
    if (client === undefined) return client;
    const version = identifyClientVersion(client);
    switch(version) {
        case DocumentClientVersions.v3:
            return DocumentClientV3Wrapper.init(client);
        case DocumentClientVersions.v2:
            return DocumentClientV2Wrapper.init(client);
        case DocumentClientVersions.electro:
            return client;
        default:
            throw new ElectroError(ErrorCodes.InvalidClientProvided, 'Invalid DynamoDB Document Client provided. ElectroDB supports the v2 and v3 DynamoDB Document Clients from the aws-sdk');
    }
}

function normalizeConfig(config = {}) {
    return {
        ...config,
        client: normalizeClient(config.client)
    }
}

module.exports = {
    v2Methods,
    v3Methods,
    normalizeClient,
    normalizeConfig,
    identifyClientVersion,
    DocumentClientVersions,
    supportedClientVersions,
    DocumentClientV3Wrapper,
    DocumentClientV2Wrapper,
};

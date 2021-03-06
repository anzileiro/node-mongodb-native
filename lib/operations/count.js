'use strict';

const buildCountCommand = require('./common_functions').buildCountCommand;
const OperationBase = require('./operation').OperationBase;

class CountOperation extends OperationBase {
  constructor(cursor, applySkipLimit, options) {
    super(options);

    this.cursor = cursor;
    this.applySkipLimit = applySkipLimit;
  }

  execute(callback) {
    const cursor = this.cursor;
    const applySkipLimit = this.applySkipLimit;
    const options = this.options;

    if (applySkipLimit) {
      if (typeof cursor.cursorSkip() === 'number') options.skip = cursor.cursorSkip();
      if (typeof cursor.cursorLimit() === 'number') options.limit = cursor.cursorLimit();
    }

    // Ensure we have the right read preference inheritance
    if (options.readPreference) {
      cursor.setReadPreference(options.readPreference);
    }

    if (
      typeof options.maxTimeMS !== 'number' &&
      cursor.cmd &&
      typeof cursor.cmd.maxTimeMS === 'number'
    ) {
      options.maxTimeMS = cursor.cmd.maxTimeMS;
    }

    let finalOptions = {};
    finalOptions.skip = options.skip;
    finalOptions.limit = options.limit;
    finalOptions.hint = options.hint;
    finalOptions.maxTimeMS = options.maxTimeMS;

    // Command
    finalOptions.collectionName = cursor.namespace.collection;

    let command;
    try {
      command = buildCountCommand(cursor, cursor.cmd.query, finalOptions);
    } catch (err) {
      return callback(err);
    }

    // Set cursor server to the same as the topology
    cursor.server = cursor.topology.s.coreTopology;

    // Execute the command
    cursor.topology.command(
      cursor.namespace.withCollection('$cmd'),
      command,
      cursor.options,
      (err, result) => {
        callback(err, result ? result.result.n : null);
      }
    );
  }
}

module.exports = CountOperation;

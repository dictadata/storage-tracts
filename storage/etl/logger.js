/**
 * storage-node/logger
 */
"use strict";

// use the storage-junctions logger
const { logger } = require('@dictadata/storage-junctions/utils');
// which is the Winston logger
const winston = require('winston');
const { format, transports } = winston;
const DailyRotateFile = require('winston-daily-rotate-file');

module.exports = exports = logger;

logger.level = process.env.LOG_LEVEL || 'info';

var defaultOptions = {
  logPath: "/var/log/storage-node",
  logPrefix: "etl",
  logLevel: "info"
};

logger.configETLLogger = function (options) {
  options = Object.assign({}, defaultOptions, options);

  //console.log(process.env.LOG_LEVEL);
  logger.level = process.env.LOG_LEVEL || options.logLevel || 'info';

  // note storage-junctions logger already defines console output

  // add log file
  logger.add(new DailyRotateFile({
    format: format.logstash(),
    dirname: options.logPath,
    filename: options.logPrefix + '-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '100m',
    maxFiles: (process.env.NODE_ENV === 'development') ? '1d' : '31d'
  }) );

};

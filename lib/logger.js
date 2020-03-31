/**
 * storage-node/logger
 */
"use strict";

// use the storage-junctions logger
const { logger } = require('@dictadata/storage-junctions');
// which is the Winston logger
const winston = require('winston');
const { format } = winston;
const DailyRotateFile = require('winston-daily-rotate-file');

module.exports = exports = logger;

var defaultOptions = {
  logPath: "./log",
  logPrefix: "dictadata",
  logLevel: "info"
};

logger.configLogger = function (options) {
  options = Object.assign({}, defaultOptions, options);

  logger.level = process.env.LOG_LEVEL || options.logLevel || 'info';

  logger.add(new DailyRotateFile({
    level: options.logLevel,
    format: format.logstash(),
    dirname: options.logPath,
    filename: options.logPrefix + '-%DATE%.log',
    datePattern: 'YYYY-MM-DD',
    maxSize: '100m',
    maxFiles: (process.env.NODE_ENV === 'development') ? '1d' : '31d'
  }) );

};

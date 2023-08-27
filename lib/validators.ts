import { ConfigurationError } from './errors.ts';
import { isObject } from './helpers.ts';

/**
 * Validates a given channel mapping, throwing an error if it's invalid
 * @param  {Object} mapping
 * @return {Object}
 */
export function validateChannelMapping(mapping: any) {
  if (!isObject(mapping)) {
    throw new ConfigurationError('Invalid channel mapping given');
  }

  return mapping;
}

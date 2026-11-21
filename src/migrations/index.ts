import * as migration_20261119_103037_initial_schema from './20261119_103037_initial_schema';
import * as migration_20261119_112500_media_blobs from './20261119_112500_media_blobs';
import * as migration_20261119_190000_ticket_verification_tokens from './20261119_190000_ticket_verification_tokens';
import * as migration_20261119_192000_tickets_versions_tokens from './20261119_192000_tickets_versions_tokens';
import * as migration_20261120_100000_azortix_platform_upgrade from './20261120_100000_azortix_platform_upgrade';
import * as migration_20261120_120000_events_timezone from './20261120_120000_events_timezone';

export const migrations = [
  {
    up: migration_20261119_103037_initial_schema.up,
    down: migration_20261119_103037_initial_schema.down,
    name: '20261119_103037_initial_schema'
  },
  {
    up: migration_20261119_112500_media_blobs.up,
    down: migration_20261119_112500_media_blobs.down,
    name: '20261119_112500_media_blobs'
  },
  {
    up: migration_20261119_190000_ticket_verification_tokens.up,
    down: migration_20261119_190000_ticket_verification_tokens.down,
    name: '20261119_190000_ticket_verification_tokens'
  },
  {
    up: migration_20261119_192000_tickets_versions_tokens.up,
    down: migration_20261119_192000_tickets_versions_tokens.down,
    name: '20261119_192000_tickets_versions_tokens'
  },
  {
    up: migration_20261120_100000_azortix_platform_upgrade.up,
    down: migration_20261120_100000_azortix_platform_upgrade.down,
    name: '20261120_100000_azortix_platform_upgrade'
  },
  {
    up: migration_20261120_120000_events_timezone.up,
    down: migration_20261120_120000_events_timezone.down,
    name: '20261120_120000_events_timezone'
  },
];

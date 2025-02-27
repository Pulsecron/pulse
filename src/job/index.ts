import * as mongodb from 'mongodb';
import { Pulse } from '../pulse';
import { JobPriority } from '../pulse/define';
import { parsePriority } from '../utils';
import { ComputeNextRunAtMethod, computeNextRunAt } from './compute-next-run-at';
import { DisableMethod, disable } from './disable';
import { EnableMethod, enable } from './enable';
import { FailMethod, fail } from './fail';
import { FetchStatusMethod, fetchStatus } from './fetch-status';
import { IsExpiredMethod, isExpired } from './is-expired';
import { IsRunningMethod, isRunning } from './is-running';
import { PriorityMethod, priority } from './priority';
import { RemoveMethod, remove } from './remove';
import { RepeatAtMethod, repeatAt } from './repeat-at';
import { RepeatEveryMethod, repeatEvery } from './repeat-every';
import { RunMethod, run } from './run';
import { SaveMethod, save } from './save';
import { ScheduleMethod, schedule } from './schedule';
import { SetShouldSaveResultMethod, setShouldSaveResult } from './set-shouldsaveresult';
import { ToJsonMethod, toJson } from './to-json';
import { TouchMethod, touch } from './touch';
import { UniqueMethod, unique } from './unique';

type Modify<T, R> = Omit<T, keyof R> & R;

export interface JobAttributesData {
  [key: string]: any;
}
export interface JobAttributes<T extends JobAttributesData = JobAttributesData> {
  /**
   * The record identity.
   */
  _id: mongodb.ObjectId;

  pulse: Pulse;

  /**
   * The type of the job (single|normal).
   */
  type: string;

  /**
   * The name of the job.
   */
  name: string;

  /**
   * Job's state
   */
  disabled?: boolean;

  /**
   * Job's progress state (0 to 100)
   */
  progress?: number;

  /**
   * Date/time the job will run next.
   */
  nextRunAt?: Date | null;

  /**
   * Date/time the job was locked.
   */
  lockedAt?: Date | null;

  /**
   * The priority of the job.
   */
  priority: number | string;

  /**
   * The job details.
   */
  data: T;

  uniqueQuery?: any;
  uniqueOpts?: {
    insertOnly: boolean;
  };

  /**
   * How often the job is repeated using a human-readable or cron format.
   */
  repeatInterval?: string;

  /**
   * The timezone that conforms to [moment-timezone](http://momentjs.com/timezone/).
   */
  repeatTimezone?: string | null;

  repeatAt?: string;

  /**
   * Date/time the job was last run.
   */
  lastRunAt?: Date;

  /*
   * Count of the number of times the job has run.
   */
  runCount?: number;

  /**
   * Date/time the job last finished running.
   */
  lastFinishedAt?: Date;

  startDate?: Date | number | null;
  endDate?: Date | number | null;
  skipDays?: string | null;

  /**
   * The number of times the job has finished running.
   */
  finishedCount?: number;

  /**
   * The reason the job failed.
   */
  failReason?: string;

  /**
   * The number of times the job has failed.
   */
  failCount?: number;

  /**
   * The date/time the job last failed.
   */
  failedAt?: Date;

  /**
   * Date/time the job was last modified.
   */
  lastModifiedBy?: string;

  /**
   * Should the return value of the job be persisted.
   */
  shouldSaveResult?: boolean;

  /**
   * Number of attempts to run the job.
   */
  attempts?: number;

  /**
   * Backoff options.
   */
  backoff?: {
    /**
     * Type of backoff to use.
     */
    type: 'exponential' | 'fixed';

    /**
     * Delay in ms.
     */
    delay: number;
  };

  /**
   * Result of the finished job.
   */
  result?: unknown;
}

/**
 * @class
 * @param {Object} args - Job Options
 * @property {Object} pulse - The Pulse instance
 * @property {Object} attrs
 */
class Job<T extends JobAttributesData = JobAttributesData> {
  private _lazyBindings: Record<string, any> = {};

  /**
   * The pulse that created the job.
   */
  pulse: Pulse;

  /**
   * The database record associated with the job.
   */
  attrs: JobAttributes<T>;

  constructor(options: Modify<JobAttributes<T>, { _id?: mongodb.ObjectId }>) {
    const { pulse, type, nextRunAt, ...args } = options ?? {};

    // Save Pulse instance
    this.pulse = pulse;

    // Set priority
    args.priority = args.priority === undefined ? JobPriority.normal : parsePriority(args.priority);

    // Set shouldSaveResult option
    args.shouldSaveResult = args.shouldSaveResult || false;

    // Set attrs to args
    const attrs: any = {};
    for (const key in args) {
      if ({}.hasOwnProperty.call(args, key)) {
        // @ts-expect-error
        attrs[key] = args[key];
      }
    }

    // Set defaults if undefined
    this.attrs = {
      ...attrs,
      name: attrs.name || '',
      priority: attrs.priority,
      type: type || 'once',
      // if a job that's non-recurring has a lastFinishedAt (finished the job), do not default nextRunAt to now
      // only if it will be defaulted either by explicitly setting it or by computing it computeNextRunAt
      nextRunAt: nextRunAt || new Date(),
    };
  }

  /**
   ***************************************
   * Public methods
   * *************************************
   */

  get toJSON(): ToJsonMethod {
    return this.bindMethod('toJSON', toJson);
  }

  get computeNextRunAt(): ComputeNextRunAtMethod {
    return this.bindMethod('computeNextRunAt', computeNextRunAt);
  }

  get repeatEvery(): RepeatEveryMethod {
    return this.bindMethod('repeatEvery', repeatEvery);
  }

  get repeatAt(): RepeatAtMethod {
    return this.bindMethod('repeatAt', repeatAt);
  }

  get disable(): DisableMethod {
    return this.bindMethod('disable', disable);
  }

  get enable(): EnableMethod {
    return this.bindMethod('enable', enable);
  }

  get unique(): UniqueMethod {
    return this.bindMethod('unique', unique);
  }

  get schedule(): ScheduleMethod {
    return this.bindMethod('schedule', schedule);
  }

  get priority(): PriorityMethod {
    return this.bindMethod('priority', priority);
  }

  get fail(): FailMethod {
    return this.bindMethod('fail', fail);
  }

  get run(): RunMethod {
    return this.bindMethod('run', run);
  }

  get isRunning(): IsRunningMethod {
    return this.bindMethod('isRunning', isRunning);
  }

  get isExpired(): IsExpiredMethod {
    return this.bindMethod('isExpired', isExpired);
  }

  get save(): SaveMethod {
    return this.bindMethod('save', save);
  }

  get remove(): RemoveMethod {
    return this.bindMethod('remove', remove);
  }

  get touch(): TouchMethod {
    return this.bindMethod('touch', touch);
  }

  get setShouldSaveResult(): SetShouldSaveResultMethod {
    return this.bindMethod('setShouldSaveResult', setShouldSaveResult);
  }

  get fetchStatus(): FetchStatusMethod {
    return this.bindMethod('fetchStatus', fetchStatus);
  }

  /**
   ***************************************
   * Private methods
   * *************************************
   */

  private bindMethod<T extends Function>(methodName: string, fn: T): T {
    if (!this._lazyBindings[methodName]) {
      this._lazyBindings[methodName] = fn.bind(this);
    }
    return this._lazyBindings[methodName] as T;
  }
}

export { Job };
